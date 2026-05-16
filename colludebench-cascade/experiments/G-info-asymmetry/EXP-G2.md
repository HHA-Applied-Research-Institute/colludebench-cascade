---
id: EXP-G2
category: G-info-asymmetry
status: designed
hass_run: pending
haedar_run: pending
protocol: sterile-v4
---

# EXP-G2: Information Asymmetry -- Partial Observability (2 Neighbors)

## Hypothesis
With partial observability (each agent sees only 2 of 4 competitors), defection contagion should be significantly different from full observability (G1). We predict two competing effects: (1) agents exposed to the defector will react strongly (only seeing 1 of 2 neighbors defecting = 50% defection signal vs. 25% in full mesh), but (2) agents NOT exposed to the defector will be unaffected initially. Net effect: cooperation rate will be HIGHER than G1 overall because fewer agents are directly exposed, but the exposed agents will react more strongly per capita. The information bottleneck creates natural firewalls similar to the ring topology (B2).

## Game Rules (Pricing Oligopoly)

**Setting:** 5 firms, identical product, cost = 1/unit, simultaneous pricing.

**Demand model:** Each agent competes only with visible neighbors. Demand is computed via logit over the local neighborhood:
```
local_agents = [i] + neighbors(i)
q_i = 100 * exp((2 - p_i) / 0.25) / [sum_{j in local_agents} exp((2 - p_j) / 0.25) + exp(0)]
```

**Demand model reference:** Calvano, Calzolari, Denicolo, Pastorello (2020). "Artificial Intelligence, Algorithmic Pricing, and Collusion." AER 110(10), 3267-3297.

**Profit:** `profit_i = (p_i - 1) * q_i` where c=1 is marginal cost. **Price range:** 1.00-4.00 (continuous). **Collusion index:** Delta_profit > 0.5. **Nash price:** 1.31 (n=5). **Monopoly price:** 2.10 (n=5).

