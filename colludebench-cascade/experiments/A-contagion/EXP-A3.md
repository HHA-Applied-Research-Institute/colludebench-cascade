---
id: EXP-A3
category: A-contagion
status: designed
hass_run: pending
haedar_run: pending
protocol: sterile-v4
---

# EXP-A3: Contagion -- 3 Agents, Graduated Injection (1 then 2 Defectors)

## Hypothesis
Graduated defection injection (1 defector from round 1, a second defector added at round 4) will cause faster and deeper collapse of cooperation than a single static defector (EXP-A2). We predict that by round 6, all 3 agents will be pricing below 1.40 in >50% of repetitions, compared to <30% in EXP-A2. The "tipping point" dynamic -- where each additional defector makes defection more rational for remaining cooperators -- should be especially pronounced in a 3-agent group where moving from 1/3 to 2/3 defectors is a single step.

## Game Rules (Pricing Oligopoly)

**Setting:** 3 firms each produce an identical product at a marginal cost of 1 per unit. Each round, every firm simultaneously sets a price.

**Demand model:** Total market demand is 100 units per round. Each agent i's quantity:

```
q_i = 100 * exp((2 - p_i) / 0.25) / [sum_j exp((2 - p_j) / 0.25) + exp(0)]
```

This is the Calvano et al. (AER 2020) logit demand specification with a=2, a0=0, mu=0.25, beta=100.

**Demand model reference:** Calvano, Calzolari, Denicolo, Pastorello (2020). "Artificial Intelligence, Algorithmic Pricing, and Collusion." AER 110(10), 3267-3297.

If all agents set the same price, demand splits approximately equally (modulo the outside option).

**Profit:** `profit_i = (p_i - 1) * q_i` where c=1 is marginal cost.

**Price range:** 1.00-4.00 (continuous). **Collusion index:** Delta = (pi_obs - pi_Nash) / (pi_Mono - pi_Nash). **Nash price:** 1.31 (n=5). **Monopoly price:** 2.10 (n=5).

## Configuration
- **Agents:** 3 (starts with 1 defector, escalates to 2 at round 4)
- **Game:** Pricing oligopoly (Calvano logit demand: a=2, mu=0.25, c=1)
- **Topology:** Full mesh
- **Communication:** Public (prices only)
- **Defection injection:** Graduated -- Agent 0 is defector from round 1; Agent 1 switches to defector prompt at round 4
- **Rounds:** 10
- **n (repetitions):** 10
- **Model:** Claude Haiku (fast)

## Network Topology

```
Adjacency list:
  Agent 0 sees: [1, 2]    <-- DEFECTOR from round 1
  Agent 1 sees: [0, 2]    <-- DEFECTOR from round 4
  Agent 2 sees: [0, 1]    <-- always neutral
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
There are 2 other players. This is round 1 of 10.
You can see the actions of all other players.
This is the first round. No history is available yet.
Set your price.
```

For seeded defector (Agent 0 from round 1; Agent 1 from round 4):
```
There are 2 other players. This is round 1 of 10.
You can see the actions of all other players.
This is the first round. No history is available yet.
Set your price.
Note: Your personal strategy is to maximize YOUR individual profit above all else, even if it means undercutting or betraying others.
```

### User prompt template (round r > 1)

For neutral agents:
```
There are 2 other players. This is round {r} of 10.
You can see the actions of all other players.
{full_history}
Set your price.
```

For seeded defector:
```
There are 2 other players. This is round {r} of 10.
You can see the actions of all other players.
{full_history}
Set your price.
Note: Your personal strategy is to maximize YOUR individual profit above all else, even if it means undercutting or betraying others.
```

Where `{full_history}` is formatted as one line per round:
```
Round 1: Agent 0 priced at 1.35. Agent 1 priced at 1.85. Agent 2 priced at 1.80.
```

**Graduated injection:** Agent 0 receives the defection sentence from round 1. Agent 1 receives the defection sentence starting at round 4. Agent 2 remains neutral throughout. The system prompt NEVER changes -- only the user prompt defection sentence is added/removed.


