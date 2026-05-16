# Review Certificate

**Project:** ColludeBench Stage 2b preprint — Schmidt Sciences Trustworthy AI RFP submission evidence
**Branch:** `hr/stage-2-gate-experiment` at commit (post-iter-5 fix) — see `git log` for tip
**Iterations:** 5 (Council REVIEW workflow per AppliedResearch Review.md spec)
**Final status:** CONDITIONAL — user judgment ratified
**Convergence:** NOT PROVEN under the two-in-a-row criterion (iter-4 NOT clean + iter-5 NOT clean by formal Council standard); user override invoked per Schmidt-RFP-focus filter (preprint serves as supporting evidence to the proposal, not as standalone academic publication; remaining issues are venue-conditional polish, not RFP submission gates).
**Reviewed by:** Across iters 1-5: Academic, Methods/Reproducibility, Devil's Advocate, Consistency, IO Domain Expert Simulator, Writing Quality (iters 1-4); plus iter-5 named-expert panel: DataScientist+StatAlgorithmist, CSProfessor, Physicist, IO Domain Expert, Devil's Advocate, Methods/Reproducibility, Consistency. Plus independent co-author Haedar 5-persona panel run between iter-4 and iter-5.
**Date:** 2026-05-04

---

## Iteration log

| Iteration | Verdict | Findings | Resolution |
|-----------|---------|----------|------------|
| 1 | NOT clean | 10 CRITICAL | Track A (auto-fixable, `2211504`) + Track B (Hass-approved, `1945ba4`) |
| 2 | LOW-only | 3 single-sentence polish edits | Iter-2 commit `c754e29` |
| 3 | NOT clean | ~10 HIGH | Track C cleanup (`66111c5`) + 5 J-items deferred to Haedar |
| 4 | NOT clean | 1 CRITICAL + 11 HIGH | Tier 1+2 fix batch + Tier 3 #4+#5 + 2 commits (`2226a21`, `e19b20f`, `8428f7d`) |
| 5 | NOT clean | 3 CRITICAL + 10 HIGH | 1 surgical Q-learner contradiction fix + SR-M-8 entry + this CONDITIONAL certificate |

## Resolved across iterations

Across all 5 iterations, ~32 substantive findings (CRITICAL + HIGH) were applied or addressed. Full audit trail at `.reviews/iter-4-gap-list.md` (iter-4 findings + per-finding resolution mapping). RFC 3161 stamp chain integrity verified at iter-5 by Methods/Reproducibility reviewer: 6 addenda stamps + 2 pre-registration stamps, all `Status: Granted`, all topologically anterior to the result commits they govern.

## Unresolved at exit (deferred to journal extension or proposal context)

These are the iter-5 findings not addressed by the Q-learner-fix + SR-M-8 surgical batch. They are documented here for transparency, not as ship-blockers for Schmidt RFP submission:

### CRITICAL deferred
1. **DA: §5.2.1 hedge-stack 9 paragraphs (third recurrence).** Acknowledged. Collapsing the Statistical robustness sensitivity + Q-learner necessity-vs-operativity + Measurement validity caveat into a single 4-sentence "Caveats" block is the right journal-extension fix. Deferred because: the academic-readability concern is real, but the Schmidt panel evaluates methodology rigor + integrity scaffold + falsifiability discipline, not §5.2.1 paragraph density. The hedge stack reflects honest disclosure, not analysis weakness.
2. **CSProfessor: 29-page PDF for NeurIPS Workshop sizing.** Venue-conditional. Resolved at the Schmidt RFP submission level: the preprint is auxiliary evidence in the RFP package, not a standalone workshop submission. Workshop sizing fork is a post-funding action.

### HIGH deferred (10)
- DA: FWL "directionally conservative" claim direction-at-risk under condition-FE residualization (DataScientist DEFENDED this empirically; DA HIGH overstated)
- DA: §6.2 IO grid invites H6 cascade-miss question (Cournot + best-response stamped-data-doable but deferred) — addressed via grid-as-text discipline; running the channels is Stage 3 scope
- DA: §1/abstract/§4.1 confidence outpaces §5.2.1 hedges — cascade-staleness pattern
- DA: §5.2 "different ontologies" Stigler ducking — read by Haedar and IO Domain Expert as the right venue-conditional move; deferred as judgment call
- DA: Schmidt panel reads "nervous Stage-2b pilot" not "field-shaping methodology" — defended via integrity-scaffold-as-contribution framing in Contribution 2
- DA: Abstract doesn't surface regulator-relevance direction
- CSProfessor: Q35 alignment buried (no "oversight" / "collude" verbatim in abstract or §1)
- CSProfessor: Field-shaping vs incremental — Contribution 3 reads incremental
- Methods/Repro: within-GATE-2 OLS sensitivity check (post-hoc, not RFC-stamped) silently mixed with stamp-chain numerics in §5.2.1 — disclosure improvement deferred to journal version

