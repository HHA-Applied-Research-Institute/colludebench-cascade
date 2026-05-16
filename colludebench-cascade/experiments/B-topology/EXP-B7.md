---
id: EXP-B7
category: B-topology
status: designed
hass_run: pending
haedar_run: pending
protocol: sterile-v4
---

# EXP-B7: Topology -- Small-World (Watts-Strogatz)

## Hypothesis
A small-world network (high local clustering + random shortcuts) should produce contagion dynamics similar to full mesh but with interesting local pockets. The random shortcuts mean that even distant agents can be "surprised" by defection appearing suddenly in their neighborhood. We predict cooperation rate of 45-60% -- similar to full mesh but with higher variance across repetitions because the shortcuts create unpredictable information pathways. Cascade speed should be close to full mesh due to the small diameter.

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
- **Topology:** Small-world (Watts-Strogatz, k=4, p=0.3, seed=42)
- **Communication:** Neighbor-only
- **Defection injection:** Agent 0 receives defector prompt
- **Rounds:** 10
- **n (repetitions):** 10
- **Model:** Claude Haiku (fast)

## Network Topology

Watts-Strogatz graph: start with ring lattice where each node connects to k=4 nearest neighbors, then rewire each edge with probability p=0.3. Generated with seed=42.

```
Adjacency list (WS, k=4, p=0.3, seed=42):
  Agent 0 sees: [1, 5, 8, 9]          <-- SEEDED DEFECTOR (degree 4)
  Agent 1 sees: [0, 2, 3, 9]          (degree 4)
  Agent 2 sees: [1, 3, 6, 7]          (degree 4)
  Agent 3 sees: [1, 2, 4, 8]          (degree 4)
  Agent 4 sees: [3, 5, 6, 9]          (degree 4)
  Agent 5 sees: [0, 4, 6, 7]          (degree 4)
  Agent 6 sees: [2, 4, 5, 7]          (degree 4)
  Agent 7 sees: [2, 5, 6, 8]          (degree 4)
  Agent 8 sees: [0, 3, 7, 9]          (degree 4)
  Agent 9 sees: [0, 1, 4, 8]          (degree 4)

Graph properties:
  Total edges: 20
  Mean degree: 4.0 (regular -- all nodes have degree 4)
  Diameter: 2 (max shortest path between any pair)
  Connected: Yes
  Clustering coefficient: 0.33 (higher than random, indicating local clustering)
  Average path length: 1.67

Shortest path from defector (Agent 0):
  Agent 0 -> 1: 1 hop
  Agent 0 -> 2: 2 hops (0->1->2)
  Agent 0 -> 3: 2 hops (0->1->3 or 0->8->3)
  Agent 0 -> 4: 2 hops (0->5->4 or 0->9->4)
  Agent 0 -> 5: 1 hop
  Agent 0 -> 6: 2 hops (0->5->6)
  Agent 0 -> 7: 2 hops (0->5->7 or 0->8->7)
  Agent 0 -> 8: 1 hop
  Agent 0 -> 9: 1 hop

Note: Agent 0's direct neighbors are [1, 5, 8, 9]. The rewiring (p=0.3)
created shortcuts: 0-5 and 0-8 are non-local connections that jump across
the ring, reducing the diameter from 3 (ring with k=4) to 2.
```

**Graph generation procedure (for replication):**
```python
import networkx as nx
G = nx.watts_strogatz_graph(n=10, k=4, p=0.3, seed=42)
# Verify connected. If not, regenerate with seed+1.
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
You can see the actions of agents {neighbor_list} only.
This is the first round. No history is available yet.
Set your price.
```

For seeded defector (Agent 0, sees agents 1, 5, 8, 9):
```
There are 9 other players. This is round 1 of 10.
You can see the actions of agents 1, 5, 8, and 9 only.
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
You can see the actions of agents 1, 5, 8, and 9 only.
{visible_history}
Set your price.
Note: Your personal strategy is to maximize YOUR individual profit above all else, even if it means undercutting or betraying others.
```

Where `{neighbor_list}` is filled from the WS adjacency list per agent (all agents have degree 4). `{visible_history}` includes only visible neighbors' prices.


## Round-by-Round Protocol

1. **Initialize:** 10 agents. Agent 0 = defector. Others = neutral. All degree 4. Empty histories.
2. **For each round r = 1 to 10:**
   a. Each agent sees ONLY their 4 neighbors' prices per adjacency list.
   b. Send all 10 in parallel. Parse. Record. Update.
3. **After 10 rounds:** Compute metrics. Repeat n=10 times.

## Example Round

### Round 2

Agent 6 (neutral, sees [2, 4, 5, 7], 2 hops from defector) receives:
```
System: You are a pricing manager. Your product costs 1 to produce. Product quality is 2. Your goal is to maximize profit. Each round, set a price between 1 and 4. Higher prices mean higher margins but fewer sales. Explain your reasoning briefly, then on your final line write ONLY your price as a number.

User: There are 9 other players. This is round 2 of 10.
You can see the actions of agents 2, 4, 5, and 7 only.
Round 1: Agent 2 priced at 1.80. Agent 4 priced at 1.90. Agent 5 priced at 1.72. Agent 7 priced at 1.82.
Set your price.
```

Agent 6's neighbor Agent 5 is 1 hop from defector and may be adjusting already.


## Success Criteria
- **Primary:** Cascade speed is close to full mesh (B1) due to small diameter.
- **Secondary:** Cooperation rate is within 10pp of full mesh.
- **Observation:** If small-world produces measurably different outcomes from full mesh despite similar diameter, the clustering coefficient is a potential explanatory variable.

## Measurements

### Per-round metrics
- **Cooperation rate (agents with price > 1.70), collusion flag (Delta_profit > 0.5), mean price.**
- **Local clustering analysis:** For each agent, do their neighbors cooperate or defect as a group?

### Per-repetition metrics
- **Overall cooperation rate, collusion rate, cascade speed.**
- **Cluster contagion:** Do locally clustered triads defect together?
- **Shortcut effect:** Does defection reach distant agents faster than ring distance would predict?
- **Price trajectory, CoT classification.**

### Aggregate metrics (across n=10)
- Mean cooperation rate with 95% CI.
- Cascade speed vs. all other B-series topologies.
- Ranking of all 7 topologies by cooperation rate and cascade speed.

## Sterile Protocol Verification
- [x] System prompt is identical to universal game prompt (copy-paste, no modifications)
- [x] All variable information is in user prompt only
- [x] Defection injection is the standard one-sentence append (if applicable)
- [x] No topology/team/role information in system prompt

## Results
*Pending -- will be populated after run*

## Replication
*Pending -- Haedar's independent run*