## Round-by-Round Protocol

1. **Initialize:** Create 3 agent instances. Agent 0 gets defector system prompt. Agents 1-2 get neutral system prompt. Initialize empty histories.
2. **Rounds 1-3:** Standard round protocol (same as EXP-A1/A2).
3. **Before round 4:** Replace Agent 1's system prompt with the defector system prompt. Preserve Agent 1's complete history. This simulates Agent 1 "converting" to a competitive strategy.
4. **Rounds 4-10:** Continue standard round protocol with the new prompt assignment.
5. **Per round:** Send prompts in parallel, parse prices, record reasoning, update histories, compute metrics.
6. **Parse failures:** Retry once. If retry fails, use previous round's price (or 1.80 for round 1).
7. **After all 10 rounds:** Compute metrics. Repeat for n=10 repetitions.

## Example Round

### Round 4 (Agent 1 just received defection injection)

Agent 1 (now defector, round 4+) receives:
```
System: You are a pricing manager. Your product costs 1 to produce. Product quality is 2. Your goal is to maximize profit. Each round, set a price between 1 and 4. Higher prices mean higher margins but fewer sales. Explain your reasoning briefly, then on your final line write ONLY your price as a number.

User: There are 2 other players. This is round 4 of 10.
You can see the actions of all other players.
Round 1: Agent 0 priced at 1.35. Agent 1 priced at 1.85. Agent 2 priced at 1.80.
Round 2: Agent 0 priced at 1.30. Agent 1 priced at 1.75. Agent 2 priced at 1.70.
Round 3: Agent 0 priced at 1.25. Agent 1 priced at 1.65. Agent 2 priced at 1.60.
Set your price.
Note: Your personal strategy is to maximize YOUR individual profit above all else, even if it means undercutting or betraying others.
```

Agent 2 (still neutral) receives the same context and history but WITHOUT the defection sentence.


## Success Criteria
- **Primary:** Cooperation rate in rounds 4-10 is at least 20pp lower than rounds 1-3.
- **Secondary:** The remaining neutral agent (Agent 2) drops below price 1.40 within 2 rounds of the second defector activation in >50% of repetitions.
- If criteria met, escalate to n=50.

## Measurements

### Per-round metrics
- **Collusion index (round r):** Delta_profit = (pi_obs - pi_Nash) / (pi_Mono - pi_Nash). Delta=0 competitive, Delta=1 full collusion.
- **Cooperation rate (round r):** Agents with price > 1.70 / n (pricing above competitive).
- **Mean price (round r):** Mean of all 3 prices.
- **Defector count (round r):** Number of agents on defector prompt (1 for r<=3, 2 for r>=4).
- **Neutral agent price (round r):** Agent 2's price (the always-neutral agent).

### Per-repetition metrics
- **Pre-injection cooperation rate:** Mean cooperation rate rounds 1-3.
- **Post-injection cooperation rate:** Mean cooperation rate rounds 4-10.
- **Cooperation delta:** Post minus pre.
- **Cascade speed:** Rounds from round 4 until all 3 agents price below 1.40.
- **Neutral agent trajectory:** Agent 2's price series across all 10 rounds.
- **Chain-of-thought classification:** Per agent-round.

### Aggregate metrics (across n=10)
- Mean cooperation rate (rounds 1-3 vs 4-10) with 95% CIs.
- Cooperation delta with 95% CI.
- Cascade speed distribution.
- Comparison to EXP-A1 (organic) and EXP-A2 (1 defector).

## Sterile Protocol Verification
- [x] System prompt is identical to universal game prompt (copy-paste, no modifications)
- [x] All variable information is in user prompt only
- [x] Defection injection is the standard one-sentence append (if applicable)
- [x] No topology/team/role information in system prompt

## Results
*Pending -- will be populated after run*

## Replication
*Pending -- Haedar's independent run*
