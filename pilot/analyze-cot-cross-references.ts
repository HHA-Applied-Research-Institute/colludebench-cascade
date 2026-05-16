#!/usr/bin/env bun
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const LITERAL_AGENT_TOKEN = /\b(competitors?|agent\s+\d+|other\s+(agent|player|firm|seller)|peer|opposing\s+(agent|player|firm))\b/gi;
const COREF_TOKEN = /\b(their|the\s+others?(?:\s+\w+)?|the\s+(higher|lower|opposing|matched|competing)|across\s+the\s+market|the\s+market(?:\s+(is|has|appears|seems|reached|stabilized))?)\b/gi;
const PRICE_NEARBY_TOKEN = /\b(pric|cost|profit|margin|undercut|cooperation|cooperat|monopol|nash|equilibri|\d+\.\d{1,4})\b/gi;
const SELF_TOKEN = /\b(my|mine|myself|we|our|ours)\b/gi;
const SELF_PREFIX_PATTERN = /^\s*(i\b|i'd\b|i'll\b|i'm\b|i\s+(am|will|would|won't|can't|cannot|priced|set|select|choose|pick|decide|adjust|raise|lower|maintain|hold)\b|my\b|we\b|our\b|myself\b)/i;
const WINDOW = 5;

interface TraceRecord {
  experiment_id?: string;
  repetition?: number;
  round?: number;
  agent_id?: number;
  reasoning?: string;
  parse_success?: boolean;
  [k: string]: unknown;
}

interface PerCondition {
  n_cot_rounds: number;
  literal_raw: { mean: number; ci95: [number, number] };
  coref_raw: { mean: number; ci95: [number, number] };
  per_other_agent_rate: { mean: number; ci95: [number, number] };
  n_other_agents: number;
}

interface AnalysisOutput {
  addendum: "5";
  stamp_date: string;
  bootstrap_B: number;
  bootstrap_seed: number;
  inputs: { GATE_5: string; GATE_2: string };
  conditions: Record<string, PerCondition>;
  decision_rule: {
    primary_per_other_agent: string;
    secondary_literal_raw: string;
    secondary_coref_raw: string;
    combined: string;
  };
  generated_at: string;
}

function tokenize(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

function findMatchTokenIndices(tokens: string[], regex: RegExp): number[] {
  const joined = tokens
    .map((t, i) => ({ t, i, start: tokens.slice(0, i).join(" ").length + (i > 0 ? 1 : 0), end: 0 }))
    .map((o) => ({ ...o, end: o.start + o.t.length }));

  const fullText = tokens.join(" ");
  const indices: number[] = [];
  for (const m of fullText.matchAll(regex)) {
    const start = m.index ?? 0;
    const tokenIdx = joined.findIndex((o) => o.start <= start && start < o.end);
    if (tokenIdx >= 0) indices.push(tokenIdx);
  }
  return indices;
}

function sentenceContainingTokenIdx(tokens: string[], tokenIdx: number): string {
  let startIdx = 0;
  for (let i = tokenIdx; i >= 0; i--) {
    if (/[.!?\n]$/.test(tokens[i])) {
      startIdx = i + 1;
      break;
    }
  }
  let endIdx = tokens.length;
  for (let i = tokenIdx; i < tokens.length; i++) {
    if (/[.!?\n]$/.test(tokens[i])) {
      endIdx = i + 1;
      break;
    }
  }
  return tokens.slice(startIdx, endIdx).join(" ");
}

function isSelfReference(tokens: string[], tokenIdx: number): boolean {
  const sentence = sentenceContainingTokenIdx(tokens, tokenIdx);
  if (SELF_PREFIX_PATTERN.test(sentence)) return true;
  const lo = Math.max(0, tokenIdx - 3);
  const hi = Math.min(tokens.length, tokenIdx + 4);
  const window = tokens.slice(lo, hi).join(" ");
  return SELF_TOKEN.test(window);
}

function countMatches(text: string, agentRegex: RegExp): number {
  if (!text) return 0;
  const tokens = tokenize(text);
  const agentIndices = findMatchTokenIndices(tokens, agentRegex);
  const priceIndices = findMatchTokenIndices(tokens, PRICE_NEARBY_TOKEN);
  if (agentIndices.length === 0 || priceIndices.length === 0) return 0;
  const priceSet = new Set(priceIndices);
  let count = 0;
  for (const ai of agentIndices) {
    if (isSelfReference(tokens, ai)) continue;
    let nearby = false;
    for (let off = -WINDOW; off <= WINDOW; off++) {
      if (off === 0) continue;
      if (priceSet.has(ai + off)) {
        nearby = true;
        break;
      }
    }
    if (nearby) count += 1;
  }
  return count;
}

function loadTraces(path: string): TraceRecord[] {
  return readFileSync(path, "utf-8")
    .split("\n")
    .filter((l) => l.trim().length > 0)
    .map((line) => JSON.parse(line) as TraceRecord);
}

function mulberry32(seed: number) {
  return function (): number {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function bootstrapCI(values: number[], B: number, seed: number, alpha = 0.05): [number, number] {
  if (values.length === 0) return [NaN, NaN];
  const rng = mulberry32(seed);
  const n = values.length;
  const means: number[] = new Array(B);
  for (let b = 0; b < B; b++) {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += values[Math.floor(rng() * n)];
    means[b] = sum / n;
  }
  means.sort((a, b) => a - b);
  return [means[Math.floor((alpha / 2) * B)], means[Math.floor((1 - alpha / 2) * B)]];
}

function disjoint(a: [number, number], b: [number, number]): boolean {
  return a[1] < b[0] || b[1] < a[0];
}

function classify(g5: PerCondition, g2: PerCondition, channel: "literal_raw" | "coref_raw" | "per_other_agent_rate"): string {
  const a = g5[channel].ci95;
  const b = g2[channel].ci95;
  const dis = disjoint(a, b);
  if (dis && g5[channel].mean > g2[channel].mean) return "DISJOINT_GATE5_HIGHER";
  if (dis && g5[channel].mean < g2[channel].mean) return "DISJOINT_GATE2_HIGHER_REVERSED";
  return "OVERLAP_NULL";
}

function combinedVerdict(primary: string): string {
  if (primary === "DISJOINT_GATE5_HIGHER") {
    return "B.1 SUPPORT — §5.2 reading (a) supported on per-other-agent rate; no §5.2 wording change; §5.2.1 reports the rates";
  }
  if (primary === "DISJOINT_GATE2_HIGHER_REVERSED") {
    return "B.1 REVERSAL — §5.2 adds explicit acknowledgment that per-other-agent CoT-reference rate at n=5 is BELOW rate at n=2, against reading (a); §5.2.1 reports the reversal";
  }
  return "B.1 NULL — §5.2 softens 'functions as an equilibrium-selection cue' to 'is a candidate mechanism among several'; §5.2.1 reports the null";
}

function main() {
  const gate5Path = process.argv[2] ?? "pilot/results/stage2b-gate-2026-04-15/EXP-GATE-5-2b/traces.jsonl";
  const gate2Path = process.argv[3] ?? "pilot/results/stage2b-gate-merged-2026-04-25/EXP-GATE-2-2b/traces.jsonl";
  const outPath = process.argv[4] ?? "pilot/results/cot-cross-references-2026-05-03.json";
  const B = 10000;
  const seed = 42;

  const all: { cond: "GATE-5" | "GATE-2"; rec: TraceRecord }[] = [];
  for (const r of loadTraces(gate5Path)) all.push({ cond: "GATE-5", rec: r });
  for (const r of loadTraces(gate2Path)) all.push({ cond: "GATE-2", rec: r });

  const literalByCond: Record<string, number[]> = { "GATE-5": [], "GATE-2": [] };
  const corefByCond: Record<string, number[]> = { "GATE-5": [], "GATE-2": [] };
  const perOtherByCond: Record<string, number[]> = { "GATE-5": [], "GATE-2": [] };
  const nOther: Record<string, number> = { "GATE-5": 4, "GATE-2": 1 };

  for (const { cond, rec } of all) {
    if (rec.parse_success === false) continue;
    const cot = rec.reasoning ?? "";
    if (typeof cot !== "string" || cot.length === 0) continue;
    const lit = countMatches(cot, LITERAL_AGENT_TOKEN);
    const cor = countMatches(cot, COREF_TOKEN);
    literalByCond[cond].push(lit);
    corefByCond[cond].push(cor);
    perOtherByCond[cond].push((lit + cor) / nOther[cond]);
  }

  const out: AnalysisOutput = {
    addendum: "5",
    stamp_date: "2026-05-03",
    bootstrap_B: B,
    bootstrap_seed: seed,
    inputs: { GATE_5: gate5Path, GATE_2: gate2Path },
    conditions: {},
    decision_rule: { primary_per_other_agent: "", secondary_literal_raw: "", secondary_coref_raw: "", combined: "" },
    generated_at: new Date().toISOString(),
  };

  for (const cond of ["GATE-5", "GATE-2"] as const) {
    const lit = literalByCond[cond];
    const cor = corefByCond[cond];
    const per = perOtherByCond[cond];
    out.conditions[cond] = {
      n_cot_rounds: lit.length,
      literal_raw: {
        mean: lit.reduce((a, b) => a + b, 0) / Math.max(lit.length, 1),
        ci95: bootstrapCI(lit, B, seed),
      },
      coref_raw: {
        mean: cor.reduce((a, b) => a + b, 0) / Math.max(cor.length, 1),
        ci95: bootstrapCI(cor, B, seed + 1),
      },
      per_other_agent_rate: {
        mean: per.reduce((a, b) => a + b, 0) / Math.max(per.length, 1),
        ci95: bootstrapCI(per, B, seed + 2),
      },
      n_other_agents: nOther[cond],
    };
  }

  const g5 = out.conditions["GATE-5"];
  const g2 = out.conditions["GATE-2"];
  out.decision_rule.primary_per_other_agent = classify(g5, g2, "per_other_agent_rate");
  out.decision_rule.secondary_literal_raw = classify(g5, g2, "literal_raw");
  out.decision_rule.secondary_coref_raw = classify(g5, g2, "coref_raw");
  out.decision_rule.combined = combinedVerdict(out.decision_rule.primary_per_other_agent);

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n");
  console.log(JSON.stringify(out, null, 2));
}

main();
