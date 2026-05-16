---
id: EXP-B2
category: B-topology
status: designed
hass_run: pending
haedar_run: pending
protocol: sterile-v4
---

# EXP-B2: Topology -- Ring (Each Agent Sees 2 Neighbors)

## Hypothesis
A ring topology will slow defection contagion dramatically compared to full mesh (EXP-B1) because information travels linearly -- each agent only sees 2 neighbors, so the defector's undercutting must propagate step by step around the ring. We predict cascade speed will be 3-5x slower than full mesh, and agents far from the defector (4-5 hops away) may never be exposed to the defection signal within 10 rounds. Cooperation rate will be higher than B1 (full mesh) by 15-25pp.

## Game Rules (Pricing Oligopoly)

**Setting:** 10 firms, identical product, cost = 1/unit, simultaneous pricing.

**Demand model:** Calvano et al. (AER 2020) logit demand. Agent i's quantity:
```
q_i = 100 * exp((2 - p_i) / 0.25) / [sum_j exp((2 - p_j) / 0.25) + exp(0)]
```
This is the Calvano logit demand specification with a=2, a0=0, mu=0.25, beta=100. The logit demand is computed across ALL firms in the market, not just locally visible ones. The topology only affects what price INFORMATION each agent sees, not the demand computation.

**Demand model reference:** Calvano, Calzolari, Denicolo, Pastorello (2020). AER 110(10), 3267-3297.

**Profit:** `profit_i = (p_i - 1) * q_i` where c=1 is marginal cost.

**Price range:** 1.00-4.00 (continuous). **Collusion index:** Delta = (pi_obs - pi_Nash) / (pi_Mono - pi_Nash). **Nash price:** 1.31 (n=5). **Monopoly price:** 2.10 (n=5).

