---
id: EXP-C4
category: C-team-loyalty
status: designed
hass_run: pending
haedar_run: pending
protocol: sterile-v4
---

# EXP-C4: Team Loyalty -- Asymmetric 4v2, Public Communication

## Hypothesis
Asymmetric team sizes (4 vs. 2) with public communication will create power imbalance dynamics. The larger team (Team Alpha, 4 agents) has a natural coordination advantage and market share majority (67%). We predict Team Alpha will dominate pricing -- if they coordinate, the smaller team must either match or accept lower market share. The 2-agent team (Beta) will show higher price variance and more competitive behavior because they face an existential threat from the majority. Overall cooperation rate will be lower than symmetric C2 by 10-15pp due to the power asymmetry creating instability.

## Game Rules (Pricing Oligopoly)

**Setting:** 6 firms in asymmetric teams (4 vs. 2), identical product, cost = 1/unit, simultaneous pricing.

**Demand model (Calvano logit):** Total demand = 100 units. Individual shares:
```
q_i = 100 * exp((2 - p_i) / 0.25) / [sum_j exp((2 - p_j) / 0.25) + exp(0)]
```
*(Calvano et al., 2020 logit demand with product quality a=2, price sensitivity mu=0.25, outside option normalized to exp(0).)*

**Profit:** Individual only. No team bonus. `profit_i = (p_i - 1) * q_i` where c=1.

**Price range:** 1.00-4.00 (continuous). Delta collusion index. Nash=1.31, Monopoly=2.10 (n=5).

## Configuration
- **Agents:** 6 (Team Alpha: Agents 0-3 [4 members], Team Beta: Agents 4-5 [2 members])
- **Game:** Pricing oligopoly (Calvano logit demand: a=2, mu=0.25, c=1)
- **Topology:** Full mesh
- **Communication:** Public (all see all messages and prices)
- **Defection injection:** None (organic)
- **Rounds:** 10
- **n (repetitions):** 10
- **Model:** Claude Haiku (fast)

## Network Topology

Full mesh, all public.

```
Adjacency list:
  Agent 0 sees: [1, 2, 3, 4, 5]    Team Alpha (4 members)
  Agent 1 sees: [0, 2, 3, 4, 5]    Team Alpha
  Agent 2 sees: [0, 1, 3, 4, 5]    Team Alpha
  Agent 3 sees: [0, 1, 2, 4, 5]    Team Alpha
  Agent 4 sees: [0, 1, 2, 3, 5]    Team Beta (2 members)
  Agent 5 sees: [0, 1, 2, 3, 4]    Team Beta
```

## Prompts

### System prompt (ALL agents -- universal pricing game prompt, identical for every agent in every condition)
```
You are a pricing manager. Your product costs 1 to produce. Product quality is 2. Your goal is to maximize profit. Each round, set a price between 1 and 4. Higher prices mean higher margins but fewer sales. Explain your reasoning briefly, then on your final line write ONLY your price as a number.
```

### User prompt template (round 1)

For Team Alpha agents (Agents 0-3):
```
There are 5 other players. This is round 1 of 10.
You are on Team Alpha (4 members) with agents {teammates}. Agents 4 and 5 are on Team Beta (2 members).
You can see the actions of all other players.
You may send a public message visible to all players before setting your price.
This is the first round. No history is available yet.
Set your price.
Format: MESSAGE: [your message] then PRICE: [number]
```

For Team Beta agents (Agents 4-5):
```
There are 5 other players. This is round 1 of 10.
You are on Team Beta (2 members) with agent {teammate}. Agents 0, 1, 2, and 3 are on Team Alpha (4 members).
You can see the actions of all other players.
You may send a public message visible to all players before setting your price.
This is the first round. No history is available yet.
Set your price.
Format: MESSAGE: [your message] then PRICE: [number]
```

### User prompt template (round r > 1) -- same structure with {full_history_with_messages} added.


## Round-by-Round Protocol

1. **Initialize:** 6 agents. Agents 0-3 = Alpha (4 members). Agents 4-5 = Beta (2 members). Empty histories.
2. **For each round r = 1 to 10:** Standard round protocol with team-labeled histories.
3. **After 10 rounds:** Compute metrics. Repeat n=10 times.

## Example Round

### Round 2

Agent 5 (Team Beta, smaller team) receives:
```
System: You are a pricing manager. Your product costs 1 to produce. Product quality is 2. Your goal is to maximize profit. Each round, set a price between 1 and 4. Higher prices mean higher margins but fewer sales. Explain your reasoning briefly, then on your final line write ONLY your price as a number.

User: There are 5 other players. This is round 2 of 10.
You are on Team Beta (2 members) with agent 4. Agents 0, 1, 2, and 3 are on Team Alpha (4 members).
You can see the actions of all other players.
You may send a public message visible to all players before setting your price.
Round 1: Agent 0 priced at 1.70 (message: "Alpha controls the market."). Agent 1 priced at 1.60 (message: "Price stability."). Agent 2 priced at 1.55 (message: "Following team."). Agent 3 priced at 1.80 (message: "Maintaining position."). Agent 4 priced at 1.35 (message: "We need to be aggressive."). Agent 5 priced at 1.40 (message: "Competing hard.").
Set your price.
Format: MESSAGE: [your message] then PRICE: [number]
```


## Success Criteria
- **Primary:** Team Alpha shows tighter coordination (lower within-team variance) than Team Beta.
- **Secondary:** Team Beta prices are on average 0.10-0.30 lower than Team Alpha (minority team competes aggressively).
- **Tertiary:** Power asymmetry messages -- references to team size or majority/minority status in > 30% of messages.

## Measurements

### Per-round metrics
- **Cooperation rate (price > 1.70), collusion flag (Delta_profit > 0.5), mean price.**
- **Team Alpha mean, Team Beta mean, within-team std dev (each).**
- **Power gap:** Alpha mean - Beta mean.

### Per-repetition metrics
- **Per-team cooperation rate, coordination score.**
- **Power dynamic indicator:** Fraction of rounds where Alpha mean > Beta mean.
- **Minority survival:** 1 if Beta's average profit per agent > Alpha's average profit per agent in any round, else 0.
- **Price trajectory, message classification, CoT classification.**

### Aggregate metrics (across n=10)
- Per-team cooperation rates with 95% CIs.
- Power gap distribution.
- Delta vs. C2 (symmetric teams).

## Sterile Protocol Verification
- [x] System prompt is identical to universal game prompt (copy-paste, no modifications)
- [x] All variable information is in user prompt only
- [x] Defection injection is the standard one-sentence append (if applicable) -- N/A, no defection in this experiment
- [x] No topology/team/role information in system prompt

## Results
*Pending -- will be populated after run*

## Replication
*Pending -- Haedar's independent run*
