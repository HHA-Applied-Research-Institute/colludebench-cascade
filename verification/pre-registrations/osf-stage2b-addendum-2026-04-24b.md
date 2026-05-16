# ColludeBench Stage 2b — Analysis Addendum #3 (2026-04-24b)

## Study Information

**Title:** Survivor-Rep Consistency Check and Host-Effect Transparency Expansion for Stage 2b Gate-2 2b Re-Run

**Authors:** Hassan Dhia, Haedar Hadi, Ahmed Dhia — H.H.A. Applied Research Institute

**Date:** 2026-04-24

**Parent pre-registration:** `pilot/admin/osf-preregistration-stage2b-draft.md` (RFC 3161 FreeTSA timestamp @ 2026-04-20 13:59:35 UTC, SHA-256 `49fc2b27…`)

**Prior addenda:**
- Addendum #1: `pilot/admin/osf-stage2b-addendum-2026-04-23.md` (RFC 3161 FreeTSA timestamp @ 2026-04-23 13:51:08 UTC, SHA-256 `43808a91…6dd3d26`)
- Addendum #2: `pilot/admin/osf-stage2b-addendum-2026-04-24.md` (RFC 3161 FreeTSA timestamp @ 2026-04-24 18:07:04 UTC, SHA-256 `0c277ba6…957d19`)

**Status:** Addendum #3 filed BEFORE the Gate-2 2b distributed re-run is launched. Parent pre-registration and both prior addenda remain locked and unmodified. This addendum adds two pre-commitments that sharpen the scientific rigor of the re-run beyond what Addendum #2 specified — neither changes any experimental parameter; both are disclosure-and-consistency-check commitments.

**Lock method:** RFC 3161 Trusted Timestamping (FreeTSA) via `pilot/admin/stamp-preregistration.ts` before the distributed Gate-2 2b re-run begins.

---

## Motivation

The 2026-04-23 single-host Gate-2 2b attempt produced clean data for Reps 1–2 (200 traces, 0 parse failures, structurally normal latency and chain-of-thought) before encountering the rate-limit window that corrupted Reps 3–5. Those two "survivor" reps are a uniquely valuable asset: they were generated under the exact pre-registered protocol on Hassan's Mac at a different wall-clock time than the re-run will use, on the same subscription that will run new reps 1–5.

A rigorous reviewer will ask whether the re-run's outputs are consistent with the surviving reps from the failed attempt. If yes, that's strong evidence against within-host temporal drift. If no, we have a genuine host-or-time effect that must be disclosed.

Rather than wait for that reviewer question to surface post-preprint, we pre-commit to the comparison now so it appears in the preprint as a planned consistency check, not a post-hoc defense.

---

## A. Survivor-Rep Consistency Check (Pre-Committed)

### Procedure

1. **Data source.** The two surviving reps from the 2026-04-23 attempt, preserved at `pilot/results/stage2b-gate-2026-04-23-FAILED-ratelimit/EXP-GATE-2-2b/traces.jsonl` (reps 1 and 2 only; all rows with `parse_success=false` excluded, verified by `parse_success=true` filter).

2. **Comparator.** Reps 1 and 2 from Hassan's slice of the distributed re-run (reps 1–5 per Addendum #2 §3 P1). Same spec file, same runner commit, same host.

