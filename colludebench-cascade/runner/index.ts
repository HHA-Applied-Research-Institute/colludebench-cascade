#!/usr/bin/env bun
/**
 * ColludeBench Multi-Agent Experiment Runner — CLI Entry Point
 *
 * Usage:
 *   bun run pilot/runner/index.ts --spec pilot/experiments/A-contagion/EXP-A1.md
 *   bun run pilot/runner/index.ts --category A-contagion
 *   bun run pilot/runner/index.ts --spec EXP-A1.md --tier standard
 *   bun run pilot/runner/index.ts --spec EXP-A1.md --output pilot/results/my-run
 *   bun run pilot/runner/index.ts --spec EXP-A1.md --dry-run
 */

import { parseSpecFile } from "./config-parser";
import { executeRound, dryRunRound } from "./round-executor";
import { TraceLogger } from "./trace-logger";
import type { ExperimentConfig, RoundResult, RoundHistory } from "./types";
import type { InferenceLevel } from "./_inference";
import { readdirSync, existsSync } from "fs";
import { join, resolve, dirname, basename } from "path";

// --- CLI arg parsing ---
function parseArgs(): {
  specPaths: string[];
  tier: InferenceLevel;
  outputDir: string;
  dryRun: boolean;
  repsOverride?: number;
  repStart: number;
  repCount?: number;
} {
  const args = process.argv.slice(2);
  let specPaths: string[] = [];
  let tier: InferenceLevel = "fast";
  let outputDir = "";
  let dryRun = false;
  let category = "";
  let repsOverride: number | undefined;
  let repStart = 1;
  let repCount: number | undefined;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--spec":
        specPaths.push(args[++i]);
        break;
      case "--category":
        category = args[++i];
        break;
      case "--tier":
        tier = args[++i] as InferenceLevel;
        break;
      case "--output":
        outputDir = args[++i];
        break;
      case "--dry-run":
        dryRun = true;
        break;
      case "--reps":
        repsOverride = parseInt(args[++i], 10);
        break;
      case "--rep-start":
        repStart = parseInt(args[++i], 10);
        break;
      case "--rep-count":
        repCount = parseInt(args[++i], 10);
        break;
    }
  }

  // Resolve spec paths
  if (category) {
    const catDir = resolve(dirname(dirname(resolve(import.meta.dir))), "experiments", category);
    if (!existsSync(catDir)) {
      // Try relative to CWD
      const altDir = resolve(process.cwd(), "pilot/experiments", category);
      if (existsSync(altDir)) {
        const files = readdirSync(altDir).filter(f => f.startsWith("EXP-") && f.endsWith(".md")).sort();
        specPaths = files.map(f => join(altDir, f));
      } else {
        console.error(`Category directory not found: ${catDir} or ${altDir}`);
        process.exit(1);
      }
    } else {
      const files = readdirSync(catDir).filter(f => f.startsWith("EXP-") && f.endsWith(".md")).sort();
      specPaths = files.map(f => join(catDir, f));
    }
  }

  // Resolve individual spec paths
  specPaths = specPaths.map(p => {
    if (existsSync(p)) return resolve(p);
    // Try relative to pilot/experiments
    const pilotPath = resolve(process.cwd(), "pilot/experiments", p);
    if (existsSync(pilotPath)) return pilotPath;
    // Try glob-style search
    const expDir = resolve(process.cwd(), "pilot/experiments");
    if (existsSync(expDir)) {
      for (const cat of readdirSync(expDir)) {
        const full = join(expDir, cat, basename(p));
        if (existsSync(full)) return full;
      }
    }
    return resolve(p);
  });

  if (specPaths.length === 0) {
    console.error("Usage: bun run index.ts --spec <path> [--category <cat>] [--tier fast|standard|smart] [--output <dir>] [--dry-run]");
    process.exit(1);
  }

  if (!outputDir) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").substring(0, 19);
    outputDir = resolve(process.cwd(), "pilot/results", timestamp);
  }

  if (repStart < 1) {
    console.error(`ERROR: --rep-start must be >= 1, got ${repStart}`);
    process.exit(1);
  }

  return { specPaths, tier, outputDir, dryRun, repsOverride, repStart, repCount };
}

