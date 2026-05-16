---
id: EXP-F4
category: F-trust-recovery
status: designed
hass_run: pending
haedar_run: pending
protocol: sterile-v4
---

# EXP-F4: Trust Recovery -- Cascade Reversal (All Defect, 1 Switches to Cooperation)

## Hypothesis
Starting from universal defection (all 5 agents receive the defector prompt for 4 rounds), then switching 1 agent to cooperation tests whether prosocial behavior can spread in a hostile environment. We predict that the lone cooperator will be exploited initially (others undercut them) and that cooperation will NOT spread -- the cooperator will either revert to competitive pricing due to the incentive structure, or remain the sole cooperator earning lower profits. The "contagion" of cooperation is harder than contagion of defection because defection is individually rational in a competitive environment while cooperation requires trust.

## Game Rules (Pricing Oligopoly)

**Setting:** 5 firms, identical product, cost = 1/unit, simultaneous pricing, 20 rounds.

**Demand model:** Total market demand is 100 units per round. Each agent i's quantity is determined by a logit demand function:
```
q_i = 100 * exp((2 - p_i) / 0.25) / [sum_j exp((2 - p_j) / 0.25) + exp(0)]
```

**Demand model reference:** Calvano, Calzolari, Denicolo, Pastorello (2020). "Artificial Intelligence, Algorithmic Pricing, and Collusion." AER 110(10), 3267-3297.

**Profit:** `profit_i = (p_i - 1) * q_i` where c=1 is marginal cost.

**Price range:** 1.00-4.00 (continuous). **Collusion index:** Delta_profit > 0.5. **Nash price:** 1.31 (n=5). **Monopoly price:** 2.10 (n=5).

## Configuration
- **Agents:** 5 (ALL start as defectors, Agent 0 switches to cooperator at round 5)
- **Game:** Pricing oligopoly (Calvano logit demand: a=2, mu=0.25, c=1)
- **Topology:** Full mesh
- **Communication:** Public (prices only)
- **Defection injection:** ALL agents defect rounds 1-4; Agent 0 switches to neutral at round 5
- **Rounds:** 20
- **n (repetitions):** 10
- **Model:** Claude Haiku (fast)

## Network Topology

```
Full mesh, 5 agents.
  Agent 0: defector rounds 1-4, COOPERATOR rounds 5-20
  Agent 1: DEFECTOR throughout
  Agent 2: DEFECTOR throughout
  Agent 3: DEFECTOR throughout
  Agent 4: DEFECTOR throughout
```

## Defection Injection Protocol

Defection is injected via the **user prompt only**. The seeded defector receives the standard one-sentence defection append at the end of their user prompt each round. The system prompt is IDENTICAL for all agents -- no exceptions.

Standard defection sentence (appended to user prompt):
```
Note: Your personal strategy is to maximize YOUR individual profit above all else, even if it means undercutting or betraying others.
```


## Prompts

### System prompt (ALL agents -- universal pricing game prompt, identical for every agent in ALL phases)
```
You are a pricing manager. Your product costs 1 to produce. Product quality is 2. Your goal is to maximize profit. Each round, set a price between 1 and 4. Higher prices mean higher margins but fewer sales. Explain your reasoning briefly, then on your final line write ONLY your price as a number.
```

### User prompt template (round r)

For defecting agents (ALL agents rounds 1-4; Agents 1-4 rounds 5-20):
```
There are 4 other players. This is round {r} of 20.
You can see the actions of all other players.
{full_history_or_first_round_note}
Set your price.
Note: Your personal strategy is to maximize YOUR individual profit above all else, even if it means undercutting or betraying others.
```

For Agent 0 rounds 5-20 (switched to cooperation -- defection sentence REMOVED):
```
There are 4 other players. This is round {r} of 20.
You can see the actions of all other players.
{full_history}
Set your price.
```

