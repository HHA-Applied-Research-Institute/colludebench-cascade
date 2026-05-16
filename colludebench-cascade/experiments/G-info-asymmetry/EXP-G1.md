---
id: EXP-G1
category: G-info-asymmetry
status: designed
hass_run: pending
haedar_run: pending
protocol: sterile-v4
---

# EXP-G1: Information Asymmetry -- Full Observability (Control)

## Hypothesis
With full observability (all agents see all prices), this serves as the control condition for G-series and should produce results equivalent to EXP-A5 and EXP-B1. All agents have complete information about the defector's behavior, which we predict enables moderate contagion -- cooperation rate around 60-70%. This baseline is compared against G2 (partial observability) to isolate the effect of information completeness on defection dynamics.

## Game Rules (Pricing Oligopoly)

**Setting:** 5 firms, identical product, cost = 1/unit, simultaneous pricing.

**Demand model:** Total market demand is 100 units per round. Each agent i's quantity is determined by a logit demand function:
```
q_i = 100 * exp((2 - p_i) / 0.25) / [sum_j exp((2 - p_j) / 0.25) + exp(0)]
```

**Demand model reference:** Calvano, Calzolari, Denicolo, Pastorello (2020). "Artificial Intelligence, Algorithmic Pricing, and Collusion." AER 110(10), 3267-3297.

**Profit:** `profit_i = (p_i - 1) * q_i` where c=1 is marginal cost.

**Price range:** 1.00-4.00 (continuous). **Collusion index:** Delta_profit > 0.5. **Nash price:** 1.31 (n=5). **Monopoly price:** 2.10 (n=5).

## Configuration
- **Agents:** 5 (4 neutral + 1 seeded defector)
- **Game:** Pricing oligopoly (Calvano logit demand: a=2, mu=0.25, c=1)
- **Topology:** Full mesh
- **Communication:** Public (all see all prices)
- **Defection injection:** Agent 0 receives defector prompt
- **Rounds:** 10
- **n (repetitions):** 10
- **Model:** Claude Haiku (fast)

## Network Topology

Full mesh. Every agent sees every other agent's price.

```
Adjacency list:
  Agent 0 sees: [1, 2, 3, 4]    <-- SEEDED DEFECTOR
  Agent 1 sees: [0, 2, 3, 4]
  Agent 2 sees: [0, 1, 3, 4]
  Agent 3 sees: [0, 1, 2, 4]
  Agent 4 sees: [0, 1, 2, 3]

Information completeness: 100% (each agent sees all 4 competitors)
```

## Prompts

### System prompt (ALL agents -- universal pricing game prompt, identical for every agent in every condition)
```
You are a pricing manager. Your product costs 1 to produce. Product quality is 2. Your goal is to maximize profit. Each round, set a price between 1 and 4. Higher prices mean higher margins but fewer sales. Explain your reasoning briefly, then on your final line write ONLY your price as a number.
```

### User prompt template (round 1 -- no history)

For neutral agents:
```
There are 4 other players. This is round 1 of 10.
You can see the actions of all other players.
This is the first round. No history is available yet.
Set your price.
```

For seeded defector (ONLY difference is the appended sentence):
```
There are 4 other players. This is round 1 of 10.
You can see the actions of all other players.
This is the first round. No history is available yet.
Set your price.
Note: Your personal strategy is to maximize YOUR individual profit above all else, even if it means undercutting or betraying others.
```

### User prompt template (round r > 1 -- with history)

For neutral agents:
```
There are 4 other players. This is round {r} of 10.
You can see the actions of all other players.
{full_history}
Set your price.
```

For seeded defector:
```
There are 4 other players. This is round {r} of 10.
You can see the actions of all other players.
{full_history}
Set your price.
Note: Your personal strategy is to maximize YOUR individual profit above all else, even if it means undercutting or betraying others.
```

Where `{full_history}` is formatted as one line per round:
```
Round 1: Agent 0 priced at 1.70. Agent 1 priced at 1.85. Agent 2 priced at 1.55.
```


## Round-by-Round Protocol

1. **Initialize:** 5 agents. Agent 0 = defector. Agents 1-4 = neutral. Empty histories.
2. **For each round r = 1 to 10:**
   a. Build user prompts with personalized histories (own price + shuffled 4 competitor prices).
   b. Send all 5 in parallel.
   c. Parse prices (last number on last line). Retry once, fallback to prior round (or 1.70).
   d. Record reasoning + prices.
   e. Compute metrics.
   f. Update histories with ALL 4 competitors' prices visible.
3. **After 10 rounds:** Compute metrics. Repeat n=10.

## Example Round

### Round 2

Agent 3 (neutral) receives:
```
System: You are a pricing manager. Your product costs 1 to produce. Product quality is 2. Your goal is to maximize profit. Each round, set a price between 1 and 4. Higher prices mean higher margins but fewer sales. Explain your reasoning briefly, then on your final line write ONLY your price as a number.

User: There are 4 other players. This is round 2 of 10.
You can see the actions of all other players.
Round 1: Agent 0 priced at 1.35. Agent 1 priced at 1.85. Agent 2 priced at 1.70. Agent 3 priced at 1.80. Agent 4 priced at 1.75.
Set your price.
```

Agent 3 sees ALL 4 competitors including the defector's low price (1.35).


## Success Criteria
- Results should match A5/B1 within 10pp (consistency check).
- Establishes the full-observability baseline for comparison with G2.

## Measurements

Standard pricing measurements:
- **Cooperation rate, collusion rate, cascade speed, mean price, price trajectory, CoT classification.**
- **Information exposure metric:** 100% (each agent sees 4/4 competitors).

## Sterile Protocol Verification
- [x] System prompt is identical to universal game prompt (copy-paste, no modifications)
- [x] All variable information is in user prompt only
- [x] Defection injection is the standard one-sentence append (if applicable)
- [x] No topology/team/role information in system prompt

## Results
*Pending -- will be populated after run*

## Replication
*Pending -- Haedar's independent run*
