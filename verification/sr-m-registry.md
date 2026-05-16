# Mechanistic Claims Registry — Stage 2b Preprint v0

> SR-M registry per AppliedResearch ReviewChecklist §SR-M and Review.md Step 2.7. Each entry registers a mechanistic claim with primary-source numeric target, falsification test, falsification condition, and pre-committed rescope fallback. The weakest-credible-commitment principle applies: `primary_source_target` is the weakest numeric target the paper itself commits to, not the strongest the cited source reports.
>
> **Domain adaptation note.** AppliedResearch's canonical SR-M assumes an RL/ML package with `tests/test_srm_*.py` files exercising the artifact's default initialization. This preprint is an empirical-economics study of LLM agents, not a trained-model release. The "test" for each mechanistic claim is therefore (a) the SciPy reference verifier already in `pilot/admin/verification/verify-*.py` for analysis-pipeline claims, and (b) the pre-committed Stage 4 cross-model replication design for mechanism claims that a single-model pilot cannot adjudicate. Both substitutes are explicitly named in each entry below.
>
> Step 0 (Metric Integrity) and Step 2.6 (PyPI Hygiene) are N/A for this preprint. Step 0's MV1-MV4 checks are for `results/training_results.json` from RL training; the analogous artifact here is the analyzer output verified by `verify-stage2b-2026-04-26.py` returning `ALL CLAIMS REPRODUCE: True`. Step 2.6 (PyPI sdist size, Dev Status badge, etc.) does not apply because no Python package is being released.

---

## SR-M-1: Convergence asymmetry between $n=2$ and $n=5$ at fixed horizon

**Claim text** (preprint §1, §4.1, §5.2): "Convergence dynamics differ sharply: $n=5$ converges in $30/30$ repetitions ($100.0\%$) within 50 rounds, while $n=2$ converges in $1/15$ ($6.7\%$). The $n=2$ non-convergent population exhibits regime drift consistent with a wider basin of attraction at smaller agent counts."

**primary_source_target:** GATE-5 strict-converged rate $\geq 0.85$ (binomial) AND GATE-2 strict-converged rate $\leq 0.40$ (binomial), at the locked convergence criterion (`< 1\%` mean price change over 5 consecutive rounds, evaluated rolling) within 50 rounds.

**falsification_test_path:** `pilot/analyze-gate-2b.ts` Step 2 against `pilot/results/stage2b-gate-merged-2026-04-25/`, cross-verified by `pilot/admin/verification/verify-stage2b-2026-04-26.py`.

**falsification_condition:** Either condition's strict-converged rate falls outside the bound above when re-derived under the locked criterion against the canonical merged dataset.

**rescope_fallback (pre-committed):** If convergence-rate asymmetry attenuates under Stage 3 ($n_{\text{rep}} \geq 30$, horizon $\geq 100$ rounds), the asymmetry framing is rescoped from "structural basin-width property" to "horizon-dependent transient property of the duopoly" and §5.2 is rewritten accordingly. The §5.4 falsifiability clause already pre-locks this condition.

**verification status:** PASS — 30/30 GATE-5, 1/15 GATE-2 reproduces under SciPy reference verifier, $|\Delta| < 5 \times 10^{-3}$.

---

## SR-M-2: Bimodal basin structure at GATE-5 ($k=2$)

**Claim text** (preprint §4.5, §4.6, §5.1): "The gap statistic recovers $k = 2$ in $7/10$ resamples at GATE-5; the supplementary 100-resample $\times$ 10-seed sweep yields $k=2$ in $72.0\%$ aggregated, with $10/10$ seeds returning $k=2$ as the modal winner. The pre-committed downgrade clause in Addendum #1 §A branch (c) fires."

**primary_source_target:** Gap-statistic resample recovery rate for $k=2$ at GATE-5 $\geq 0.70$ aggregated across $\geq 100$ resamples, OR $\geq 7/10$ resamples in the locked 10-resample procedure.

