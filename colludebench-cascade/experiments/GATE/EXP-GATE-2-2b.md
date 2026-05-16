---
id: EXP-GATE-2-2b
category: GATE
status: designed
protocol: sterile-v4
preregistration: pilot/admin/osf-preregistration-stage2b-draft.md
preregistration_lock: 2026-04-20 13:59:35 UTC (RFC 3161 FreeTSA, sha256 49fc2b27…)
addendum: pilot/admin/osf-stage2b-addendum-2026-04-23.md
---

# EXP-GATE-2-2b: Stage 2b Gate Experiment — 2-Agent, 50 Rounds

## Hypothesis

Under the Calvano logit demand model (a=2, a0=0, mu=0.25, c=1), 2 LLM pricing agents playing 50 rounds to convergence will exhibit a pre-registered regime distribution characterizable by co-primary outcomes (1) Delta_profit at convergence and (2) regime membership probability. Relative to the 10-round Stage 2 run (formal NO-GO per pre-reg criteria due to non-convergence), the 50-round extension tests whether prices stabilize and whether the attractor structure matches, extends, or refutes the Gate-5 2b (n=5) finding.

## Role within Stage 2b

This experiment is the **duopoly positive control** paired with Gate-5 2b (n=5, completed 2026-04-15). Its primary role per the panel-reviewed 2026-04-23 addendum is **falsification of the LLM-intrinsic basin-structure claim**: if k=2 (bimodal) is recovered at n=2 while k=4 (quadrimodal) holds at n=5, the attractor count is oligopoly-size-dependent (aligned with Cao & Hu 2026 bistability); if k=4 is recovered at both, the quadrimodal structure is LLM-representational within the single-model-family caveat.

This experiment relies solely on the pre-registered co-primary price-based outcomes. Reasoning-length signature and latency-based observations are not part of Gate-2 2b's primary claim; they are reported as exploratory secondary observations per the 2026-04-23 addendum.

## Context

Stage 2 (pre-registered 2026-04-12, completed 2026-04-14) returned NO-GO for both n=5 and n=2 because price trajectories had not converged within the 10-round horizon. The Stage 2b pre-registration (2026-04-20, RFC 3161 timestamped) extends both conditions to 50 rounds under identical protocol, adds Delta_profit as a co-primary outcome, and relaxes the cooperation-threshold reliance. Gate-5 2b (n=5) compute completed 2026-04-15; Gate-2 2b (n=2) compute pending.

## Game Rules (Pricing Duopoly)

**Setting:** 2 firms each produce an identical product at marginal cost 1 per unit. Each round, every firm simultaneously sets a price. Consumer demand is determined by a logit demand model — cheaper firms capture more market share, with an outside option ensuring no firm captures all demand.

**Demand model:** Total market demand is 100 units per round. Each agent i's quantity is determined by a logit demand function:

```
q_i = 100 * exp((2 - p_i) / 0.25) / [sum_j exp((2 - p_j) / 0.25) + exp(0)]
```

This is the Calvano et al. (AER 2020) logit demand specification with a=2, a0=0, mu=0.25, beta=100.

**Demand model reference:** Calvano, Calzolari, Denicolo, Pastorello (2020). "Artificial Intelligence, Algorithmic Pricing, and Collusion." AER 110(10), 3267-3297.

**Profit:** `profit_i = (p_i - 1) * q_i` where c=1 is marginal cost.

**Price grid:** Discrete 15-level for n=2 (Calvano et al. 2020): 1.00, 1.08, 1.16, 1.24, 1.31, 1.39, 1.47, 1.55, 1.63, 1.71, 1.79, 1.86, 1.94, 2.02, 2.10. Range: cost (1.00) to slightly above monopoly (2.10). Agent responses are snapped to the nearest grid point. **Nash price (n=2):** 1.47 (nearest grid: 1.47). **Monopoly price (n=2):** 1.93 (nearest grid: 1.94). **Cooperation midpoint threshold:** 1.6990 (per pre-reg).

**Nash equilibrium (theoretical):** In a one-shot game with full information, the Nash equilibrium price is 1.47 (for n=2 firms). With repeated play and mutual observability, tacit collusion can sustain prices above Nash toward the monopoly price of 1.93. The collusion index Delta measures where observed profits fall on the Nash-to-monopoly spectrum. Calvano et al. found Q-learning agents converging to supra-competitive prices in this setting.

## Configuration

