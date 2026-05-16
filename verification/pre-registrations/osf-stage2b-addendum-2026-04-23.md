# ColludeBench Stage 2b — Analysis Addendum (2026-04-23)

## Study Information

**Title:** Analysis Addendum to ColludeBench Stage 2b Pre-Registration (k-Selection, Reasoning-Length Signature, Mechanism, Instrumentation)

**Authors:** Hassan Dhia, Haedar Hadi, Ahmed Dhia — H.H.A. Applied Research Institute

**Date:** 2026-04-23

**Parent pre-registration:** `pilot/admin/osf-preregistration-stage2b-draft.md` (RFC 3161 FreeTSA timestamp @ 2026-04-20 13:59:35 UTC, SHA-256 `49fc2b27…`)

**Status:** Addendum filed BEFORE observation of Gate-2 2b (n=2) results. Parent pre-registration is not modified; co-primary outcomes (Δ_profit at convergence; regime membership probability) remain locked as originally specified.

**Lock method:** This file will be stamped with RFC 3161 Trusted Timestamping (FreeTSA) via `pilot/admin/stamp-preregistration.ts` before Gate-2 2b compute is launched. Both `{file}.md` and `{file}.md.tsr` will be committed to the repository before any Gate-2 2b result is observed.

---

## Motivation

Between the parent pre-registration lock (2026-04-20) and the launch of Gate-2 2b (n=2) compute (2026-04-23), a four-lens expert panel review (`working/literature/panel-runs/2026-04-21-hassan-latency-swap.md`) surfaced five analytical refinements that materially affect how Stage 2b results will be interpreted and published. To preserve confirmatory standing of these refinements — rather than presenting them as post-hoc exploration — they are pre-registered here before the Gate-2 2b compute is launched and before any downstream analysis of either the Gate-5 2b (n=5, completed 2026-04-15) or the forthcoming Gate-2 2b (n=2) data is conducted under the refined procedures.

This addendum does not modify the parent pre-registration. All parent pre-registered outcomes remain primary and will be reported first and as specified.

---

## A. K-Selection: Bootstrap Decision Rule for Basin Count

### Motivation

The parent pre-registration specifies regime membership classification (HIGH / MID / LOW) based on fixed cooperation-rate thresholds relative to the Nash–Monopoly midpoint. This is the primary regime outcome and is retained unchanged. A secondary empirical question — how many distinct Δ_profit attractors the data supports at steady state — emerged in analysis and requires a pre-committed decision rule before interpretation.

### Procedure

1. **Data.** Final-window Δ_profit values (mean of rounds 41–50 per repetition). n=30 for Gate-5 2b; n=15 for Gate-2 2b.
2. **Resampling.** 10 bootstrap resamples. In each resample, drop 20% of repetitions at random, then re-fit k-means on the remaining Δ_profit values.
3. **Model selection per resample.** For each resample, compute k-means within-cluster sum of squares (WSS) at k ∈ {1, 2, 3, 4, 5}, and select the elbow k by (a) gap statistic (Tibshirani, Walther, Hastie 2001) as primary, and (b) Bayesian Information Criterion (BIC) under a Gaussian mixture model as secondary. Report both per resample.
4. **Recovery threshold.** The basin-count claim "k=K is supported by the data" requires that k=K be selected in **≥ 7 of 10** resamples by the gap statistic (primary). BIC agreement is reported but not required.

### Decision rule (pre-committed before observation)

- If gap-statistic selects **k=4** in ≥7/10 resamples at n=5 AND k=4 in ≥7/10 resamples at n=2: report *quadrimodal attractor structure, present at duopoly and oligopoly*. Interpret as LLM-intrinsic basin structure (subject to single-model-family caveat).
- If gap-statistic selects **k=4** in ≥7/10 resamples at n=5 AND **k=2** in ≥7/10 resamples at n=2: report *quadrimodal at oligopoly, bimodal at duopoly*. Interpret as oligopoly-size-dependent attractor count, aligned with Cao & Hu (2026) theoretical bistability at duopoly.
- If gap-statistic selects **k=2** in ≥7/10 resamples at n=5: retract quadrimodal narrative entirely and report bimodal throughout (which strengthens alignment with Cao & Hu 2026 bistability). This is a pre-registered downgrade path; the reasoning-length correlation result (Section C) survives regardless of k.
- All other configurations: report as **inconclusive** on k-selection; report the resample distribution and decline to claim a basin count. Interpretation deferred to replication.

---

## B. Quadrimodal-vs-Bimodal Interpretation at n=2

### Prior

Cao & Hu (2026, *Cao_2026_llm_collusion*) predict theoretical bistability (k=2) in LLM pricing duopolies. Young (1993, *young_1993_evolution_of_conventions*) predicts population-level equilibrium selection via stochastic stability in 2x2 coordination games. A k=2 finding at n=2 is therefore the theoretically privileged prior.

### Pre-committed interpretation