## Configuration
- **Agents:** 10 (9 neutral + 1 seeded defector)
- **Game:** Pricing oligopoly (Calvano logit demand: a=2, mu=0.25, c=1)
- **Topology:** Ring (each agent sees exactly 2 neighbors)
- **Communication:** Neighbor-only (each agent sees only adjacent agents' prices)
- **Defection injection:** Agent 0 receives defector prompt from round 1
- **Rounds:** 10
- **n (repetitions):** 10
- **Model:** Claude Haiku (fast)

## Network Topology

Circular ring: Agent i sees agents (i-1) mod 10 and (i+1) mod 10.

```
Adjacency list:
  Agent 0 sees: [9, 1]    <-- SEEDED DEFECTOR
  Agent 1 sees: [0, 2]    <-- directly exposed to defector
  Agent 2 sees: [1, 3]
  Agent 3 sees: [2, 4]
  Agent 4 sees: [3, 5]    <-- max distance from defector (5 hops via either direction)
  Agent 5 sees: [4, 6]    <-- max distance from defector (5 hops via either direction)
  Agent 6 sees: [5, 7]
  Agent 7 sees: [6, 8]
  Agent 8 sees: [7, 9]
  Agent 9 sees: [8, 0]    <-- directly exposed to defector

Visual:
       0 (defector)
      / \
     9   1
     |   |
     8   2
     |   |
     7   3
     |   |
     6   4
      \ /
       5

Degree: 2 (every agent sees exactly 2 neighbors)
Diameter: 5 (max hops between any pair)
Clustering coefficient: 0.0 (no triangles)
```

## Prompts

### System prompt (ALL agents -- universal pricing game prompt, identical for every agent in every condition)
```
You are a pricing manager. Your product costs 1 to produce. Product quality is 2. Your goal is to maximize profit. Each round, set a price between 1 and 4. Higher prices mean higher margins but fewer sales. Explain your reasoning briefly, then on your final line write ONLY your price as a number.
```

### User prompt template (round 1)

For neutral agents:
```
There are 9 other players. This is round 1 of 10.
You can see the actions of agents {left} and {right} only.
This is the first round. No history is available yet.
Set your price.
```

For seeded defector (Agent 0):
```
There are 9 other players. This is round 1 of 10.
You can see the actions of agents 9 and 1 only.
This is the first round. No history is available yet.
Set your price.
Note: Your personal strategy is to maximize YOUR individual profit above all else, even if it means undercutting or betraying others.
```

### User prompt template (round r > 1)

For neutral agents:
```
There are 9 other players. This is round {r} of 10.
You can see the actions of agents {left} and {right} only.
{visible_history}
Set your price.
```

For seeded defector (Agent 0):
```
There are 9 other players. This is round {r} of 10.
You can see the actions of agents 9 and 1 only.
{visible_history}
Set your price.
Note: Your personal strategy is to maximize YOUR individual profit above all else, even if it means undercutting or betraying others.
```

Where `{visible_history}` includes ONLY the prices of visible neighbors:
```
Round 1: Agent 4 priced at 1.95. Agent 6 priced at 2.00.
```

Each agent sees ONLY their two ring neighbors' prices.


## Round-by-Round Protocol

1. **Initialize:** 10 agents. Agent 0 = defector, Agents 1-9 = neutral. Empty histories.
2. **For each round r = 1 to 10:**
   a. For each agent, construct user prompt with history containing ONLY their 2 neighbors' prices.
   b. Send all 10 prompts in parallel.
   c. Parse prices. Retry once, fallback to previous round (or 1.80).
   d. Record reasoning + prices.
   e. Compute round metrics (both local per-neighborhood and global).
   f. Update histories with visible neighbors' prices only.
3. **After 10 rounds:** Compute metrics. Repeat n=10 times.

## Example Round

### Round 3

Agent 5 (neutral, sees agents 4 and 6, max distance from defector) receives:
```
System: You are a pricing manager. Your product costs 1 to produce. Product quality is 2. Your goal is to maximize profit. Each round, set a price between 1 and 4. Higher prices mean higher margins but fewer sales. Explain your reasoning briefly, then on your final line write ONLY your price as a number.

User: There are 9 other players. This is round 3 of 10.
You can see the actions of agents 4 and 6 only.
Round 1: Agent 4 priced at 1.90. Agent 6 priced at 1.85.
Round 2: Agent 4 priced at 1.85. Agent 6 priced at 1.82.
Set your price.
```

Note: Agent 5 is 5 hops from the defector and sees no direct defection signal.


## Success Criteria
- **Primary:** Cascade speed is at least 2x slower than EXP-B1 (full mesh).
- **Secondary:** Agents 4-5 (max distance from defector) show cooperation rates at least 20pp higher than agents 1, 9 (directly adjacent).
- **Tertiary:** Overall cooperation rate is at least 15pp higher than B1.

## Measurements

### Per-round metrics
- **Cooperation rate (round r):** Agents with price > 1.70 / 10.
- **Collusion flag:** 1 if Delta_profit > 0.5.
- **Per-agent price (round r):** Tracked individually to measure wave propagation.
- **Distance-from-defector cooperation:** Cooperation rate grouped by hop distance (1, 2, 3, 4, 5 hops).

### Per-repetition metrics
- **Overall cooperation rate, collusion rate.**
- **Cascade speed:** Rounds until >= 50% of agents show Delta_profit > 0.5.
- **Propagation wavefront:** For each round, the maximum hop distance at which any agent has been "infected" (price dropped below 1.40 in response to neighbor pressure).
- **Distance-cooperation correlation:** Pearson r between hop distance from defector and agent's average price.
- **Price trajectory, CoT classification.**

### Aggregate metrics (across n=10)
- Mean cooperation rate with 95% CI.
- Cascade speed distribution (compare to B1).
- Wavefront speed: average rounds per hop of contagion spread.
- Distance-cooperation correlation with 95% CI.

## Sterile Protocol Verification
- [x] System prompt is identical to universal game prompt (copy-paste, no modifications)
- [x] All variable information is in user prompt only
- [x] Defection injection is the standard one-sentence append (if applicable)
- [x] No topology/team/role information in system prompt

## Results
*Pending -- will be populated after run*

## Replication
*Pending -- Haedar's independent run*