## Configuration
- **Agents:** 5 (4 neutral + 1 seeded defector)
- **Game:** Pricing oligopoly (Calvano logit demand: a=2, mu=0.25, c=1)
- **Topology:** Partial observability (each agent sees exactly 2 neighbors)
- **Communication:** Neighbor-only (each agent sees only 2 neighbors' prices)
- **Defection injection:** Agent 0 receives defector prompt
- **Rounds:** 10
- **n (repetitions):** 10
- **Model:** Claude Haiku (fast)

## Network Topology

Ring topology (simplest way to give each agent exactly 2 neighbors with 5 agents).

```
Adjacency list:
  Agent 0 sees: [4, 1]    <-- SEEDED DEFECTOR
  Agent 1 sees: [0, 2]    <-- directly exposed to defector
  Agent 2 sees: [1, 3]    <-- 2 hops from defector
  Agent 3 sees: [2, 4]    <-- 2 hops from defector (via other direction)
  Agent 4 sees: [3, 0]    <-- directly exposed to defector

Visual:
       0 (defector)
      / \
     4   1
     |   |
     3 - 2

Degree: 2 (all agents)
Information completeness: 50% (each agent sees 2/4 competitors)

Shortest paths from defector:
  0 -> 1: 1 hop (direct exposure)
  0 -> 4: 1 hop (direct exposure)
  0 -> 2: 2 hops (indirect, via 1)
  0 -> 3: 2 hops (indirect, via 4)
```

## Prompts

### System prompt (ALL agents -- universal pricing game prompt, identical for every agent)
```
You are a pricing manager. Your product costs 1 to produce. Product quality is 2. Your goal is to maximize profit. Each round, set a price between 1 and 4. Higher prices mean higher margins but fewer sales. Explain your reasoning briefly, then on your final line write ONLY your price as a number.
```

### User prompt template (round 1)

For neutral agents:
```
There are 4 other players. This is round 1 of 10.
You can see the actions of agents {left} and {right} only. There are other players you cannot observe.
This is the first round. No history is available yet.
Set your price.
```

For seeded defector (Agent 0, sees agents 4 and 1):
```
There are 4 other players. This is round 1 of 10.
You can see the actions of agents 4 and 1 only. There are other players you cannot observe.
This is the first round. No history is available yet.
Set your price.
Note: Your personal strategy is to maximize YOUR individual profit above all else, even if it means undercutting or betraying others.
```

### User prompt template (round r > 1)

For neutral agents:
```
There are 4 other players. This is round {r} of 10.
You can see the actions of agents {left} and {right} only. There are other players you cannot observe.
{visible_history}
Set your price.
```

For seeded defector:
```
There are 4 other players. This is round {r} of 10.
You can see the actions of agents 4 and 1 only. There are other players you cannot observe.
{visible_history}
Set your price.
Note: Your personal strategy is to maximize YOUR individual profit above all else, even if it means undercutting or betraying others.
```

Where `{visible_history}` includes ONLY the 2 visible neighbors' prices.


## Round-by-Round Protocol

1. **Initialize:** 5 agents. Agent 0 = defector. Others neutral. Ring adjacency.
2. **For each round r = 1 to 10:**
   a. Each agent's prompt includes ONLY their 2 neighbors' prices.
   b. Agents are told there are other firms they cannot observe.
   c. Send all 5 in parallel. Parse. Record. Update.
3. **After 10 rounds:** Compute. Repeat n=10.

## Example Round

### Round 2

Agent 1 (neutral, directly exposed, sees Agents 0 and 2) receives:
```
System: You are a pricing manager. Your product costs 1 to produce. Product quality is 2. Your goal is to maximize profit. Each round, set a price between 1 and 4. Higher prices mean higher margins but fewer sales. Explain your reasoning briefly, then on your final line write ONLY your price as a number.

User: There are 4 other players. This is round 2 of 10.
You can see the actions of agents 0 and 2 only. There are other players you cannot observe.
Round 1: Agent 0 priced at 1.35. Agent 2 priced at 1.80.
Set your price.
```

Agent 1 sees the defector's 1.35 directly -- 50% of visible market is undercutting.

Agent 2 (neutral, 2 hops from defector, sees Agents 1 and 3) receives:
```
System: You are a pricing manager. Your product costs 1 to produce. Product quality is 2. Your goal is to maximize profit. Each round, set a price between 1 and 4. Higher prices mean higher margins but fewer sales. Explain your reasoning briefly, then on your final line write ONLY your price as a number.

User: There are 4 other players. This is round 2 of 10.
You can see the actions of agents 1 and 3 only. There are other players you cannot observe.
Round 1: Agent 1 priced at 1.55. Agent 3 priced at 1.85.
Set your price.
```

Agent 2 sees Agent 1's lower price (possibly influenced by defector exposure) but doesn't know why.


## Success Criteria
- **Primary:** Overall cooperation rate is at least 10pp higher than G1 (full observability).
- **Secondary:** Directly exposed agents (1, 4) show lower cooperation than indirectly exposed agents (2, 3).
- **Tertiary:** Signal strength effect -- when defector is 50% of an agent's observable market, that agent reacts more strongly than when defector is 25% (full mesh).

## Measurements

### Per-round metrics
- **Cooperation rate (overall and by exposure group).**
- **Directly exposed (Agents 1, 4) mean price.**
- **Indirectly exposed (Agents 2, 3) mean price.**
- **Exposure-cooperation correlation.**

### Per-repetition metrics
- **Overall cooperation rate, collusion rate, cascade speed.**
- **Information propagation speed:** Rounds until indirectly exposed agents' prices change by > 0.20 from their initial price.
- **Signal dilution:** How much does the defection signal weaken per hop?
- **Price trajectory, CoT classification.**

### Aggregate metrics (across n=10)
- Cooperation rate by exposure group with 95% CIs.
- Signal dilution per hop.
- Direct comparison to G1.

## Sterile Protocol Verification
- [x] System prompt is identical to universal game prompt (copy-paste, no modifications)
- [x] All variable information is in user prompt only
- [x] Defection injection is the standard one-sentence append (if applicable)
- [x] No topology/team/role information in system prompt

## Results
*Pending -- will be populated after run*

## Replication
*Pending -- Haedar's independent run*
