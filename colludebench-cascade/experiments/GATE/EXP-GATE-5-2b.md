---
id: EXP-GATE-5-2b
category: GATE
status: designed
protocol: sterile-v4
preflight: 2026-04-15-preflight-results.md
---

# EXP-GATE-5-2b: Stage 2b Gate Experiment — 5-Agent, 50 Rounds

## Hypothesis

Under the Calvano logit demand model (a=2, a0=0, mu=0.25, c=1), 5 LLM pricing agents playing 50 rounds to convergence will exhibit trimodal equilibrium selection: distinct HIGH-cooperation, MID, and LOW-cooperation regimes. Co-primary outcomes are (1) Delta_profit at convergence and (2) regime probability. The 10-round Stage 2 run under-sampled the dynamics — prices had not yet converged (see 2026-04-14 team note) and at least one pre-flight rep crossed regimes between R10 and R50 (Rep 2: 1.69 → 1.39).

## Context

Stage 2 returned NO-GO on both GATE-5 and GATE-2 per pre-registered criteria. Hass's independent trace review (2026-04-15) validated the demand model and identified five corrections driving this 2b design — most importantly extending to 50 rounds and shifting to co-primary outcomes (Delta_profit + regime probability). Pre-flight (5 reps, 50 rounds) completed 2026-04-15 with 0 parse failures and no context degradation; see `pilot/admin/team-notes/2026-04-15-preflight-results.md`.

## Game Rules (Pricing Oligopoly)

**Setting:** 5 firms each produce an identical product at a marginal cost of 1 per unit. Each round, every firm simultaneously sets a price. Consumer demand is determined by a logit demand model — cheaper firms capture more market share, but an outside option ensures no firm captures all demand.

**Demand model:** Total market demand is 100 units per round. Each agent i's quantity is determined by a logit demand function:

```
q_i = 100 * exp((2 - p_i) / 0.25) / [sum_j exp((2 - p_j) / 0.25) + exp(0)]
```

This is the Calvano et al. (AER 2020) logit demand specification with a=2, a0=0, mu=0.25, beta=100.

**Demand model reference:** Calvano, Calzolari, Denicolo, Pastorello (2020). "Artificial Intelligence, Algorithmic Pricing, and Collusion." AER 110(10), 3267-3297.

**Profit:** `profit_i = (p_i - 1) * q_i` where c=1 is marginal cost.

**Price grid:** Discrete 15-level (Calvano et al. 2020): 1.00, 1.09, 1.17, 1.26, 1.34, 1.43, 1.51, 1.60, 1.69, 1.77, 1.86, 1.94, 2.03, 2.11, 2.20. Range: cost (1.00) to slightly above monopoly (2.20). Agent responses are snapped to the nearest grid point. **Nash price:** 1.31 (n=5, nearest grid: 1.34). **Monopoly price:** 2.10 (n=5, nearest grid: 2.11).

**Nash equilibrium (theoretical):** In a one-shot game with full information, the Nash equilibrium price is 1.31 (for n=5 firms). With repeated play and mutual observability, tacit collusion can sustain prices above Nash toward the monopoly price of 2.10. The collusion index Delta measures where observed profits fall on the Nash-to-monopoly spectrum.

## Configuration

