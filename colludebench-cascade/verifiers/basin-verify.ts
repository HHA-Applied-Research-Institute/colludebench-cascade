#!/usr/bin/env bun
/**
 * ColludeBench — Stage 2b Exploratory Basin Verifier (Haedar, hr:)
 * ============================================================================
 *
 * EXPLORATORY — NOT pre-registered. The pre-registered analyzer is
 * pilot/analyze-gate-2b.ts (RFC 3161 locked, sha256 49fc2b27...).
 *
 * Purpose: independent verification of Hass's 2026-04-20 email claim that
 * the 30 Stage 2b reps cluster into FOUR basins (not two) when grouped on
 * raw steady-state (r41-50) Δ_profit rather than the binary cooperation
 * threshold used by the pre-registered regime classifier.
 *
 * Hass explicitly did NOT share his verifier code (/tmp/verify_stage2b.py,
 * /tmp/basin_analysis.py on his machine) so that this verifier is genuinely
 * independent. We use the SAME benchmarks and SAME Δ_profit formula as the
 * locked analyzer to avoid any methodological drift.
 *
 * Outputs:
 *   1. Per-rep mean Δ_profit over rounds 41-50 + mean price over r41-50
 *   2. Sorted Δ_profit with gaps between consecutive entries
 *   3. K-means WSS for k=1..5 (20 random restarts) + drop ratios
 *   4. Cluster assignment at k=4 with n, mean Δ_profit, mean price per cluster
 *   5. Cross-check of cluster membership vs. Hass's claimed rep IDs
 *
 * Usage:
 *   bun pilot/verify/haedar-basin-verify.ts \
 *     --in pilot/results/stage2b-gate-2026-04-15/EXP-GATE-5-2b/results.json
 * ============================================================================
 */

import { readFileSync } from "fs";
import {
  computeMarketOutcome,
  computeBenchmarks,
  CALVANO_DEFAULTS,
  type DemandModelParams,
} from "../runner/demand-model";

// ---------- shapes ----------
interface AgentResp {
  agent_id: number;
  action: number | string;
  parse_success: boolean;
  is_defector: boolean;
}
interface Round { round: number; agents: AgentResp[] }
interface Repetition { repetitionIndex: number; rounds: Round[] }
interface ResultsFile {
  experiment_id: string;
  config: { agentCount: number; rounds: number; repetitions: number };
  repetitions: Repetition[];
}

// ---------- helpers ----------
const mean = (xs: number[]) =>
  xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;

function nashOrFallback(a: number | string, nashPrice: number): number {
  if (typeof a === "number" && Number.isFinite(a)) return a;
  const p = typeof a === "string" ? parseFloat(a) : NaN;
  return Number.isFinite(p) ? p : nashPrice;
}

// ---------- 1D k-means (Lloyd's with random restarts) ----------
interface KMeansResult {
  k: number;
  centroids: number[];
  assignments: number[];
  wss: number;
}

function kmeans1D(xs: number[], k: number, restarts = 20): KMeansResult {
  let best: KMeansResult | null = null;
  const n = xs.length;
  for (let r = 0; r < restarts; r++) {
    // k-means++ style init: first point random, next points weighted by distance^2
    const initIdx: number[] = [];
    initIdx.push(Math.floor(Math.random() * n));
    while (initIdx.length < k) {
      const d2 = xs.map((x) => {
        let md = Infinity;
        for (const i of initIdx) {
          const diff = x - xs[i];
          if (diff * diff < md) md = diff * diff;
        }
        return md;
      });
      const total = d2.reduce((a, b) => a + b, 0);
      let target = Math.random() * total;
      let pick = 0;
      for (let i = 0; i < n; i++) {
        target -= d2[i];
        if (target <= 0) { pick = i; break; }
      }
      if (!initIdx.includes(pick)) initIdx.push(pick);
    }
    let centroids = initIdx.map((i) => xs[i]);
    let assignments = new Array(n).fill(0);
    for (let iter = 0; iter < 200; iter++) {
      let changed = false;
      // assign
      for (let i = 0; i < n; i++) {
        let bestC = 0; let bestD = Infinity;
        for (let c = 0; c < k; c++) {
          const d = (xs[i] - centroids[c]) ** 2;
          if (d < bestD) { bestD = d; bestC = c; }
        }
        if (assignments[i] !== bestC) { assignments[i] = bestC; changed = true; }
      }
      // update
      const sums = new Array(k).fill(0);
      const counts = new Array(k).fill(0);
      for (let i = 0; i < n; i++) {
        sums[assignments[i]] += xs[i];
        counts[assignments[i]]++;
      }
      const newC = centroids.map((c, i) => (counts[i] ? sums[i] / counts[i] : c));
      centroids = newC;
      if (!changed) break;
    }
    let wss = 0;
    for (let i = 0; i < n; i++) wss += (xs[i] - centroids[assignments[i]]) ** 2;
    if (!best || wss < best.wss) {
      best = { k, centroids: [...centroids], assignments: [...assignments], wss };
    }
  }
  return best!;
}