// --- Dry-run mode ---
function runDryMode(config: ExperimentConfig): void {
  console.log("\n" + "=".repeat(70));
  console.log(`DRY RUN: ${config.id}`);
  console.log("=".repeat(70));
  console.log(`  Category:      ${config.category}`);
  console.log(`  Agents:        ${config.agentCount}`);
  console.log(`  Game:          ${config.gameType} (response: ${config.responseType})`);
  console.log(`  Rounds:        ${config.rounds}`);
  console.log(`  Repetitions:   ${config.repetitions}`);
  console.log(`  Defectors:     ${config.defectorAgentIds.length > 0 ? config.defectorAgentIds.join(", ") : "none (organic)"}`);
  console.log(`  Communication: ${config.communicationType}`);
  if (config.teams) {
    for (const [name, members] of config.teams) {
      console.log(`  Team ${name}:      agents [${members.join(", ")}]`);
    }
  }
  if (config.agentRoles && config.agentRoles.size > 0) {
    console.log(`  Roles:`);
    for (const [id, role] of config.agentRoles) {
      console.log(`    Agent ${id}: ${role}`);
    }
  }
  if (config.defectionStartRound || config.defectionEndRound) {
    console.log(`  Defection window: round ${config.defectionStartRound ?? 1} to ${config.defectionEndRound ?? config.rounds}`);
  }

  console.log(`\n--- System Prompt (all agents) ---`);
  console.log(config.systemPrompt);

  // Print round 1 prompts
  console.log(`\n--- Round 1 User Prompts ---`);
  const emptyHistory: RoundHistory = new Map();
  const emptyMessages = new Map<number, string>();
  const prompts = dryRunRound(1, config, emptyHistory, emptyMessages);

  for (const [agentId, prompt] of [...prompts.entries()].sort((a, b) => a[0] - b[0])) {
    const isDefector = config.defectorAgentIds.includes(agentId);
    console.log(`\n  [Agent ${agentId}${isDefector ? " (DEFECTOR)" : ""}]:`);
    for (const line of prompt.split("\n")) {
      console.log(`    ${line}`);
    }
  }

  // For F-series, also print prompts at the defection boundary
  if (config.defectionEndRound && config.defectionEndRound < config.rounds) {
    console.log(`\n--- Round ${config.defectionEndRound + 1} User Prompts (post-defection) ---`);
    // Build fake history
    const fakeHistory: RoundHistory = new Map();
    for (let i = 0; i < config.agentCount; i++) {
      const actions: (string | number)[] = [];
      for (let r = 0; r < config.defectionEndRound; r++) {
        actions.push(config.responseType === "cooperate-defect" ? "COOPERATE" : 1.80);
      }
      fakeHistory.set(i, actions);
    }
    const postPrompts = dryRunRound(config.defectionEndRound + 1, config, fakeHistory, emptyMessages);
    for (const [agentId, prompt] of [...postPrompts.entries()].sort((a, b) => a[0] - b[0])) {
      const isDefector = config.defectorAgentIds.includes(agentId);
      console.log(`\n  [Agent ${agentId}${isDefector ? " (DEFECTOR — redemption phase)" : ""}]:`);
      for (const line of prompt.split("\n")) {
        console.log(`    ${line}`);
      }
    }
  }

  console.log("\n" + "=".repeat(70));
}

// --- Live run ---

/**
 * Halt-rule configuration. Rolling per-round parse-failure rate (across the
 * entire experiment, NOT reset per-rep) > threshold for N consecutive rounds
 * triggers a clean halt. Designed to catch subscription rate-limit throttling
 * before it corrupts multiple reps (the Gate-2 2b 2026-04-23 failure mode).
 *
 * Pre-reg's original stopping rule (context-degradation at r25+) is a narrower
 * case of this: that rule fires at low threshold, this rule fires at higher
 * threshold (to avoid spurious halts from a single bad round) but applies
 * globally.
 */
const HALT_RULE = {
  rollingWindow: 10,
  parseFailThresholdPct: 50, // halt if >50% of agent calls in window are failing
  consecutiveRounds: 3,      // require sustained (3+ rounds), not a single spike
  minRoundsBeforeCheck: 5,   // don't check until we have enough data
};

/**
 * Pre-flight guard: refuse to start if the target output directory already
 * contains trace data. This is the single most important defense against the
 * 2026-04-25 Ahmed failure mode (multi-run trace concatenation into the same
 * file produced 274 duplicate trace tuples and corrupted the analysis).
 *
 * Operators who need to retry a slice MUST use a fresh suffix (e.g.,
 * `-attempt2`, `-attempt3`) per Addendum #2 §3 P4. There is no `--force`
 * override on this guard intentionally — every retry should land in a new
 * dir so prior attempts are preserved for audit.
 */
