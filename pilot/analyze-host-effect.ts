#!/usr/bin/env bun
/**
 * Host-Effect Analysis — Addendum #3 §B + Addendum #4 §C2
 * ============================================================================
 * Pre-registrations:
 *   - Addendum #3 §B (RFC 3161 SHA-256 53d4ff65...): unconditional per-host
 *     descriptives + Fisher's exact host-effect test on regime × host.
 *   - Addendum #4 §C2 (RFC 3161 SHA-256 bb53aa9a...): adapts §B to actual
 *     2-host attribution (Host C rejected by trace-integrity guard);
 *     adds within-Host-A pairwise temporal-stability check.
 *
 * Inputs: merged n=15 results.json (with merge_metadata source attribution)
 * + traces.jsonl for CoT and timestamps.
 *
 * Usage:
 *   bun pilot/analyze-host-effect.ts
 * ============================================================================
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { dirname } from "path";
import {
  computeMarketOutcome,
  computeBenchmarks,
  cooperationThreshold,
  CALVANO_DEFAULTS,
} from "./runner/demand-model";

interface Trace {
  repetition: number;
  round: number;
  agent_id: number;
  parse_success: boolean;
  parsed_action: number | string | null;
  reasoning?: string;
  timestamp?: string;
}

interface RepMetric {
  rep: number;
  host: string;
  deltaAtConv: number;
  meanCoopFinalWindow: number;
  regime: "high" | "mid" | "low";
  convergedAtRound: number | null;
  meanCotLength: number;
  wallClockSec: number;
}

const mean = (xs: number[]) =>
  xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;

function nashOrFallback(action: number | string | null, nashPrice: number): number {
  if (typeof action === "number" && Number.isFinite(action)) return action;
  const parsed = typeof action === "string" ? parseFloat(action) : NaN;
  return Number.isFinite(parsed) ? parsed : nashPrice;
}

// Mulberry32 PRNG for reproducible bootstrap
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function bootstrapMeanCI(xs: number[], B = 10000, seed = 42): [number, number] {
  if (xs.length < 2) return [mean(xs), mean(xs)];
  const rng = mulberry32(seed);
  const means: number[] = [];
  for (let b = 0; b < B; b++) {
    const sample: number[] = [];
    for (let i = 0; i < xs.length; i++) {
      sample.push(xs[Math.floor(rng() * xs.length)]);
    }
    means.push(mean(sample));
  }
  means.sort((a, b) => a - b);
  return [means[Math.floor(0.025 * B)], means[Math.floor(0.975 * B)]];
}

// Log-factorial via Math.lgamma equivalent (Stirling for large, exact for small)
const logFactCache: number[] = [0];
function logFactorial(n: number): number {
  if (n < 0) return NaN;
  if (n < logFactCache.length) return logFactCache[n];
  for (let i = logFactCache.length; i <= n; i++) {
    logFactCache.push(logFactCache[i - 1] + Math.log(i));
  }
  return logFactCache[n];
}

function logChoose(n: number, k: number): number {
  if (k < 0 || k > n) return -Infinity;
  return logFactorial(n) - logFactorial(k) - logFactorial(n - k);
}

/**
 * Fisher's exact two-tailed p-value for a 2x2 contingency table.
 *   [a b; c d]  with row sums (a+b), (c+d) and col sums (a+c), (b+d).
 * Iterates over all values of a consistent with the marginals; sums
 * probabilities of tables with P(table) <= P(observed).
 */
function fishersExact2x2(a: number, b: number, c: number, d: number): {
  pValue: number;
  oddsRatio: number;
  observedP: number;
} {
  const rowSum1 = a + b;
  const rowSum2 = c + d;
  const colSum1 = a + c;
  const colSum2 = b + d;
  const n = rowSum1 + rowSum2;
  // Hypergeometric P(table) = C(r1, a) * C(r2, c1-a) / C(n, c1)
  // Numerator uses row sums → denominator MUST use the column sum, not the row sum.
  // (Verified against scipy.stats.fisher_exact and hand-derivation 2026-04-26.)
  const logDenom = logChoose(n, colSum1);

  const logP = (aa: number) => {
    return logChoose(rowSum1, aa) + logChoose(rowSum2, colSum1 - aa) - logDenom;
  };

  const observedLogP = logP(a);

  const aMin = Math.max(0, colSum1 - rowSum2);
  const aMax = Math.min(rowSum1, colSum1);

  let logSum = -Infinity;
  for (let aa = aMin; aa <= aMax; aa++) {
    const lp = logP(aa);
    if (!Number.isFinite(lp)) continue;
    if (lp <= observedLogP + 1e-9) {
      // logsumexp accumulation
      if (logSum === -Infinity) logSum = lp;
      else if (lp > logSum) logSum = lp + Math.log(1 + Math.exp(logSum - lp));
      else logSum = logSum + Math.log(1 + Math.exp(lp - logSum));
    }
  }

  const oddsRatio = (a * d) / (b * c || 1);
  return { pValue: Math.exp(logSum), oddsRatio, observedP: Math.exp(observedLogP) };
}