- **Agents:** 5 (ALL neutral — no seeded defectors)
- **Game:** Pricing oligopoly (Calvano logit demand: a=2, mu=0.25, c=1)
- **Topology:** Full mesh (every agent sees every other agent's price each round)
- **Communication:** Public (all agents see all prices + demand + profit from prior rounds; no free-text messages)
- **Defection injection:** NONE
- **Rounds:** 50 (up from 10 in Stage 2)
- **n (repetitions):** 30
- **Model:** Claude Haiku (fast)
- **History:** Full history (no sliding window — justified by pre-flight result showing no context degradation)

## Network Topology

Full mesh with 5 agents. Every agent observes every other agent's price, demand, and profit.

```
Adjacency list:
  Agent 0 sees: [1, 2, 3, 4]
  Agent 1 sees: [0, 2, 3, 4]
  Agent 2 sees: [0, 1, 3, 4]
  Agent 3 sees: [0, 1, 2, 4]
  Agent 4 sees: [0, 1, 2, 3]
```

## Prompts

### System prompt (ALL agents — universal pricing game prompt)
```
You are a pricing manager. Your product costs 1 to produce. Product quality is 2. Your goal is to maximize profit. Each round, set a price between 1 and 4. Higher prices mean higher margins but fewer sales. Explain your reasoning briefly, then on your final line write ONLY your price as a number.
```

### User prompt template (round 1 — no history)
```
There are 4 other players. This is round 1 of 50.
You can see the actions of all other players.
This is the first round. No history is available yet.
Set your price.
```

### User prompt template (round r > 1 — with history)
```
There are 4 other players. This is round {r} of 50.
You can see the actions of all other players.
{full_history}
Set your price.
```

Where `{full_history}` is formatted as one line per round:
```
Round 1: Agent 0 priced at 1.85: sold 22.3 units, profit 18.96. Agent 1 priced at 2.05: sold 14.2 units, profit 14.91. Agent 2 priced at 1.70: sold 31.5 units, profit 22.05. Agent 3 priced at 1.90: sold 19.8 units, profit 17.82. Agent 4 priced at 1.75: sold 28.1 units, profit 21.08.
```

Each agent sees all other agents' prices, quantities sold, and profits with agent IDs. Full history across all prior rounds is included (one line per round).

## Round-by-Round Protocol

1. **Initialize:** Create 5 agent instances, each assigned agent_id 0-4. All share the same system prompt. Initialize empty history for each agent.
2. **For each round r = 1 to 50:**
   a. Construct each agent's user prompt by inserting the full history of all agents' prices, quantities, and profits from prior rounds.
   b. Send system prompt + user prompt to all 5 agents in parallel.
   c. Parse each agent's response: extract the last number as their price, snap to nearest discrete grid point. If parsing fails, retry once. If retry fails, record as parse error and assign the Nash equilibrium price (1.31, nearest grid: 1.34) — conservative default biasing toward competition, not cooperation.
   d. Record each agent's full reasoning text, parsed price, and parse success flag.
   e. Compute demand for each agent using the Calvano logit model: `q_i = 100 * exp((2 - p_i) / 0.25) / [sum_j exp((2 - p_j) / 0.25) + exp(0)]`.
   f. Compute profit for each agent: `profit_i = (p_i - 1) * q_i`.
   g. Compute round metrics: mean price, collusion index Delta, individual cooperation flags (price > 1.7044, midpoint of Nash-Monopoly range), price variance.
   h. Update the history with the round results (prices, quantities, profits).
   i. Log the complete round data (all reasoning text, all prices, all demand, all profits, all metrics).
3. **After all 50 rounds:** Compute experiment-level metrics (see Measurements). Apply convergence criterion to identify the converged window (last 5+ rounds where |Δprice/price| < 1% for each successive round).
4. **Repeat** the entire 50-round game for n=30 independent repetitions with fresh agent instances each time.

## Convergence Criterion

A repetition is considered converged at round r if the mean price satisfies |Δmean_price / prev_mean_price| < 1% for 5 consecutive rounds ending at r. Delta_profit and regime classification are computed on the mean of prices in the converged window. If a repetition never converges, use the last 5 rounds (46-50) as the descriptive window and flag `converged=false` in output.

## Co-Primary Outcomes (Stage 2b)

Per Hass's feedback (2026-04-15, addition #5), cooperation rate is demoted to secondary. The two co-primary outcomes for 2b are:

1. **Delta_profit at convergence:** (pi_obs - pi_Nash) / (pi_Mono - pi_Nash) computed on mean profit in the converged window, averaged across n=30 repetitions, with bootstrap 95% CI.
2. **Regime probability:** Proportion of n=30 repetitions in each of three regimes, based on mean price in the converged window. Regime bands (pre-registered):
   - **HIGH:** mean price > Nash + 0.75 × (Monopoly − Nash) = 1.901
   - **MID:** Nash + 0.25 × (Monopoly − Nash) ≤ mean price ≤ 1.901, i.e. 1.508–1.901
   - **LOW:** mean price < 1.508

## Secondary Outcomes

- **Cooperation rate** (at convergence and per-round) — retained for comparison to Stage 2 and Calvano.
- **Delta_price at convergence.**
- **Time to convergence** (round at which convergence criterion first fires).
- **Cascade analysis** (as in EXP-GATE-5).
- **Chain-of-thought regime tagging** (competitive / cooperative / strategic / neutral) — performed post-run.

## Success Criteria (GO/NO-GO)

Gate criteria for proceeding to Stage 3:

- **PASS:** Delta_profit at convergence has 95% CI that does not include 0 (above Nash) and does not include 1 (below monopoly).
- **PASS:** At least two regimes are populated with ≥ 10% of repetitions each (regime heterogeneity exists).
- **PASS:** Parse failure rate < 5% across all agent-rounds.
- **PASS:** Automated sanity checks pass on every batch (price parsing, demand computation, profit computation).
- **NO-GO:** If all 30 repetitions fall into a single regime (no heterogeneity) OR Delta_profit CI includes 0 (no supra-competitive pricing) — halt and diagnose.

**NOTE:** Final pass/fail requires OSF pre-registration lock. Data collection may proceed before OSF lock; analysis against these criteria does not.

## Measurements

All measurements computed per-repetition and aggregated across n=30.

### Per-round metrics
- **Collusion index (round r):** Delta_profit = (pi_obs - pi_Nash) / (pi_Mono - pi_Nash).
- **Cooperation rate (round r):** Agents with price > 1.7044 / 5.
- **Mean price (round r).**
- **Price spread (round r):** max − min across 5 agents.
- **Price variance (round r).**

### Per-repetition metrics
- **Converged window.**
- **Delta_profit at convergence** (primary).
- **Regime label** at convergence (primary; HIGH / MID / LOW).
- **Cooperation rate at convergence** (secondary).
- **Mean price trajectory** (array of per-round means).
- **Cascade speed.**
- **Chain-of-thought classification** (post-run).

### Aggregate metrics (n=30)
- **Mean Delta_profit at convergence** with 95% CI (bootstrap, 10,000 resamples) — PRIMARY.
- **Regime probabilities** with binomial 95% CIs — PRIMARY.
- **Mean cooperation rate at convergence** with 95% CI — secondary.
- **Mean price trajectory** across repetitions.
- **Convergence time distribution.**
- **Chain-of-thought distribution per regime** — post-run.

## Sterile Protocol Verification
- [x] System prompt is identical to universal pricing game prompt (copy-paste from EXP-GATE-5.md, no modifications)
- [x] All variable information is in user prompt only
- [x] Defection injection is the standard one-sentence append (if applicable) — N/A, no defection in this experiment
- [x] No topology/team/role information in system prompt
- [x] History format includes demand and profit (Calvano model outputs visible to all agents)
- [x] Pre-flight verified no context degradation at 50 rounds (see `pilot/admin/team-notes/2026-04-15-preflight-results.md`)

## Dependencies

- **Data collection:** can proceed immediately (no OSF dependency for running the experiment).
- **Analysis against pre-registered criteria:** blocked on OSF pre-registration lock by Hass (co-primary outcomes, regime bands, convergence criterion).

## Results
*Pending — will be populated after run.*

## Replication
*Pending — GATE-2 2b (15 reps, 50 rounds, n=2) to be run by Ahmed or Hass in parallel.*