// ---------- main ----------
function parseArgs(): { in: string } {
  const args = process.argv.slice(2);
  let inPath = "pilot/results/stage2b-gate-2026-04-15/EXP-GATE-5-2b/results.json";
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--in") inPath = args[++i];
  }
  return { in: inPath };
}

function main() {
  const { in: inPath } = parseArgs();
  const data: ResultsFile = JSON.parse(readFileSync(inPath, "utf-8"));
  const nAgents = data.config.agentCount;
  const nRounds = data.config.rounds;
  const params: DemandModelParams = { ...CALVANO_DEFAULTS, nFirms: nAgents };
  const bench = computeBenchmarks(params);
  const piNash = bench.nashProfit;
  const piMono = bench.monopolyProfit;
  const denom = piMono - piNash || 1;

  console.log("=".repeat(78));
  console.log("Stage 2b EXPLORATORY Basin Verifier (hr: Haedar, independent of Hass)");
  console.log("=".repeat(78));
  console.log(`Input: ${inPath}`);
  console.log(`Config: nFirms=${nAgents}, rounds=${nRounds}, reps=${data.repetitions.length}`);
  console.log(`Benchmarks: Nash price=${bench.nashPrice.toFixed(4)}, Monopoly price=${bench.monopolyPrice.toFixed(4)}`);
  console.log(`            Nash profit=${piNash.toFixed(4)}, Monopoly profit=${piMono.toFixed(4)}`);
  console.log(`            Δ_profit denominator = π_Mono − π_Nash = ${denom.toFixed(4)}`);
  console.log("");

  // Per-rep: mean Δ_profit over r41-50 + mean price over r41-50
  interface RepRow {
    rep: number;
    meanDelta4150: number;
    meanPrice4150: number;
  }
  const rows: RepRow[] = [];
  for (const rep of data.repetitions) {
    const deltas: number[] = [];
    const prices: number[] = [];
    for (const rd of rep.rounds) {
      // rounds array is 1-indexed as rd.round; take rd.round ∈ [41,50]
      if (rd.round < 41 || rd.round > 50) continue;
      const p = rd.agents.map((a) => nashOrFallback(a.action, bench.nashPrice));
      const out = computeMarketOutcome(p, params);
      const piObs = mean(out.profits);
      deltas.push((piObs - piNash) / denom);
      prices.push(mean(p));
    }
    rows.push({
      rep: rep.repetitionIndex,
      meanDelta4150: mean(deltas),
      meanPrice4150: mean(prices),
    });
  }

  // ===== [1] per-rep table =====
  console.log("[1] Per-rep Δ_profit and mean price, averaged over rounds 41-50");
  console.log("-".repeat(78));
  console.log("rep | Δ_profit(r41-50) |  price(r41-50)");
  console.log("----+------------------+---------------");
  const sortedByRep = [...rows].sort((a, b) => a.rep - b.rep);
  for (const r of sortedByRep) {
    console.log(` ${String(r.rep).padStart(2)} |       ${r.meanDelta4150.toFixed(4).padStart(8)} |      ${r.meanPrice4150.toFixed(4)}`);
  }
  console.log("");

  // ===== [2] sorted with gaps =====
  const sorted = [...rows].sort((a, b) => a.meanDelta4150 - b.meanDelta4150);
  console.log("[2] Sorted Δ_profit r41-50 with gaps between consecutive entries");
  console.log("-".repeat(78));
  console.log("rank | rep |   Δ_profit   |   gap from previous");
  console.log("-----+-----+--------------+---------------------");
  for (let i = 0; i < sorted.length; i++) {
    const gap = i === 0 ? null : sorted[i].meanDelta4150 - sorted[i - 1].meanDelta4150;
    console.log(`  ${String(i + 1).padStart(2)}  |  ${String(sorted[i].rep).padStart(2)} |  ${sorted[i].meanDelta4150.toFixed(4).padStart(8)}  |  ${gap === null ? "  —   " : gap.toFixed(4).padStart(6)}`);
  }
  console.log("");
  // Top-5 gaps (largest)
  const gaps = sorted.slice(1).map((r, i) => ({
    gap: r.meanDelta4150 - sorted[i].meanDelta4150,
    after_rank: i + 1,
    after_delta: sorted[i].meanDelta4150,
    before_delta: r.meanDelta4150,
  }));
  gaps.sort((a, b) => b.gap - a.gap);
  console.log("Top-5 largest gaps (candidates for cluster boundaries):");
  for (const g of gaps.slice(0, 5)) {
    console.log(`  gap=${g.gap.toFixed(4)}  between Δ=${g.after_delta.toFixed(4)} and Δ=${g.before_delta.toFixed(4)}  (after sorted rank ${g.after_rank})`);
  }
  console.log("");

  // ===== [3] k-means for k=1..5 =====
  const xs = rows.map((r) => r.meanDelta4150);
  const kmResults: KMeansResult[] = [];
  // Deterministic seed via Math.random replacement for reproducibility not critical
  // — 20 restarts with k-means++ init is stable enough for n=30 in 1D.
  for (let k = 1; k <= 5; k++) kmResults.push(kmeans1D(xs, k, 20));
  console.log("[3] K-means WSS elbow (1D, 20 k-means++ restarts each)");
  console.log("-".repeat(78));
  console.log("  k  |    WSS     | drop vs k-1  | drop ratio");
  console.log("-----+------------+--------------+-----------");
  for (let i = 0; i < kmResults.length; i++) {
    const k = kmResults[i].k;
    const w = kmResults[i].wss;
    const dropAbs = i === 0 ? null : kmResults[i - 1].wss - w;
    const dropRel = i === 0 ? null : dropAbs! / kmResults[i - 1].wss;
    console.log(
      `  ${k}  | ${w.toFixed(4).padStart(8)} | ${dropAbs === null ? "     —    " : dropAbs.toFixed(4).padStart(10)} | ${dropRel === null ? "    —   " : (dropRel * 100).toFixed(1).padStart(5) + "%"}`,
    );
  }
  console.log("");

  // ===== [4] k=4 cluster-level summary =====
  const km4 = kmResults[3]; // k=4
  // Reorder cluster indices by centroid ascending → cluster 1..4 = Nash..Monopoly
  const order = km4.centroids
    .map((c, i) => ({ c, i }))
    .sort((a, b) => a.c - b.c)
    .map((x) => x.i);
  const orderMap: Record<number, number> = {};
  order.forEach((origIdx, newIdx) => (orderMap[origIdx] = newIdx));
  const clusterLabels = ["Nash basin", "Low supra-comp", "Mid supra-comp", "Near-monopoly"];
  console.log("[4] k=4 cluster summary (centroids sorted ascending)");
  console.log("-".repeat(78));
  console.log("cluster          | n  | mean Δ   | mean price | reps");
  console.log("-----------------+----+----------+------------+-------");
  const clusterMembers: number[][] = [[], [], [], []];
  rows.forEach((row, i) => {
    const cid = orderMap[km4.assignments[i]];
    clusterMembers[cid].push(row.rep);
  });
  for (let c = 0; c < 4; c++) {
    const members = clusterMembers[c];
    const memberRows = rows.filter((r) => members.includes(r.rep));
    const mDelta = mean(memberRows.map((r) => r.meanDelta4150));
    const mPrice = mean(memberRows.map((r) => r.meanPrice4150));
    const repsSorted = [...members].sort((a, b) => a - b).join(",");
    console.log(
      `${clusterLabels[c].padEnd(16)} | ${String(members.length).padStart(2)} | ${mDelta.toFixed(4).padStart(7)} | ${mPrice.toFixed(4).padStart(9)}  | ${repsSorted}`,
    );
  }
  console.log("");

  // ===== [5] cross-check vs Hass's claimed clusters =====
  const hass: Record<number, number[]> = {
    0: [1, 5, 11, 14, 15, 17, 30], // Nash
    1: [4, 7, 10, 13, 20, 22],       // Low-SC
    2: [2, 12, 16, 18, 19, 24, 25, 27, 28, 29], // Mid-SC
    3: [3, 6, 8, 9, 21, 23, 26],   // Monopoly
  };
  console.log("[5] Cross-check vs. Hass's claimed cluster membership");
  console.log("-".repeat(78));
  let agreeTotal = 0;
  let disagreeReps: number[] = [];
  for (let c = 0; c < 4; c++) {
    const ours = new Set(clusterMembers[c]);
    const his = new Set(hass[c]);
    const agree = [...ours].filter((r) => his.has(r)).length;
    const onlyOurs = [...ours].filter((r) => !his.has(r));
    const onlyHis = [...his].filter((r) => !ours.has(r));
    agreeTotal += agree;
    disagreeReps.push(...onlyOurs, ...onlyHis);
    console.log(
      `${clusterLabels[c].padEnd(16)} | agree ${agree}/${Math.max(ours.size, his.size)} | only-ours: [${onlyOurs.join(",") || "—"}] | only-his: [${onlyHis.join(",") || "—"}]`,
    );
  }
  console.log(`\nOverall agreement: ${agreeTotal}/30 reps in same cluster (${((100 * agreeTotal) / 30).toFixed(1)}%)`);
  console.log("");

  // ===== [6] Latency-confound probe — cluster vs temporal =====
  // Hass's email: HIGH regime reps 16% faster than LOW (54.7s vs 65.1s).
  // Two hypotheses: (a) substance — fewer alternatives to weigh in monopoly basin,
  //                 (b) temporal — HIGH reps happened to run later when servers were quieter.
  // Test: per-rep mean latency, then correlate with (i) cluster centroid, (ii) rep start time.
  const tracesPath = inPath.replace(/results\.json$/, "traces.jsonl");
  try {
    const traceText = readFileSync(tracesPath, "utf-8");
    const latencyByRep: Map<number, number[]> = new Map();
    const firstTsByRep: Map<number, number> = new Map();
    for (const line of traceText.split("\n")) {
      if (!line) continue;
      const rec = JSON.parse(line) as {
        repetition: number;
        latency_ms?: number;
        timestamp?: string;
      };
      if (typeof rec.latency_ms === "number") {
        if (!latencyByRep.has(rec.repetition)) latencyByRep.set(rec.repetition, []);
        latencyByRep.get(rec.repetition)!.push(rec.latency_ms);
      }
      if (rec.timestamp) {
        const t = Date.parse(rec.timestamp);
        if (Number.isFinite(t)) {
          const cur = firstTsByRep.get(rec.repetition);
          if (cur === undefined || t < cur) firstTsByRep.set(rec.repetition, t);
        }
      }
    }
    // Per-rep: mean latency + start timestamp
    type LatRow = { rep: number; meanLatSec: number; startMs: number; delta: number; cluster: number };
    const latRows: LatRow[] = rows.map((r) => {
      const lats = latencyByRep.get(r.rep) ?? [];
      const meanLat = mean(lats) / 1000;
      return {
        rep: r.rep,
        meanLatSec: meanLat,
        startMs: firstTsByRep.get(r.rep) ?? 0,
        delta: r.meanDelta4150,
        cluster: orderMap[km4.assignments[rows.findIndex((x) => x.rep === r.rep)]],
      };
    });
    console.log("[6] Latency-confound probe (Hass's HIGH-16%-faster claim)");
    console.log("-".repeat(78));
    // Mean latency by cluster
    console.log("Mean latency (seconds) by k=4 cluster:");
    for (let c = 0; c < 4; c++) {
      const inC = latRows.filter((r) => r.cluster === c);
      const mLat = mean(inC.map((r) => r.meanLatSec));
      console.log(`  ${clusterLabels[c].padEnd(16)} | n=${String(inC.length).padStart(2)} | mean lat = ${mLat.toFixed(1)}s`);
    }
    // Pearson correlation helper
    const pearson = (xs: number[], ys: number[]) => {
      const mx = mean(xs), my = mean(ys);
      let num = 0, dx = 0, dy = 0;
      for (let i = 0; i < xs.length; i++) {
        num += (xs[i] - mx) * (ys[i] - my);
        dx += (xs[i] - mx) ** 2;
        dy += (ys[i] - my) ** 2;
      }
      return num / Math.sqrt(dx * dy);
    };
    const corrLatDelta = pearson(latRows.map((r) => r.meanLatSec), latRows.map((r) => r.delta));
    console.log(`\nCorrelation(mean_latency, Δ_profit)  r = ${corrLatDelta.toFixed(3)}   (>0 = high basin slower; <0 = high basin faster)`);
    // Temporal: correlation of start time with Δ_profit
    const hasTs = latRows.every((r) => r.startMs > 0);
    if (hasTs) {
      const corrTsDelta = pearson(latRows.map((r) => r.startMs), latRows.map((r) => r.delta));
      const corrTsLat = pearson(latRows.map((r) => r.startMs), latRows.map((r) => r.meanLatSec));
      console.log(`Correlation(start_time, Δ_profit)    r = ${corrTsDelta.toFixed(3)}   (>0 = later reps end higher)`);
      console.log(`Correlation(start_time, latency)     r = ${corrTsLat.toFixed(3)}   (<0 = servers got faster over time)`);
      const firstStart = Math.min(...latRows.map((r) => r.startMs));
      const lastStart = Math.max(...latRows.map((r) => r.startMs));
      console.log(`\nRun span: ${((lastStart - firstStart) / 3600000).toFixed(1)} hours across ${latRows.length} reps`);
    } else {
      console.log("(timestamps missing for some reps — skipping temporal correlations)");
    }
    console.log("");
  } catch (err) {
    console.log(`[6] traces.jsonl not found or unreadable at ${tracesPath} — skipping latency probe`);
    console.log("");
  }

  console.log("=".repeat(78));
  console.log("Verification complete. Output is exploratory — pre-reg analyzer unchanged.");
  console.log("=".repeat(78));
}

main();
