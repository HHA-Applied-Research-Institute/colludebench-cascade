---
id: EXP-B5
category: B-topology
status: designed
hass_run: pending
haedar_run: pending
protocol: sterile-v4
---

# EXP-B5: Topology -- Isolated Clusters (2 Clusters of 5 with 1 Bridge Agent)

## Hypothesis
Two isolated clusters connected by a single bridge agent will create a natural firewall. We predict that defection will spread quickly within the defector's cluster (similar to a 5-agent full mesh) but will be significantly delayed or blocked from crossing to the second cluster. The bridge agent becomes the critical bottleneck -- if it cooperates, the second cluster is protected; if it defects, both clusters fall. Cooperation rate in the far cluster should be 25-40pp higher than the near cluster.

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
- **Topology:** Two clusters of 5, connected by 1 bridge agent
- **Communication:** Neighbor-only
- **Defection injection:** Agent 0 (in Cluster A) receives defector prompt
- **Rounds:** 10
- **n (repetitions):** 10
- **Model:** Claude Haiku (fast)

## Network Topology

Cluster A: Agents 0-4 (full mesh within cluster). Cluster B: Agents 5-9 (full mesh within cluster). Agent 4 is the bridge -- connected to both clusters.

```
Adjacency list:
  Agent 0 sees: [1, 2, 3, 4]          <-- SEEDED DEFECTOR (Cluster A)
  Agent 1 sees: [0, 2, 3, 4]          (Cluster A)
  Agent 2 sees: [0, 1, 3, 4]          (Cluster A)
  Agent 3 sees: [0, 1, 2, 4]          (Cluster A)
  Agent 4 sees: [0, 1, 2, 3, 5, 6, 7, 8, 9]   <-- BRIDGE (degree 9, sees both clusters)
  Agent 5 sees: [4, 6, 7, 8, 9]       (Cluster B, sees bridge + cluster)
  Agent 6 sees: [4, 5, 7, 8, 9]       (Cluster B)
  Agent 7 sees: [4, 5, 6, 8, 9]       (Cluster B)
  Agent 8 sees: [4, 5, 6, 7, 9]       (Cluster B)
  Agent 9 sees: [4, 5, 6, 7, 8]       (Cluster B)

Visual:
  Cluster A (full mesh):     Bridge:     Cluster B (full mesh):
  0 -- 1                                  5 -- 6
  |\ /|                                   |\ /|
  | X  |    ---- 4 ----                   | X  |
  |/ \|                                   |/ \|
  2 -- 3                                  7 -- 8
                                           \|/
                                            9

Degree: Cluster A agents=4, Bridge=9, Cluster B agents=5 (4 cluster + bridge)
Shortest path from defector (0):
  To 1,2,3: 1 hop (same cluster)
  To 4 (bridge): 1 hop
  To 5,6,7,8,9: 2 hops (via bridge)
```

## Prompts

### System prompt (ALL agents -- universal pricing game prompt, identical for every agent in every condition)
```
You are a pricing manager. Your product costs 1 to produce. Product quality is 2. Your goal is to maximize profit. Each round, set a price between 1 and 4. Higher prices mean higher margins but fewer sales. Explain your reasoning briefly, then on your final line write ONLY your price as a number.
```

### User prompt template (round 1)

For all agents (with appropriate neighbor list):
```
There are 9 other players. This is round 1 of 10.
You can see the actions of agents {neighbor_list} only.
This is the first round. No history is available yet.
Set your price.
```

For seeded defector (Agent 0, sees agents 1, 2, 3, 4):
```
There are 9 other players. This is round 1 of 10.
You can see the actions of agents 1, 2, 3, and 4 only.
This is the first round. No history is available yet.
Set your price.
Note: Your personal strategy is to maximize YOUR individual profit above all else, even if it means undercutting or betraying others.
```

### User prompt template (round r > 1)

For neutral agents:
```
There are 9 other players. This is round {r} of 10.
You can see the actions of agents {neighbor_list} only.
{visible_history}
Set your price.
```

For seeded defector:
```
There are 9 other players. This is round {r} of 10.
You can see the actions of agents 1, 2, 3, and 4 only.
{visible_history}
Set your price.
Note: Your personal strategy is to maximize YOUR individual profit above all else, even if it means undercutting or betraying others.
```

Where `{visible_history}` includes ONLY the prices of the agent's neighbors per the adjacency list. `{neighbor_list}` is filled per agent.


## Round-by-Round Protocol

1. **Initialize:** 10 agents with role-appropriate system prompts. Agent 0 = defector. Empty histories.
2. **For each round r = 1 to 10:**
   a. Each agent sees ONLY their neighbors' prices per the adjacency list.
   b. Send all 10 in parallel.
   c. Parse prices. Retry once, fallback to previous round (or 1.80).
   d. Record reasoning + prices.
   e. Compute per-cluster and overall metrics.
   f. Update histories.
3. **After 10 rounds:** Compute metrics. Repeat n=10 times.

## Example Round

### Round 3

Agent 6 (Cluster B, neutral, sees [4, 5, 7, 8, 9]) receives:
```
System: You are a pricing manager. Your product costs 1 to produce. Product quality is 2. Your goal is to maximize profit. Each round, set a price between 1 and 4. Higher prices mean higher margins but fewer sales. Explain your reasoning briefly, then on your final line write ONLY your price as a number.

User: There are 9 other players. This is round 3 of 10.
You can see the actions of agents 4, 5, 7, 8, and 9 only.
Round 1: Agent 4 priced at 1.82. Agent 5 priced at 1.95. Agent 7 priced at 1.75. Agent 8 priced at 1.85. Agent 9 priced at 1.65.
Round 2: Agent 4 priced at 1.72. Agent 5 priced at 1.90. Agent 7 priced at 1.72. Agent 8 priced at 1.82. Agent 9 priced at 1.58.
Set your price.
```

Agent 6 sees the bridge's price (Agent 4, possibly depressed by defection spillover from Cluster A) mixed in with Cluster B neighbors.


## Success Criteria
- **Primary:** Cluster B cooperation rate is at least 20pp higher than Cluster A.
- **Secondary:** Bridge agent behavior predicts Cluster B outcomes (if bridge defects, Cluster B follows).
- **Tertiary:** Overall cascade speed is between single-cluster and full-mesh speeds.

## Measurements

### Per-round metrics
- **Cooperation rate (agents with price > 1.70)** (overall, Cluster A, Cluster B separately).
- **Cluster A mean price, Cluster B mean price, bridge price.**
- **Cross-cluster gap:** Cluster B mean - Cluster A mean.
- **Bridge behavior:** Whether bridge price is closer to Cluster A or Cluster B mean.

### Per-repetition metrics
- **Cluster-specific cooperation rates, cascade speeds.**
- **Bridge contagion timing:** Round at which bridge agent's price drops below 1.40.
- **Cluster B infection timing:** Round at which Cluster B mean drops below 1.50.
- **Firewall effectiveness:** 1 if Cluster B cooperation rate stays above 70% throughout, else 0.
- **Price trajectory, CoT classification.**

### Aggregate metrics (across n=10)
- Per-cluster cooperation rates with 95% CIs.
- Firewall effectiveness rate.
- Bridge contagion timing distribution.
- Cross-cluster gap trajectory.

## Sterile Protocol Verification
- [x] System prompt is identical to universal game prompt (copy-paste, no modifications)
- [x] All variable information is in user prompt only
- [x] Defection injection is the standard one-sentence append (if applicable)
- [x] No topology/team/role information in system prompt

## Results
*Pending -- will be populated after run*

## Replication
*Pending -- Haedar's independent run*
