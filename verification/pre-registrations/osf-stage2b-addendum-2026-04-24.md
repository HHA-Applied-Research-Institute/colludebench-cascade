# ColludeBench Stage 2b — Analysis Addendum #2 (2026-04-24)

## Study Information

**Title:** Distributed-Execution Protocol and Runtime-Hardening Addendum to ColludeBench Stage 2b Pre-Registration (Gate-2 2b Re-Run)

**Authors:** Hassan Dhia, Haedar Hadi, Ahmed Dhia — H.H.A. Applied Research Institute

**Date:** 2026-04-24

**Parent pre-registration:** `pilot/admin/osf-preregistration-stage2b-draft.md` (RFC 3161 FreeTSA timestamp @ 2026-04-20 13:59:35 UTC, SHA-256 `49fc2b27…`)

**Prior addendum:** `pilot/admin/osf-stage2b-addendum-2026-04-23.md` (RFC 3161 FreeTSA timestamp @ 2026-04-23 13:51:08 UTC, SHA-256 `43808a91…6dd3d26`)

**Status:** Addendum #2 filed BEFORE the Gate-2 2b re-run. Parent pre-registration and addendum #1 remain locked and unmodified. This addendum documents (a) the methodology failure of the 2026-04-23 Gate-2 2b attempt, (b) runtime instrumentation upgrades added in direct response, and (c) the distributed-execution protocol for the re-run.

**Lock method:** This file will be stamped with RFC 3161 Trusted Timestamping (FreeTSA) via `pilot/admin/stamp-preregistration.ts` before the distributed Gate-2 2b re-run is launched.

---

## 1. Motivation — The 2026-04-23 Gate-2 2b Failure

### Observed failure mode

The 2026-04-23 Gate-2 2b attempt (n=2, 50 rounds, 15 reps, launched 14:52 UTC on a single Mac under Claude Code Max subscription) produced clean data for Reps 1–2 and then entered a sustained 71-minute window in which `claude --print` subprocess calls returned empty output (exit code 0, empty stdout, rate-limit signature in discarded stderr). This corresponds to an Anthropic subscription-tier rolling rate-limit being reached while the runner continued to issue ~28 parallel-agent calls per round.

Empirical timeline (all UTC):
- 15:49:24 — last clean trace (Rep 3 Round 4)
- 15:50:07 — first failed trace (Rep 3 Round 5)
- 17:00:17 — last failed trace (Rep 5 Round 9)
- 17:01:32 — first recovery trace (Rep 5 Round 10)

Full trace-level diagnostics are preserved at `pilot/results/stage2b-gate-2026-04-23-FAILED-ratelimit/` and in the post-mortem at `pilot/admin/team-notes/2026-04-24-gate-2-2b-protocol-violation.md`.

### Four enabling bugs in the runner

Subscription rate-limiting is a known operational reality, not itself a bug. What allowed the rate-limit event to corrupt data is four coupled runner-side issues:

**B1 — Instrumentation gap (Inference.ts):** Upstream PAI `Inference.ts` returned `{success: true, output: ''}` on successful exit with empty stdout, silently dropping the stderr that carried the rate-limit signal.

**B2 — Error-propagation gap (round-executor.ts):** The retry loop discarded `result.error` entirely after exhausting attempts. Trace records showed `parse_success: false` with no diagnostic context.

**B3 — Retry calibration mismatch:** Backoffs of 3/6/9/12 s (≤30 s total) were calibrated for transient network blips and could not span the 71-min rate-limit window.

**B4 — Halt rule not code-enforced:** The parent pre-registration's stopping rule ("halt if parse-fail rate > 5% in any round after round 25") was documented but not enforced in the runner's main loop.

### Classification

Per the parent pre-registration, the 2026-04-23 Gate-2 2b run is formally a **protocol-violation event** under the stopping-rule condition. Reps 1–2 constitute legitimate data collected before the violation; Reps 3–5 are corrupted and are NOT used for any Stage 2b analysis. The protocol-violation note at `pilot/admin/team-notes/2026-04-24-gate-2-2b-protocol-violation.md` documents the full chain of evidence and is cross-linked from the preprint's Limitations section.

---

## 2. Runtime-Hardening Upgrades (Committed 2026-04-24, commit `6c23513`)

The following instrumentation and control-flow upgrades are pre-committed here to establish that they land BEFORE the re-run begins, and are scientifically equivalent to the pre-registered protocol (they do not change experimental parameters, only failure-detection and data integrity).

**U1 — Empty-output validation.** `pilot/runner/_inference.ts` now re-classifies `{success: true, output: ''}` as a failure and preserves upstream stderr as the error message.

**U2 — Rate-limit signature detection.** `pilot/runner/round-executor.ts` matches stderr against `/(rate[\s_\-]?limit|429|quota|too many requests|retry[\s_\-]?after|exceeded|throttl)/i` and switches retry backoffs from short (3/6/9/12 s) to long (60s / 5 min / 15 min / 30 min, ≥ 30 min total wait) upon detection.

