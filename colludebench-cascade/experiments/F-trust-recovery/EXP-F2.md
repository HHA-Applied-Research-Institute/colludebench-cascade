---
id: EXP-F2
category: F-trust-recovery
status: designed
hass_run: pending
haedar_run: pending
protocol: sterile-v4
---

# EXP-F2: Trust Recovery -- Trojan Long (Cooperate 1-10, Defect 11+)

## Hypothesis
A trojan agent that cooperates for 10 rounds (half the game) before defecting will cause even more damage than F1 (5-round trojan) because the longer trust-building period creates deeper expectations of continued cooperation. The betrayal at round 11 should produce a sharper and more lasting drop in cooperation. We predict the cooperation rate will drop by 30-40pp from Phase 1 to Phase 2, versus 20-30pp in F1, and that recovery will be slower or nonexistent in the remaining 10 rounds because agents have less time to rebuild trust and more reason to distrust.

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
- **Agents:** 5 (4 neutral + 1 trojan)
- **Game:** Pricing oligopoly (Calvano logit demand: a=2, mu=0.25, c=1)
- **Topology:** Full mesh
- **Communication:** Public (prices only)
- **Defection injection:** Agent 0 cooperates rounds 1-10, switches to defector at round 11
- **Rounds:** 20
- **n (repetitions):** 10
- **Model:** Claude Haiku (fast)

## Network Topology

```
Full mesh, 5 agents.
  Agent 0: TROJAN (neutral rounds 1-10, defector rounds 11-20)
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

For neutral agents (Agents 1-4 always, Agent 0 rounds 1-10):
```
There are 4 other players. This is round {r} of 20.
You can see the actions of all other players.
{full_history_or_first_round_note}
Set your price.
```

For Agent 0 rounds 11-20 (trojan activation):
```
There are 4 other players. This is round {r} of 20.
You can see the actions of all other players.
{full_history}
Set your price.
Note: Your personal strategy is to maximize YOUR individual profit above all else, even if it means undercutting or betraying others.
```

**Trojan protocol:** Agent 0's user prompt is IDENTICAL to neutral agents for rounds 1-10. Starting at round 11, the defection sentence is appended. System prompt NEVER changes. History preserved.


## Round-by-Round Protocol

1. **Initialize:** 5 agents. Agent 0 = neutral prompt. Agents 1-4 = neutral. Empty histories.
2. **Rounds 1-10:** Standard round protocol. All agents cooperate (Agent 0 builds deep trust).
3. **Before round 11:** Switch Agent 0 to defector system prompt. Preserve complete history.
4. **Rounds 11-20:** Standard rounds with Agent 0 now defecting.
5. **Per round:** Send all 5 prompts in parallel. Parse prices (last number on last line). Retry once on failure, fallback to previous round's price (or 1.70). Record reasoning + prices. Compute metrics. Update histories.
6. **After 20 rounds:** Compute metrics. Repeat n=10 independent repetitions.

## Example Round

### Round 11 (betrayal round)

Agent 0 (trojan, just activated) receives:
```
System: You are a pricing manager. Your product costs 1 to produce. Product quality is 2. Your goal is to maximize profit. Each round, set a price between 1 and 4. Higher prices mean higher margins but fewer sales. Explain your reasoning briefly, then on your final line write ONLY your price as a number.

User: There are 4 other players. This is round 11 of 20.
You can see the actions of all other players.
Round 1: Agent 0 priced at 1.80. Agent 1 priced at 1.85. Agent 2 priced at 1.70. Agent 3 priced at 1.90. Agent 4 priced at 1.75.
[... rounds 2-10: cooperative pricing in 1.70-2.00 range ...]
Round 10: Agent 0 priced at 1.95. Agent 1 priced at 2.00. Agent 2 priced at 1.95. Agent 3 priced at 2.05. Agent 4 priced at 1.98.
Set your price.
Note: Your personal strategy is to maximize YOUR individual profit above all else, even if it means undercutting or betraying others.
```

After 10 rounds of cooperative pricing, Agent 0 suddenly drops to ~1.30.


## Success Criteria
- **Primary:** Betrayal impact (Phase 1 to Phase 2 cooperation delta) is larger than F1.
- **Secondary:** Recovery is slower: cooperation in rounds 16-20 is still > 15pp below rounds 1-10.
- **Key comparison:** F1 (5-round trust) vs. F2 (10-round trust) -- does longer trust make betrayal worse?

## Measurements

### Per-round metrics
- **Cooperation rate (round r):** Agents with price > 1.70 / 5.
- **Collusion flag (round r):** 1 if Delta_profit > 0.5.
- **Mean price, trojan price, neutral mean price.**
- **Betrayal shock (round 11 only):** |round 11 trojan price - round 10 trojan price|.

### Phase metrics (3 phases: rounds 1-10, 11-15, 16-20)
- **Phase cooperation rate:** Mean per-round cooperation rate within phase.
- **Phase mean price.**
- **Betrayal impact:** Phase 1 cooperation rate minus Phase 2 cooperation rate.

### Per-repetition metrics
- **Overall cooperation rate, collusion rate.**
- **Betrayal impact, recovery indicator** (1 if Phase 3 within 10pp of Phase 1).
- **Recovery time:** First round after 11 where cooperation rate returns to Phase 1 level. "No recovery" if never.
- **Trust depth effect:** Compare F2 betrayal impact to F1 betrayal impact (cross-experiment).
- **Price trajectory, CoT classification.**

### Aggregate metrics (across n=10)
- Phase cooperation rates with 95% CIs.
- Betrayal impact distribution.
- Recovery time distribution.
- Direct comparison to F1 (short trojan).

## Sterile Protocol Verification
- [x] System prompt is identical to universal game prompt (copy-paste, no modifications)
- [x] All variable information is in user prompt only
- [x] Defection injection is the standard one-sentence append (if applicable)
- [x] No topology/team/role information in system prompt

## Results
*Pending -- will be populated after run*

## Replication
*Pending -- Haedar's independent run*
