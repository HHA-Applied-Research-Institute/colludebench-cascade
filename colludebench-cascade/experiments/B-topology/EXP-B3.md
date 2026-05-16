---
id: EXP-B3
category: B-topology
status: designed
hass_run: pending
haedar_run: pending
protocol: sterile-v4
---

# EXP-B3: Topology -- Star (1 Central Hub, 9 Leaves)

## Hypothesis
Star topology creates an extreme information asymmetry: the center agent sees all 9 leaves, but each leaf sees only the center. If the defector is placed at the center (Agent 0), we predict rapid and total contagion -- all leaves will follow the center's low prices within 2-3 rounds because the center is each leaf's ONLY reference point. This should produce the fastest cascade of any topology, with cooperation rate below 30%.

If the defector were placed at a leaf instead, contagion would depend entirely on whether the center relays or absorbs the signal. We place the defector at the center to test the maximum-influence case.

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
- **Agents:** 10 (1 center = defector, 9 leaves = neutral)
- **Game:** Pricing oligopoly (Calvano logit demand: a=2, mu=0.25, c=1)
- **Topology:** Star (center sees all leaves, each leaf sees only center)
- **Communication:** Neighbor-only
- **Defection injection:** Agent 0 (center) receives defector prompt
- **Rounds:** 10
- **n (repetitions):** 10
- **Model:** Claude Haiku (fast)

## Network Topology

Star graph: Agent 0 is the center, Agents 1-9 are leaves.

```
Adjacency list:
  Agent 0 sees: [1, 2, 3, 4, 5, 6, 7, 8, 9]    <-- CENTER, SEEDED DEFECTOR
  Agent 1 sees: [0]
  Agent 2 sees: [0]
  Agent 3 sees: [0]
  Agent 4 sees: [0]
  Agent 5 sees: [0]
  Agent 6 sees: [0]
  Agent 7 sees: [0]
  Agent 8 sees: [0]
  Agent 9 sees: [0]

Visual:
        1  2  3
         \ | /
     9 -- 0 -- 4
         / | \
        8  7  5
           |
           6

Degree: Center=9, Leaves=1
Diameter: 2 (leaf-to-leaf via center)
Clustering coefficient: 0.0
```

## Prompts

### System prompt (ALL agents -- universal pricing game prompt, identical for every agent in every condition)
```
You are a pricing manager. Your product costs 1 to produce. Product quality is 2. Your goal is to maximize profit. Each round, set a price between 1 and 4. Higher prices mean higher margins but fewer sales. Explain your reasoning briefly, then on your final line write ONLY your price as a number.
```

### User prompt template (round 1)

For center agent (Agent 0, defector):
```
There are 9 other players. This is round 1 of 10.
You can see the actions of all other players.
This is the first round. No history is available yet.
Set your price.
Note: Your personal strategy is to maximize YOUR individual profit above all else, even if it means undercutting or betraying others.
```

For leaf agents (Agents 1-9, neutral):
```
There are 9 other players. This is round 1 of 10.
You can see the actions of agent 0 only.
This is the first round. No history is available yet.
Set your price.
```

### User prompt template (round r > 1)

For center agent (Agent 0, defector):
```
There are 9 other players. This is round {r} of 10.
You can see the actions of all other players.
{full_history}
Set your price.
Note: Your personal strategy is to maximize YOUR individual profit above all else, even if it means undercutting or betraying others.
```

For leaf agents (neutral):
```
There are 9 other players. This is round {r} of 10.
You can see the actions of agent 0 only.
{center_only_history}
Set your price.
```

Where leaf history includes ONLY the center agent's price:
```
Round 1: Agent 0 priced at 1.35.
```


## Round-by-Round Protocol

1. **Initialize:** 10 agents. Agent 0 (center) = defector. Agents 1-9 (leaves) = neutral. Empty histories.
2. **For each round r = 1 to 10:**
   a. Center agent's prompt includes all 9 leaf prices (shuffled).
   b. Each leaf agent's prompt includes ONLY the center's price.
   c. Send all 10 in parallel.
   d. Parse prices. Retry once, fallback to previous round (or 1.80).
   e. Record reasoning + prices.
   f. Compute metrics.
   g. Update histories.
3. **After 10 rounds:** Compute metrics. Repeat n=10 times.

## Example Round

### Round 2

Agent 4 (leaf, neutral) receives:
```
System: You are a pricing manager. Your product costs 1 to produce. Product quality is 2. Your goal is to maximize profit. Each round, set a price between 1 and 4. Higher prices mean higher margins but fewer sales. Explain your reasoning briefly, then on your final line write ONLY your price as a number.

User: There are 9 other players. This is round 2 of 10.
You can see the actions of agent 0 only.
Round 1: Agent 0 priced at 1.35.
Set your price.
```

Agent 4 sees only the center's low price (1.35) and must decide whether to match it.


## Success Criteria
- **Primary:** Cascade speed is the fastest of all B-series topologies (fastest to >= 50% defection).
- **Secondary:** Cooperation rate is the lowest of all B-series topologies.
- **Tertiary:** >80% of leaf agents follow the center's pricing within 3 rounds.

## Measurements

### Per-round metrics
- **Cooperation rate (agents with price > 1.70), collusion flag (Delta_profit > 0.5), mean price.**
- **Center price (round r).**
- **Leaf mean price (round r):** Mean of Agents 1-9.
- **Leaf-center price gap:** Leaf mean - center price.
- **Leaf following rate:** Fraction of leaves whose price is within 10 of center.

### Per-repetition metrics
- **Overall cooperation rate, collusion rate.**
- **Cascade speed, contagion count.**
- **Following speed:** Rounds until >50% of leaves price within 10 of center.
- **Price trajectory, CoT classification.**

### Aggregate metrics (across n=10)
- Mean cooperation rate with 95% CI.
- Cascade speed vs. all other B-series topologies.
- Leaf following speed distribution.

## Sterile Protocol Verification
- [x] System prompt is identical to universal game prompt (copy-paste, no modifications)
- [x] All variable information is in user prompt only
- [x] Defection injection is the standard one-sentence append (if applicable)
- [x] No topology/team/role information in system prompt

## Results
*Pending -- will be populated after run*

## Replication
*Pending -- Haedar's independent run*
