# Iteration 4 Gap List — ColludeBench Stage 2b Preprint

**Iteration:** 4
**Date:** 2026-05-04
**Branch:** `hr/stage-2-gate-experiment`
**Input commit (state reviewed):** `ee22fa1` (Haedar pre-Council edits 1+2 applied on top of `2f41020` §5.2.1 REVERSAL)
**Output commits (state after iter-5 input fix batch):** `2226a21` (Addendum #6 + analyzer + .tsr stamp + result) + `e19b20f` (Tier 1+2 LaTeX + SR-M registry) + `<this-commit>` (Tier 3 #4+#5 promotions)
**Reviewer panel:** 6 agents per AppliedResearch Review.md spec — Academic, Methods/Reproducibility, Devil's Advocate, Consistency, IO Domain Expert Simulator, Writing Quality
**Aggregate severity:** 1 CRITICAL + 11 HIGH + 12 MEDIUM + 7 LOW
**Verdict:** NOT CLEAN — fix batch executed; iter-5 to follow

---

## Per-reviewer verdicts

| Reviewer | Verdict | HIGH+CRITICAL count |
|---|---|---|
| Academic | NOT-CLEAN-HIGH | 2 HIGH |
| Methods/Reproducibility | APPROVED-MEDIUM | 1 HIGH (SR-M-6 missing) |
| Devil's Advocate | NOT-CLEAN-CRITICAL | 1 CRITICAL + 4 HIGH |
| Consistency | APPROVED-MEDIUM | 0 (one MEDIUM = SR-M-6) |
| IO Domain Expert Simulator | NOT-CLEAN-HIGH | 3 HIGH |
| Writing Quality | APPROVED-MEDIUM | 1 HIGH (§5.2 L22 hedge stack) |

---

## CRITICAL findings (1) + resolutions

| ID | Reviewer | Finding | Resolution |
|---|---|---|---|
| C1 | DA | §1 Contribution 3 / §5.2.1 collision: Contribution 3 frames LLM bimodality conditionality on agent count, but the only mechanism the paper offered (cross-sectional-signal reading (a)) was knocked out by §5.2.1 REVERSAL; Contribution 3 implicitly depends on rejected reading | RESOLVED `e19b20f`: §1 Contribution 3 rewritten to explicitly cite Addendum #5 reversal + Addendum #6 (a') support; mechanism now properly attributed |

---

## HIGH findings (11) + resolutions

### §5.2.1 downstream integration (5 findings)
| ID | Reviewer | Finding | Resolution |
|---|---|---|---|
| H1 | Academic | §4.1 + §4.4 forward-refs to §5.2 basin-width framing are stale post-§5.2.1 reversal | RESOLVED `e19b20f`: §4.1 caption + §4.4 caption add "(mechanism refined to reading (a') in §5.2.1)" / "(mechanism refined in §5.2.1)" |
| H2 | Academic | §5.2 ¶34 still pre-commits "reading (a) as hypothesis under test" without acknowledging §5.2.1 reversal; reader sees internal contradiction | RESOLVED `e19b20f`: §5.2 ¶34 harmonized — acknowledges Addendum #5 reversal + Addendum #6 (a') support inline |
| H3 | DA | §5.2 ¶34 hidden retreat — pre-commit language stale | RESOLVED with H2 |
| H4 | Methods/Repro + Consistency | SR-M-6 missing for §5.2.1 mechanistic claim | RESOLVED `e19b20f`: SR-M-6 entry added; SR-M-7 also added for Addendum #6; registry summary 5 → 7 |
| H5 | DA | §1 Intro mechanism sentence (¶44-47) assumes reading (a) is operative; never gets §5.2.1 heads-up | RESOLVED `e19b20f`: Intro mechanism paragraph extended with §5.2.1 forward-ref clause |

### Channel (iii) residualization (2 findings)
| ID | Reviewer | Finding | Resolution |
|---|---|---|---|
| H6 | DA | Channel (iii) residualization is doable on EXISTING Stage 2b traces; deferring to Stage 4 is "indefensible" — total CoT word count is in the JSON, residualization is single regression | RESOLVED `2226a21`: Addendum #6 pre-committed + RFC 3161 stamped (SHA-256 `15d5663...b65606`, May 4 05:36:42 2026 GMT) + new analyzer `pilot/analyze-cot-residualized.ts` ran on locked traces |
| H7 | IO Domain Expert | 5.8× decomposes mechanically into ~4× N-1 collapse + ~1.45× signal; "REVERSAL" framing overstates until residualization runs | RESOLVED via Addendum #6: result was REVERSAL SURVIVES RESIDUALIZATION; talk volumes nearly identical (195.15 vs 194.67 words/CoT-round); mean residuals disjoint with GATE-2 +2.040 vs GATE-5 −0.408 (CIs disjoint, GATE-2 ~5× higher residual). Refined reading (a') supported on Stage 2b data even controlling for talk volume |

### Framing integrity (2 findings)
| ID | Reviewer | Finding | Resolution |
|---|---|---|---|
| H8 | DA | "Reading (a) as initially formulated" + refined (a') reads as Lakatosian post-hoc auxiliary-hypothesis rescue | RESOLVED `e19b20f`: §5.2.1 paragraph header changed from "Empirical anchor" to "Empirical test" (it WAS a test, not a confirmatory anchor); §5.2 acknowledgment paragraph rewritten as honest "test ran, result reversed reading (a), refined reading (a') tested via Addendum #6 and survived." Not a Lakatosian rescue because (a') made a falsifiable prediction (rate gap survives talk-volume control) and the prediction was confirmed |
| H9 | DA | Measurement validity caveat necessary but insufficient — bootstrap CIs reported as headline statistics with unvalidated regex is canonical p-hacking-via-measurement | RESOLVED `e19b20f`: caveat rewritten — bootstrap CIs explicitly flagged as resampling-variance-only (not construct validity); v1→v2 widening directional-bias risk named explicitly; gold-standard subset deferred but acknowledged as the right bound |

### IO substance (2 findings — surfaced for Hass judgment as Tier 3)
| ID | Reviewer | Finding | Resolution |
|---|---|---|---|
| H10 | IO Domain Expert | Stigler 1964 free-rider tension acknowledged but not resolved — Stigler is price-theoretic, not attention-budget | DEFERRED Tier 3: Hass judgment call (paragraph add vs explicit out-of-scope frame) |
| H11 | IO Domain Expert | IO-standard robustness analyses absent (Cournot, asymmetric cost, demand-shock, best-response); §6.2 says "Stage 3+" without specifying | DEFERRED Tier 3: Hass judgment call (§6.2 deferral grid) |

### Writing (1 finding)
| ID | Reviewer | Finding | Resolution |
|---|---|---|---|
| H12 | Writing Quality | §5.2 L22 six-hedge sentence stacks defenses around single criticism | RESOLVED `e19b20f`: split into two clean sentences |

(Plus Writing Quality + DA flagged "annotated to death" recurrence as slightly worse — addressed indirectly by H8 Lakatosian reframe + L22 split + Edit-2 measurement caveat tightening)

---

## MEDIUM findings (12) — selected

| ID | Reviewer | Finding | Status |
|---|---|---|---|
| M1 | Academic | n_round 7500/1500 not in body text | RESOLVED `e19b20f`: §5.2.1 prose now includes "$n_{\text{round}} = 7500$ at GATE-5 and $1500$ at GATE-2" |
| M2 | Academic | Edit 1 doesn't bound what Stage 4 will NOT adjudicate | RESOLVED `e19b20f`: §5.2.1 channel ¶ adds "None of the three independently adjudicates strategic-complexity content vs content-free reference noise — a CoT-content-coding analysis is pre-committed for Stage 4 supplementary" |
| M3 | Academic | Edit 2 doesn't name asymmetric-overfit-to-GATE-2 directional bias | RESOLVED `e19b20f`: caveat now names "an asymmetric overfit to GATE-2 patterns is the specific threat that the deferred gold-standard subset would bound" |
| M4 | Methods/Repro | SR-M-1 needs footnote noting §5.2.1 complicates basin-width-by-signal-poverty | NOT RESOLVED — minor; deferred (SR-M-1 PASS scope is convergence asymmetry itself, not the mechanism) |
| M5 | Methods/Repro | Analyzer self-exclusion edge case ("Then I'll match competitor's price") | NOT RESOLVED — edge case; documented for Stage-3 analyzer revision |
| M6 | Methods/Repro | §A.4 normalization: 5.8× has definitional structure component; raw-channel ratios should be in body sentence | RESOLVED `e19b20f`: §5.2.1 prose adds "(raw literal-channel ratio $1.11\times$; raw co-referent ratio $2.65\times$)" |
| M7 | DA | Table caption celebrates 5.8× as if metric were validated | RESOLVED `e19b20f`: new tab:cot-residualized caption flags "Bootstrap CIs reflect resampling variance only; see measurement validity caveat below"; Edit 2 caveat tightened |
| M8 | IO Domain Expert | Δ_profit half-gap needs welfare-loss translation | DEFERRED Tier 3 |
| M9 | IO Domain Expert | Q-learner positive control should be PROMOTED post-§5.2.1 | RESOLVED `<this-commit>` (Tier 3 #4): one-sentence promotion in §5.2.1 talk-volume-control paragraph |
| M10 | IO Domain Expert | Conditionality result lift to co-equal headline | RESOLVED `<this-commit>` (Tier 3 #5): §1 headline paragraph adds "As a co-equal headline, the bimodal $k=2$ basin structure ... is conditional on agent count" |
| M11 | Writing Quality | Edit 1 90+-word channel sentence reads as defensive list | NOT RESOLVED — sentence simplification deferred (still long but content is structurally necessary) |
| M12 | Writing Quality | §5.3 L94 opinion-as-claim sentence ("we recommend the practice as a default") | NOT RESOLVED — minor preference; deferred |

---

## LOW findings (7)

Mostly cosmetic polish items deferred to post-iter-5 final pass.

---

## Independent verification paths (for Haedar)

1. **Reviewer panel composition** — see this file §"Per-reviewer verdicts"; each reviewer was a `general-purpose` Agent invocation with focused prompt covering specific reviewer role + access to the modified preprint sections. Spawn pattern: 6 parallel `Agent` calls in one message.

2. **Iter-4 input state** — `git checkout ee22fa1`; `cat preprint/sections/05-discussion.tex` and review §5.2 + §5.2.1.

3. **Channel (iii) residualization independent verification:**
   ```bash
   shasum -a 256 pilot/admin/osf-stage2b-addendum-2026-05-04.md
   # expected: 15d5663625a08660c27a9761ac2d722c1e124a75cc343aea728896a827b65606
   openssl ts -reply -in pilot/admin/osf-stage2b-addendum-2026-05-04.md.tsr -text 2>&1 | grep "Time stamp"
   # expected: Time stamp: May  4 05:36:42 2026 GMT
   git log --oneline -8 hr/stage-2-gate-experiment
   # expected sequence with 2226a21 (stamp commit) topologically before §5.2.1-update commit
   bun pilot/analyze-cot-residualized.ts
   # expected output (key fields):
   #   conditions.GATE-5.mean_words: 195.15 [194.44, 195.87]
   #   conditions.GATE-2.mean_words: 194.67 [193.18, 196.16]
   #   conditions.GATE-5.mean_residual: -0.408 [-0.416, -0.400]
   #   conditions.GATE-2.mean_residual: +2.040 [+1.951, +2.130]
   #   decision_rule.combined: REVERSAL SURVIVES RESIDUALIZATION
   ```

4. **§5.2.1 numeric cross-checks** — every value in §5.2.1 prose + Tables `tab:cot-cross-references` and `tab:cot-residualized` traces to one of:
   - `pilot/results/cot-cross-references-2026-05-03.json` (Addendum #5)
   - `pilot/results/cot-residualized-2026-05-04.json` (Addendum #6)

5. **SR-M-6 + SR-M-7 entries** — `.reviews/mechanistic-claims.md` lines 89+ (SR-M-6) and 113+ (SR-M-7); each includes primary-source target, falsification test path, falsification condition, rescope fallback.