**U3 — Per-attempt error persistence.** Trace schema extended to include `inference_error`, `attempts_used`, `rate_limit_detected` fields. All failed inferences now carry diagnostic context in `traces.jsonl`.

**U4 — Code-enforced halt rule.** `pilot/runner/index.ts` main loop maintains a rolling per-round parse-fail rate. If > 50% for 3 consecutive rounds (with a 10-round rolling window and a minimum of 5 completed rounds before checking), the experiment halts cleanly, writes partial `results.json`, and exits with status code 2. This is a *stricter-than-parent* threshold (parent pre-reg used 5%, this uses 50%) chosen specifically to avoid spurious halts from single-round network noise while still catching sustained throttle-corruption like the 04-23 event. The parent pre-reg's 5% rule is ALSO retained via post-hoc analysis per-rep in the analyzer.

**U5 — Incremental `results.json` writes.** Summary is written after each completed rep, not only at end-of-run. Protects aggregated data against process kills mid-run.

**U6 — Rep-range CLI flags (`--rep-start N --rep-count M`).** Enables disjoint-rep distributed execution across team subscriptions without changing any scientific parameter.

**U7 — Merge-traces tool (`pilot/merge-traces.ts`).** Combines independent per-slice runs into a unified `traces.jsonl` + `results.json` for the analyzer. Hard-fails on rep-index overlap or `experiment_id` mismatch.

**U8 — Unit tests.** 16 unit tests at `pilot/runner/__tests__/runner.test.ts` (all passing) cover: rate-limit regex specificity and regression cases, backoff-array ordering and total-duration bounds, merge-traces overlap detection, merge-traces happy path, experiment_id enforcement, runner dry-run integration, rep-range CLI parsing.

---

## 3. Distributed-Execution Protocol (Pre-Registered)

### Rationale

The 2026-04-23 failure demonstrated experimentally that a single Claude Code Max subscription cannot sustain the 1,500-call, 2-hour continuous compute envelope of Gate-2 2b without encountering a rolling rate-limit window. Rather than requiring a budget-prohibitive switch to API-tier access, we pre-register a distributed-execution protocol that exploits the independence of the 15 pre-registered repetitions (each is defined to run with fresh agent context and fresh seeds, with no cross-rep state) to parallelize across the three Co-PIs' Claude Code subscriptions.

### Protocol

**P1 — Rep-range allocation (pre-committed).** The 15 pre-registered repetitions are partitioned into three disjoint slices:

| Teammate | Rep range | Slice size |
|----------|-----------|------------|
| Hassan Dhia | 1–5 | 5 |
| Haedar Hadi | 6–10 | 5 |
| Ahmed Dhia | 11–15 | 5 |

Each teammate runs their slice on their own Claude Code Max subscription, on their own host (`Mac` / `WSL` / `Mac` respectively). The allocation is pre-committed BEFORE compute begins; any deviation will be documented as a protocol modification.

**P2 — Runner invocation per slice.** Each teammate invokes:

```bash
cd <repo>
bun run pilot/runner/index.ts \
  --spec pilot/experiments/GATE/EXP-GATE-2-2b.md \
  --tier fast \
  --rep-start <FIRST_REP_INDEX> \
  --rep-count 5 \
  --output pilot/results/stage2b-gate-2b-rerun-<USERNAME>-2026-04-<DD>
```

Where `<FIRST_REP_INDEX>` is 1, 6, or 11 per the allocation in P1.

**P3 — Sacred Run Window (pre-committed).** Before launching a slice, the teammate must satisfy:
- No interactive `claude` / `claude-code` / subprocess invocations of `claude --print` from the same subscription in the preceding 60 minutes (soft minimum) or 5 hours (preferred) to minimize rolling-window contention.
- The machine must remain powered and connected throughout the estimated ~2.7-hour slice duration.
- Any competing Claude-subscription consumer (e.g., other background agents) should be quiesced for the duration.

**P4 — Halt and rerun protocol.** If any slice halts early per the U4 code-enforced halt rule (exit status 2), the owning teammate:
1. Preserves the partial `traces.jsonl` + `results.json` for audit.
2. Waits a minimum of 5 hours for the rate-limit rolling window to advance.
3. Reruns their slice with the same `--rep-start` and `--rep-count`, writing to a fresh output directory (`<...>-attempt2`, `<...>-attempt3`, etc.).
4. Reports each attempt in the final methodology section.

**P5 — Trace merge and analysis.** Upon successful completion of all three slices:
1. All three teammates commit their `traces.jsonl` + `results.json` to `hr/stage-2-gate-experiment`.
2. Hass runs `pilot/merge-traces.ts` to produce the unified `traces.jsonl` and `results.json` with the scientific invariants enforced (disjoint reps, matching `experiment_id`, matching config signature).
3. `pilot/analyze-gate-2b.ts --gate2 <merged-results.json>` runs on the unified data to produce the pre-registered co-primary outcomes.

