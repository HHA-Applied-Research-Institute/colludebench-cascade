#!/usr/bin/env bun
/**
 * Unit tests for Phase-1 runner hardening (2026-04-24).
 * Run with: bun test pilot/runner/__tests__/runner.test.ts
 *
 * Covers:
 *   1. Rate-limit signature regex matches expected error strings
 *   2. Short vs long backoff arrays are ordered correctly
 *   3. merge-traces rejects overlapping rep indices
 *   4. merge-traces accepts disjoint rep indices
 *   5. Halt rule config is conservative enough to avoid single-round spikes
 */

import { describe, test, expect } from "bun:test";
import { __internals } from "../round-executor";
import { writeFileSync, mkdirSync, rmSync, existsSync, readFileSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

describe("rate-limit signature detection", () => {
  const sigs = __internals.RATE_LIMIT_SIGNATURES;

  test("matches 'rate limit'", () => {
    expect(sigs.test("rate limit exceeded")).toBe(true);
    expect(sigs.test("Rate Limit Exceeded")).toBe(true);
    expect(sigs.test("rate-limit")).toBe(true);
    expect(sigs.test("rate_limit")).toBe(true);
  });

  test("matches HTTP 429", () => {
    expect(sigs.test("HTTP 429 Too Many Requests")).toBe(true);
    expect(sigs.test("status: 429")).toBe(true);
  });

  test("matches quota keywords", () => {
    expect(sigs.test("quota exceeded")).toBe(true);
    expect(sigs.test("usage quota reached")).toBe(true);
  });

  test("matches retry-after header", () => {
    expect(sigs.test("retry-after: 60")).toBe(true);
    expect(sigs.test("retry after 5 minutes")).toBe(true);
  });

  test("matches throttling language", () => {
    expect(sigs.test("throttling engaged")).toBe(true);
    expect(sigs.test("throttled")).toBe(true);
  });

  test("does NOT match benign errors", () => {
    expect(sigs.test("connection timeout")).toBe(false);
    expect(sigs.test("network error")).toBe(false);
    expect(sigs.test("invalid json")).toBe(false);
    // Regression: make sure we don't have a catch-all
    expect(sigs.test("random gibberish text")).toBe(false);
  });
});

describe("backoff policy", () => {
  test("short backoff is strictly shorter than long backoff", () => {
    const short = __internals.SHORT_BACKOFF_MS;
    const long = __internals.LONG_BACKOFF_MS;
    for (let i = 0; i < Math.min(short.length, long.length); i++) {
      expect(long[i]).toBeGreaterThan(short[i]);
    }
  });

  test("long backoff is monotonically increasing", () => {
    const long = __internals.LONG_BACKOFF_MS;
    for (let i = 1; i < long.length; i++) {
      expect(long[i]).toBeGreaterThan(long[i - 1]);
    }
  });

  test("long backoff covers at least 30 minutes of total wait", () => {
    const total = __internals.LONG_BACKOFF_MS.reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThan(30 * 60 * 1000);
  });

  test("short backoff stays under 1 minute total", () => {
    const total = __internals.SHORT_BACKOFF_MS.reduce((a, b) => a + b, 0);
    expect(total).toBeLessThan(60 * 1000);
  });

  test("max attempts is 5 (matches pre-reg expectation)", () => {
    expect(__internals.MAX_ATTEMPTS).toBe(5);
  });
});

describe("merge-traces", () => {
  const TMP = "/tmp/merge-traces-test";
  const EXP_ID = "EXP-TEST";
  const REPO = ".";

  function setupSource(dir: string, reps: number[]): void {
    const expDir = join(TMP, dir, EXP_ID);
    mkdirSync(expDir, { recursive: true });
    const lines: string[] = [];
    for (const rep of reps) {
      for (let round = 1; round <= 3; round++) {
        for (const agentId of [0, 1]) {
          lines.push(
            JSON.stringify({
              experiment_id: EXP_ID,
              repetition: rep,
              round,
              agent_id: agentId,
              parse_success: true,
              parsed_action: 1.5,
              latency_ms: 1000,
              is_defector: false,
              system_prompt: "test",
              user_prompt: "test",
              raw_response: "1.5",
              reasoning: "",
              visible_agents: [],
              timestamp: "2026-04-24T00:00:00Z",
            })
          );
        }
      }
    }
    writeFileSync(join(expDir, "traces.jsonl"), lines.join("\n") + "\n");
    const resultsJson = {
      experiment_id: EXP_ID,
      config: { agentCount: 2, rounds: 3, repetitions: Math.max(...reps), gameType: "pricing" },
      repetitions: reps.map((r) => ({ repetitionIndex: r, rounds: [] })),
    };
    writeFileSync(join(expDir, "results.json"), JSON.stringify(resultsJson, null, 2));
  }

  test("rejects overlapping reps (hard exit)", () => {
    if (existsSync(TMP)) rmSync(TMP, { recursive: true });
    setupSource("sourceA", [1, 2, 3]);
    setupSource("sourceB", [3, 4, 5]); // REP 3 overlaps
    let caught = false;
    try {
      execSync(
        `bun ${REPO}/pilot/merge-traces.ts --out ${TMP}/merged --experiment ${EXP_ID} ${TMP}/sourceA/${EXP_ID} ${TMP}/sourceB/${EXP_ID}`,
        { stdio: "pipe" }
      );
    } catch (e) {
      caught = true;
    }
    expect(caught).toBe(true); // expect non-zero exit
    rmSync(TMP, { recursive: true });
  });

  test("accepts disjoint reps and produces merged output", () => {
    if (existsSync(TMP)) rmSync(TMP, { recursive: true });
    setupSource("hass", [1, 2, 3, 4, 5]);
    setupSource("haedar", [6, 7, 8, 9, 10]);
    setupSource("ahmed", [11, 12, 13, 14, 15]);

    execSync(
      `bun ${REPO}/pilot/merge-traces.ts --out ${TMP}/merged --experiment ${EXP_ID} ${TMP}/hass/${EXP_ID} ${TMP}/haedar/${EXP_ID} ${TMP}/ahmed/${EXP_ID}`,
      { stdio: "pipe" }
    );

    const mergedPath = join(TMP, "merged", EXP_ID, "traces.jsonl");
    expect(existsSync(mergedPath)).toBe(true);
    const lines = readFileSync(mergedPath, "utf-8").split("\n").filter((l) => l.trim().length > 0);
    expect(lines.length).toBe(15 * 3 * 2); // 15 reps × 3 rounds × 2 agents = 90

    const reps = new Set(lines.map((l) => JSON.parse(l).repetition));
    expect(reps.size).toBe(15);
    for (let r = 1; r <= 15; r++) expect(reps.has(r)).toBe(true);

    rmSync(TMP, { recursive: true });
  });

  test("rejects mismatched experiment_id", () => {
    if (existsSync(TMP)) rmSync(TMP, { recursive: true });
    setupSource("sourceA", [1]);
    // Rewrite sourceA traces with different experiment_id
    const pathA = join(TMP, "sourceA", EXP_ID, "traces.jsonl");
    const lines = readFileSync(pathA, "utf-8").split("\n").filter((l) => l.trim().length > 0);
    const munged = lines.map((l) => {
      const obj = JSON.parse(l);
      obj.experiment_id = "EXP-OTHER";
      return JSON.stringify(obj);
    });
    writeFileSync(pathA, munged.join("\n") + "\n");

    let caught = false;
    try {
      execSync(
        `bun ${REPO}/pilot/merge-traces.ts --out ${TMP}/merged --experiment ${EXP_ID} ${TMP}/sourceA/${EXP_ID}`,
        { stdio: "pipe" }
      );
    } catch (e) {
      caught = true;
    }
    expect(caught).toBe(true);
    rmSync(TMP, { recursive: true });
  });
});

describe("idiot-proof guards (added 2026-04-25 after Ahmed contamination event)", () => {
  const TMP = "/tmp/runner-guard-test";
  const REPO = ".";
  const SPEC = "colludebench-cascade/experiments/GATE/EXP-GATE-2-2b.md";

  function setup(): string {
    if (existsSync(TMP)) rmSync(TMP, { recursive: true });
    mkdirSync(TMP, { recursive: true });
    return TMP;
  }

  test("runner refuses to start when output dir contains existing traces.jsonl", () => {
    const dir = setup();
    const expDir = join(dir, "EXP-GATE-2-2b");
    mkdirSync(expDir, { recursive: true });
    writeFileSync(
      join(expDir, "traces.jsonl"),
      JSON.stringify({ experiment_id: "stale", repetition: 1, round: 1, agent_id: 0 }) + "\n"
    );

    let exitCode = 0;
    let output = "";
    try {
      output = execSync(
        `cd ${REPO} && bun run colludebench-cascade/runner/index.ts --spec ${SPEC} --tier fast --rep-start 1 --rep-count 1 --output ${dir} 2>&1`,
        { encoding: "utf-8" }
      );
    } catch (e: unknown) {
      exitCode = (e as { status: number }).status ?? 1;
      output = ((e as { stdout?: Buffer }).stdout ?? Buffer.from("")).toString();
    }
    expect(exitCode).toBe(3);
    expect(output).toContain("OUTPUT DIRECTORY ALREADY CONTAINS TRACE DATA");
    expect(output).toContain("attempt2");
    rmSync(TMP, { recursive: true });
  });

  test("runner refuses to start when output dir contains existing results.json", () => {
    const dir = setup();
    const expDir = join(dir, "EXP-GATE-2-2b");
    mkdirSync(expDir, { recursive: true });
    writeFileSync(join(expDir, "results.json"), "{}");

    let exitCode = 0;
    try {
      execSync(
        `cd ${REPO} && bun run colludebench-cascade/runner/index.ts --spec ${SPEC} --tier fast --rep-start 1 --rep-count 1 --output ${dir} 2>&1`,
        { encoding: "utf-8" }
      );
    } catch (e: unknown) {
      exitCode = (e as { status: number }).status ?? 1;
    }
    expect(exitCode).toBe(3);
    rmSync(TMP, { recursive: true });
  });

  test("runner accepts a fresh empty output dir", () => {
    const dir = setup();
    // Don't pre-populate — empty dir should be fine; we use --dry-run so no
    // actual inference is invoked but the guard still runs because we wired
    // it in runExperiment, not main. Use a real spec that dry-runs cleanly.
    // (Dry-run skips runExperiment entirely, so this test just verifies the
    // CLI parsing of --output to a fresh dir works.)
    const output = execSync(
      `cd ${REPO} && bun run colludebench-cascade/runner/index.ts --spec ${SPEC} --dry-run --output ${dir} 2>&1`,
      { encoding: "utf-8" }
    );
    expect(output).toContain("DRY RUN: EXP-GATE-2-2b");
    rmSync(TMP, { recursive: true });
  });

  test("merge-traces rejects within-source duplicate (rep,round,agent_id) tuples", () => {
    const dir = setup();
    const sourceDir = join(dir, "contaminated", "EXP-GATE-2-2b");
    mkdirSync(sourceDir, { recursive: true });
    // Write the same (rep, round, agent_id) tuple twice with different timestamps —
    // mimics Ahmed's multi-run concatenation pattern.
    const dupTrace = (ts: string) =>
      JSON.stringify({
        experiment_id: "EXP-CONTAM",
        repetition: 11,
        round: 1,
        agent_id: 0,
        parse_success: true,
        parsed_action: 1.5,
        latency_ms: 1000,
        is_defector: false,
        system_prompt: "test",
        user_prompt: "test",
        raw_response: "1.5",
        reasoning: "",
        visible_agents: [],
        timestamp: ts,
      });
    writeFileSync(
      join(sourceDir, "traces.jsonl"),
      [dupTrace("2026-04-25T01:00:00Z"), dupTrace("2026-04-25T02:00:00Z")].join("\n") + "\n"
    );
    writeFileSync(
      join(sourceDir, "results.json"),
      JSON.stringify({
        experiment_id: "EXP-CONTAM",
        config: { agentCount: 2, rounds: 1, repetitions: 11, gameType: "pricing" },
        repetitions: [],
      })
    );

    let caught = false;
    let output = "";
    try {
      output = execSync(
        `bun ${REPO}/pilot/merge-traces.ts --out ${dir}/merged --experiment EXP-CONTAM ${sourceDir} 2>&1`,
        { encoding: "utf-8" }
      );
    } catch (e: unknown) {
      caught = true;
      output = ((e as { stdout?: Buffer }).stdout ?? Buffer.from("")).toString();
    }
    expect(caught).toBe(true);
    expect(output.toLowerCase()).toContain("duplicate");
    rmSync(TMP, { recursive: true });
  });
});

describe("dry-run integration (runner still parses spec cleanly after patches)", () => {
  test("existing Gate-2 2b spec still dry-runs clean", () => {
    const output = execSync(
      `cd . && bun run colludebench-cascade/runner/index.ts --spec colludebench-cascade/experiments/GATE/EXP-GATE-2-2b.md --dry-run 2>&1`,
      { encoding: "utf-8" }
    );
    expect(output).toContain("DRY RUN: EXP-GATE-2-2b");
    expect(output).toContain("Agents:        2");
    expect(output).toContain("Rounds:        50");
    expect(output).toContain("Repetitions:   15");
  });

  test("rep-range CLI flag accepted", () => {
    const output = execSync(
      `cd . && bun run colludebench-cascade/runner/index.ts --spec colludebench-cascade/experiments/GATE/EXP-GATE-2-2b.md --dry-run --rep-start 6 --rep-count 5 2>&1`,
      { encoding: "utf-8" }
    );
    // Dry-run doesn't actually use rep-range (it only prints round-1), but the flag must parse
    expect(output).toContain("Rep range: start=6, count=5");
  });
});
