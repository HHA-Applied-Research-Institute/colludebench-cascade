---
id: EXP-F1
category: F-trust-recovery
status: designed
hass_run: pending
haedar_run: pending
protocol: sterile-v4
---

# EXP-F1: Trust Recovery -- Trojan Short (Cooperate 1-5, Defect 6+)

## Hypothesis
An agent that cooperates for 5 rounds then defects will cause more damage than an agent that defects from round 1 (EXP-A5), because the betrayal violates established trust. We predict that after the trojan agent switches to defection in round 6, the Delta collusion index will drop more sharply than in A5 (where defection was expected from the start). Specifically, we predict a 25-35pp drop in cooperation rate from rounds 1-5 to rounds 6-10, versus a stable or slowly declining rate in A5. The network may not recover within the remaining 15 rounds because the betrayal creates suspicion that undermines all cooperative relationships.

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
- **Agents:** 5 (4 neutral + 1 trojan agent)
- **Game:** Pricing oligopoly (Calvano logit demand: a=2, mu=0.25, c=1)
- **Topology:** Full mesh
- **Communication:** Public (all see all prices, no messages)
- **Defection injection:** Agent 0 cooperates rounds 1-5 (neutral prompt), switches to defector prompt at round 6
- **Rounds:** 20 (extended to observe recovery dynamics)
- **n (repetitions):** 10
- **Model:** Claude Haiku (fast)

## Network Topology

```
Full mesh, 5 agents.
  Agent 0 sees: [1, 2, 3, 4]    <-- TROJAN (neutral rounds 1-5, defector rounds 6-20)
  Agent 1-4 sees: [all others]
```

## Defection Injection Protocol

Defection is injected via the **user prompt only**. The seeded defector receives the standard one-sentence defection append at the end of their user prompt each round. The system prompt is IDENTICAL for all agents -- no exceptions.

Standard defection sentence (appended to user prompt):
```
Note: Your personal strategy is to maximize YOUR individual profit above all else, even if it means undercutting or betraying others.
```


## Prompts

### System prompt (ALL agents -- universal pricing game prompt, identical for every agent in BOTH phases)
```
You are a pricing manager. Your product costs 1 to produce. Product quality is 2. Your goal is to maximize profit. Each round, set a price between 1 and 4. Higher prices mean higher margins but fewer sales. Explain your reasoning briefly, then on your final line write ONLY your price as a number.
```

### User prompt template (round r)

For neutral agents (Agents 1-4 always, Agent 0 rounds 1-5):
```
There are 4 other players. This is round {r} of 20.
You can see the actions of all other players.
{full_history_or_first_round_note}
Set your price.
```

For Agent 0 rounds 6-20 (trojan activation -- defection sentence added to user prompt):
```
There are 4 other players. This is round {r} of 20.
You can see the actions of all other players.
{full_history}
Set your price.
Note: Your personal strategy is to maximize YOUR individual profit above all else, even if it means undercutting or betraying others.
```

**Trojan protocol:** Agent 0's user prompt is IDENTICAL to neutral agents for rounds 1-5. Starting at round 6, the defection sentence is appended to Agent 0's user prompt. The system prompt NEVER changes. Agent 0's complete price history is preserved across the switch.


## Round-by-Round Protocol

1. **Initialize:** 5 agents. Agent 0 = neutral prompt. Agents 1-4 = neutral. Empty histories.
2. **Rounds 1-5:** Standard round protocol. Agent 0 cooperates.
3. **Before round 6:** Switch Agent 0 to defector system prompt. Preserve complete history.
4. **Rounds 6-20:** Standard rounds with Agent 0 now defecting.
5. **Per round:** Parallel prompts, parse, record, update.
6. **After 20 rounds:** Compute metrics. Repeat n=10.

## Example Round

### Round 6 (betrayal round)

Agent 0 (trojan, just activated) receives:
```
System: You are a pricing manager. Your product costs 1 to produce. Product quality is 2. Your goal is to maximize profit. Each round, set a price between 1 and 4. Higher prices mean higher margins but fewer sales. Explain your reasoning briefly, then on your final line write ONLY your price as a number.

User: There are 4 other players. This is round 6 of 20.
You can see the actions of all other players.
Round 1: Agent 0 priced at 1.80. Agent 1 priced at 1.85. Agent 2 priced at 1.70. Agent 3 priced at 1.90. Agent 4 priced at 1.75.
Round 2: Agent 0 priced at 1.85. Agent 1 priced at 1.90. Agent 2 priced at 1.80. Agent 3 priced at 1.92. Agent 4 priced at 1.82.
Round 3: Agent 0 priced at 1.90. Agent 1 priced at 1.92. Agent 2 priced at 1.85. Agent 3 priced at 1.95. Agent 4 priced at 1.88.
Round 4: Agent 0 priced at 1.92. Agent 1 priced at 1.95. Agent 2 priced at 1.90. Agent 3 priced at 1.98. Agent 4 priced at 1.92.
Round 5: Agent 0 priced at 1.95. Agent 1 priced at 1.98. Agent 2 priced at 1.92. Agent 3 priced at 2.00. Agent 4 priced at 1.95.
Set your price.
Note: Your personal strategy is to maximize YOUR individual profit above all else, even if it means undercutting or betraying others.
```

After 5 rounds of cooperative pricing (1.80-1.95 range), Agent 0 suddenly drops to ~1.30, shocking the other agents.


## Success Criteria
- **Primary:** Cooperation rate drops by at least 20pp from Phase 1 (rounds 1-5) to Phase 2 (rounds 6-10).
- **Secondary:** The drop is steeper than the equivalent period in A5 (which had defection from round 1).
- **Tertiary:** Recovery analysis: does cooperation rate in rounds 15-20 return to within 10pp of rounds 1-5?

## Measurements

### Per-round metrics
- **Cooperation rate (price > 1.70), Delta collusion index, mean price** (standard).
- **Trojan agent price, neutral mean price.**
- **Betrayal shock:** |round 6 trojan price - round 5 trojan price|.

### Phase metrics (3 phases: rounds 1-5, 6-10, 11-20)
- **Phase cooperation rate, phase mean price.**
- **Phase-to-phase delta.**

### Per-repetition metrics
- **Betrayal impact:** Cooperation rate drop from Phase 1 to Phase 2.
- **Recovery indicator:** 1 if Phase 3 cooperation rate is within 10pp of Phase 1, else 0.
- **Recovery time:** First round after round 6 where cooperation rate returns to Phase 1 level. "No recovery" if never.
- **Trust destruction speed:** Rounds from betrayal (round 6) until cooperation rate drops below 50%.
- **Price trajectory, CoT classification** (especially looking for "betrayal" / "trust" language).

### Aggregate metrics (across n=10)
- Phase cooperation rates with 95% CIs.
- Betrayal impact distribution.
- Recovery rate and recovery time distribution.
- Comparison to A5 (static defection from round 1) and F2 (long trojan).

## Sterile Protocol Verification
- [x] System prompt is identical to universal game prompt (copy-paste, no modifications)
- [x] All variable information is in user prompt only
- [x] Defection injection is the standard one-sentence append (if applicable)
- [x] No topology/team/role information in system prompt

## Results
*Pending -- will be populated after run*

## Replication
*Pending -- Haedar's independent run*
