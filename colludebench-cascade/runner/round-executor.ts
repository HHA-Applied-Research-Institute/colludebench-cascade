/**
 * ColludeBench — Round Executor
 * Runs one round for all agents in parallel via inference.
 */

import { inference, type InferenceLevel, type InferenceResult } from "./_inference";
import type { ExperimentConfig, AgentResponse, RoundResult, RoundHistory } from "./types";
import { buildUserPrompt } from "./history-builder";
import { getVisibleAgents } from "./topology";
import { snapToGrid } from "./demand-model";

const TIER_TIMEOUTS: Record<string, number> = {
  fast: 180_000,
  standard: 180_000,
  smart: 300_000,
};

/**
 * Rate-limit signature detection. Applied to stderr / error messages from
 * the inference subprocess. When matched, we switch from short transient-blip
 * backoffs to long rate-limit-aware backoffs.
 */
const RATE_LIMIT_SIGNATURES =
  /(rate[\s_\-]?limit|429|quota|too many requests|retry[\s_\-]?after|exceeded|throttl)/i;

/** Short backoffs (ms) — for transient network blips. */
const SHORT_BACKOFF_MS = [3_000, 6_000, 9_000, 12_000];

/** Long backoffs (ms) — for sustained rate-limit windows. 60s / 5min / 15min / 30min. */
const LONG_BACKOFF_MS = [60_000, 300_000, 900_000, 1_800_000];

const MAX_ATTEMPTS = 5;

export interface RetriedInferenceResult extends InferenceResult {
  attemptsUsed: number;
  /** Last error message observed across attempts (stderr or empty-output marker). */
  lastError?: string;
  /** True if any attempt's error matched the rate-limit signature. */
  rateLimitDetected: boolean;
}

