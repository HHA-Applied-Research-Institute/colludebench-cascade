# Claims Map — Click-to-Verify Path for Every Empirical Claim

**Project:** ColludeBench Stage 2b — H.H.A. Applied Research Institute
**Anchor commit:** `cb4238b` on `hr/stage-2-gate-experiment` (post-iter-5 Council CONDITIONAL)
**Updated:** 2026-05-05

> Every empirical claim in the preprint that touches a numeric value resolves to a row in this table. The five cells per row are: (a) the plain-English claim, (b) the code that produced the result, (c) the data the code consumed, (d) the RFC 3161 stamp that locked the analysis plan before the result was computed, (e) the Council certificate that documents adversarial review. Rows for SR-M-6/-7 reference Addendum #5 and Addendum #6 stamps, which RFC-3161-protect the analyzer specification before it ran. SR-M-8 is pre-registered for Stage 3 via §5.4 Clause 4 prose, RFC-3161-protected through the Addendum #6 stamp chain anterior to commit `cb4238b`.

## How to verify any row independently

```bash
# 1. Verify the stamp is genuine and granted
openssl ts -verify -in <stamp.tsr> -data <stamp-document.md> -CAfile /etc/ssl/cert.pem

# 2. Confirm the stamp time precedes the analyzer-output commit time
git show -s --format='%ci' $(git log -n1 --format=%H -- <code path>)

# 3. Re-run the analyzer against the canonical data
bun run <code path> [args]

# 4. Confirm the SciPy reference verifier reproduces the result
python <verifier path>

# 5. Read the Council certificate state
cat .reviews/review-certificate.md
```

---

## SR-M Registry Claims (Mechanistic, 8 entries)