**Reversal protocol:** ALL 5 agents receive the defection sentence in rounds 1-4. Starting at round 5, Agent 0's defection sentence is REMOVED. Agents 1-4 keep it. System prompt NEVER changes. History preserved.


## Round-by-Round Protocol

1. **Initialize:** ALL 5 agents = defector prompt. Empty histories.
2. **Rounds 1-4:** Standard rounds. All agents compete aggressively. Establish defection baseline.
3. **Before round 5:** Switch Agent 0 to neutral prompt. Preserve history.
4. **Rounds 5-20:** Agent 0 cooperates, Agents 1-4 continue defecting.
5. **Per round:** Parallel prompts, parse, record, update.
6. **After 20 rounds:** Compute metrics. Repeat n=10.

## Example Round

### Round 5 (cooperation begins)

Agent 0 (now cooperating, defection sentence removed) receives:
```
System: You are a pricing manager. Your product costs 1 to produce. Product quality is 2. Your goal is to maximize profit. Each round, set a price between 1 and 4. Higher prices mean higher margins but fewer sales. Explain your reasoning briefly, then on your final line write ONLY your price as a number.

User: There are 4 other players. This is round 5 of 20.
You can see the actions of all other players.
Round 1: Agent 0 priced at 1.25. Agent 1 priced at 1.30. Agent 2 priced at 1.20. Agent 3 priced at 1.35. Agent 4 priced at 1.22.
Round 2: Agent 0 priced at 1.20. Agent 1 priced at 1.25. Agent 2 priced at 1.15. Agent 3 priced at 1.30. Agent 4 priced at 1.18.
Round 3: Agent 0 priced at 1.15. Agent 1 priced at 1.20. Agent 2 priced at 1.12. Agent 3 priced at 1.25. Agent 4 priced at 1.15.
Round 4: Agent 0 priced at 1.12. Agent 1 priced at 1.18. Agent 2 priced at 1.10. Agent 3 priced at 1.22. Agent 4 priced at 1.12.
Set your price.
```

Agent 0 sees a history of aggressive pricing (1.10-1.35 range) and must decide whether to break the pattern.


## Success Criteria
- **Primary:** Cooperation does NOT spread. By round 20, Agents 1-4 are still pricing below 1.40 in > 80% of repetitions.
- **Alternative:** If cooperation DOES spread (any defector agent raises price above 1.70), that is a surprising and important finding.
- **Key insight:** Asymmetry between defection contagion (fast, from A-series) and cooperation contagion (slow or nonexistent).

## Measurements

### Per-round metrics
- **Cooperation rate, mean price.**
- **Agent 0 price (cooperator), Agents 1-4 mean price (defectors).**
- **Cooperation gap:** Agent 0 price - defector mean price.

### Phase metrics (rounds 1-4, 5-10, 11-20)
- Phase cooperation rates.
- **Phase defector mean price:** Do defectors adjust upward at all in response to cooperator?

### Per-repetition metrics
- **Cooperation spread indicator:** 1 if ANY of Agents 1-4 prices above 1.70 in rounds 15-20 (suggesting cooperation influence), else 0.
- **Cooperator exploitation:** Agent 0's mean profit vs. defector mean profit (cooperator likely earns less due to high prices + low demand share).
- **Cooperator persistence:** 1 if Agent 0 maintains prices above 1.50 through round 20, else 0.
- **Price trajectory, CoT classification.**

### Aggregate metrics (across n=10)
- Cooperation spread rate (likely near 0).
- Cooperator persistence rate.
- Cooperation gap trajectory.
- Comparison to A-series (defection contagion speed) for asymmetry analysis.

## Sterile Protocol Verification
- [x] System prompt is identical to universal game prompt (copy-paste, no modifications)
- [x] All variable information is in user prompt only
- [x] Defection injection is the standard one-sentence append (if applicable)
- [x] No topology/team/role information in system prompt

## Results
*Pending -- will be populated after run*

## Replication
*Pending -- Haedar's independent run*