function guardOutputDirIsClean(expOutputDir: string): void {
  const traces = join(expOutputDir, "traces.jsonl");
  const results = join(expOutputDir, "results.json");
  if (existsSync(traces) || existsSync(results)) {
    console.error(
      `\n🛑 OUTPUT DIRECTORY ALREADY CONTAINS TRACE DATA — REFUSING TO START.\n` +
        `\n  Path: ${expOutputDir}\n` +
        `  Existing: ${existsSync(traces) ? "traces.jsonl " : ""}${existsSync(results) ? "results.json" : ""}\n` +
        `\n  This guard prevents multi-run concatenation into the same file\n` +
        `  (the 2026-04-25 contamination mode). Re-runs of the same slice MUST\n` +
        `  go to a fresh output directory per Addendum #2 §3 P4.\n` +
        `\n  Fix: change --output to a new path, e.g., add an attempt suffix:\n` +
        `       --output ${expOutputDir.replace(/\/[^/]+$/, "")}-attempt2\n`
    );
    process.exit(3);
  }
}

/**
 * Post-run integrity check: every (rep, round, agent_id) tuple must appear
 * exactly once in the trace file. Catches any failure mode that allowed
 * duplicate writes despite the pre-flight guard. Hard-fail with a non-zero
 * exit code so a CI/git-hook can refuse to accept corrupted data.
 */
function validateTraceIntegrity(tracePath: string): void {
  const fs = require("fs");
  if (!fs.existsSync(tracePath)) return;
  const lines = (fs.readFileSync(tracePath, "utf-8") as string)
    .split("\n")
    .filter((l: string) => l.trim().length > 0);
  const seen = new Set<string>();
  const dups: string[] = [];
  for (const line of lines) {
    try {
      const t = JSON.parse(line);
      const key = `${t.repetition}|${t.round}|${t.agent_id}`;
      if (seen.has(key)) dups.push(key);
      seen.add(key);
    } catch {
      // skip malformed line
    }
  }
  if (dups.length > 0) {
    console.error(
      `\n🛑 TRACE INTEGRITY VIOLATION: ${dups.length} duplicate (rep,round,agent_id) tuples in ${tracePath}\n` +
        `  First 5 duplicates: ${dups.slice(0, 5).join(", ")}\n` +
        `  Total trace lines: ${lines.length}, unique tuples: ${seen.size}\n` +
        `  Refusing to declare success. Investigate before merging.\n`
    );
    process.exit(4);
  }
  console.log(`✓ Trace integrity: ${lines.length}/${seen.size} lines/unique tuples — no duplicates.`);
}