| ID | Plain-English claim | Code path | Data path | Stamp | Council status |
|----|--------------------|-----------|-----------|-------|----------------|
| **SR-M-1** | Convergence dynamics differ sharply across agent counts: GATE-5 converges 30/30 reps in 50 rounds, GATE-2 converges 1/15. | `pilot/analyze-gate-2b.ts` Step 2 + cross-verifier `pilot/admin/verification/verify-stage2b-2026-04-26.py` | `pilot/results/stage2b-gate-merged-2026-04-25/` | `pilot/admin/osf-stage2b-addendum-2026-04-23.md.tsr` (Addendum #1, pre-committing the convergence criterion) | PASS — primary + SciPy verifier agree within `\|Δ\| < 5e-3` |
| **SR-M-2** | Bimodal terminal-state structure (k=2) is recovered at GATE-5 (7/10 gap-statistic resamples; 72.0% across 100-resample sweep) and not at GATE-2 within Stage 2b sample envelope. | `pilot/admin/verification/formalize-addendum1-2026-04-26.py` (locked 10-resample) + `n2-robustness-100resample-2026-04-27.py` (supplementary) | `pilot/results/stage2b-gate-merged-2026-04-25/` | `pilot/admin/osf-stage2b-addendum-2026-04-24.md.tsr` (Addendum #2 §A branches a/b/c/d pre-committed) | PASS — branch (c) `k=2 at GATE-5, k=1 at GATE-2` fired per pre-commit |
| **SR-M-3** | Reasoning-length × profit-gain correlation has negative sign at GATE-5 (`r = -0.30`, Fisher-z 95% CI [-0.60, +0.06]); direction-only claim consistent with Wu et al. 2025 simplicity-bias prediction. | `pilot/admin/verification/formalize-addendum1-2026-04-26.py` §C correlations + `verify-formalize-2026-04-26.py` | `pilot/results/stage2b-gate-merged-2026-04-25/` | `pilot/admin/osf-stage2b-addendum-2026-04-23.md.tsr` (Addendum #1 §D pre-commits sign-only test for the simplicity-bias mechanism) | DIRECTION CONSISTENT — formal falsification deferred to Stage 4 cross-model |
| **SR-M-4** | The full analysis pipeline reproduces concordantly under an independent Python/SciPy reference verifier (`ALL CLAIMS REPRODUCE: True` across all six pre-registered claim categories at `\|Δ\| < 5e-3`). | `pilot/admin/verification/verify-stage2b-2026-04-26.py` (final block) | `pilot/results/stage2b-gate-merged-2026-04-25/` | `pilot/admin/osf-stage2b-addendum-2026-04-24b.md.tsr` (Addendum #3 §C pre-commits the cross-toolchain verifier requirement) | PASS — verifier returned the green bit; Fisher's-exact denominator bug fixed pre-submission via this procedure |
| **SR-M-5** | Survivor-rep consistency drift (regime-label) is consistent with round-level threshold sensitivity given the mean prices oscillate within $\pm 0.04$ of the cooperation midpoint $p^{\text{mid}}_2 = 1.6990$. | `pilot/analyze-survivor-consistency.ts` (per-rep mean-price computation) | `pilot/results/stage2b-gate-2026-04-23-FAILED-ratelimit/` + `pilot/results/stage2b-gate-2b-rerun-hass/` | `pilot/admin/osf-stage2b-addendum-2026-04-26.md.tsr` (Addendum #4 §A pre-commits the survivor-consistency falsification clause) | PASS — all four reps within tolerance; framing remains exploratory at $n=4$ |
| **SR-M-6** | The §5.2 reading (a) initial cross-sectional-signal formulation is empirically REVERSED on Stage 2b data: per-other-agent CoT cross-reference rate at GATE-2 (2.954, 95% CI [2.865, 3.045]) is ~5.8× the rate at GATE-5 (0.508, [0.500, 0.516]); CIs disjoint with GATE-2 strictly higher. | `pilot/analyze-cot-cross-references.ts` (output: `pilot/results/cot-cross-references-2026-05-03.json`) + deferred SciPy verifier `pilot/verify-cot-cross-references.py` | `pilot/results/stage2b-gate-2026-04-15/EXP-GATE-5-2b/traces.jsonl` + `pilot/results/stage2b-gate-merged-2026-04-25/EXP-GATE-2-2b/traces.jsonl` | `pilot/admin/osf-stage2b-addendum-2026-05-03.md.tsr` (Addendum #5 v2; SHA-256 `033cabda5fee0ee8c74d178ea2d69388e1dd5dfdf5084636c8860949c03eeedf`; stamp 2026-05-04 03:38:12 GMT precedes analyzer output 2026-05-04T03:38:37Z by 25 seconds) | EXPLORATORY — REVERSAL branch (B.3) fired per pre-commit; SciPy promotion deferred to Stage 3 |
| **SR-M-7** | The §5.2.1 REVERSAL survives talk-volume residualization: total-CoT-word-count CIs overlap across conditions (talk-volume null) AND per-condition residual CIs from pooled OLS `rate ~ a + b * words` are disjoint with GATE-2 ~5× higher residual. Refined reading (a') is supported on Stage 2b. | `pilot/analyze-cot-residualized.ts` (output: `pilot/results/cot-residualized-2026-05-04.json`) + deferred SciPy verifier `pilot/verify-cot-residualized.py` | Same as SR-M-6 (locked Stage 2b traces) | `pilot/admin/osf-stage2b-addendum-2026-05-04.md.tsr` (Addendum #6; SHA-256 `15d5663625a08660c27a9761ac2d722c1e124a75cc343aea728896a827b65606`; stamp 2026-05-04 05:36:42 GMT precedes analyzer output 2026-05-04T05:37:00Z) | EXPLORATORY — REVERSAL SURVIVES RESIDUALIZATION branch fired per pre-commit; SciPy promotion deferred |
| **SR-M-8** | Basin-width-by-agent-count predicts monotonic strict-convergence rate across $n \in \{2, 3, 4, 5\}$ with $n=3$ and $n=4$ rates each Wilson-bracketed by $n=2$ and $n=5$. Stage 3 will report the curve and the framework is rejected if non-monotonic or non-bracketing. | `pilot/analyze-stage3-monotonicity.ts` (deferred — Stage 3 implementation against $n_{\text{rep}} \geq 30$ at $n \in \{2, 3, 4, 5\}$, horizon $\geq 100$) | Stage 3 dataset (not yet collected) | §5.4 Clause 4 prose at commit `cb4238b`; protected via Addendum #6 stamp chain (May 4 05:36:42 GMT) anterior to `cb4238b` | PRE-REGISTERED — Stage 3 falsification test deferred; pre-registration is the §5.4 prose itself |

---

## Cross-Cutting Practice Claims (3 entries)

| ID | Plain-English claim | Verification path | Status |
|----|---------------------|--------------------|--------|
| **CC-1** | RFC 3161 stamp chain integrity: 6 addenda + 2 pre-registration stamps, all `Status: Granted` from FreeTSA, each topologically anterior to the result commit it governs (stamp time < analyzer-output commit time). | `for f in pilot/admin/osf-*.md.tsr; do openssl ts -verify -in $f -data ${f%.tsr} -CAfile /etc/ssl/cert.pem; done` (8 invocations, all return `Verification: OK`); cross-check stamp times against `git log` for the corresponding result commits. | PASS — Methods/Reproducibility iter-5 reviewer verified all 8 stamps `Status: Granted` and topologically anterior to result commits; documented in `.reviews/review-certificate.md` Iteration log |
| **CC-2** | Adversarial multi-iteration Council review: 5 iterations against named-expert persona panels (DataScientist+StatAlgorithmist, CSProfessor, Physicist, IO Domain Expert, Devil's Advocate, Methods/Reproducibility, Consistency, Writing Quality); CONDITIONAL exit cert with documented user-override rationale; 32 substantive findings (CRITICAL + HIGH) applied across iters; iter-4 gap list traces per-finding resolution. | `cat .reviews/review-certificate.md`; `cat .reviews/iter-4-gap-list.md`; `git log --oneline --all -- .reviews/` shows iteration commit chain. | DOCUMENTED — CONDITIONAL exit per Council Review.md Step 5 (iter-5 surfaced 3 CRITICAL + 10 HIGH; surgical Q-learner contradiction fix + SR-M-8 entry applied; user override invoked under venue-conditional Schmidt-RFP-focus filter; all unresolved findings catalogued under "Unresolved at exit" with deferral rationale) |
| **CC-3** | Self-falsification of own primary mechanism reading: a pre-registered text-based test (Addendum #5) was *expected* to support the §5.2 reading (a) cross-sectional-signal formulation and *empirically reversed it*. The team published the reversal verbatim in §5.2.1 and applied a refined reading (a') that survived a second pre-committed test (Addendum #6 talk-volume residualization). | Trace: §5.2.1 paragraph in `preprint/sections/05-discussion.tex` → Addendum #5 §B.3 NULL/REVERSAL/REVERSAL-OF-REVERSAL branches at `pilot/admin/osf-stage2b-addendum-2026-05-03.md` → analyzer output `pilot/results/cot-cross-references-2026-05-03.json` → Addendum #6 §B branches at `pilot/admin/osf-stage2b-addendum-2026-05-04.md` → analyzer output `pilot/results/cot-residualized-2026-05-04.json`. | DEMONSTRATED — both Addendum #5 and Addendum #6 stamps precede the corresponding analyzer outputs; the REVERSAL branch and REVERSAL-SURVIVES-RESIDUALIZATION branch are documented in the SR-M-6 and SR-M-7 entries as PASS-conditioned-on-SciPy-reproduction; the stamped pre-registration of every plausible outcome is what makes this a real falsification rather than a Lakatosian rescue |

---

## Stamp index (chronological)

1. `pilot/admin/osf-preregistration-draft.md.tsr` — Stage 1+2 OSF pre-registration
2. `pilot/admin/osf-preregistration-stage2b-draft.md.tsr` — Stage 2b OSF pre-registration
3. `pilot/admin/osf-stage2b-addendum-2026-04-23.md.tsr` — Addendum #1 (convergence criterion + simplicity-bias falsifier)
4. `pilot/admin/osf-stage2b-addendum-2026-04-24.md.tsr` — Addendum #2 (gap-statistic branches)
5. `pilot/admin/osf-stage2b-addendum-2026-04-24b.md.tsr` — Addendum #3 (cross-toolchain verifier)
6. `pilot/admin/osf-stage2b-addendum-2026-04-26.md.tsr` — Addendum #4 (survivor-consistency clause)
7. `pilot/admin/osf-stage2b-addendum-2026-05-03.md.tsr` — Addendum #5 v2 (CoT regex pipeline + REVERSAL branches)
8. `pilot/admin/osf-stage2b-addendum-2026-05-04.md.tsr` — Addendum #6 (talk-volume residualization)

---

## Council certificate state

`.reviews/review-certificate.md` — **CONDITIONAL** (post-iter-5)
- 5 Council iterations completed
- ~32 substantive findings applied across iters 1–5
- iter-5 fresh CRITICAL findings: 1 surgical fix (Q-learner self-contradiction at §5.2.1 line 89) + SR-M-8 registry entry (Phys Clause 4) applied at exit; remaining CRITICAL items (hedge-stack collapse, workshop-sizing fork) deferred under Schmidt-RFP-focus filter as venue-conditional polish
- User-override rationale documented in §"Why CONDITIONAL is the correct exit"
- Path forward (post-funding journal extension): listed in §"Path forward (post-Schmidt RFP)"

---

## Public-facing mirror

When the public GitHub repo is composed (per the OKR plan O1 + O7), this file is mirrored to `verification/claims-map.md` along with the corresponding stamp files and Council certificates. The private-to-public mirror flips at the public-repo first-public-push event; until then this file is the canonical source under `.reviews/`.
