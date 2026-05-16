# Claims Map — Click-to-Verify Path for Every Empirical Claim

**Project:** ColludeBench Stage 2b — H.H.A. Applied Research Institute
**Stage 2b release SHA-256 (preprint paper/main.pdf):** see `paper/README.md`
**Updated:** 2026-05-16

> Every empirical claim in the preprint that touches a numeric value resolves to a row in this table. The five cells per row are: (a) the plain-English claim, (b) the analysis pipeline that produced the result, (c) the canonical data the pipeline consumed, (d) the RFC 3161 stamp that locked the analysis plan before the result was computed, (e) the review certificate that documents adversarial review. Rows for SR-M-6/-7 reference Addendum #5 and Addendum #6 stamps, which RFC-3161-protect the analyzer specification before it ran. SR-M-8 is pre-registered for Stage 3 via §5.4 Clause 4 prose, RFC-3161-protected through the Addendum #6 stamp chain.
>
> **Reproduction primitive.** The team runs a TypeScript-Bun primary analyzer (development tree) plus an independent Python/SciPy reference verifier. **The SciPy verifiers are what ships publicly** at `colludebench-cascade/verifiers/` and are the load-bearing reproduction artifact for any external reader. `ALL CLAIMS REPRODUCE: True` is the green-bit pre-condition for any analytic claim in the preprint.
>
> **Canonical data shipping publicly.** The locked Stage 2b GATE-2 dataset (n=15 reps, 50 rounds, n=2 agents) ships at `colludebench-cascade/results-canonical/stage2b-gate-merged/EXP-GATE-2-2b/{results.json, traces.jsonl}`. The GATE-5 dataset (n=30 reps, 50 rounds, n=5 agents) is reserved for the journal-version release per the team's open-methodology + delayed-data-release policy; SciPy verifiers reproduce its analytic outputs from the locked private data on request.

## How to verify any row independently

```bash
# 1. Verify the stamp is genuine and granted
openssl ts -verify \
  -in verification/stamps/<stamp.tsr> \
  -data verification/pre-registrations/<stamp-document.md> \
  -CAfile verification/stamps/freetsa.crt

# 2. Run the SciPy reference verifier against canonical data
python colludebench-cascade/verifiers/verify-stage2b-2026-04-26.py \
  colludebench-cascade/results-canonical/stage2b-gate-merged/

# 3. Read the review certificate state
cat verification/council-certificates/review-certificate.md

# 4. Reproduce all SR-M checks from a clean clone (one-script)
bash verification/reproduce/verify-stage2b.sh
```

---

## SR-M Registry Claims (Mechanistic, 8 entries)