async function inferWithRetry(
  systemPrompt: string,
  userPrompt: string,
  tier: InferenceLevel
): Promise<RetriedInferenceResult> {
  const opts = {
    systemPrompt,
    userPrompt,
    level: tier,
    timeout: TIER_TIMEOUTS[tier] || 90_000,
  };

  let lastError: string | undefined;
  let rateLimitDetected = false;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const result = await inference(opts);
    if (result.success && result.output && result.output.trim().length > 0) {
      return { ...result, attemptsUsed: attempt + 1, lastError, rateLimitDetected };
    }

    lastError = result.error || "empty output / unknown failure";
    if (RATE_LIMIT_SIGNATURES.test(lastError)) rateLimitDetected = true;

    if (attempt < MAX_ATTEMPTS - 1) {
      const backoffArr = rateLimitDetected ? LONG_BACKOFF_MS : SHORT_BACKOFF_MS;
      const backoff = backoffArr[Math.min(attempt, backoffArr.length - 1)];
      const tag = rateLimitDetected ? "rate-limit" : "retry";
      console.error(
        `\n  [${tag}] attempt ${attempt + 1}/${MAX_ATTEMPTS}, backoff ${backoff / 1000}s | err: ${lastError.slice(0, 140)}`
      );
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
  const finalResult = await inference(opts);
  if (!finalResult.success || !finalResult.output || finalResult.output.trim().length === 0) {
    lastError = finalResult.error || lastError || "empty output after all retries";
    if (RATE_LIMIT_SIGNATURES.test(lastError)) rateLimitDetected = true;
  }
  return { ...finalResult, attemptsUsed: MAX_ATTEMPTS + 1, lastError, rateLimitDetected };
}

/** Exported for unit tests. */
export const __internals = {
  RATE_LIMIT_SIGNATURES,
  SHORT_BACKOFF_MS,
  LONG_BACKOFF_MS,
  MAX_ATTEMPTS,
};

function parseResponse(
  rawOutput: string,
  responseType: "number" | "cooperate-defect" | "instruction"
): { action: string | number; reasoning: string; parseSuccess: boolean } {
  const trimmed = rawOutput.trim();
  const lines = trimmed.split("\n");
  const lastLine = lines[lines.length - 1].trim();
  const reasoning = lines.slice(0, -1).join("\n").trim();

  if (responseType === "number") {
    // Extract last number from the response (preserve decimal precision)
    const numbers = trimmed.match(/(\d+\.?\d*)/g);
    if (numbers && numbers.length > 0) {
      const lastNum = parseFloat(numbers[numbers.length - 1]);
      return { action: lastNum, reasoning, parseSuccess: true };
    }
    return { action: 0, reasoning, parseSuccess: false };
  }

  if (responseType === "cooperate-defect") {
    // Look for COOPERATE or DEFECT in the last line, case-insensitive
    if (/COOPERATE/i.test(lastLine)) {
      return { action: "COOPERATE", reasoning, parseSuccess: true };
    }
    if (/DEFECT/i.test(lastLine)) {
      return { action: "DEFECT", reasoning, parseSuccess: true };
    }
    // Fallback: search entire response from bottom up
    for (let i = lines.length - 1; i >= 0; i--) {
      if (/COOPERATE/i.test(lines[i])) return { action: "COOPERATE", reasoning, parseSuccess: true };
      if (/DEFECT/i.test(lines[i])) return { action: "DEFECT", reasoning, parseSuccess: true };
    }
    return { action: "COOPERATE", reasoning, parseSuccess: false };
  }

  // instruction type
  return { action: lastLine, reasoning, parseSuccess: true };
}

export async function executeRound(
  roundIndex: number,
  config: ExperimentConfig,
  fullHistory: RoundHistory,
  previousMessages: Map<number, string>,
  tier: InferenceLevel
): Promise<{ result: RoundResult; newMessages: Map<number, string>; userPrompts: Map<number, string> }> {
  const agentPromises: Promise<{ agentId: number; result: RetriedInferenceResult; userPrompt: string; startMs: number }>[] = [];

  for (let agentId = 0; agentId < config.agentCount; agentId++) {
    const userPrompt = buildUserPrompt(agentId, roundIndex, config, fullHistory, previousMessages);

    const startMs = Date.now();
    // Stagger spawns to avoid claude -p concurrency spikes
    const delay = agentId * 500;
    const promise = Bun.sleep(delay).then(() =>
      inferWithRetry(config.systemPrompt, userPrompt, tier).then(result => ({
        agentId,
        result,
        userPrompt,
        startMs,
      }))
    );

    agentPromises.push(promise);
  }

  // All agents execute in parallel
  const results = await Promise.all(agentPromises);

  const agents: AgentResponse[] = [];
  const newMessages = new Map<number, string>();
  const userPrompts = new Map<number, string>();

  for (const { agentId, result, userPrompt, startMs } of results) {
    userPrompts.set(agentId, userPrompt);
    const latencyMs = Date.now() - startMs;
    const rawOutput = result.success ? (result.output || "").trim() : "";

    const parsed = parseResponse(rawOutput, config.responseType);

    // Handle parse failures: use configured default (Nash price) instead of 0
    if (!parsed.parseSuccess && typeof parsed.action === "number" && config.parseFailureDefault !== undefined) {
      parsed.action = config.parseFailureDefault;
      console.error(`\n  [parse-failure] Agent ${agentId}, round ${roundIndex}: defaulting to ${config.parseFailureDefault} (Nash). Raw: "${rawOutput.substring(0, 80)}..."`);
    }

    // Snap to discrete grid if configured (Calvano 15-level)
    if (config.discretePriceGrid && typeof parsed.action === "number" && parsed.parseSuccess) {
      parsed.action = snapToGrid(parsed.action as number, config.discretePriceGrid);
    }

    // Extract message if communication is enabled (look for MESSAGE: or DIRECTIVE: prefix)
    let message: string | undefined;
    if (config.communicationType !== "none") {
      const msgMatch = rawOutput.match(/(?:DIRECTIVE|MESSAGE):\s*(.+?)(?:\n|PRICE:|$)/i);
      if (msgMatch) message = msgMatch[1].trim();
    }

    if (message) newMessages.set(agentId, message);

    agents.push({
      agentId,
      rawOutput,
      reasoning: parsed.reasoning,
      action: parsed.action,
      parseSuccess: parsed.parseSuccess,
      latencyMs,
      isDefector: config.defectorAgentIds.includes(agentId),
      message,
      inferenceError: result.success ? undefined : result.lastError,
      attemptsUsed: result.attemptsUsed,
      rateLimitDetected: result.rateLimitDetected,
    });
  }

  return {
    result: {
      roundIndex,
      agents: agents.sort((a, b) => a.agentId - b.agentId),
      timestamp: new Date().toISOString(),
    },
    newMessages,
    userPrompts,
  };
}

/** Dry-run mode: builds prompts for round 1 without calling inference */
export function dryRunRound(
  roundIndex: number,
  config: ExperimentConfig,
  fullHistory: RoundHistory,
  previousMessages: Map<number, string>
): Map<number, string> {
  const prompts = new Map<number, string>();
  for (let agentId = 0; agentId < config.agentCount; agentId++) {
    prompts.set(agentId, buildUserPrompt(agentId, roundIndex, config, fullHistory, previousMessages));
  }
  return prompts;
}