async function runExperiment(
  config: ExperimentConfig,
  tier: InferenceLevel,
  outputDir: string,
  repStart: number,
  repCount: number | undefined
): Promise<void> {
  const expOutputDir = join(outputDir, config.id);
  guardOutputDirIsClean(expOutputDir);
  const logger = new TraceLogger(expOutputDir);

  const effectiveRepCount = repCount ?? (config.repetitions - repStart + 1);
  const repEnd = repStart + effectiveRepCount - 1;

  console.log(`\n${"=".repeat(70)}`);
  console.log(`RUNNING: ${config.id} | ${config.agentCount} agents | ${config.gameType} | ${config.rounds} rounds`);
  console.log(`Rep range: ${repStart}..${repEnd} (${effectiveRepCount} reps of ${config.repetitions} total)`);
  console.log(`Output: ${expOutputDir}`);
  console.log("=".repeat(70));

  const allRepetitions: { rounds: RoundResult[]; repetitionIndex: number }[] = [];

  // Halt-rule state: rolling parse-fail rate per completed round (experiment-wide).
  const rollingParseFailRates: number[] = [];
  let haltedEarly = false;

  for (let rep = repStart; rep <= repEnd; rep++) {
    if (haltedEarly) break;
    const repStartTime = Date.now();
    const history: RoundHistory = new Map();
    // Initialize empty history for each agent
    for (let i = 0; i < config.agentCount; i++) {
      history.set(i, []);
    }

    let previousMessages = new Map<number, string>();
    const roundResults: RoundResult[] = [];

    for (let round = 1; round <= config.rounds; round++) {
      const { result, newMessages, userPrompts } = await executeRound(
        round,
        config,
        history,
        previousMessages,
        tier
      );

      roundResults.push(result);
      logger.logRound(config, rep, result, userPrompts);

      // Update history with this round's results
      for (const agent of result.agents) {
        const agentHistory = history.get(agent.agentId) || [];
        agentHistory.push(agent.action);
        history.set(agent.agentId, agentHistory);
      }

      previousMessages = newMessages;

      // Progress output
      const parseSuccessRate = result.agents.filter(a => a.parseSuccess).length / result.agents.length;
      const cooperationRate = config.responseType === "cooperate-defect"
        ? result.agents.filter(a => a.action === "COOPERATE").length / result.agents.length
        : result.agents.filter(a => typeof a.action === "number" && a.action > 1.70).length / result.agents.length;

      process.stdout.write(
        `\r  ${config.id} | Rep ${rep}/${repEnd} | Round ${round}/${config.rounds} | ` +
        `Cooperation: ${(cooperationRate * 100).toFixed(0)}% | Parse: ${(parseSuccessRate * 100).toFixed(0)}%`
      );

      // --- Halt rule: rolling parse-fail rate across experiment ---
      const roundFailRate = (1 - parseSuccessRate) * 100;
      rollingParseFailRates.push(roundFailRate);
      if (rollingParseFailRates.length > HALT_RULE.rollingWindow) {
        rollingParseFailRates.shift();
      }
      if (rollingParseFailRates.length >= HALT_RULE.minRoundsBeforeCheck) {
        // Count trailing consecutive rounds above threshold
        let trailingConsec = 0;
        for (let i = rollingParseFailRates.length - 1; i >= 0; i--) {
          if (rollingParseFailRates[i] > HALT_RULE.parseFailThresholdPct) trailingConsec++;
          else break;
        }
        if (trailingConsec >= HALT_RULE.consecutiveRounds) {
          const windowMean =
            rollingParseFailRates.reduce((a, b) => a + b, 0) / rollingParseFailRates.length;
          console.error(
            `\n\n🛑 HALT RULE TRIGGERED at Rep ${rep} Round ${round}\n` +
              `   Rolling ${rollingParseFailRates.length}-round parse-fail rate: ${windowMean.toFixed(1)}%\n` +
              `   Consecutive rounds above ${HALT_RULE.parseFailThresholdPct}% threshold: ${trailingConsec}\n` +
              `   Likely cause: sustained rate-limit throttle or auth failure.\n` +
              `   Writing partial results and exiting. Rerun the failed rep range once capacity recovers.\n`
          );
          haltedEarly = true;
          break; // exit round loop
        }
      }
    }

    const repDuration = ((Date.now() - repStartTime) / 1000).toFixed(1);
    console.log(`  [${repDuration}s]`);

    allRepetitions.push({ rounds: roundResults, repetitionIndex: rep });
    // Persist summary after each completed rep (protects against process kill mid-run)
    logger.writeSummary(expOutputDir, config, allRepetitions);

    if (haltedEarly) break;
  }

  // Final summary write
  logger.writeSummary(expOutputDir, config, allRepetitions);

  // Post-run integrity check (catches any duplicate-write failure mode that
  // somehow slipped past the pre-flight guard).
  validateTraceIntegrity(join(expOutputDir, "traces.jsonl"));

  if (haltedEarly) {
    console.log(`\nHALTED EARLY: ${config.id} — partial results at ${expOutputDir}/results.json (${allRepetitions.length} complete reps written)`);
    process.exit(2);
  }
  console.log(`\nComplete: ${config.id} — results at ${expOutputDir}/results.json`);
}

// --- Main ---
async function main() {
  const { specPaths, tier, outputDir, dryRun, repsOverride, repStart, repCount } = parseArgs();

  console.log(`ColludeBench Multi-Agent Runner`);
  console.log(`  Specs:    ${specPaths.length} experiment(s)`);
  console.log(`  Tier:     ${tier}`);
  console.log(`  Mode:     ${dryRun ? "DRY RUN" : "LIVE"}`);
  if (repsOverride) console.log(`  Reps:     ${repsOverride} (override)`);
  if (repStart !== 1 || repCount !== undefined)
    console.log(`  Rep range: start=${repStart}${repCount !== undefined ? `, count=${repCount}` : ""}`);
  if (!dryRun) console.log(`  Output:   ${outputDir}`);

  for (const specPath of specPaths) {
    const config = parseSpecFile(specPath);
    if (repsOverride) config.repetitions = repsOverride;

    if (dryRun) {
      runDryMode(config);
    } else {
      await runExperiment(config, tier, outputDir, repStart, repCount);
    }
  }

  if (!dryRun) {
    console.log(`\nAll experiments complete. Results in ${outputDir}/`);
  }
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