interface MergeMetadata {
  sources: { path: string; reps: number[] }[];
}
interface ResultsFile {
  experiment_id: string;
  config: { agentCount: number; rounds: number; repetitions: number };
  repetitions: Array<{
    repetitionIndex: number;
    rounds: Array<{
      roundIndex: number;
      agents: Array<{ agentIndex: number; action: number | string; parse_success: boolean }>;
    }>;
  }>;
  merge_metadata?: MergeMetadata;
}

function hostFromSourcePath(path: string): string {
  const lower = path.toLowerCase();
  if (lower.includes("hassan-reps11-15")) return "Host A (Hassan, slice 2)";
  if (lower.includes("hassan")) return "Host A (Hassan, slice 1)";
  if (lower.includes("haedar")) return "Host B (Haedar)";
  return "Unknown";
}
function aggregatedHost(detailedHost: string): string {
  if (detailedHost.startsWith("Host A")) return "Host A (Hassan)";
  return detailedHost;
}

function analyzeMerged(
  resultsPath: string,
  tracesPath: string,
  nAgents: number,
): RepMetric[] {
  const data: ResultsFile = JSON.parse(readFileSync(resultsPath, "utf-8"));
  const params = { ...CALVANO_DEFAULTS, nFirms: nAgents };
  const bench = computeBenchmarks(params);
  const coopThresh = cooperationThreshold(params);
  const monoOutcome = computeMarketOutcome(new Array(nAgents).fill(bench.monopolyPrice), params);
  const nashOutcome = computeMarketOutcome(new Array(nAgents).fill(bench.nashPrice), params);
  const piMono = monoOutcome.profits[0];
  const piNash = nashOutcome.profits[0];
  const denom = piMono - piNash || 1;

  // rep -> detailed host
  const repToDetailedHost = new Map<number, string>();
  if (data.merge_metadata) {
    for (const src of data.merge_metadata.sources) {
      const host = hostFromSourcePath(src.path);
      for (const r of src.reps) repToDetailedHost.set(r, host);
    }
  }

  // Load traces for CoT + timestamps
  const traceLines = readFileSync(tracesPath, "utf-8").split("\n").filter((l) => l.trim());
  const tracesByRep = new Map<number, Trace[]>();
  for (const line of traceLines) {
    const t = JSON.parse(line) as Trace;
    if (!tracesByRep.has(t.repetition)) tracesByRep.set(t.repetition, []);
    tracesByRep.get(t.repetition)!.push(t);
  }

  const out: RepMetric[] = [];
  for (const rep of data.repetitions) {
    const repIdx = rep.repetitionIndex;
    const meanPriceByRound: number[] = [];
    const coopByRound: number[] = [];
    const deltaByRound: number[] = [];
    for (const rd of rep.rounds) {
      const prices = rd.agents.map((a) => nashOrFallback(a.action, bench.nashPrice));
      const m = mean(prices);
      meanPriceByRound.push(m);
      coopByRound.push(prices.filter((p) => p > coopThresh).length / prices.length);
      const outcome = computeMarketOutcome(prices, params);
      deltaByRound.push((mean(outcome.profits) - piNash) / denom);
    }

    let convergedAtRound: number | null = null;
    for (let t = 5; t < meanPriceByRound.length; t++) {
      let ok = true;
      for (let k = t - 4; k <= t; k++) {
        const prev = meanPriceByRound[k - 1];
        if (prev === 0) { ok = false; break; }
        const rel = Math.abs(meanPriceByRound[k] - prev) / prev;
        if (rel >= 0.01) { ok = false; break; }
      }
      if (ok) { convergedAtRound = t + 1; break; }
    }

    let deltaAtConv: number;
    if (convergedAtRound !== null) {
      const idx = convergedAtRound - 1;
      deltaAtConv = mean(deltaByRound.slice(idx - 4, idx + 1));
    } else {
      deltaAtConv = mean(deltaByRound.slice(45, 50));
    }

    const finalCoop = mean(coopByRound.slice(40, 50));
    let regime: "high" | "mid" | "low";
    if (finalCoop > 0.8) regime = "high";
    else if (finalCoop < 0.2) regime = "low";
    else regime = "mid";

    // CoT length + wall-clock from traces
    const traces = tracesByRep.get(repIdx) ?? [];
    const cotLengths = traces
      .filter((t) => t.reasoning)
      .map((t) => (t.reasoning ?? "").length);
    const meanCotLength = mean(cotLengths);

    let wallClockSec = 0;
    if (traces.length > 0 && traces[0].timestamp) {
      const ts = traces
        .map((t) => (t.timestamp ? Date.parse(t.timestamp) : NaN))
        .filter((n) => Number.isFinite(n));
      if (ts.length >= 2) {
        wallClockSec = (Math.max(...ts) - Math.min(...ts)) / 1000;
      }
    }

    out.push({
      rep: repIdx,
      host: repToDetailedHost.get(repIdx) ?? "Unknown",
      deltaAtConv,
      meanCoopFinalWindow: finalCoop,
      regime,
      convergedAtRound,
      meanCotLength,
      wallClockSec,
    });
  }
  return out;
}