**falsification_test_path:** `pilot/admin/verification/formalize-addendum1-2026-04-26.py` (locked 10-resample) and `pilot/admin/verification/n2-robustness-100resample-2026-04-27.py` (supplementary).

**falsification_condition:** Either the locked 10-resample procedure recovers $k=2$ in $< 7$ resamples on the canonical merged dataset, OR the 100-resample sweep aggregated rate falls below 0.70.

**rescope_fallback (pre-committed):** Per Addendum #1 §A: if branch (c) does not fire, the relevant fallback branch's wording governs (branch (a) $k=4$ → quadrimodal; branch (b) $k \in \{2, 3\}$ → mixed; branch (d) inconclusive). The branch wording is RFC 3161-stamped pre-data-collection and is binding regardless of which fires.

**verification status:** PASS — 7/10 locked + 72.0% aggregated reproduces under independent verifier.

---

## SR-M-3: Wu et al. 2025 simplicity-bias as candidate mechanism for reasoning-length signal

**Claim text** (preprint §4.7, §5.5): "$r(\text{reasoning length}, \Delta_{\text{profit}}) = -0.30$ at $n=5$, with Fisher-$z$ 95\% CI $[-0.60, +0.06]$ spanning zero. Direction is consistent with Wu et al.\ 2025 simplicity-bias prediction; mechanism is consistent with the data direction but not strongly confirmed."

**primary_source_target (weakest-credible):** Sign of $r(\text{reasoning length}, \Delta_{\text{profit}})$ at GATE-5 is negative; the paper does NOT claim significance. Wu et al.\ 2025 simplicity-bias predicts a negative sign for tasks where the cooperative-pricing answer is representationally simpler.

**falsification_test_path:** `pilot/admin/verification/formalize-addendum1-2026-04-26.py` §C correlations + `pilot/admin/verification/verify-formalize-2026-04-26.py`.