A k=4 result at n=2 would be **surprising relative to Cao & Hu 2026** and would constitute stronger evidence for an LLM-representational (not game-theoretic) origin of the quadrimodal pattern. A k=2 result at n=2 is theoretically expected and does not distinguish LLM-intrinsic vs oligopoly-size-dependent interpretation on its own; it must be combined with the n=5 result (Section A) for interpretation.

This is pre-committed to prevent post-hoc rationalization in either direction.

---

## C. Reasoning-Length as Per-Basin Signature (Exploratory → Pre-Registered)

### Motivation

Chain-of-thought reasoning-length (character count of agent reasoning text) was observed, post parent pre-registration lock, to correlate negatively with Δ_profit at the repetition level in Gate-5 2b traces (r = −0.78, n=30). The panel review identified this as a potentially publishable signature replacing a latency-based signature that is contaminated by Claude CLI subprocess overhead, subscription auth back-off, and inter-agent stagger (`pilot/runner/round-executor.ts:94-103`; see `working/literature/panel-runs/2026-04-21-hassan-latency-swap-persona-syseng.md`).

### Procedure (pre-committed)

1. **Outcome definition.** Per repetition, compute mean `len(reasoning)` across all agent-rounds in rounds 41–50 (final window).
2. **Primary correlation.** Pearson r between per-repetition mean reasoning-length and per-repetition mean Δ_profit (rounds 41–50), computed separately for n=5 and n=2.
3. **Fisher-z 95% confidence intervals** will be reported for all four correlations specified below, regardless of direction or magnitude:
   - r(reasoning-length, Δ_profit) at n=5
   - r(latency_ms, Δ_profit) at n=5 (retained for comparison, see Section E caveat)
   - r(reasoning-length, latency_ms) at n=5 (collinearity diagnostic; also VIF)
   - partial r(reasoning-length, Δ_profit | latency_ms) at n=5 (basin-fixed-effects regression)
4. **Within-basin vs between-basin decomposition.** A basin-fixed-effects regression of Δ_profit on reasoning-length, with basin label (from regime classification) as a fixed effect, will be reported. If the reasoning-length coefficient is not statistically distinguishable from zero after basin fixed effects, reasoning-length will be reported as a between-basin discriminator but not a within-basin signature.

### Decision rule (pre-committed before observation)

The reasoning-length swap is justified on **validity grounds** (construct, identifiability, reproducibility), not on numerical-correlation grounds. It is pre-committed that:

- If Fisher-z CIs for r(reasoning-length, Δ_profit) and r(latency, Δ_profit) overlap substantially at n=5, this will be reported explicitly; the reasoning-length claim will not assert it "beats" latency numerically. It will assert that reasoning-length is the payload-derived, auth-path-invariant, reproducible version of a signal that latency contaminates.
- If the partial correlation r(reasoning-length, Δ_profit | latency_ms) is small in magnitude at n=5, the claim will be downgraded to "reasoning-length is collinear with latency; the swap is validity-motivated, not incremental-information-motivated."

---

## D. Mechanism Commitment: Wu 2025 Simplicity-Bias

### Motivation

A negative correlation between reasoning-length and Δ_profit (shorter chain-of-thought → more cooperative outcome) is a non-obvious direction. Without an explicit mechanism, reviewers may interpret the negative sign as a bug or confounding artifact.

### Pre-committed mechanism

Wu et al. 2025 ("When More Is Less," *wu2025whenMoreIsLess*) establishes capability-aligned simplicity-bias: once a pretrained model has a stable answer to a problem, generating additional chain-of-thought tokens yields diminishing or negative returns on output quality. We pre-commit to the following mechanism in Discussion:

> If a collusive attractor is representationally simpler for a Haiku-class pretrained agent — i.e., the cooperative-pricing answer is closer to the model's prior — then simplicity-bias predicts shorter reasoning traces at more-cooperative basins. This is the predicted direction of r(reasoning-length, Δ_profit) < 0.

### Falsifiability clause (pre-committed)

The simplicity-bias mechanism is falsified by the following pre-specified test:

> In follow-up work (cross-model, cross-prompt, or Stage 3 with full instrumentation per Section E), if reasoning-length scales *positively* with basin welfare loss — i.e., more-cooperative basins exhibit *longer* reasoning — then simplicity-bias as a mechanism for the Stage 2b negative sign is refuted. An alternative mechanism (e.g., effort-proportional-to-complexity) would then be warranted.

The negative sign of r = −0.78 is not presented as evidence *for* simplicity-bias; it is presented as *consistent with* simplicity-bias, with a pre-registered test for refutation.

---

## E. Latency as Uninterpreted Secondary Observable

### Wording commitment

All `latency_ms` values reported in Stage 2b publications will carry the following caveat at first mention and in every figure caption referencing latency:

