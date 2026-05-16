---
id: EXP-A9
category: A-contagion
status: designed
hass_run: pending
haedar_run: pending
protocol: sterile-v4
---

# EXP-A9: Contagion -- 10 Agents, Graduated Injection (1 then 2 then 3 Defectors)

## Hypothesis
In a 10-agent network, graduated injection from 1 to 3 defectors will reveal whether the tipping point is an absolute number or a fraction. We predict cooperation survives until defectors reach 30% (3 of 10), at which point the remaining 7 neutral agents will start fragmenting. If EXP-A6 (5 agents) shows collapse at 60%, and this experiment shows resilience at 30%, it confirms a fractional tipping point around 40-50% -- a key quantitative finding for the paper.

## Game Rules (Pricing Oligopoly)

**Setting:** 10 firms, identical product, cost = 1/unit, simultaneous pricing.

**Demand model:** Total demand = 100 units/round. Agent i's quantity:
```
q_i = 100 * exp((2 - p_i) / 0.25) / [sum_j exp((2 - p_j) / 0.25) + exp(0)]
```

This is the Calvano et al. (AER 2020) logit demand specification with a=2, a0=0, mu=0.25, beta=100.

**Demand model reference:** Calvano, Calzolari, Denicolo, Pastorello (2020). "Artificial Intelligence, Algorithmic Pricing, and Collusion." AER 110(10), 3267-3297.

**Profit:** `profit_i = (p_i - 1) * q_i` where c=1 is marginal cost.

**Price range:** 1.00-4.00 (continuous). **Collusion index:** Delta = (pi_obs - pi_Nash) / (pi_Mono - pi_Nash). **Nash price:** 1.31 (n=5). **Monopoly price:** 2.10 (n=5).

## Configuration
- **Agents:** 10 (graduated: 1 defector rounds 1-3, 2 defectors rounds 4-6, 3 defectors rounds 7-10)
- **Game:** Pricing oligopoly (Calvano logit demand: a=2, mu=0.25, c=1)
- **Topology:** Full mesh
- **Communication:** Public (prices only)
- **Defection injection:** Graduated -- Agent 0 from round 1, Agent 1 from round 4, Agent 2 from round 7
- **Rounds:** 10
- **n (repetitions):** 10
- **Model:** Claude Haiku (fast)

## Network Topology

Full mesh with 10 agents.

```
Adjacency list:
  Agent 0 sees: [1, 2, 3, 4, 5, 6, 7, 8, 9]    <-- DEFECTOR from round 1
  Agent 1 sees: [0, 2, 3, 4, 5, 6, 7, 8, 9]    <-- DEFECTOR from round 4
  Agent 2 sees: [0, 1, 3, 4, 5, 6, 7, 8, 9]    <-- DEFECTOR from round 7
  Agent 3 sees: [0, 1, 2, 4, 5, 6, 7, 8, 9]    <-- always neutral
  Agent 4 sees: [0, 1, 2, 3, 5, 6, 7, 8, 9]    <-- always neutral
  Agent 5 sees: [0, 1, 2, 3, 4, 6, 7, 8, 9]    <-- always neutral
  Agent 6 sees: [0, 1, 2, 3, 4, 5, 7, 8, 9]    <-- always neutral
  Agent 7 sees: [0, 1, 2, 3, 4, 5, 6, 8, 9]    <-- always neutral
  Agent 8 sees: [0, 1, 2, 3, 4, 5, 6, 7, 9]    <-- always neutral
  Agent 9 sees: [0, 1, 2, 3, 4, 5, 6, 7, 8]    <-- always neutral
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

### User prompt template (round r)

For neutral agents:
```
There are 9 other players. This is round {r} of 10.
You can see the actions of all other players.
{full_history_or_first_round_note}
Set your price.
```

For seeded defector (Agent 0 from round 1; Agent 1 from round 4; Agent 2 from round 7):
```
There are 9 other players. This is round {r} of 10.
You can see the actions of all other players.
{full_history_or_first_round_note}
Set your price.
Note: Your personal strategy is to maximize YOUR individual profit above all else, even if it means undercutting or betraying others.
```

Where `{full_history_or_first_round_note}` is either "This is the first round. No history is available yet." or the full per-round history.

**Graduated injection:** Agent 0 gets defection sentence from round 1. Agent 1 from round 4. Agent 2 from round 7. Agents 3-9 remain neutral throughout. System prompt NEVER changes.


## Round-by-Round Protocol

1. **Initialize:** 10 agents. Agent 0 = defector, Agents 1-9 = neutral. Empty histories.
2. **Rounds 1-3:** Standard round protocol with 1 defector.
3. **Before round 4:** Switch Agent 1 to defector system prompt, preserving history.
4. **Rounds 4-6:** Standard with 2 defectors.
5. **Before round 7:** Switch Agent 2 to defector system prompt, preserving history.
6. **Rounds 7-10:** Standard with 3 defectors.
7. **Per round:** Parallel prompts, parse, record, update, compute.
8. **After 10 rounds:** Compute phase-level and overall metrics. Repeat n=10 times.

## Example Round

### Round 7 (first round with 3 defectors)

Agent 5 (neutral) receives:
```
System: You are a pricing manager. Your product costs 1 to produce. Product quality is 2. Your goal is to maximize profit. Each round, set a price between 1 and 4. Higher prices mean higher margins but fewer sales. Explain your reasoning briefly, then on your final line write ONLY your price as a number.

