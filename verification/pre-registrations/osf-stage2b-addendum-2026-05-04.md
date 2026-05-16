# OSF Stage 2b Addendum #6 — Talk-Volume-Controlled Residualization of the Addendum #5 Per-Other-Agent Rate

**Pre-committed:** 2026-05-04 (RFC 3161 stamp pending — see `osf-stage2b-addendum-2026-05-04.md.tsr` after stamp).
**Scope:** Exploratory text-based residualization analysis on the locked Stage 2b traces. No new data collection. No re-run of the primary analysis pipeline. No modification of Addendum #5 or its analyzer.
**Authors:** Hass Dhia, Haidar Hadi, Ahmed Dhia.
**Motivation:** The Addendum #5 §5.2.1 result (per-other-agent CoT cross-reference rate at GATE-2 is approximately 5.8x the GATE-5 rate) admits an alternative explanation: GATE-2 may simply produce more total CoT text per round (longer deliberation per round when there is only one peer to model), so the per-other-agent reference count would scale mechanically with talk volume regardless of any per-peer attention-density mechanism. The §5.2.1 measurement-validity caveat acknowledges this but does not test it; the §5.2.1 closing paragraph defers the test to Stage 4 channel (iii). On internal adversarial review (iter-4, 2026-05-04), this deferral was flagged as indefensible: the test requires only the existing Stage 2b traces (already stamped via prior addenda, untouched since), is a single-regression operation, and is the central discriminator between the §5.2.1 mechanistic reading (a') and the talk-volume-artifact null. This addendum locks the residualization in advance of running it.

---

## §A — Pre-committed analysis specification

### A.1 — Talk-volume measure

For each agent-round CoT segment (the `reasoning` field of each trace record), the talk-volume measure is the total word count: `words = reasoning.trim().split(/\s+/).filter(Boolean).length`. This is an unambiguous, deterministic measure that does not require tokenization beyond whitespace splitting.

### A.2 — Per-other-agent rate (Addendum #5 metric, copied)

The per-other-agent rate per record is identical to the Addendum #5 metric: `rate = (literal_count + coref_count) / n_other_agents`, with `n_other_agents = 4` at GATE-5 and `n_other_agents = 1` at GATE-2. The literal and co-referent counts use the same regex specifications as Addendum #5 §A.1 / §A.2 / §A.3 / §A.4 — byte-identical regex constants are copied into the new analyzer at `pilot/analyze-cot-residualized.ts` with a comment naming the source. No regex modification.

### A.3 — Pooled OLS regression

A single ordinary-least-squares regression is fit across both conditions pooled: `rate ~ a + b * words + epsilon`. The coefficients `a` (intercept), `b` (slope), and `R^2` are reported. The pooled fit is intentional: it estimates the marginal effect of one additional word of CoT on the per-other-agent rate, treating both conditions as draws from the same talk-volume-rate relationship. A condition-specific fit would absorb the very effect the residualization is designed to test.

### A.4 — Residual computation and per-condition aggregation

For each record: `residual = rate - (a + b * words)`. Per-condition mean residual + 95% bootstrap CI (B = 10,000 resamples, fixed seed = 42, mulberry32 RNG matching Addendum #5's analyzer). A secondary metric `rate_per_1000_words = (rate / words) * 1000` is also computed per-condition with bootstrap CI; this is reported alongside the residualized rate as a sensitivity check (the rate-per-1000-words has a different functional dependence on talk volume than the OLS residual).

---

## §B — Pre-committed decision rule

Per condition (GATE-5, GATE-2), compute mean residual + 95% bootstrap CI per §A.4, then apply this rule:

| Outcome | §5.2.1 redline action |
|---------|------------------------|
| Residualized 95% CIs disjoint **and** GATE-2 mean residual > GATE-5 mean residual | REVERSAL SURVIVES RESIDUALIZATION. §5.2.1 reading (a') strengthened: per-peer attention density is denser at $n = 2$ even controlling for talk volume. §5.2.1 reports the residualized rates verbatim; §5.2 acknowledgment paragraph is unchanged. |
| Residualized 95% CIs overlap | RESIDUALIZED NULL. §5.2.1 acknowledges the gap collapses under talk-volume control; §5.2.1 reports the null verbatim and softens the §5.2.1 reading (a') framing to "talk-volume-confounded — Stage 4 cross-model replication required to discriminate." |
| Residualized 95% CIs disjoint **but** GATE-5 mean residual > GATE-2 mean residual | RESIDUALIZED REVERSAL OF REVERSAL. Talk volume drives the apparent §5.2.1 reversal; refined reading (a') is NOT supported by Stage 2b data. §5.2.1 reports this verbatim and rewrites the reading (a') framing to "refuted at Stage 2b under talk-volume control; the §5.2 mechanism question reverts to reading (b) horizon-and-sample-size effects + Stage 3 + Stage 4." |

The secondary rate-per-1000-words metric is reported in §5.2.1 alongside the residualized result for sensitivity, but does NOT trigger §5.2.1 wording changes — only the §B primary residual decision rule is load-bearing.

---

## §C — Implementation and provenance

- Analyzer: `pilot/analyze-cot-residualized.ts` (TypeScript, Bun runtime; ~250 lines)
- Inputs (the canonical Stage 2b dataset, RFC 3161 stamped via prior addenda, untouched since stamp):
  - GATE-5 traces: `pilot/results/stage2b-gate-2026-04-15/EXP-GATE-5-2b/traces.jsonl`
  - GATE-2 traces: `pilot/results/stage2b-gate-merged-2026-04-25/EXP-GATE-2-2b/traces.jsonl`
- Schema: `experiment_id` -> condition mapping (`EXP-GATE-5-2b` -> `GATE-5`; `EXP-GATE-2-2b` -> `GATE-2`); `reasoning` -> chain-of-thought text; `parse_success === false` records filtered out
- Output: `pilot/results/cot-residualized-2026-05-04.json`
- The analyzer reads each record's `reasoning`, computes the per-other-agent rate per Addendum #5 §A regex pipeline (byte-identical), computes total word count, fits the pooled OLS, computes residuals, bootstraps the per-condition residual CIs, applies §B decision rule, and emits the verdict verbatim.
- Independent SciPy verification: deferred (same as Addendum #5 §C). The pooled OLS + bootstrap pattern is straightforward enough that the deferred SciPy verifier will be a single-day implementation when the SR-M registry promotion is justified.

---

## §D — Provenance and stamp

- Pre-commit timestamp: 2026-05-04
- RFC 3161 stamp: pending — `osf-stage2b-addendum-2026-05-04.md.tsr` to be generated by `pilot/admin/stamp-preregistration.ts` BEFORE the analyzer runs
- Analyzer execution: must occur AFTER the stamp
- §5.2.1 update: must occur AFTER the analyzer run and report the §B outcome verbatim

---

## §E — Relationship to Addendum #5

This addendum extends but does NOT modify Addendum #5. The Addendum #5 stamp at `pilot/admin/osf-stage2b-addendum-2026-05-03.md.tsr` and analyzer at `pilot/analyze-cot-cross-references.ts` remain the canonical record of the §5.2.1 primary result (per-other-agent rate REVERSAL of §5.2 reading (a) initial formulation). This Addendum #6 adds a sensitivity test that adversarial review at iter-4 demanded; the §5.2.1 update will report the Addendum #6 outcome adjacent to (not replacing) the Addendum #5 result.