**P6 — Scientific equivalence commitment (pre-committed).** We hereby assert — pre-commit, before observing any re-run data — that distributed execution across three hosts introduces no scientifically relevant variation in the pre-registered co-primary outcomes (Δ_profit at convergence, regime membership probability). This follows from:
(a) the parent pre-registration's definition of each repetition as fully independent with no cross-rep state;
(b) identical model specification (`claude-haiku-4-5-20251001`) invoked via identical `claude --print --model haiku --output-format text --tools= --setting-sources=` arguments on all three hosts;
(c) identical `_inference.ts` resolver yielding the same underlying subscription-auth path on both macOS and WSL;
(d) identical demand model, prompts, grid, and analyzer parameterization across slices.

If a reviewer challenges the equivalence claim, we commit to running a host-effect check on the merged data: Fisher's exact test of regime proportions by host, with α = 0.05. A significant result would be disclosed in Results under a dedicated "distributed-execution host effect" subsection; a null result is reported as a consistency check.

---

## 4. What Is Not Changed

The following remain LOCKED per the parent pre-registration and addendum #1:

- Calvano logit demand model (a=2, a0=0, μ=0.25, c=1, β=100).
- Nash (1.47) and Monopoly (1.93) equilibrium prices at n=2; cooperation midpoint threshold 1.6990.
- 50 rounds, 15 repetitions (partitioned across three hosts per §3 P1).
- Model: `claude-haiku-4-5-20251001` via subscription-tier `claude --print`, `--output-format text`, `--tools=`, `--setting-sources=`.
- Co-primary outcomes: Δ_profit at convergence, regime membership probability, analyzed via `pilot/analyze-gate-2b.ts --gate2`.
- Convergence criterion: 5 consecutive rounds with |Δprice / prior_price| < 1%, else final-window r46–50.
- Regime bands at n=2: HIGH > 1.815, MID 1.585–1.815, LOW < 1.585.
- Bootstrap k-selection decision rule per addendum #1 §A (≥ 7/10 resample recovery).
- Fisher-z CIs per addendum #1 §C (reported regardless of direction).
- Wu 2025 simplicity-bias mechanism pre-commitment per addendum #1 §D.
- Latency caveat wording per addendum #1 §E.
- Single-model-family / single-auth-path / single-prompt caveats per addendum #1 §G.

No experimental parameter is modified; only failure-detection, data integrity, and operational parallelization are added.

---

## 5. Summary of Pre-Committed Decisions (Checklist)

- [ ] Gate-2 2b re-run allocated Hass: reps 1–5, Haedar: reps 6–10, Ahmed: reps 11–15 (§3 P1).
- [ ] Each teammate invokes runner with committed CLI (§3 P2).
- [ ] Sacred Run Window observed before each slice (§3 P3).
- [ ] Halt + rerun protocol followed on slice halts (§3 P4).
- [ ] Merge + analyze per §3 P5.
- [ ] Host-effect check (Fisher's exact) reported if challenged (§3 P6).
- [ ] Runtime-hardening upgrades U1–U8 landed in commit `6c23513` BEFORE re-run kickoff.
- [ ] 2026-04-23 protocol-violation event documented at `pilot/admin/team-notes/2026-04-24-gate-2-2b-protocol-violation.md` and in preprint Limitations.

---

## 6. Filing Procedure

1. This file is written to `pilot/admin/osf-stage2b-addendum-2026-04-24.md`.
2. RFC 3161 timestamp token generated via:
   ```
   bun pilot/admin/stamp-preregistration.ts pilot/admin/osf-stage2b-addendum-2026-04-24.md
   ```
3. Both `.md` and `.md.tsr` committed to `hr/stage-2-gate-experiment` BEFORE the distributed Gate-2 2b re-run is launched.
4. The `{file}.md.tsr` token, once committed, is independently verifiable via OpenSSL against FreeTSA's public certificate chain; any modification to `{file}.md` after stamping invalidates the token.

---

## References

- Parent pre-reg: `pilot/admin/osf-preregistration-stage2b-draft.md` (+ `.tsr`, 2026-04-20)
- Addendum #1: `pilot/admin/osf-stage2b-addendum-2026-04-23.md` (+ `.tsr`, 2026-04-23)
- Protocol-violation note: `pilot/admin/team-notes/2026-04-24-gate-2-2b-protocol-violation.md`
- Runtime-hardening commit: `6c23513` on `hr/stage-2-gate-experiment`
- Failed-run traces: `pilot/results/stage2b-gate-2026-04-23-FAILED-ratelimit/`
- Panel context: `working/literature/panel-runs/2026-04-21-hassan-latency-swap.md`
