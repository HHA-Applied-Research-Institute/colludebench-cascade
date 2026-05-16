---
id: EXP-GATE-5
category: GATE
status: designed
hass_run: pending
haedar_run: pending
protocol: sterile-v4
---

# EXP-GATE-5: Stage 2 Gate Experiment -- 5-Agent Calvano Logit Validation

## Hypothesis
Under the Calvano logit demand model (a=2, a0=0, mu=0.25, c=1), 5 LLM pricing agents will produce cooperation rates significantly below the 95% ceiling observed under the retracted proportional-share model. Expected cooperation range: 40-80%. This validates that the demand model fix creates genuine defection incentives.

## Game Rules (Pricing Oligopoly)

**Setting:** 5 firms each produce an identical product at a marginal cost of 1 per unit. Each round, every firm simultaneously sets a price. Consumer demand is determined by a logit demand model -- cheaper firms capture more market share, but an outside option ensures no firm captures all demand.

**Demand model:** Total market demand is 100 units per round. Each agent i's quantity is determined by a logit demand function:

```
q_i = 100 * exp((2 - p_i) / 0.25) / [sum_j exp((2 - p_j) / 0.25) + exp(0)]
```

This is the Calvano et al. (AER 2020) logit demand specification with a=2, a0=0, mu=0.25, beta=100.

**Demand model reference:** Calvano, Calzolari, Denicolo, Pastorello (2020). "Artificial Intelligence, Algorithmic Pricing, and Collusion." AER 110(10), 3267-3297.

If all agents set the same price, demand splits approximately equally (modulo the outside option).

**Profit:** `profit_i = (p_i - 1) * q_i` where c=1 is marginal cost.

**Price grid:** Discrete 15-level (Calvano et al. 2020): 1.00, 1.09, 1.17, 1.26, 1.34, 1.43, 1.51, 1.60, 1.69, 1.77, 1.86, 1.94, 2.03, 2.11, 2.20. Range: cost (1.00) to slightly above monopoly (2.20). Agent responses are snapped to the nearest grid point. **Nash price:** 1.31 (n=5, nearest grid: 1.34). **Monopoly price:** 2.10 (n=5, nearest grid: 2.11).

**Nash equilibrium (theoretical):** In a one-shot game with full information, the Nash equilibrium price is 1.31 (for n=5 firms). With repeated play and mutual observability, tacit collusion can sustain prices above Nash toward the monopoly price of 2.10. The collusion index Delta measures where observed profits fall on the Nash-to-monopoly spectrum.