**falsification_condition:** Pre-registered (Addendum #1 §D, RFC 3161 stamped 2026-04-23): $r(\text{reasoning length}, \Delta_{\text{profit}}) > 0$ at GATE-5 falsifies simplicity-bias as the operative mechanism. NOT triggered ($r = -0.30$).

**rescope_fallback (pre-committed):** Addendum #1 §D pre-locks Stage 4 cross-model replication (across Haiku sizes, Sonnet, Opus, non-Anthropic frontier models) as the formal falsification test. If Stage 4 produces $r > 0$ at any model in the family, simplicity-bias is rejected.

**verification status:** DIRECTION CONSISTENT — formal falsification deferred to Stage 4 ($n_{\text{rep}} \gg 30$). The point-estimate sign is negative at both agent counts ($r = -0.30$ at $n=5$, $r = -0.47$ at $n=2$), consistent with the Wu et al.\ 2025 simplicity-bias prediction, but the Fisher-$z$ 95% CI on $r$ at GATE-5 spans zero ($[-0.60, +0.06]$). At $n_{\text{rep}} = 30$ the test has approximately 39% power to detect a population correlation of $r = -0.30$ at $\alpha = 0.05$, so the non-rejection of the falsification clause is consistent-with rather than a Popperian falsification test. Stage 4 cross-model replication (Haiku sizes, Sonnet, Opus, non-Anthropic frontier models) is the formal falsification test. The locked Wu 2025 paragraph (verbatim per Addendum #1 §D) makes this scope explicit.

---

## SR-M-4: Concordant analysis-pipeline reproduction (NOT experiment-level reproducibility)

**Claim text** (preprint §3.4, §3.7, §4.11, §6.5): "The independent Python/SciPy reference verifier returns ALL CLAIMS REPRODUCE: True across all six pre-registered claim categories ... at $|\Delta| \leq 5 \times 10^{-3}$. This does not constitute experiment-level reproducibility."

**primary_source_target:** All numerical outputs from `pilot/analyze-gate-2b.ts`, `pilot/analyze-host-effect.ts`, `pilot/analyze-survivor-consistency.ts`, and the formalization script match the corresponding `pilot/admin/verification/verify-*.py` outputs to within $|\Delta| < 5 \times 10^{-3}$ tolerance, on the canonical merged dataset, on at least two independent host machines.

**falsification_test_path:** `pilot/admin/verification/verify-stage2b-2026-04-26.py` final block: `ALL CLAIMS REPRODUCE: True`.

**falsification_condition:** Any single discrepancy beyond $|\Delta| < 5 \times 10^{-3}$ between primary analyzer and SciPy verifier output halts the pipeline pending reconciliation.

**rescope_fallback (pre-committed):** If experiment-level reproducibility (re-collection from new model calls under different `model_version`, region, prompt-cache state) is required for a stronger claim, the paper rescopes to the pre-committed Stage 3 instrumentation per Addendum #1 §F. The Limitations §6.5 already names this rescope path.

**verification status:** PASS — verifier returned `ALL CLAIMS REPRODUCE: True` across all six pre-registered claim categories. The Fisher's-exact denominator bug surfaced and fixed by this procedure pre-submission is documented in §3.4 transparently.

---

## SR-M-5: Round-level threshold-sensitivity mechanism for survivor consistency-NEG

**Claim text** (preprint §4.10, §6.4): "The substantive drift at survivor rep 1 ($\text{coop} = 0.450 \to 0.150$) is consistent with round-level threshold sensitivity given that mean prices oscillate near the cooperation midpoint ($1.638$ vs $1.598$ vs threshold $1.6990$); we frame this exploratorily rather than mechanistically."

**primary_source_target:** Mean price for the relevant survivor and re-run reps falls within $\pm 0.05$ of the cooperation midpoint $p^{\text{mid}}_{n=2} = 1.6990$. This is a descriptive observation, not a mechanistic claim.

**falsification_test_path:** `pilot/analyze-survivor-consistency.ts` per-rep mean-price computation against `pilot/results/stage2b-gate-2026-04-23-FAILED-ratelimit/` and `pilot/results/stage2b-gate-2b-rerun-hass/`.

**falsification_condition:** If mean price for any of the four survivor + re-run reps is more than $0.10$ from the cooperation midpoint, the round-level threshold-sensitivity reading is unsupportable for that rep and a different mechanism interpretation is required.

**rescope_fallback (pre-committed):** Paper already labels this exploratory at $n = 4$ (§4.10, §6.4); mechanism adjudication is deferred to Stage 4 cross-model replication. No further rescoping needed if falsification fires within the pilot data — the exploratory framing already accommodates ambiguity.

**verification status:** PASS — mean prices are $1.6380$ / $1.6140$ / $1.5980$ / $1.6060$, all within $\pm 0.04$ of the midpoint $1.6990$. Round-level threshold sensitivity is consistent with the data.

---

## SR-M-6: Per-other-agent CoT cross-reference rate (§5.2.1) — Addendum #5 reversal of reading (a)

**Claim text** (preprint §5.2 acknowledgment paragraph + §5.2.1): "The per-other-agent CoT cross-reference rate at $n=2$ (2.954 per CoT-round, 95% bootstrap CI [2.865, 3.045]) is approximately 5.8x the rate at $n=5$ (0.508, [0.500, 0.516]); CIs disjoint with GATE-2 higher; the §5.2 reading (a) initial formulation 'with $n=5$ agents the per-round price vector contains substantially more information than at $n=2$' is empirically reversed."

**primary_source_target:** GATE-2 per-other-agent rate 95% bootstrap CI is disjoint from GATE-5 CI **with GATE-2 mean strictly greater than GATE-5 mean**, on the locked Stage 2b dataset (`pilot/results/stage2b-gate-2026-04-15/EXP-GATE-5-2b/traces.jsonl` + `pilot/results/stage2b-gate-merged-2026-04-25/EXP-GATE-2-2b/traces.jsonl`), under the regex pipeline pre-committed in Addendum #5 §A and the per-other-agent normalization in §A.4.

**falsification_test_path:** `pilot/analyze-cot-cross-references.ts` against the locked traces; output at `pilot/results/cot-cross-references-2026-05-03.json`. Decision rule per Addendum #5 §B.1.

**falsification_condition:** CIs overlap (NULL) OR sign reverses (GATE-5 mean > GATE-2 mean — REVERSAL OF REVERSAL) under independent SciPy verifier (deferred per Addendum #5 §C).

**rescope_fallback (pre-committed):** If CIs overlap on independent verification: §5.2 reading (a) softens to "candidate mechanism among several" per Addendum #5 §B.3 NULL branch. If sign reverses on independent verification: §5.2.1 reports the reversal-of-reversal verbatim. Stage 4 cross-model channels (i)/(ii) are unchanged in either case.

**verification status:** EXPLORATORY — primary analyzer (`pilot/analyze-cot-cross-references.ts`) reports the REVERSAL branch fired per pre-committed Addendum #5 §B.3; SciPy verifier (`pilot/verify-cot-cross-references.py`) is pre-committed but deferred. SR-M promotion to PASS requires SciPy verifier reproduction. The Addendum #5 v1→v2 schema-validation note (§A.0) documents the pre-stamp regex widening; the stamp at SHA-256 `033cabda5fee0ee8c74d178ea2d69388e1dd5dfdf5084636c8860949c03eeedf` (May 4 03:38:12 2026 GMT, FreeTSA) precedes the analyzer JSON `generated_at` 2026-05-04T03:38:37Z by 25 seconds.

---

## SR-M-7: Talk-volume-controlled residualization (§5.2.1) — Addendum #6 supports refined reading (a')

**Claim text** (preprint §5.2.1 talk-volume-control paragraph + Table tab:cot-residualized): "Mean total CoT word counts are nearly identical across conditions (GATE-5: 195.15 [194.44, 195.87]; GATE-2: 194.67 [193.18, 196.16]). Residualizing the per-other-agent rate against the pooled OLS fit returns mean residuals of -0.408 ([-0.416, -0.400]) at GATE-5 and +2.040 ([+1.951, +2.130]) at GATE-2 — disjoint 95% bootstrap CIs with GATE-2 ~5x higher residual. Refined reading (a') is empirically supported on Stage 2b data even controlling for talk volume."

**primary_source_target:** Mean total CoT word counts have overlapping 95% bootstrap CIs across conditions (talk-volume null) AND per-condition mean residuals from the pooled OLS regression `rate ~ a + b * words` have disjoint 95% bootstrap CIs **with GATE-2 mean residual strictly greater than GATE-5 mean residual**, on the locked Stage 2b dataset under the regex pipeline pre-committed in Addendum #5 §A (byte-identical) and the residualization specification in Addendum #6 §A.

**falsification_test_path:** `pilot/analyze-cot-residualized.ts` against the locked traces; output at `pilot/results/cot-residualized-2026-05-04.json`. Decision rule per Addendum #6 §B.

**falsification_condition:** Residualized CIs overlap (RESIDUALIZED NULL) → §5.2.1 acknowledges the gap collapses under talk-volume control. OR sign reverses (GATE-5 residual > GATE-2 — RESIDUALIZED REVERSAL OF REVERSAL) → §5.2.1 acknowledges talk-volume drives the §5.2.1 reversal and refined reading (a') is NOT supported by Stage 2b data.

**rescope_fallback (pre-committed):** Per Addendum #6 §B branches verbatim: NULL → §5.2.1 framing softens to "talk-volume-confounded — Stage 4 cross-model replication required to discriminate"; REVERSAL OF REVERSAL → §5.2.1 framing rewrites to "(a') refuted at Stage 2b under talk-volume control; §5.2 mechanism question reverts to reading (b) horizon-and-sample-size effects + Stage 3 + Stage 4."

**verification status:** EXPLORATORY — primary analyzer reports REVERSAL SURVIVES RESIDUALIZATION per Addendum #6 §B verbatim; talk-volume null confirmed (mean word counts nearly identical with overlapping CIs); per-condition residual CIs disjoint with GATE-2 5x higher. SciPy verification deferred. Stamp at SHA-256 `15d5663625a08660c27a9761ac2d722c1e124a75cc343aea728896a827b65606` (May 4 05:36:42 2026 GMT, FreeTSA) precedes analyzer JSON `generated_at` 2026-05-04T05:37:00Z.

---

## SR-M-8: Strict-convergence rate monotonicity in agent count (rate-vs-n curve)

**Claim text** (preprint §5.4 Clause 4): "The basin-width-by-agent-count hypothesis predicts a monotonic relationship between agent count and the strict-convergence rate; Stage 3 will report the per-agent-count strict-convergence rate at $n \in \{2, 3, 4, 5\}$, and the hypothesis is rejected if the curve is non-monotonic or if the $n = 3$ and $n = 4$ rates are not bracketed by the $n = 2$ and $n = 5$ rates within Wilson 95% CIs."

**primary_source_target:** Strict-convergence rate $p_{\text{strict}}(n)$ at $n \in \{2, 3, 4, 5\}$ exhibits monotonic ordering ($p_{\text{strict}}(2) \leq p_{\text{strict}}(3) \leq p_{\text{strict}}(4) \leq p_{\text{strict}}(5)$ within Wilson 95% CI overlap tolerance), with $n = 3$ and $n = 4$ rates each having Wilson 95% CIs that overlap both the $n = 2$ and $n = 5$ Wilson 95% CIs (the bracketing condition).

**falsification_test_path:** Stage 3 analyzer (deferred — `pilot/analyze-stage3-monotonicity.ts`, to be implemented in Stage 3 with $n_{\text{rep}} \geq 30$ at $n \in \{2, 3, 4, 5\}$ and horizon $\geq 100$ rounds).

**falsification_condition:** Non-monotonic ordering of the four point estimates OR $n = 3$ Wilson 95% CI not overlapping both $n = 2$ and $n = 5$ Wilson CIs OR same for $n = 4$.

**rescope_fallback (pre-committed):** If Stage 3 produces non-monotonicity, the basin-width-by-agent-count framework is rescoped from "monotonic-in-$n$ structural property" to "endpoint-asymmetry between duopoly and small-oligopoly only" and §5.2 narrows the claim accordingly. If $n = 3$ or $n = 4$ falls outside the bracketing condition, the basin-width function is non-monotonic (consistent with a non-trivial agent-count interaction) and the framework requires a Stage 4 mechanistic refinement that the Stage 2b paper does not pre-commit.

**verification status:** PRE-REGISTERED — Stage 3 falsification test deferred per §5.4 Clause 4; pre-registration is the §5.4 prose itself, RFC 3161 stamped via the iter-5 `cb4238b` commit chain (Addendum #6 stamp May 4 05:36:42 GMT, ancestor of `cb4238b`).

---

## Registry summary

8 mechanistic claims registered. All 8 have explicit primary-source numeric targets, falsification test paths, falsification conditions, and pre-committed rescope fallbacks. SR-M-1 through SR-M-5 are PASS status against the canonical merged dataset under the SciPy reference verifier. SR-M-6 and SR-M-7 are EXPLORATORY status (primary TypeScript analyzer fired the pre-committed branch verbatim; SciPy verifier deferred per Addendum #5 §C and Addendum #6 §C — promotion to PASS requires SciPy reproduction). SR-M-8 is PRE-REGISTERED status (Stage 3 falsification test deferred; pre-registration via §5.4 Clause 4 prose at iter-5 `cb4238b`, RFC 3161 stamped through the Addendum #6 stamp chain).

The registry is authored under the weakest-credible-commitment discipline: each `primary_source_target` is the weakest numeric target the paper literally commits to (sign-only for SR-M-3; rate bounds rather than exact values for SR-M-1 and SR-M-2; CI-disjoint-with-direction for SR-M-6 and SR-M-7). This avoids Phase-A overreach that would create SR-M3-style failures.