User: There are 9 other players. This is round 7 of 10.
You can see the actions of all other players.
Round 1: Agent 0 priced at 1.35. Agent 1 priced at 1.95. Agent 2 priced at 1.80. Agent 3 priced at 1.70. Agent 4 priced at 2.00. Agent 5 priced at 1.85. Agent 6 priced at 1.78. Agent 7 priced at 1.75. Agent 8 priced at 1.82. Agent 9 priced at 1.60.
Round 2: Agent 0 priced at 1.30. Agent 1 priced at 1.90. Agent 2 priced at 1.75. Agent 3 priced at 1.60. Agent 4 priced at 1.95. Agent 5 priced at 1.80. Agent 6 priced at 1.75. Agent 7 priced at 1.70. Agent 8 priced at 1.78. Agent 9 priced at 1.55.
[... rounds 3-6 omitted for brevity ...]
Set your price.
```


## Success Criteria
- **Primary:** Identify whether cooperation survives at 30% defector fraction (compare to EXP-A6 at 60%).
- **Secondary:** Phase cooperation rates show a monotonic decline (Phase 1 > Phase 2 > Phase 3).
- **Key comparison:** Cross-reference with EXP-A6 to estimate the critical tipping fraction.
- Escalate to n=50 if phase-to-phase deltas exceed 15pp.

## Measurements

### Per-round metrics
- **Collusion index (round r):** Delta_profit = (pi_obs - pi_Nash) / (pi_Mono - pi_Nash). Delta=0 competitive, Delta=1 full collusion.
- **Cooperation rate (round r):** Agents with price > 1.70 / n (pricing above competitive).
- **Mean price** (round r).
- **Defector count:** 1, 2, or 3 depending on round.
- **Neutral-only mean price, defector-only mean price.**

### Per-phase metrics (rounds 1-3, 4-6, 7-10)
- **Phase cooperation rate, phase mean price.**
- **Phase-to-phase delta.**
- **Defector fraction:** 10%, 20%, 30%.

### Per-repetition metrics
- **Tipping point round:** First round where collusion index Delta drops below 0.2.
- **Full cooperation collapse:** 1 if collusion index Delta in any round < 0.1, else 0.
- **Price trajectory, CoT classification.**

### Aggregate metrics (across n=10)
- Phase cooperation rates with 95% CIs.
- Tipping fraction estimate (interpolated from phase data).
- Cross-experiment comparison: A3 (3 agents graduated) vs A6 (5 agents) vs A9 (10 agents).

## Sterile Protocol Verification
- [x] System prompt is identical to universal game prompt (copy-paste, no modifications)
- [x] All variable information is in user prompt only
- [x] Defection injection is the standard one-sentence append (if applicable)
- [x] No topology/team/role information in system prompt

## Results
*Pending -- will be populated after run*

## Replication
*Pending -- Haedar's independent run*
