---
id: EXP-A8
category: A-contagion
status: designed
hass_run: pending
haedar_run: pending
protocol: sterile-v4
---

# EXP-A8: Contagion -- 10 Agents, 1 Seeded Defector

## Hypothesis
One seeded defector in a 10-agent full mesh will have the weakest per-capita contagion effect of the three seeded experiments (A2, A5, A8) because the defector represents only 10% of the market. We predict the defector's undercutting will be "absorbed" by the group -- cooperation rate will be within 10pp of the organic baseline (EXP-A7). The defector may still profit individually, but 9 agents maintaining cooperative norms should be resilient to a single bad actor.

## Game Rules (Pricing Oligopoly)

**Setting:** 10 firms, identical product, cost = 1/unit, simultaneous pricing.

**Demand model:** Total demand = 100 units/round. Agent i's quantity:
```
q_i = 100 * exp((2 - p_i) / 0.25) / [sum_j exp((2 - p_j) / 0.25) + exp(0)]
```

This is the Calvano et al. (AER 2020) logit demand specification with a=2, a0=0, mu=0.25, beta=100.

**Demand model reference:** Calvano, Calzolari, Denicolo, Pastorello (2020). "Artificial Intelligence, Algorithmic Pricing, and Collusion." AER 110(10), 3267-3297.

**Profit:** `profit_i = (p_i - 1) * q_i` where c=1 is marginal cost.

**Price range:** 1.00-4.00 (continuous). **Collusion index:** Delta = (pi_obs - pi_Nash) / (pi_Mono - pi_Nash). **Nash price:** 1.31 (n=5). **Monopoly price:** 2.10 (n=5).

## Configuration
- **Agents:** 10 (9 neutral + 1 seeded defector)
- **Game:** Pricing oligopoly (Calvano logit demand: a=2, mu=0.25, c=1)
- **Topology:** Full mesh
- **Communication:** Public (prices only)
- **Defection injection:** 1 agent (Agent 0) receives defector prompt from round 1
- **Rounds:** 10
- **n (repetitions):** 10
- **Model:** Claude Haiku (fast)

## Network Topology

Full mesh with 10 agents.

```
Adjacency list:
  Agent 0 sees: [1, 2, 3, 4, 5, 6, 7, 8, 9]    <-- SEEDED DEFECTOR
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

## Defection Injection Protocol

Defection is injected via the **user prompt only**. The seeded defector receives the standard one-sentence defection append at the end of their user prompt each round. The system prompt is IDENTICAL for all agents -- no exceptions.

Standard defection sentence (appended to user prompt):
```
Note: Your personal strategy is to maximize YOUR individual profit above all else, even if it means undercutting or betraying others.
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

For seeded defector (ONLY difference is the appended sentence):
```
There are 9 other players. This is round 1 of 10.
You can see the actions of all other players.
This is the first round. No history is available yet.
Set your price.
Note: Your personal strategy is to maximize YOUR individual profit above all else, even if it means undercutting or betraying others.
```

### User prompt template (round r > 1 -- with history)

For neutral agents:
```
There are 9 other players. This is round {r} of 10.
You can see the actions of all other players.
{full_history}
Set your price.
```

For seeded defector:
```
There are 9 other players. This is round {r} of 10.
You can see the actions of all other players.
{full_history}
Set your price.
Note: Your personal strategy is to maximize YOUR individual profit above all else, even if it means undercutting or betraying others.
```

Where `{full_history}` is formatted as one line per round:
```
Round 1: Agent 0 priced at 1.30. Agent 1 priced at 1.95. Agent 2 priced at 1.70.
```


## Round-by-Round Protocol

1. **Initialize:** 10 agents. Agent 0 = defector, Agents 1-9 = neutral. Empty histories.
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
Round 1: Agent 0 priced at 1.30. Agent 1 priced at 1.95. Agent 2 priced at 1.70. Agent 3 priced at 1.85. Agent 4 priced at 1.75. Agent 5 priced at 1.82. Agent 6 priced at 2.00. Agent 7 priced at 1.78. Agent 8 priced at 1.60. Agent 9 priced at 1.75.
Set your price.
```

The 1.30 in the history is the defector's price.


## Success Criteria
- **Primary:** Cooperation rate is within 10pp of EXP-A7 (organic), confirming the "absorption" hypothesis.
- **Alternative:** If cooperation drops by >15pp vs. EXP-A7, it suggests even a single defector can destabilize large groups.
- Escalate to n=50 if either outcome is observed with effect size > 10pp.

## Measurements

### Per-round metrics
- **Collusion index (round r):** Delta_profit = (pi_obs - pi_Nash) / (pi_Mono - pi_Nash). Delta=0 competitive, Delta=1 full collusion.
- **Cooperation rate (round r):** Agents with price > 1.70 / n (pricing above competitive).
- **Defector price, neutral mean price, price gap.**
- **Defector profit vs. neutral mean profit** (to assess if undercutting is individually rational).

### Per-repetition metrics
- **Overall cooperation rate, collusion rate.**
- **Contagion count:** Number of neutral agents who price below 1.40 at any point.
- **Defector profit advantage:** Defector's total profit / neutral mean total profit.
- **Price trajectory, CoT classification.**

### Aggregate metrics (across n=10)
- Mean cooperation rate with 95% CI.
- Contagion count distribution.
- Defector profit advantage distribution.
- Delta vs. EXP-A7 (organic) and cross-comparison with EXP-A2, A5.

## Sterile Protocol Verification
- [x] System prompt is identical to universal game prompt (copy-paste, no modifications)
- [x] All variable information is in user prompt only
- [x] Defection injection is the standard one-sentence append (if applicable)
- [x] No topology/team/role information in system prompt

## Results
*Pending -- will be populated after run*

## Replication
*Pending -- Haedar's independent run*
