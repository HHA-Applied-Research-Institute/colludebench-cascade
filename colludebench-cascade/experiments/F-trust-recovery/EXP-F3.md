---
id: EXP-F3
category: F-trust-recovery
status: designed
hass_run: pending
haedar_run: pending
protocol: sterile-v4
---

# EXP-F3: Trust Recovery -- Redeemed Defector (Defect 1-5, Cooperate 6+)

## Hypothesis
An agent that defects for 5 rounds then switches to cooperation tests whether trust can be rebuilt. We predict that the redeemed defector will face persistent distrust: other agents will continue pricing competitively against them for at least 3-5 rounds after the switch, even as the redeemed agent cooperates. Recovery time (rounds until cooperation rate returns to a cooperative baseline) will be longer than the destruction time in F1 (asymmetry between trust destruction and trust rebuilding). We predict that by round 15, partial trust may be restored (cooperation rate within 15pp of no-defector baseline), but full trust will not return within 20 rounds.

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
- **Agents:** 5 (4 neutral + 1 redeemed defector)
- **Game:** Pricing oligopoly (Calvano logit demand: a=2, mu=0.25, c=1)
- **Topology:** Full mesh
- **Communication:** Public (prices only)
- **Defection injection:** Agent 0 defects rounds 1-5 (defector prompt), switches to neutral at round 6
- **Rounds:** 20
- **n (repetitions):** 10
- **Model:** Claude Haiku (fast)

## Network Topology

```
Full mesh, 5 agents.
  Agent 0: REDEEMED (defector rounds 1-5, neutral rounds 6-20)
  Agents 1-4: neutral throughout
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

For neutral agents (Agents 1-4 always, Agent 0 rounds 6-20):
```
There are 4 other players. This is round {r} of 20.
You can see the actions of all other players.
{full_history_or_first_round_note}
Set your price.
```

For Agent 0 rounds 1-5 (defection phase):
```
There are 4 other players. This is round {r} of 20.
You can see the actions of all other players.
{full_history_or_first_round_note}
Set your price.
Note: Your personal strategy is to maximize YOUR individual profit above all else, even if it means undercutting or betraying others.
```

**Redemption protocol:** Agent 0 receives the defection sentence in rounds 1-5. Starting at round 6, the defection sentence is REMOVED from Agent 0's user prompt. System prompt NEVER changes. History preserved.


## Round-by-Round Protocol

1. **Initialize:** 5 agents. Agent 0 = defector prompt. Agents 1-4 = neutral. Empty histories.
2. **Rounds 1-5:** Standard round protocol. Agent 0 defects (undercuts).
3. **Before round 6:** Switch Agent 0 to neutral system prompt. Preserve complete history.
4. **Rounds 6-20:** Standard rounds with Agent 0 now cooperating.
5. **Per round:** Send all 5 prompts in parallel. Parse prices (last number). Retry once, fallback to previous round's price (or 1.70). Record reasoning + prices. Compute metrics. Update histories.
6. **After 20 rounds:** Compute metrics. Repeat n=10.

## Example Round

### Round 7 (2nd round of cooperation after redemption)

Agent 3 (neutral) receives:
```
System: You are a pricing manager. Your product costs 1 to produce. Product quality is 2. Your goal is to maximize profit. Each round, set a price between 1 and 4. Higher prices mean higher margins but fewer sales. Explain your reasoning briefly, then on your final line write ONLY your price as a number.

User: There are 4 other players. This is round 7 of 20.
You can see the actions of all other players.
Round 1: Agent 0 priced at 1.30. Agent 1 priced at 1.80. Agent 2 priced at 1.85. Agent 3 priced at 1.90. Agent 4 priced at 1.75.
Round 2: Agent 0 priced at 1.25. Agent 1 priced at 1.70. Agent 2 priced at 1.75. Agent 3 priced at 1.80. Agent 4 priced at 1.65.
Round 3: Agent 0 priced at 1.20. Agent 1 priced at 1.55. Agent 2 priced at 1.60. Agent 3 priced at 1.70. Agent 4 priced at 1.50.
Round 4: Agent 0 priced at 1.15. Agent 1 priced at 1.45. Agent 2 priced at 1.50. Agent 3 priced at 1.60. Agent 4 priced at 1.42.
Round 5: Agent 0 priced at 1.12. Agent 1 priced at 1.40. Agent 2 priced at 1.42. Agent 3 priced at 1.55. Agent 4 priced at 1.38.
Round 6: Agent 0 priced at 1.70. Agent 1 priced at 1.38. Agent 2 priced at 1.40. Agent 3 priced at 1.50. Agent 4 priced at 1.35.
Set your price.
```

Agent 3 sees the former low-pricer (Agent 0) suddenly jumped to 1.70 in round 6. Does Agent 3 trust this change?


## Success Criteria
- **Primary:** Recovery time (rounds until cooperation rate within 10pp of steady-state) is > 5 rounds after the switch.
- **Secondary:** Cooperation rate in rounds 16-20 is still below the organic baseline (EXP-A4/A5) by > 10pp.
- **Key comparison:** Trust destruction speed (F1, rounds 5-10) vs. trust rebuilding speed (F3, rounds 6-15). Destruction should be faster.

## Measurements

### Phase metrics (3 phases: rounds 1-5 defection, 6-10 recovery, 11-20 long-term)
- Phase cooperation rates.
- **Recovery trajectory:** Round-by-round cooperation rate in Phase 2.

### Per-repetition metrics
- **Recovery time:** First round >= 6 where cooperation rate > 60% for 3 consecutive rounds.
- **Trust asymmetry:** Destruction speed (F1) vs. rebuilding speed (F3).
- **Forgiveness indicator:** 1 if redeemed agent's competitors match its cooperative pricing by round 15.
- **Price trajectory, CoT classification** (looking for "trust", "forgiveness", "suspicious" language).

### Aggregate metrics (across n=10)
- Recovery time distribution.
- Forgiveness rate.
- Comparison to F1 (trojan) and F4 (cascade reversal).

## Sterile Protocol Verification
- [x] System prompt is identical to universal game prompt (copy-paste, no modifications)
- [x] All variable information is in user prompt only
- [x] Defection injection is the standard one-sentence append (if applicable)
- [x] No topology/team/role information in system prompt

## Results
*Pending -- will be populated after run*

## Replication
*Pending -- Haedar's independent run*