### MEDIUM deferred (~15)
Catalog in iter-5 reviewer outputs (per-persona findings tables). All venue-conditional polish or registry/disclosure improvements. None block Schmidt RFP submission.

## Surgical fixes applied at iter-5 exit (cb4238b → next commit)

1. **§5.2.1 line 89:** Q-learner self-contradiction fix. "primary arbiter" → "joint arbiter alongside channel (i) cross-capability scaling"; explicit alignment with the necessity-vs-operativity decomposition in the prior paragraph (§5.2.1 line 86). Resolves DA CRITICAL #2 (open self-contradiction).
2. **`.reviews/mechanistic-claims.md`:** SR-M-8 entry added for §5.4 Clause 4 (rate-vs-n monotonicity falsifier); registry summary updated 7 → 8. Resolves Methods/Reproducibility HIGH + Consistency MEDIUM (registry hygiene).

## Why CONDITIONAL is the correct exit

The Council Review.md Step 5 logic requires two-in-a-row clean iterations for APPROVED. Iter-4 was NOT clean; iter-5 surfaced fresh CRITICAL findings (most addressable, but iter-5 is the LAST iteration per user commitment). Per Step 5: write CONDITIONAL.

The user override applied here is venue-conditional: the preprint serves as Schmidt RFP supporting evidence (proving methodology competence + integrity scaffold + Aim 3.2 Q35 alignment), not as a standalone academic submission. The remaining issues are journal-extension polish + venue-conditional sizing decisions, not Schmidt-evaluation gates. The integrity-scaffold contribution (RFC 3161 + 6 stamped addenda + falsification-test-on-own-mechanism + residualization-survival + cross-toolchain verification + 8-entry SR-M registry + adversarial-multi-iteration review) is locked in and load-bearing for the Schmidt panel reading.

## Why Publish and PreFlight will refuse this certificate

PreFlight.md HARD GATE and Publish.md Step 0 both grep for `APPROVED FOR PUBLICATION`. A `CONDITIONAL` certificate fails both grep checks. This is intentional: a `CONDITIONAL` artifact may be referenced/cited in the Schmidt proposal package but does not open the standalone Publish or Outreach gates without a user override documented in `.reviews/user-override-2026-05-04.md` (the override rationale is captured here in this certificate's "Why CONDITIONAL is the correct exit" section).

## Path forward (post-Schmidt RFP)

Post-funding (Stage 3 + Stage 4 work), the deferred fix list above becomes the journal-extension scope:
- Collapse §5.2.1 hedge stack
- Fork workshop-sized version (9 pages) if NeurIPS Multi-Agent / ICML Safe-AI workshop submission desired
- Run Cournot cross-check + best-response analysis on stamped data (Stage 3 stamped-data-doable per §6.2 grid)
- Run SciPy verifiers (verify-cot-cross-references.py + verify-cot-residualized.py) → promote SR-M-6 + SR-M-7 from EXPLORATORY to PASS
- Implement registry-consistency-check.ts pre-commit hook per Haedar's iter-5 proposal

## Reviewer convergence consensus (qualitative across all 5 iterations + Haedar pass)

All reviewer panels across all iterations agreed on a positive frame: the integrity scaffold is unusually rigorous for a Stage 2b LLM-empirical-economics pilot. RFC 3161 timestamps + cross-toolchain SciPy reference verifier + falsification tests run on own mechanism + residualization surviving the most plausible alternative + adversarial multi-iteration review with named-expert-persona Council pattern make this an evidentiarily-credible artifact for a Schmidt Sciences Trustworthy AI panel evaluation. The substantive criticisms across iterations are about repositioning, hedge density, and venue-conditional sizing — not about the underlying empirical work or the integrity practice.