| ID | Plain-English claim | Verification path | Canonical data | Stamp | Review status |
|----|--------------------|-------------------|----------------|-------|----------------|
| **SR-M-1** | Convergence dynamics differ sharply across agent counts: GATE-5 converges 30/30 reps in 50 rounds, GATE-2 converges 1/15. | SciPy verifier `colludebench-cascade/verifiers/verify-stage2b-2026-04-26.py` (Step 2 reproduces the convergence check). | `colludebench-cascade/results-canonical/stage2b-gate-merged/EXP-GATE-2-2b/` (public) + GATE-5 locked traces (private; reproduced on request) | `verification/stamps/osf-stage2b-addendum-2026-04-23.md.tsr` (Addendum #1, pre-committing the convergence criterion) | PASS — primary + SciPy verifier agree within `\|Δ\| < 5e-3` |
| **SR-M-2** | Bimodal terminal-state structure (k=2) is recovered at GATE-5 (7/10 gap-statistic resamples; 72.0% across 100-resample sweep) and not at GATE-2 within Stage 2b sample envelope. | SciPy locked 10-resample verifier `colludebench-cascade/verifiers/formalize-addendum1-2026-04-26.py` + supplementary 100-resample `colludebench-cascade/verifiers/n2-robustness-100resample-2026-04-27.py`. | `colludebench-cascade/results-canonical/stage2b-gate-merged/` | `verification/stamps/osf-stage2b-addendum-2026-04-24.md.tsr` (Addendum #2 §A branches a/b/c/d pre-committed) | PASS — branch (c) `k=2 at GATE-5, k=1 at GATE-2` fired per pre-commit |
| **SR-M-3** | Reasoning-length × profit-gain correlation has negative sign at GATE-5 (`r = -0.30`, Fisher-z 95% CI [-0.60, +0.06]); direction-only claim consistent with Wu et al. 2025 simplicity-bias prediction. | SciPy verifier `colludebench-cascade/verifiers/formalize-addendum1-2026-04-26.py` §C correlations + `colludebench-cascade/verifiers/verify-formalize-2026-04-26.py`. | `colludebench-cascade/results-canonical/stage2b-gate-merged/` | `verification/stamps/osf-stage2b-addendum-2026-04-23.md.tsr` (Addendum #1 §D pre-commits sign-only test) | DIRECTION CONSISTENT — formal falsification deferred to Stage 4 cross-model |
| **SR-M-4** | The full analysis pipeline reproduces concordantly under an independent Python/SciPy reference verifier (`ALL CLAIMS REPRODUCE: True` across all six pre-registered claim categories at `\|Δ\| < 5e-3`). | SciPy verifier `colludebench-cascade/verifiers/verify-stage2b-2026-04-26.py` final block returns `ALL CLAIMS REPRODUCE: True`. | `colludebench-cascade/results-canonical/stage2b-gate-merged/` | `verification/stamps/osf-stage2b-addendum-2026-04-24b.md.tsr` (Addendum #3 §C pre-commits cross-toolchain verifier requirement) | PASS — Fisher's-exact denominator bug surfaced and fixed pre-submission via this procedure |
| **SR-M-5** | Survivor-rep consistency drift (regime-label) is consistent with round-level threshold sensitivity given mean prices oscillate within $\pm 0.04$ of the cooperation midpoint $p^{\text{mid}}_2 = 1.6990$. | SciPy verifier `colludebench-cascade/verifiers/verify-stage2b-2026-04-26.py` per-rep mean-price block. | `colludebench-cascade/results-canonical/stage2b-gate-merged/` (Stage 2b GATE-2 reps include the survivor + re-run set) | `verification/stamps/osf-stage2b-addendum-2026-04-26.md.tsr` (Addendum #4 §A pre-commits survivor-consistency falsification clause) | PASS — all four reps within tolerance; framing remains exploratory at $n=4$ |
| **SR-M-6** | The §5.2 reading (a) initial cross-sectional-signal formulation is empirically REVERSED on Stage 2b data: per-other-agent CoT cross-reference rate at GATE-2 (2.954, 95% CI [2.865, 3.045]) is ~5.8× the rate at GATE-5 (0.508, [0.500, 0.516]); CIs disjoint with GATE-2 strictly higher. | Primary TypeScript analyzer fired the REVERSAL branch per Addendum #5 §B.3; SciPy verifier port deferred to Stage 3 per Addendum #5 §C. | Locked Stage 2b traces (GATE-2 canonical at `colludebench-cascade/results-canonical/stage2b-gate-merged/EXP-GATE-2-2b/traces.jsonl`; GATE-5 traces private, on request). | `verification/stamps/osf-stage2b-addendum-2026-05-03.md.tsr` (Addendum #5 v2; SHA-256 `033cabda5fee0ee8c74d178ea2d69388e1dd5dfdf5084636c8860949c03eeedf`; stamp 2026-05-04 03:38:12 GMT) | EXPLORATORY — REVERSAL branch (B.3) fired per pre-commit; SciPy promotion deferred to Stage 3 |
| **SR-M-7** | The §5.2.1 REVERSAL survives talk-volume residualization: total-CoT-word-count CIs overlap across conditions (talk-volume null) AND per-condition residual CIs from pooled OLS `rate ~ a + b * words` are disjoint with GATE-2 ~5× higher residual. Refined reading (a') is supported on Stage 2b. | Primary TypeScript analyzer fired the REVERSAL-SURVIVES-RESIDUALIZATION branch per Addendum #6 §B; SciPy verifier port deferred to Stage 3 per Addendum #6 §C. | Same locked Stage 2b traces as SR-M-6. | `verification/stamps/osf-stage2b-addendum-2026-05-04.md.tsr` (Addendum #6; SHA-256 `15d5663625a08660c27a9761ac2d722c1e124a75cc343aea728896a827b65606`; stamp 2026-05-04 05:36:42 GMT) | EXPLORATORY — REVERSAL SURVIVES RESIDUALIZATION branch fired per pre-commit; SciPy promotion deferred |
| **SR-M-8** | Basin-width-by-agent-count predicts monotonic strict-convergence rate across $n \in \{2, 3, 4, 5\}$ with $n=3$ and $n=4$ rates each Wilson-bracketed by $n=2$ and $n=5$. Stage 3 will report the curve and the framework is rejected if non-monotonic or non-bracketing. | Stage 3 SciPy verifier (deferred — implementation against $n_{\text{rep}} \geq 30$ at $n \in \{2, 3, 4, 5\}$, horizon $\geq 100$). | Stage 3 dataset (not yet collected). | §5.4 Clause 4 prose at Stage 2b release; protected via Addendum #6 stamp chain (May 4 05:36:42 GMT) anterior to release. | PRE-REGISTERED — Stage 3 falsification test deferred; pre-registration is the §5.4 prose itself |

---

## Cross-Cutting Practice Claims (3 entries)

| ID | Plain-English claim | Verification path | Status |
|----|---------------------|--------------------|--------|
| **CC-1** | RFC 3161 stamp chain integrity: 6 addenda + 2 pre-registration stamps, all `Status: Granted` from FreeTSA, each topologically anterior to the result it governs. | `for f in verification/stamps/osf-*.md.tsr; do openssl ts -verify -in $f -data verification/pre-registrations/$(basename ${f%.tsr}) -CAfile verification/stamps/freetsa.crt; done` (8 invocations; 6 return `Verification: OK`, 2 redacted public versions intentionally fail imprint match with originals available on request). | PASS — verified at release |
| **CC-2** | Structured multi-iteration adversarial review: 5 iterations against eight pre-defined methodological dimensions (statistical algorithm validity, computer-science peer-review standards, first-principles consistency, industrial-organization domain expertise, devil's-advocate stress-testing, methods and reproducibility audit, internal consistency, writing rigor); CONDITIONAL exit cert with documented user-override rationale; 32 substantive findings (CRITICAL + HIGH) applied across iters; iter-4 gap list traces per-finding resolution. | `cat verification/council-certificates/review-certificate.md`; `cat verification/council-certificates/iter-4-gap-list.md`. | DOCUMENTED — CONDITIONAL exit; iter-5 surfaced 3 CRITICAL + 10 HIGH; surgical Q-learner contradiction fix + SR-M-8 entry applied; user override invoked under venue-conditional Schmidt-RFP-focus filter; all unresolved findings catalogued under "Unresolved at exit" with deferral rationale |
| **CC-3** | Self-falsification of own primary mechanism reading: a pre-registered text-based test (Addendum #5) was *expected* to support the §5.2 reading (a) cross-sectional-signal formulation and *empirically reversed it*. The team published the reversal verbatim in §5.2.1 and applied a refined reading (a') that survived a second pre-committed test (Addendum #6 talk-volume residualization). | Trace: §5.2.1 paragraph in `paper/sections/05-discussion.tex` → Addendum #5 §B.3 NULL/REVERSAL/REVERSAL-OF-REVERSAL branches at `verification/pre-registrations/osf-stage2b-addendum-2026-05-03.md` → Addendum #6 §B branches at `verification/pre-registrations/osf-stage2b-addendum-2026-05-04.md`. | DEMONSTRATED — both Addendum #5 and Addendum #6 stamps precede the corresponding analyzer outputs; the REVERSAL branch and REVERSAL-SURVIVES-RESIDUALIZATION branch are documented in the SR-M-6 and SR-M-7 entries as EXPLORATORY-pending-SciPy-reproduction-at-Stage-3; the stamped pre-registration of every plausible outcome is what makes this a real falsification rather than a Lakatosian rescue |

---

## Stamp index (chronological)

1. `verification/stamps/osf-preregistration-draft.md.tsr` — Stage 1+2 OSF pre-registration
2. `verification/stamps/osf-preregistration-stage2b-draft.md.tsr` — Stage 2b OSF pre-registration
3. `verification/stamps/osf-stage2b-addendum-2026-04-23.md.tsr` — Addendum #1 (convergence criterion + simplicity-bias falsifier)
4. `verification/stamps/osf-stage2b-addendum-2026-04-24.md.tsr` — Addendum #2 (gap-statistic branches)
5. `verification/stamps/osf-stage2b-addendum-2026-04-24b.md.tsr` — Addendum #3 (cross-toolchain verifier)
6. `verification/stamps/osf-stage2b-addendum-2026-04-26.md.tsr` — Addendum #4 (survivor-consistency clause)
7. `verification/stamps/osf-stage2b-addendum-2026-05-03.md.tsr` — Addendum #5 v2 (CoT regex pipeline + REVERSAL branches)
8. `verification/stamps/osf-stage2b-addendum-2026-05-04.md.tsr` — Addendum #6 (talk-volume residualization)

---

## review certificate state

`verification/council-certificates/review-certificate.md` — **CONDITIONAL** (post-iter-5)
- 5 structured-review iterations completed
- ~32 substantive findings applied across iters 1–5
- iter-5 fresh CRITICAL findings: 1 surgical fix (Q-learner self-contradiction at §5.2.1) + SR-M-8 registry entry (Phys Clause 4) applied at exit; remaining CRITICAL items (hedge-stack collapse, workshop-sizing fork) deferred under Schmidt-RFP-focus filter as venue-conditional polish
- User-override rationale documented in §"Why CONDITIONAL is the correct exit"
- Path forward (post-funding journal extension): listed in §"Path forward"
