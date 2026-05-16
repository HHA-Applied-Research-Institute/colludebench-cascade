# OSF Stage 2b Addendum #5 — CoT Cross-Agent Reference Exploratory Subanalysis

**Pre-committed:** 2026-05-03 (RFC 3161 stamp pending — see `osf-stage2b-addendum-2026-05-03.md.tsr` after stamp).
**Scope:** Exploratory text-based subanalysis on the locked Stage 2b traces (n_rep = 15 + n_rep = 30 dataset already analyzed and reported in the preprint v0). No new data collection. No re-run of the primary analysis pipeline.
**Authors:** Hass Dhia, Haidar Hadi, Ahmed Dhia.
**Motivation:** §5.2 (Discussion) of the preprint asserts an "in-context cross-sectional signal" mechanism — that with n=5 agents the per-round price vector contains substantially more information than at n=2, and the LLM's natural-language reading of that vector functions as an equilibrium-selection cue. The mechanism is asserted in one sentence with no Stage 2b empirical anchor. This addendum locks an exploratory regex-based count of cross-agent references in chain-of-thought (CoT) traces at GATE-5 vs GATE-2, with a symmetric decision rule that publishably resolves the assertion either way.

**Schema validation note (2026-05-03 pre-stamp revision):** The v1 draft of this addendum referenced `pilot/traces.jsonl` and a `condition` field. Inspection of the canonical Stage 2b traces (no records modified) before stamp revealed the actual file paths (two condition-specific files, see §C) and the actual schema (`experiment_id` carries the condition label; `reasoning` carries the chain-of-thought text). The v1 regex was also too narrow to match the empirical Haiku CoT pattern observed in two sample records (one per condition) — the LLM frequently references "Agent N" without using the literal string "pric" within the same token window. This pre-stamp v2 widens the regex to a ±5-word window between agent reference and any price-relevant token (price / pric / 1.x / cooperation / margin / undercut / profit). The widening is itself pre-committed before the run; the addendum text below is what is RFC 3161 stamped.

---

## §A — Pre-committed regex specifications

Two cross-agent reference categories are counted independently per agent-round CoT segment. Both are pre-committed before any analyzer run.

### A.1 — Literal cross-agent reference (named agent within ±5 words of a price-relevant token)

Matches an explicit reference to another agent (named or generic) followed within ±5 words by a price-relevant token. Captures both `Agent 0 has stabilized around 1.63-1.71` and `competitor's price is 1.69`.

```regex
LITERAL_AGENT_TOKEN: /\b(competitors?|agent\s+\d+|other\s+(agent|player|firm|seller)|peer|opposing\s+(agent|player|firm))\b/gi
PRICE_NEARBY_TOKEN:  /\b(pric|cost|profit|margin|undercut|cooperation|cooperat|monopol|nash|equilibri|\d+\.\d{1,4})\b/gi
WINDOW: ±5 whitespace-separated tokens between a LITERAL_AGENT_TOKEN match and a PRICE_NEARBY_TOKEN match (inclusive of either order).
```

A LITERAL match is counted when one LITERAL_AGENT_TOKEN match has at least one PRICE_NEARBY_TOKEN match within ±5 tokens of it (excluding tokens that are themselves part of the agent reference). One match per (agent reference, price nearby token) pair.

### A.2 — Co-referent cross-agent reference (pronoun/determinative within ±5 words of a price-relevant token)

Matches indirect references where the LLM equilibrium-selects on the price vector via pronoun/determinative co-reference rather than naming a specific agent.

```regex
COREF_TOKEN: /\b(their|the\s+other(s|\s+\w+)?|the\s+(higher|lower|opposing|matched|competing)|across\s+the\s+market|the\s+market(?:\s+(is|has|appears|seems|reached|stabilized))?|the\s+others)\b/gi
PRICE_NEARBY_TOKEN: same as §A.1
WINDOW: ±5 tokens between COREF_TOKEN match and PRICE_NEARBY_TOKEN match.
```

A COREF match is counted under the same window rule as A.1.

### A.3 — Self-exclusion

References to the agent's own prices/strategies are NOT counted. Two filters apply, evaluated in order:

1. **Sentence-prefix filter:** if the sentence containing the candidate match begins with `I `, `My `, `My `, `We `, `Our `, `I'll`, `I'd`, `I will`, `I'm`, `I am`, `Myself`, drop the match.
2. **Token-window filter:** if any of `my`, `mine`, `myself`, `we`, `our`, `ours` appears within ±3 tokens of the candidate LITERAL_AGENT_TOKEN or COREF_TOKEN match, drop the match.

Sentence boundaries are detected by `[.!?\n]+` followed by a capital letter or paragraph break. Conservative — the cost of a false-exclude is one missed cross-agent reference; the cost of a false-include is contamination of the cross-agent count by self-reference.

