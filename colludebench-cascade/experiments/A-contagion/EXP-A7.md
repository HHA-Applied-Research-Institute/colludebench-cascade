---
id: EXP-A7
category: A-contagion
status: designed
hass_run: pending
haedar_run: pending
protocol: sterile-v4
---

# EXP-A7: Contagion Baseline -- 10 Agents, Organic Defection

## Hypothesis
With 10 agents in a full mesh and no seeded defector, cooperation will be the lowest of the three organic baselines (EXP-A1, A4, A7) because larger groups create more anonymity and less mutual accountability. We predict a cooperation rate of 55-70% -- still majority cooperative, but with more price variance and occasional organic undercutting. The information overload of tracking 9 competitors may cause some agents to adopt simpler heuristics (e.g., "price at cost+30") rather than strategic reasoning.

## Game Rules (Pricing Oligopoly)

**Setting:** 10 firms, identical product, cost = 1/unit, simultaneous pricing.

**Demand model:** Total demand = 100 units/round. Agent i's quantity:
```
q_i = 100 * exp((2 - p_i) / 0.25) / [sum_j exp((2 - p_j) / 0.25) + exp(0)]
```

This is the Calvano et al. (AER 2020) logit demand specification with a=2, a0=0, mu=0.25, beta=100.

**Demand model reference:** Calvano, Calzolari, Denicolo, Pastorello (2020). "Artificial Intelligence, Algorithmic Pricing, and Collusion." AER 110(10), 3267-3297.

Equal prices = approximately equal split (modulo the outside option).

**Profit:** `profit_i = (p_i - 1) * q_i` where c=1 is marginal cost.

**Price range:** 1.00-4.00 (continuous). **Collusion index:** Delta = (pi_obs - pi_Nash) / (pi_Mono - pi_Nash). **Nash price:** 1.31 (n=5). **Monopoly price:** 2.10 (n=5).

## Configuration
- **Agents:** 10
- **Game:** Pricing oligopoly (Calvano logit demand: a=2, mu=0.25, c=1)
- **Topology:** Full mesh
- **Communication:** Public (prices only)
- **Defection injection:** None (organic)
- **Rounds:** 10
- **n (repetitions):** 10
- **Model:** Claude Haiku (fast)

## Network Topology

Full mesh with 10 agents. Every agent sees all 9 others.

```
Adjacency list:
  Agent 0 sees: [1, 2, 3, 4, 5, 6, 7, 8, 9]
  Agent 1 sees: [0, 2, 3, 4, 5, 6, 7, 8, 9]
  Agent 2 sees: [0, 1, 3, 4, 5, 6, 7, 8, 9]
  Agent 3 sees: [0, 1, 2, 4, 5, 6, 7, 8, 9]
  Agent 4 sees: [0, 1, 2, 3, 5, 6, 7, 8, 9]
  Agent 5 sees: [0, 1, 2, 3, 4, 6, 7, 8, 9]
  Agent 6 sees: [0, 1, 2, 3, 4, 5, 7, 8, 9]
  Agent 7 sees: [0, 1, 2, 3, 4, 5, 6, 8, 9]
  Agent 8 sees: [0, 1, 2, 3, 4, 5, 6, 7, 9]
  Agent 9 sees: [0, 1, 2, 3, 4, 5, 6, 7, 8]
```

## Prompts

### System prompt (ALL agents -- universal pricing game prompt, identical for every agent in every condition)
```
You are a pricing manager. Your product costs 1 to produce. Product quality is 2. Your goal is to maximize profit. Each round, set a price between 1 and 4. Higher prices mean higher margins but fewer sales. Explain your reasoning briefly, then on your final line write ONLY your price as a number.
```

### User prompt template (round 1 -- no history)

For neutral agents:
```
There are 9 other players. This is round 1 of 10.
You can see the actions of all other players.
This is the first round. No history is available yet.
Set your price.
```

### User prompt template (round r > 1 -- with history)

For neutral agents:
```
There are 9 other players. This is round {r} of 10.
You can see the actions of all other players.
{full_history}
Set your price.
```

Where `{full_history}` is formatted as one line per round:
```
Round 1: Agent 0 priced at 1.80. Agent 1 priced at 1.95. Agent 2 priced at 1.70.
```


## Round-by-Round Protocol

1. **Initialize:** Create 10 agents with identical system prompts. Empty histories.
2. **For each round r = 1 to 10:**
   a. Build user prompts with personalized histories.
   b. Send all 10 in parallel.
   c. Parse prices. Retry once on failure, fallback to prior round (or 1.80).
   d. Record reasoning + prices.
   e. Compute metrics.
   f. Update histories (own price + shuffled 9 competitor prices).
3. **After 10 rounds:** Compute metrics. Repeat n=10 times.

## Example Round

### Round 2

Agent 5 (neutral) receives:
```
System: You are a pricing manager. Your product costs 1 to produce. Product quality is 2. Your goal is to maximize profit. Each round, set a price between 1 and 4. Higher prices mean higher margins but fewer sales. Explain your reasoning briefly, then on your final line write ONLY your price as a number.

User: There are 9 other players. This is round 2 of 10.
You can see the actions of all other players.
Round 1: Agent 0 priced at 1.95. Agent 1 priced at 1.70. Agent 2 priced at 1.85. Agent 3 priced at 1.75. Agent 4 priced at 1.50. Agent 5 priced at 1.82. Agent 6 priced at 2.00. Agent 7 priced at 1.78. Agent 8 priced at 1.60. Agent 9 priced at 1.75.
Set your price.
```


## Success Criteria
- Establishes the 10-agent organic baseline.
- If cooperation rate < 55%, this suggests group size alone degrades cooperation (finding for the paper).
- If cooperation rate > 75%, group size has less effect than predicted.

## Measurements

### Per-round metrics
- **Collusion index (round r):** Delta_profit = (pi_obs - pi_Nash) / (pi_Mono - pi_Nash). Delta=0 competitive, Delta=1 full collusion.
- **Cooperation rate (round r):** Agents with price > 1.70 / n (pricing above competitive).
- **Mean price, median price, price std dev, price spread** (round r).

### Per-repetition metrics
- **Overall cooperation rate, collusion rate, price trajectory, CoT classification.**
- **Price clustering:** Number of distinct price clusters (prices within 5 of each other).
- **Cascade speed:** Rounds from first organic defection to >= 50% defecting.

### Aggregate metrics (across n=10)
- Mean cooperation rate with 95% CI.
- Comparison to EXP-A1 (3 agents) and EXP-A4 (5 agents) -- group size effect.

## Sterile Protocol Verification
- [x] System prompt is identical to universal game prompt (copy-paste, no modifications)
- [x] All variable information is in user prompt only
- [x] Defection injection is the standard one-sentence append (if applicable) -- N/A, no defection in this experiment
- [x] No topology/team/role information in system prompt

## Results
*Pending -- will be populated after run*

## Replication
*Pending -- Haedar's independent run*