> **Latency caveat.** Reported `latency_ms` values are wall-clock elapsed time per agent-round as measured in the experiment harness. They include: Claude CLI subprocess spawn overhead, subscription authentication, rate-limit back-off, scheduling delays, prefill, decode, streaming, and teardown — in addition to model inference. They are not a proxy for inference time. Per-agent 500ms stagger (`pilot/runner/round-executor.ts:97`) is also included. Latency is retained as a descriptive observable and for reproducibility auditing; it is not interpreted mechanistically.

---

## F. Instrumentation Timeline (I1: `response.usage.output_tokens`)

### Pre-committed acknowledgement

Gate-5 2b (n=5, completed 2026-04-15) and Gate-2 2b (n=2, forthcoming) were and will be run without logging `response.usage.output_tokens` because the inference harness invokes `claude --print --output-format text`, which does not surface the usage envelope. As a result, reasoning-length in Stage 2b is measured by `len(reasoning)` in characters, not by tokens.

### Pre-committed forward plan

Before Stage 3 (μ-sweep, scheduled to launch after Gate-2 2b) is run, the runner will be modified to invoke `claude --print --output-format json` (confirmed to return `usage.output_tokens` and `usage.input_tokens` in the JSON envelope via direct test at 2026-04-23), with `output_tokens` and `input_tokens` logged per agent-round in `traces.jsonl`. Stage 3 onwards will therefore report reasoning-effort in both characters and tokens, enabling direct comparison to the Stage 2b char-count results.

Character-count and token-count are expected to correlate strongly but not perfectly; any discrepancy will be reported as a tokenizer-vs-char-count robustness check.

---

## G. Single-Model-Family and Single-Auth-Path Caveats

### Pre-committed scope limitation

All Stage 2b findings (both parent pre-registration and this addendum) apply to:

- **Model:** `claude-haiku-4-5-20251001` only. Extension to other Haiku sizes, to Sonnet, to Opus, or to non-Anthropic frontier models (GPT, Gemini, Llama, DeepSeek, Qwen, Mistral) is not claimed and is explicitly scoped out of the Stage 2b publication. These are the subject of Stage 4 (cross-model replication).
- **Authentication path:** Claude CLI subscription auth, `--output-format text`, `--no-session-persistence`, `--setting-sources=""` (as implemented at commits preceding 2026-04-23). Extension to direct Anthropic Messages API (`ANTHROPIC_API_KEY`, persistent HTTP, stream=True) is not claimed.
- **Prompt:** Identical system/user prompts to Stage 2 (see Stage 2 pre-registration). Extension to alternative prompt formulations is not claimed.

### Discussion commitment

Each of these three caveats will appear in Limitations of any Stage 2b preprint, with explicit naming of the replication (Stage 4) pathway that addresses it.

---

## Summary of Pre-Committed Decisions (Checklist)

- [ ] Bootstrap k-selection procedure: gap-statistic primary, BIC secondary, ≥7/10 resample recovery threshold.
- [ ] Three quadrimodal/bimodal decision branches + one inconclusive branch specified.
- [ ] Fisher-z CIs pre-committed for 4 named correlations at n=5, regardless of direction.
- [ ] Basin fixed-effects regression for within-basin vs between-basin reasoning-length effect pre-committed.
- [ ] Latency caveat wording pre-committed for all figures and tables.
- [ ] Wu 2025 simplicity-bias pre-committed as the mechanism explanation for the negative sign, with falsifiability clause.
- [ ] I1 instrumentation pre-committed for Stage 3 onwards; Stage 2b char-count reported as-is.
- [ ] Single-model-family (Haiku 4.5), single-auth-path (subscription CLI), single-prompt caveats explicitly scoped out of Stage 2b claims.

---

## Filing Procedure

1. This file is written to `pilot/admin/osf-stage2b-addendum-2026-04-23.md`.
2. RFC 3161 timestamp token is generated via:
   ```
   bun pilot/admin/stamp-preregistration.ts pilot/admin/osf-stage2b-addendum-2026-04-23.md
   ```
3. Both `.md` and `.md.tsr` are committed to `hr/stage-2-gate-experiment` before Gate-2 2b compute is launched.
4. The `{file}.md.tsr` token, once committed, is independently verifiable via OpenSSL against FreeTSA's public certificate chain; any modification to `{file}.md` after stamping invalidates the token.

---

## References (KB bibkeys)

- calvano_etal_2020_ai_algorithmic_pricing_collusion
- Cao_2026_llm_collusion
- fish2024algorithmicCollusion
- BracaleSyrnikov_2026_institutional
- wu2025whenMoreIsLess
- snell2024testtimecompute
- wei2022cot
- kojima2022zeroshot
- jin2024stepLength
- turpin2023unfaithful
- young_1993_evolution_of_conventions
- kwon2023pagedattention
- agrawal2024sarathi
- patel2023splitwise
- miao2023llmservingsurvey
- OpenAI_2024_o1_report

(All bibkeys present in `working/literature/kb/sources.jsonl`.)