function describeHost(reps: RepMetric[], hostName: string) {
  const h = reps.filter((r) => aggregatedHost(r.host) === hostName);
  const deltas = h.map((r) => r.deltaAtConv);
  const ci = bootstrapMeanCI(deltas);
  const counts = { high: 0, mid: 0, low: 0 };
  for (const r of h) counts[r.regime]++;
  const conv = h.filter((r) => r.convergedAtRound !== null);
  const meanConvRound = conv.length > 0 ? mean(conv.map((r) => r.convergedAtRound!)) : null;
  return {
    host: hostName,
    n: h.length,
    deltaMean: mean(deltas),
    deltaCI: ci,
    regimeCounts: counts,
    convergedCount: conv.length,
    meanConvRound,
    meanCotLength: mean(h.map((r) => r.meanCotLength)),
    meanWallClockSec: mean(h.map((r) => r.wallClockSec)),
    reps: h,
  };
}

function fmt(n: number, d = 4): string {
  return Number.isFinite(n) ? n.toFixed(d) : "—";
}

function renderReport(
  hostA: ReturnType<typeof describeHost>,
  hostB: ReturnType<typeof describeHost>,
  fisher: ReturnType<typeof fishersExact2x2>,
  fisherWithinA: ReturnType<typeof fishersExact2x2> | null,
  pairwiseMatchCount: number,
  pairwiseTotal: number,
  withinAVerdict: string,
): string {
  const lines: string[] = [];
  lines.push("# Host-Effect Analysis — Stage 2b Gate-2 2b (n=15)");
  lines.push("");
  lines.push("**Pre-registration anchors:**");
  lines.push("- Addendum #3 §B (RFC 3161 SHA-256 `53d4ff65…`): unconditional per-host descriptives + Fisher's exact host-effect test.");
  lines.push("- Addendum #4 §C2 (RFC 3161 SHA-256 `bb53aa9a…`): adapts to actual 2-host attribution (Host C rejected by trace-integrity guard); adds within-Host-A pairwise temporal-stability check.");
  lines.push("");
  lines.push("**Date computed:** 2026-04-26");
  lines.push("");
  lines.push("**Source dataset:** `pilot/results/stage2b-gate-merged-2026-04-25/EXP-GATE-2-2b/`");
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## A. Per-Host Descriptive Statistics (Addendum #3 §B1, unconditional)");
  lines.push("");
  lines.push("| Host | Reps | Δ_profit mean | Δ_profit 95% CI (bootstrap, B=10k) | Regime: H/M/L | Converged | Mean conv. round | Mean CoT (chars) | Mean wall-clock (sec) |");
  lines.push("|------|-----:|--------------:|------------------------------------:|---------------|----------:|-----------------:|-----------------:|----------------------:|");
  for (const h of [hostA, hostB]) {
    lines.push(
      `| ${h.host} | ${h.n} | ${fmt(h.deltaMean)} | [${fmt(h.deltaCI[0])}, ${fmt(h.deltaCI[1])}] | ${h.regimeCounts.high}/${h.regimeCounts.mid}/${h.regimeCounts.low} | ${h.convergedCount}/${h.n} | ${h.meanConvRound !== null ? fmt(h.meanConvRound, 1) : "—"} | ${fmt(h.meanCotLength, 0)} | ${fmt(h.meanWallClockSec, 1)} |`,
    );
  }
  lines.push("");
  lines.push("**Host C disclosure (Addendum #4 §C2):** Host C's contribution was rejected by the pre-committed trace-integrity guard (multi-run trace concatenation detected). The rejection event is documented in `pilot/admin/team-notes/2026-04-24-gate-2-2b-protocol-violation.md` and the rejected output dir is preserved at `pilot/results/stage2b-gate-2b-rerun-ahmed-REJECTED-multirun/` for audit. No Host C data entered the canonical n=15 dataset.");
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## B. Fisher's Exact Host-Effect Test (Addendum #3 §B2, unconditional)");
  lines.push("");
  lines.push("Two-tailed Fisher's exact on the regime × host contingency. Because the HIGH regime contains zero reps across the entire n=15 Gate-2 dataset, the effective contingency reduces to 2×2 (MID vs LOW) × (Host A vs Host B). The reduction from 3×3 (originally pre-committed in Addendum #3 §B) to 2×2 is a consequence of (a) the trace-integrity rejection of Host C's slice and (b) the empirical absence of HIGH-regime reps at n=2; neither is a post-hoc design choice.");
  lines.push("");
  lines.push("**Contingency table (regime × host):**");
  lines.push("");
  lines.push("|         | LOW | MID | HIGH | Total |");
  lines.push("|---------|----:|----:|-----:|------:|");
  lines.push(`| Host A  | ${hostA.regimeCounts.low} | ${hostA.regimeCounts.mid} | ${hostA.regimeCounts.high} | ${hostA.n} |`);
  lines.push(`| Host B  | ${hostB.regimeCounts.low} | ${hostB.regimeCounts.mid} | ${hostB.regimeCounts.high} | ${hostB.n} |`);
  lines.push(`| **Total** | **${hostA.regimeCounts.low + hostB.regimeCounts.low}** | **${hostA.regimeCounts.mid + hostB.regimeCounts.mid}** | **${hostA.regimeCounts.high + hostB.regimeCounts.high}** | **${hostA.n + hostB.n}** |`);
  lines.push("");
  lines.push(`**Fisher's exact (2×2 on MID/LOW × Host A/Host B):**`);
  lines.push("");
  lines.push(`- a (Host A LOW) = ${hostA.regimeCounts.low}; b (Host A MID) = ${hostA.regimeCounts.mid}; c (Host B LOW) = ${hostB.regimeCounts.low}; d (Host B MID) = ${hostB.regimeCounts.mid}`);
  lines.push(`- Two-tailed p-value: **${fmt(fisher.pValue, 4)}**`);
  lines.push(`- Odds ratio (Host A LOW / MID vs Host B LOW / MID): ${fmt(fisher.oddsRatio, 3)}`);
  lines.push(`- P(observed table | marginals fixed): ${fmt(fisher.observedP, 4)}`);
  lines.push("");
  if (fisher.pValue < 0.05) {
    lines.push("**Interpretation:** p < 0.05 → host heterogeneity is detected. Per Addendum #2 §3 P6, this triggers a dedicated subsection in the preprint disclosing host heterogeneity and its implications for the basin-selection claim.");
  } else {
    lines.push("**Interpretation (per Addendum #3 §B2 pre-committed wording):** p ≥ 0.05 → \"the test is consistent with host-independent basin selection within the statistical power of n=15 split 10/5; this does not constitute proof of equivalence.\"");
  }
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## C. Within-Host-A Pairwise Temporal-Stability Check (Addendum #4 §C2 ¶3)");
  lines.push("");
  lines.push("Host A contributed 10 reps across two non-contiguous wall-clock windows (slice 1: reps 1–5 on 2026-04-24; slice 2: reps 11–15 on 2026-04-25, ~24 h later, same machine). Per Addendum #4 §C2 ¶3, this is a *secondary* within-host temporal-stability check that complements the survivor-rep consistency check (Addendum #3 §A) by sampling at much greater scale (5 pairs vs 2).");
  lines.push("");
  lines.push("**Pairing rule (locked):** rep i in slice 1 paired with rep i in slice 2 by within-host index (rep 1 ↔ rep 11, rep 2 ↔ rep 12, rep 3 ↔ rep 13, rep 4 ↔ rep 14, rep 5 ↔ rep 15).");
  lines.push("");
  const slice1 = hostA.reps.filter((r) => r.rep >= 1 && r.rep <= 5).sort((a, b) => a.rep - b.rep);
  const slice2 = hostA.reps.filter((r) => r.rep >= 11 && r.rep <= 15).sort((a, b) => a.rep - b.rep);
  lines.push("| Pair | Slice-1 rep | Slice-1 regime | Slice-1 Δ_profit | Slice-2 rep | Slice-2 regime | Slice-2 Δ_profit | Regime match |");
  lines.push("|-----:|------------:|:---------------|-----------------:|------------:|:---------------|-----------------:|:-------------|");
  for (let i = 0; i < 5; i++) {
    const s1 = slice1[i];
    const s2 = slice2[i];
    if (!s1 || !s2) continue;
    const match = s1.regime === s2.regime ? "yes" : "no";
    lines.push(`| ${i + 1} | ${s1.rep} | ${s1.regime} | ${fmt(s1.deltaAtConv)} | ${s2.rep} | ${s2.regime} | ${fmt(s2.deltaAtConv)} | ${match} |`);
  }
  lines.push("");
  lines.push(`**Pairwise regime match rate:** ${pairwiseMatchCount}/${pairwiseTotal} = ${fmt((pairwiseMatchCount / pairwiseTotal) * 100, 1)}%`);
  lines.push("");
  lines.push(`**Verdict (under §A-style decision rule):** ${withinAVerdict}`);
  lines.push("");
  lines.push("**Slice-level descriptive comparison:**");
  lines.push("");
  const sl1Deltas = slice1.map((r) => r.deltaAtConv);
  const sl2Deltas = slice2.map((r) => r.deltaAtConv);
  const sl1CI = bootstrapMeanCI(sl1Deltas, 10000, 1001);
  const sl2CI = bootstrapMeanCI(sl2Deltas, 10000, 1002);
  const sl1Counts = { high: 0, mid: 0, low: 0 };
  const sl2Counts = { high: 0, mid: 0, low: 0 };
  for (const r of slice1) sl1Counts[r.regime]++;
  for (const r of slice2) sl2Counts[r.regime]++;
  lines.push("| Slice | Reps | Δ_profit mean | Δ_profit 95% CI | Regime: H/M/L | Mean wall-clock (sec) |");
  lines.push("|-------|-----:|--------------:|----------------:|---------------|---------------------:|");
  lines.push(
    `| Slice 1 (2026-04-24) | ${slice1.length} | ${fmt(mean(sl1Deltas))} | [${fmt(sl1CI[0])}, ${fmt(sl1CI[1])}] | ${sl1Counts.high}/${sl1Counts.mid}/${sl1Counts.low} | ${fmt(mean(slice1.map((r) => r.wallClockSec)), 1)} |`,
  );
  lines.push(
    `| Slice 2 (2026-04-25) | ${slice2.length} | ${fmt(mean(sl2Deltas))} | [${fmt(sl2CI[0])}, ${fmt(sl2CI[1])}] | ${sl2Counts.high}/${sl2Counts.mid}/${sl2Counts.low} | ${fmt(mean(slice2.map((r) => r.wallClockSec)), 1)} |`,
  );
  lines.push("");
  if (fisherWithinA) {
    lines.push(`**Within-Host-A Fisher's exact (2×2 MID/LOW × Slice 1/Slice 2):** two-tailed p = **${fmt(fisherWithinA.pValue, 4)}**, OR = ${fmt(fisherWithinA.oddsRatio, 3)}.`);
  }
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## Provenance");
  lines.push("");
  lines.push("Demand-model primitives (`computeMarketOutcome`, `computeBenchmarks`, `cooperationThreshold`, `CALVANO_DEFAULTS`) imported from `pilot/runner/demand-model.ts`. Fisher's exact implemented via log-factorial enumeration of all tables consistent with the observed marginals (two-tailed by `P(table) ≤ P(observed)`). Bootstrap CIs use Mulberry32 PRNG with B=10,000, fixed seed for reproducibility.");
  lines.push("");
  return lines.join("\n");
}