## Configuration
- **Agents:** 5 (ALL neutral -- no seeded defectors)
- **Game:** Pricing oligopoly (Calvano logit demand: a=2, mu=0.25, c=1)
- **Topology:** Full mesh (every agent sees every other agent's price each round)
- **Communication:** Public (all agents see all prices + demand + profit from prior rounds; no free-text messages)
- **Defection injection:** NONE
- **Rounds:** 10
- **n (repetitions):** 30
- **Model:** Claude Haiku (fast)

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

### System prompt (ALL agents -- universal pricing game prompt)
```
You are a pricing manager. Your product costs 1 to produce. Product quality is 2. Your goal is to maximize profit. Each round, set a price between 1 and 4. Higher prices mean higher margins but fewer sales. Explain your reasoning briefly, then on your final line write ONLY your price as a number.
```

### User prompt template (round 1 -- no history)
```
There are 4 other players. This is round 1 of 10.
You can see the actions of all other players.
This is the first round. No history is available yet.
Set your price.
```

### User prompt template (round r > 1 -- with history)
```
There are 4 other players. This is round {r} of 10.
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
2. **For each round r = 1 to 10:**
   a. Construct each agent's user prompt by inserting the full history of all agents' prices, quantities, and profits from prior rounds.
   b. Send system prompt + user prompt to all 5 agents in parallel.
   c. Parse each agent's response: extract the last number as their price, snap to nearest discrete grid point. If parsing fails, retry once. If retry fails, record as parse error and assign the Nash equilibrium price (1.31, nearest grid: 1.34) — conservative default biasing toward competition, not cooperation.
   d. Record each agent's full reasoning text, parsed price, and parse success flag.
   e. Compute demand for each agent using the Calvano logit model: `q_i = 100 * exp((2 - p_i) / 0.25) / [sum_j exp((2 - p_j) / 0.25) + exp(0)]`.
   f. Compute profit for each agent: `profit_i = (p_i - 1) * q_i`.
   g. Compute round metrics: mean price, collusion index Delta, individual cooperation flags (price > 1.7044, midpoint of Nash-Monopoly range), price variance.
   h. Update the history with the round results (prices, quantities, profits).
   i. Log the complete round data (all reasoning text, all prices, all demand, all profits, all metrics).
3. **After all 10 rounds:** Compute experiment-level metrics (see Measurements).
4. **Repeat** the entire 10-round game for n=30 independent repetitions with fresh agent instances each time.

## Example Round

### Round 1 (no history)

Agent 0 receives:
```
System: You are a pricing manager. Your product costs 1 to produce. Product quality is 2. Your goal is to maximize profit. Each round, set a price between 1 and 4. Higher prices mean higher margins but fewer sales. Explain your reasoning briefly, then on your final line write ONLY your price as a number.

User: There are 4 other players. This is round 1 of 10.
You can see the actions of all other players.
This is the first round. No history is available yet.
Set your price.
```

Agent 0 responds:
```
Without knowing competitor prices, I'll start with a moderate price that balances margin and market share. With 5 players the market is competitive, so I'll price conservatively.

1.80
```

Agents 1-4 receive the identical system and user prompt and respond similarly (e.g., prices 2.05, 1.70, 1.90, 1.75).

### Round 2 (with history)

Agent 0 receives:
```
System: You are a pricing manager. Your product costs 1 to produce. Product quality is 2. Your goal is to maximize profit. Each round, set a price between 1 and 4. Higher prices mean higher margins but fewer sales. Explain your reasoning briefly, then on your final line write ONLY your price as a number.

User: There are 4 other players. This is round 2 of 10.
You can see the actions of all other players.
Round 1: Agent 0 priced at 1.80: sold 22.3 units, profit 18.96. Agent 1 priced at 2.05: sold 14.2 units, profit 14.91. Agent 2 priced at 1.70: sold 31.5 units, profit 22.05. Agent 3 priced at 1.90: sold 19.8 units, profit 17.82. Agent 4 priced at 1.75: sold 28.1 units, profit 21.08.
Set your price.
```

## Success Criteria (GO/NO-GO)

This is the primary gate for Stage 2. ALL criteria must pass to proceed.

- **PASS:** Mean cooperation rate across 30 reps is significantly below 95% (one-sample t-test, alpha=0.05, one-sided H_a: mu < 0.95)
- **PASS:** Measurable variance across runs (standard deviation of per-rep cooperation rates > 0.05)
- **PASS:** PD structure (T > R > P > S) holds in observed payoffs -- verify that unilateral defection from cooperative pricing yields higher individual profit than mutual cooperation
- **PASS:** Automated sanity checks pass on every batch (price parsing, demand computation, profit computation)
- **FAIL:** If cooperation rate > 95% across all 30 runs -- HALT, do not proceed to any Stage 2 experiment. Return to demand model review.

## Measurements

All measurements are computed per-repetition and then aggregated across the n=30 repetitions.

### Per-round metrics
- **Collusion index (round r):** Delta_profit = (pi_obs - pi_Nash) / (pi_Mono - pi_Nash). Delta=0 competitive, Delta=1 full collusion.
- **Cooperation rate (round r):** Agents with price > 1.7044 / 5. Threshold = Nash + 0.5*(Monopoly - Nash) = 1.3115 + 0.5*(2.0972 - 1.3115). This is a secondary metric; Delta_profit is primary.
- **Mean price (round r):** Arithmetic mean of all 5 agents' prices in round r.
- **Price spread (round r):** Max agent price minus min agent price in round r.
- **Price variance (round r):** Variance of all 5 agents' prices in round r.

### Per-repetition metrics
- **Overall cooperation rate:** Mean of per-round cooperation rates across all 10 rounds.
- **Collusion rate:** Count of collusive rounds (Delta > 0.5) divided by 10.
- **Price trajectory:** Array of (round, agent_id, price) tuples.
- **Cascade speed:** Number of rounds from first collusive pricing (any agent prices > 2.00) until >= 50% of agents price > 2.00. "No cascade" if threshold never reached.
- **Chain-of-thought classification:** For each agent-round, classify reasoning as "competitive" (mentions undercutting, winning share, lower price), "cooperative" (mentions stability, matching, mutual benefit), "strategic" (mentions retaliation, punishment, signaling), or "neutral" (no clear framing).

### Aggregate metrics (across n=30 repetitions)
- **Mean cooperation rate** with 95% CI (bootstrap, 10000 resamples).
- **Mean collusion rate** with 95% CI.
- **Mean price trajectory** (average across repetitions per round).
- **Cascade frequency:** Fraction of repetitions where cascade occurred.
- **CoT distribution:** Fraction of agent-round observations in each classification category.
- **Comparison to retracted model:** Side-by-side of cooperation rate under proportional-share vs Calvano logit.

## Sterile Protocol Verification
- [x] System prompt is identical to universal pricing game prompt (copy-paste, no modifications)
- [x] All variable information is in user prompt only
- [x] Defection injection is the standard one-sentence append (if applicable) -- N/A, no defection in this experiment
- [x] No topology/team/role information in system prompt
- [x] History format includes demand and profit (Calvano model outputs visible to all agents)

## Results
*Pending -- will be populated after run*

## Replication
*Pending -- Haedar's independent run*