### A.4 — Per-other-agent normalization

The raw count from A.1 + A.2 trivially favors GATE-5 (4 other agents to reference) over GATE-2 (1 other agent). The decision rule (§B) is computed on the **per-other-agent** normalized rate: for each agent-round CoT segment, the per-other-agent rate is `(literal_count + coref_count) / n_other_agents`, where `n_other_agents = 4` at GATE-5 and `n_other_agents = 1` at GATE-2. This isolates the per-peer signal density from the trivial agent-count effect.

---

## §B — Pre-committed decision rule

Per condition (GATE-5, GATE-2), compute:
1. Per-CoT-round literal cross-agent reference count (§A.1)
2. Per-CoT-round co-referent cross-agent reference count (§A.2)
3. Per-CoT-round per-other-agent normalized rate (§A.4)
4. Per-condition mean of (1), (2), (3) across all agent-rounds in the locked dataset
5. 95% bootstrap CI on each per-condition mean (B = 10,000 resamples, fixed seed = 42)

### B.1 — Per-other-agent normalized rate decision (PRIMARY)

| Outcome | §5.2 redline action |
|---------|----------------------|
| GATE-5 95% CI disjoint from GATE-2 95% CI **and** GATE-5 mean > GATE-2 mean | DESCRIPTIVE SUPPORT for §5.2 reading (a). The "in-context cross-sectional signal" sentence retains current "functions as an equilibrium-selection cue" framing; §5.2.1 reports the per-other-agent rates and decision. |
| 95% CIs overlap | NO PRIMARY DISCRIMINATION. §5.2 reading (a) softens to "candidate mechanism among several"; §5.2.1 reports the null primary result. |
| GATE-5 95% CI disjoint **but** GATE-5 mean < GATE-2 mean | REVERSED — surfaces against §5.2 reading (a); §5.2.1 reports the reversal and §5.2 acknowledges the data point. |

### B.2 — Raw count decisions (SECONDARY, both channels reported regardless of B.1)

The literal-channel raw count and co-referent-channel raw count are both reported in §5.2.1 verbatim from the analyzer JSON, regardless of B.1 outcome, for transparency. They are not used to alter the §5.2 wording — only B.1's per-other-agent rate triggers wording changes.

### B.3 — Combined verdict for §5.2 redline

- B.1 SUPPORT (per-other-agent rate disjoint, GATE-5 > GATE-2) → reading (a) supported, no §5.2 wording change; §5.2.1 reports the rates
- B.1 NULL → §5.2 softens "functions as an equilibrium-selection cue" → "is a candidate mechanism among several"; §5.2.1 reports the null
- B.1 REVERSAL → §5.2 adds an explicit acknowledgment ("the per-other-agent CoT-reference rate at $n=5$ is below the rate at $n=2$, against reading (a)"); §5.2.1 reports the reversal verbatim

---

## §C — Implementation and provenance

- Analyzer: `pilot/analyze-cot-cross-references.ts` (TypeScript, Bun runtime)
- Inputs (the canonical Stage 2b dataset, RFC 3161 stamped via prior addenda, untouched since stamp):
  - GATE-5 traces: `pilot/results/stage2b-gate-2026-04-15/EXP-GATE-5-2b/traces.jsonl` (30 reps × 5 agents × 50 rounds = 7500 records)
  - GATE-2 traces: `pilot/results/stage2b-gate-merged-2026-04-25/EXP-GATE-2-2b/traces.jsonl` (15 reps × 2 agents × 50 rounds = 1500 records)
- Schema fields used:
  - `experiment_id` → condition mapping: `EXP-GATE-5-2b` → `GATE-5`; `EXP-GATE-2-2b` → `GATE-2`
  - `reasoning` → chain-of-thought text (the field this analysis parses)
  - `parse_success` filter: only records with `parse_success === true` are included
- Output: `pilot/results/cot-cross-references-2026-05-03.json` (per-condition raw counts, per-other-agent rates, bootstrap CIs, decision-rule outcome)
- The analyzer reads `reasoning` per record, applies the §A regex pipeline + self-exclusion + ±5-token window + §A.4 normalization, computes per-condition statistics per §B, and emits the decision-rule outcome verbatim per §B.3.
- Independent SciPy verification: `pilot/verify-cot-cross-references.py` (deferred to post-run; not blocking §5.2.1 if §B.1 outcome is unambiguous).

---

## §D — Provenance and stamp

- Pre-commit timestamp: 2026-05-03
- RFC 3161 stamp: pending — `osf-stage2b-addendum-2026-05-03.md.tsr` to be generated by `pilot/admin/stamp-preregistration.ts` BEFORE the analyzer runs
- Analyzer execution: must occur AFTER the stamp
- §5.2.1 preprint addition: must occur AFTER the analyzer run and report the §B.1 outcome verbatim
