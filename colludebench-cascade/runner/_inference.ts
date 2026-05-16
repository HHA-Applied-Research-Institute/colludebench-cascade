/**
 * Anthropic SDK adapter for ColludeBench experiments.
 *
 * Reads ANTHROPIC_API_KEY from process.env. Three tiers map to the Claude
 * model family used in Stage 2b and locked for Stage 3:
 *   - fast     → claude-haiku-4-5-20251001  (Stage 2b model under test)
 *   - standard → claude-sonnet-4-5
 *   - smart    → claude-opus-4-1
 *
 * Override the model per tier via env vars CLAUDE_MODEL_FAST /
 * CLAUDE_MODEL_STANDARD / CLAUDE_MODEL_SMART.
 *
 * Empty-output detection (load-bearing): when the API returns success
 * with an empty content block — typically a rate-limit or content-filter
 * edge case — this wrapper re-classifies it as failure so the runner
 * can back off rather than silently corrupting traces with empty
 * reasoning blocks.
 */

import Anthropic from "@anthropic-ai/sdk";

export type InferenceLevel = "fast" | "standard" | "smart";

export interface InferenceOptions {
  systemPrompt: string;
  userPrompt: string;
  level?: InferenceLevel;
  expectJson?: boolean;
  timeout?: number;
}

export interface InferenceResult {
  success: boolean;
  output: string;
  parsed?: unknown;
  error?: string;
  latencyMs: number;
  level: InferenceLevel;
}

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  throw new Error(
    "ANTHROPIC_API_KEY not set. Set it in your environment to run experiments. " +
      "See https://docs.anthropic.com/claude/docs/getting-access-to-claude for an API key.",
  );
}
const client = new Anthropic({ apiKey });

function modelForLevel(level: InferenceLevel): string {
  switch (level) {
    case "smart":
      return process.env.CLAUDE_MODEL_SMART ?? "claude-opus-4-1";
    case "standard":
      return process.env.CLAUDE_MODEL_STANDARD ?? "claude-sonnet-4-5";
    case "fast":
    default:
      return process.env.CLAUDE_MODEL_FAST ?? "claude-haiku-4-5-20251001";
  }
}

export async function inference(opts: InferenceOptions): Promise<InferenceResult> {
  const level: InferenceLevel = opts.level ?? "fast";
  const model = modelForLevel(level);
  const start = Date.now();

  try {
    const response = await client.messages.create({
      model,
      max_tokens: 8192,
      system: opts.systemPrompt,
      messages: [{ role: "user", content: opts.userPrompt }],
    });

    const textBlocks = response.content.filter(
      (block): block is { type: "text"; text: string } => block.type === "text",
    );
    const output = textBlocks.map((b) => b.text).join("");
    const latencyMs = Date.now() - start;

    // Load-bearing empty-output detection — see header comment.
    if (!output || output.trim().length === 0) {
      return {
        success: false,
        output: "",
        error:
          "API returned empty content block (likely rate-limit or content-filter edge case)",
        latencyMs,
        level,
      };
    }

    let parsed: unknown;
    if (opts.expectJson) {
      try {
        parsed = JSON.parse(output);
      } catch {
        // Leave parsed undefined; caller decides whether to treat as failure.
      }
    }

    return { success: true, output, parsed, latencyMs, level };
  } catch (err) {
    const latencyMs = Date.now() - start;
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, output: "", error: message, latencyMs, level };
  }
}