3. **Comparison dimensions (all pre-committed to be reported, regardless of direction):**
   - Δ_profit at convergence per rep, side-by-side (4 values: old r1, old r2, new r1, new r2).
   - Regime label per rep under the parent pre-reg classifier.
   - Mean price in the converged window per rep.
   - Convergence round per rep.
   - Mean chain-of-thought character length per rep (exploratory, per Addendum #1 §C).
   - Mean parse-success rate per rep (data-quality check).

4. **Reporting location in preprint.** A dedicated subsection titled "Intra-host temporal consistency check: 2026-04-23 survivor reps" within the Results/Methods, with a two-row-by-six-column table and one paragraph of interpretation.

### Decision rule (pre-committed before observation)

Let `Δold` = {Δ_profit old r1, Δ_profit old r2} and `Δnew` = {Δ_profit new r1, Δ_profit new r2}. Compute the regime-label match-rate across the four reps.

- **If all four reps share the same regime label** (all HIGH, all MID, or all LOW under the pre-reg classifier): reported as a **consistency-positive** result. Supports the claim that within-host variation across 24+ hours is not producing regime drift.
- **If three of four reps share the same regime label:** reported as a **partial-consistency** result. Interpretation deferred to the merged n=15 analysis for statistical context.
- **If the four reps split 2–2 across regimes OR any comparison rep lands in a different regime than its survivor-counterpart:** reported as a **consistency-negative** result. Triggers mandatory disclosure of intra-host temporal heterogeneity as a Limitation in the preprint, with the following pre-committed language:

> "A consistency check comparing Reps 1–2 from the 2026-04-23 failed run (before the rate-limit event) against Reps 1–2 from the 2026-04-24+ distributed re-run showed regime disagreement for \[N/4\] reps. This indicates non-trivial within-host temporal variance in basin selection at n=2, which constrains how cleanly we can claim basin-level reproducibility at this sample size. We report the raw comparison and do not exclude either source from the analysis; the merged n=15 distribution is the primary result."

### What this pre-commitment protects against

- **HARKing accusations** on the consistency check (the decision rule is locked before observation).
- **Selective reporting** of Δ_profit numerics (the exact six dimensions must all be reported).
- **Silent data substitution** (survivor reps cannot be retroactively incorporated into the canonical n=15 — they remain an out-of-sample consistency check only).

### Non-inclusion of survivor reps in primary analysis

The 2026-04-23 survivor reps are NOT added to the primary n=15 analysis. They remain a cross-check only. The canonical Gate-2 2b dataset is exactly the 15 reps produced by the distributed re-run per Addendum #2 §3 P1, merged via `pilot/merge-traces.ts`. This preserves pre-registration fidelity: the re-run is the experiment; the survivor reps are a consistency probe.

---

## B. Host-Effect Transparency Expansion (Pre-Committed)

Addendum #2 §3 P6 pre-committed a Fisher's exact test of regime proportions by host if a reviewer challenges the equivalence claim. This addendum strengthens that commitment in two ways:

**B1. Unconditional per-host reporting.** Regardless of whether any reviewer challenges scientific equivalence, the preprint's Methods section will include a per-host descriptive table (or equivalent paragraph) reporting the following for each of the three hosts (Hassan / Haedar / Ahmed):
- Number of reps contributed
- Mean Δ_profit at convergence with bootstrap 95% CI
- Regime distribution (count of HIGH / MID / LOW)
- Mean convergence round
- Mean chain-of-thought length
- Mean wall-clock run duration per rep

These descriptive statistics are reported even if Fisher's exact yields a non-significant result. Transparency beats hypothesis-test sufficiency.

**B2. Fisher's exact run unconditionally.** Fisher's exact on regime proportions by host is run and reported regardless of reviewer challenge. The test result is reported in Methods alongside the per-host descriptive table. If p < 0.05, interpretation follows Addendum #2 §3 P6 (dedicated subsection disclosing host heterogeneity). If p ≥ 0.05, we report the test as a consistency check, not as a null-hypothesis "proof" of host equivalence.

### Pre-committed wording (preprint Methods subsection)

> "Stage 2b Gate-2 2b was executed as a distributed-host protocol per Addendum #2, with 15 pre-registered independent repetitions partitioned into three disjoint 5-rep slices (reps 1–5 on Host A, reps 6–10 on Host B, reps 11–15 on Host C). Per-host descriptive statistics for the co-primary outcomes (Δ_profit at convergence; regime distribution) are reported in Table \[X\]. Fisher's exact test on the 3×3 contingency of regime × host yielded p = \[x.xxx\]. \[If p < 0.05:\] Host heterogeneity is disclosed and discussed in Section \[Y\]. \[If p ≥ 0.05:\] The test is consistent with host-independent basin selection within the statistical power of n=15 at 5 reps per host; this does not constitute proof of equivalence."

---

## C. Relationship to Prior Addenda

- **Parent pre-reg (2026-04-20):** locks co-primary outcomes, sampling plan, convergence criterion, regime classifier, 5% parse-failure halt rule. Unchanged.
- **Addendum #1 (2026-04-23):** locks bootstrap k-selection, Fisher-z CIs, Wu 2025 mechanism, latency caveat, single-model-family caveats. Unchanged.
- **Addendum #2 (2026-04-24):** locks distributed-execution protocol, runtime instrumentation upgrades (commit the runtime-hardening commit), Fisher's exact host-effect test availability. Unchanged except strengthened by §B below (Fisher's exact is now *unconditional*, not only on reviewer challenge).
- **Addendum #3 (2026-04-24, this file):** adds survivor-rep consistency check (§A) and unconditional per-host reporting + Fisher's exact (§B). No experimental parameter modified.

---

## D. Summary of Pre-Committed Decisions Added by This Addendum

- [ ] Survivor-rep comparison procedure and decision rule locked (§A).
- [ ] Pre-committed preprint wording for consistency-negative result locked (§A decision rule).
- [ ] Survivor reps are OUT-OF-SAMPLE cross-check only; not added to primary n=15 (§A non-inclusion clause).
- [ ] Per-host descriptive statistics reported unconditionally, even if no reviewer challenges (§B1).
- [ ] Fisher's exact host-effect test run unconditionally (§B2).
- [ ] Preprint Methods wording for distributed-execution disclosure pre-committed (§B end).

---

## E. Filing Procedure

1. This file is written to `pilot/admin/osf-stage2b-addendum-2026-04-24b.md`.
2. RFC 3161 timestamp token generated via:
   ```
   bun pilot/admin/stamp-preregistration.ts pilot/admin/osf-stage2b-addendum-2026-04-24b.md
   ```
3. Both `.md` and `.md.tsr` committed to `<dev-branch>` BEFORE any teammate launches their distributed Gate-2 2b slice.
4. Verification via OpenSSL against FreeTSA's public certificate chain; any modification to `{file}.md` after stamping invalidates the token.

---

## References

- Parent pre-reg: `pilot/admin/osf-preregistration-stage2b-draft.md` (+ `.tsr`)
- Addendum #1: `pilot/admin/osf-stage2b-addendum-2026-04-23.md` (+ `.tsr`)
- Addendum #2: `pilot/admin/osf-stage2b-addendum-2026-04-24.md` (+ `.tsr`)
- Protocol-violation note: `pilot/admin/team-notes/2026-04-24-gate-2-2b-protocol-violation.md`
- Failed-run survivor traces: `pilot/results/stage2b-gate-2026-04-23-FAILED-ratelimit/EXP-GATE-2-2b/traces.jsonl` (rows where `repetition ∈ {1, 2}` AND `parse_success=true`)
- Runtime-hardening commit: the runtime-hardening commit on `<dev-branch>`