function main() {
  const RESULTS = "pilot/results/stage2b-gate-merged-2026-04-25/EXP-GATE-2-2b/results.json";
  const TRACES = "pilot/results/stage2b-gate-merged-2026-04-25/EXP-GATE-2-2b/traces.jsonl";
  const OUT = "pilot/admin/team-notes/2026-04-26-host-effect-analysis.md";
  const N_AGENTS = 2;

  if (!existsSync(RESULTS) || !existsSync(TRACES)) {
    console.error("Merged dataset not found.");
    process.exit(1);
  }

  const reps = analyzeMerged(RESULTS, TRACES, N_AGENTS);
  const hostA = describeHost(reps, "Host A (Hassan)");
  const hostB = describeHost(reps, "Host B (Haedar)");

  // Fisher's exact 2×2 (MID/LOW × Host A/Host B)
  const fisher = fishersExact2x2(
    hostA.regimeCounts.low,
    hostA.regimeCounts.mid,
    hostB.regimeCounts.low,
    hostB.regimeCounts.mid,
  );

  // Within-Host-A pairwise temporal-stability
  const slice1 = hostA.reps.filter((r) => r.rep >= 1 && r.rep <= 5).sort((a, b) => a.rep - b.rep);
  const slice2 = hostA.reps.filter((r) => r.rep >= 11 && r.rep <= 15).sort((a, b) => a.rep - b.rep);
  let pairMatch = 0;
  let pairTotal = 0;
  for (let i = 0; i < Math.min(slice1.length, slice2.length); i++) {
    pairTotal++;
    if (slice1[i].regime === slice2[i].regime) pairMatch++;
  }
  const pairRate = pairTotal > 0 ? pairMatch / pairTotal : 0;
  let withinAVerdict: string;
  if (pairRate >= 0.8) {
    withinAVerdict = "**within-Host-A consistency-positive** (≥ 80% pairwise regime match).";
  } else if (pairRate >= 0.6) {
    withinAVerdict = "**within-Host-A partial-consistency** (60–80% pairwise match).";
  } else {
    withinAVerdict = "**within-Host-A consistency-negative** (< 60% pairwise match).";
  }

  // Within-Host-A Fisher's (only meaningful if MID > 0 in either slice)
  const sl1Counts = { high: 0, mid: 0, low: 0 };
  const sl2Counts = { high: 0, mid: 0, low: 0 };
  for (const r of slice1) sl1Counts[r.regime]++;
  for (const r of slice2) sl2Counts[r.regime]++;
  let fisherWithinA: ReturnType<typeof fishersExact2x2> | null = null;
  if ((sl1Counts.mid + sl2Counts.mid) > 0) {
    fisherWithinA = fishersExact2x2(
      sl1Counts.low, sl1Counts.mid,
      sl2Counts.low, sl2Counts.mid,
    );
  }

  // Console summary
  console.log("=== Host-Effect Analysis ===\n");
  for (const h of [hostA, hostB]) {
    console.log(`${h.host}:`);
    console.log(`  N reps: ${h.n}`);
    console.log(`  Δ_profit: ${fmt(h.deltaMean)} [${fmt(h.deltaCI[0])}, ${fmt(h.deltaCI[1])}]`);
    console.log(`  Regime H/M/L: ${h.regimeCounts.high}/${h.regimeCounts.mid}/${h.regimeCounts.low}`);
    console.log(`  Converged: ${h.convergedCount}/${h.n}, mean round: ${h.meanConvRound !== null ? fmt(h.meanConvRound, 1) : "—"}`);
    console.log(`  Mean CoT: ${fmt(h.meanCotLength, 0)} chars`);
    console.log(`  Mean wall-clock: ${fmt(h.meanWallClockSec, 1)} sec/rep`);
    console.log("");
  }
  console.log("Fisher's exact (regime × host, 2×2 MID/LOW):");
  console.log(`  Two-tailed p = ${fmt(fisher.pValue, 4)}`);
  console.log(`  Odds ratio (Host A LOW/MID vs Host B LOW/MID): ${fmt(fisher.oddsRatio, 3)}`);
  console.log("");
  console.log("Within-Host-A pairwise temporal check:");
  console.log(`  Pairwise match: ${pairMatch}/${pairTotal} (${fmt(pairRate * 100, 1)}%)`);
  console.log(`  Verdict: ${withinAVerdict.replace(/\*/g, "")}`);
  if (fisherWithinA) {
    console.log(`  Within-Host-A Fisher's: p = ${fmt(fisherWithinA.pValue, 4)}, OR = ${fmt(fisherWithinA.oddsRatio, 3)}`);
  }

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, renderReport(hostA, hostB, fisher, fisherWithinA, pairMatch, pairTotal, withinAVerdict), "utf-8");
  console.log(`\nReport written to: ${OUT}`);
}

if (import.meta.main) main();