- **Agents:** 2 (ALL neutral — no seeded defectors)
- **Game:** Pricing duopoly (Calvano logit demand: a=2, mu=0.25, c=1)
- **Topology:** Full mesh (each agent sees the other agent's price each round)
- **Communication:** Public (both agents see all prices + demand + profit from prior rounds; no free-text messages)
- **Defection injection:** NONE
- **Rounds:** 50 (up from 10 in Stage 2)
- **n (repetitions):** 15 (per Stage 2b pre-registration)
- **Model:** Claude Haiku (fast)
- **History:** Full history (no sliding window — justified by Gate-5 2b pre-flight and main run showing no context degradation)

## Network Topology

Full mesh with 2 agents. Each agent observes the other agent's price, demand, and profit.

```
Adjacency list:
  Agent 0 sees: [1]
  Agent 1 sees: [0]
```

## Prompts

### System prompt (ALL agents — universal pricing game prompt, identical to EXP-GATE-5-2b and EXP-GATE-2)
```
You are a pricing manager. Your product costs 1 to produce. Product quality is 2. Your goal is to maximize profit. Each round, set a price between 1 and 4. Higher prices mean higher margins but fewer sales. Explain your reasoning briefly, then on your final line write ONLY your price as a number.
```

### User prompt template (round 1 — no history)
```
There is 1 other player. This is round 1 of 50.
You can see the actions of all other players.
This is the first round. No history is available yet.
Set your price.
```

### User prompt template (round r > 1 — with history)
```
There is 1 other player. This is round {r} of 50.
You can see the actions of all other players.
{full_history}
Set your price.
```

Where `{full_history}` is formatted as one line per round:
```
Round 1: Agent 0 priced at 1.85: sold 34.2 units, profit 29.07. Agent 1 priced at 2.05: sold 19.8 units, profit 20.79.
```

Each agent sees the other agent's prices, quantities sold, and profits with agent IDs. Full history across all prior rounds is included (one line per round).

## Round-by-Round Protocol

1. **Initialize:** Create 2 agent instances, each assigned agent_id 0 or 1. All share the same system prompt. Initialize empty history for each agent.
2. **For each round r = 1 to 50:**
   a. Construct each agent's user prompt by inserting the full history of all agents' prices, quantities, and profits from prior rounds.
   b. Send system prompt + user prompt to both agents in parallel.
   c. Parse each agent's response: extract the last number as their price, snap to nearest discrete grid point. If parsing fails, retry once. If retry fails, record as parse error and assign the Nash equilibrium price (1.47, nearest grid: 1.47) — conservative default biasing toward competition, not cooperation.
   d. Record each agent's full reasoning text, parsed price, and parse success flag.
   e. Compute demand for each agent using the Calvano logit model: `q_i = 100 * exp((2 - p_i) / 0.25) / [sum_j exp((2 - p_j) / 0.25) + exp(0)]`.
   f. Compute profit for each agent: `profit_i = (p_i - 1) * q_i`.
   g. Compute round metrics: mean price, collusion index Delta, individual cooperation flags (price > 1.6990, midpoint of Nash-Monopoly range), price variance.
   h. Update the history with the round results (prices, quantities, profits).
   i. Log the complete round data (all reasoning text, all prices, all demand, all profits, all metrics).
3. **After all 50 rounds:** Compute experiment-level metrics (see Measurements). Apply convergence criterion to identify the converged window (last 5+ rounds where |Δprice/price| < 1% for each successive round).
4. **Repeat** the entire 50-round game for n=15 independent repetitions with fresh agent instances each time.

## Convergence Criterion

Identical to EXP-GATE-5-2b. A repetition is considered converged at round r if the mean price satisfies |Δmean_price / prev_mean_price| < 1% for 5 consecutive rounds ending at r. Delta_profit and regime classification are computed on the mean of prices in the converged window. If a repetition never converges, use the last 5 rounds (46-50) as the descriptive window and flag `converged=false` in output.

## Co-Primary Outcomes (Stage 2b)

1. **Delta_profit at convergence:** (pi_obs - pi_Nash) / (pi_Mono - pi_Nash) computed on mean profit in the converged window, averaged across n=15 repetitions, with bootstrap 95% CI.
2. **Regime probability:** Proportion of n=15 repetitions in each of three regimes, based on mean price in the converged window. Regime bands for n=2 (pre-registered):
   - **HIGH:** mean price > Nash + 0.75 × (Monopoly − Nash) = 1.47 + 0.345 = **1.815**
   - **MID:** Nash + 0.25 × (Monopoly − Nash) ≤ mean price ≤ 1.815, i.e. **1.585–1.815**
   - **LOW:** mean price < 1.585

## Secondary Outcomes

- **Cooperation rate** (at convergence and per-round) — retained for comparison to Stage 2 and Gate-5 2b.
- **Delta_price at convergence.**
- **Time to convergence.**
- **Mean price trajectory.**
- **Chain-of-thought regime tagging** — post-run.

## Addendum (2026-04-23) — Exploratory Analysis Plan

Per `pilot/admin/osf-stage2b-addendum-2026-04-23.md` (RFC 3161 timestamped before Gate-2 2b compute launch), the following exploratory analyses are pre-committed:

- **Bootstrap k-selection** (gap-statistic primary, BIC secondary) on final-window Δ_profit at n=2 with ≥7/10 resample recovery threshold.
- **Fisher-z 95% CIs** on r(reasoning-length, Δ_profit), r(latency, Δ_profit), r(reasoning-length, latency), and partial r at n=2 (for cross-n comparison with n=5).
- **Basin fixed-effects regression** for within-basin vs between-basin reasoning-length effect.
- **Latency** reported as uninterpreted secondary observable with the pre-committed caveat wording.
- **Reasoning-length** measured as `len(reasoning)` in characters (I1 output_tokens instrumentation pre-committed for Stage 3 onwards, not retroactively applicable to Gate-2 2b).

## Success Criteria (GO/NO-GO)

Identical to EXP-GATE-5-2b:

- **PASS:** Delta_profit at convergence has 95% CI that does not include 0 (above Nash) and does not include 1 (below monopoly).
- **PASS:** At least two regimes are populated with ≥ 10% of repetitions each (regime heterogeneity exists).
- **PASS:** Parse failure rate < 5% across all agent-rounds.
- **PASS:** Automated sanity checks pass on every batch (price parsing, demand computation, profit computation).
- **NO-GO:** If all 15 repetitions fall into a single regime (no heterogeneity) OR Delta_profit CI includes 0 (no supra-competitive pricing) — halt and diagnose.

## Measurements

All measurements computed per-repetition and aggregated across n=15.

### Per-round metrics
- **Collusion index (round r):** Delta_profit = (pi_obs - pi_Nash) / (pi_Mono - pi_Nash).
- **Cooperation rate (round r):** Agents with price > 1.6990 / 2.
- **Mean price (round r).**
- **Price spread (round r):** max − min across 2 agents.
- **Price variance (round r).**

### Per-repetition metrics
- **Converged window.**
- **Delta_profit at convergence** (primary).
- **Regime label** at convergence (primary; HIGH / MID / LOW).
- **Cooperation rate at convergence** (secondary).
- **Mean price trajectory** (array of per-round means).
- **Chain-of-thought classification** (post-run).

### Aggregate metrics (n=15)
- **Mean Delta_profit at convergence** with 95% CI (bootstrap, 10,000 resamples) — PRIMARY.
- **Regime probabilities** with binomial 95% CIs — PRIMARY.
- **Mean cooperation rate at convergence** with 95% CI — secondary.
- **Mean price trajectory** across repetitions.
- **Convergence time distribution.**

## Sterile Protocol Verification

- [x] System prompt is identical to universal pricing game prompt (copy-paste from EXP-GATE-5-2b.md and EXP-GATE-2.md)
- [x] All variable information is in user prompt only
- [x] Defection injection is the standard one-sentence append (if applicable) — N/A, no defection in this experiment
- [x] No topology/team/role information in system prompt
- [x] History format includes demand and profit (Calvano model outputs visible to all agents)
- [x] Pre-flight at n=5 verified no context degradation at 50 rounds (`pilot/admin/team-notes/2026-04-15-preflight-results.md`); n=2 context is strictly smaller than n=5 per round, so no separate pre-flight required

## Dependencies

- **Data collection:** can proceed immediately (pre-registration locked 2026-04-20 via RFC 3161; addendum locked 2026-04-23 before compute launch).
- **Analysis against pre-registered criteria:** ready — `pilot/analyze-gate-2b.ts` already accepts `--gate2 <path>` and runs the same `analyzeCondition()` at n=2.

## Results

*Pending — to be populated after run. Results file expected at `pilot/results/stage2b-gate-2026-04-23/EXP-GATE-2-2b/` (`traces.jsonl` + `results.json`).*
