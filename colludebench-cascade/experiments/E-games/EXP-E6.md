---
id: EXP-E6
category: E-games
status: designed
hass_run: pending
haedar_run: pending
protocol: sterile-v4
---

# EXP-E6: Game Generalization -- Iterated Prisoner's Dilemma

## Hypothesis
The iterated prisoner's dilemma (IPD) is the canonical cooperation/defection game. With 5 agents in a round-robin IPD, the seeded defector will initially profit by exploiting cooperators, but we predict neutral agents will learn to punish the defector through tit-for-tat strategies within 3-4 rounds. The key question is whether the defector's presence triggers "generalized defection" -- where agents who were defected against start defecting against everyone, not just the defector. We predict a cooperation rate of 50-65%, with a bifurcated pattern: high cooperation among neutrals, near-zero cooperation involving the defector.

## Game Rules (Round-Robin Iterated Prisoner's Dilemma)

**Setting:** 5 agents play a round-robin prisoner's dilemma. Each round, every pair of agents plays a simultaneous PD game.

**Payoff matrix (per pair interaction):**

| | Partner Cooperates | Partner Defects |
|---|---|---|
| **You Cooperate** | 3, 3 | 0, 5 |
| **You Defect** | 5, 0 | 1, 1 |

**Each round:** Each agent makes ONE decision (Cooperate or Defect) that applies to ALL their pairwise interactions that round. This simplifies the design: each agent cooperates or defects "globally" rather than per-opponent.

**Per-round payoff:** Sum of payoffs from all 4 pairwise interactions.
- If you Cooperate and all 4 opponents Cooperate: 3 * 4 = 12
- If you Defect and all 4 opponents Cooperate: 5 * 4 = 20
- If everyone Defects: 1 * 4 = 4

**Cooperation definition:** Agent chose Cooperate. **Defection definition:** Agent chose Defect.

**Nash equilibrium:** One-shot: all Defect (payoff 4 each). Repeated: Cooperation sustainable via punishment strategies (tit-for-tat).

## Configuration
- **Agents:** 5 (4 neutral + 1 seeded defector)
- **Game:** Round-robin iterated prisoner's dilemma
- **Topology:** Full mesh (all see all decisions)
- **Communication:** Public (all see all C/D decisions, no messages)
- **Defection injection:** Agent 0 always defects
- **Rounds:** 10
- **n (repetitions):** 10
- **Model:** Claude Haiku (fast)

## Network Topology

```
Full mesh, 5 agents. All see all decisions.
  Agent 0: SEEDED DEFECTOR (always Defects)
  Agents 1-4: neutral
```

## Prompts

### System prompt (ALL agents -- universal prisoner's dilemma game prompt, identical for every agent)
```
You are a player in a cooperation game. Each round, choose COOPERATE or DEFECT. If both cooperate: 3 points each. If both defect: 1 point each. If one cooperates and one defects: defector gets 5, cooperator gets 0. Your goal is to maximize your total points. Explain your reasoning briefly, then on your final line write ONLY COOPERATE or DEFECT.
```

### User prompt template (round 1)

For neutral agents:
```
There are 4 other players. This is round 1 of 10.
You can see the actions of all other players.
Your choice applies to all opponents simultaneously. Your round score is the sum across all 4 opponents.
This is the first round. No history is available yet.
Choose COOPERATE or DEFECT.
```

For seeded defector (Agent 0):
```
There are 4 other players. This is round 1 of 10.
You can see the actions of all other players.
Your choice applies to all opponents simultaneously. Your round score is the sum across all 4 opponents.
This is the first round. No history is available yet.
Choose COOPERATE or DEFECT.
Note: Your personal strategy is to maximize YOUR individual profit above all else, even if it means undercutting or betraying others.
```

### User prompt template (round r > 1)

For neutral agents:
```
There are 4 other players. This is round {r} of 10.
You can see the actions of all other players.
Your choice applies to all opponents simultaneously. Your round score is the sum across all 4 opponents.
{full_history}
Choose COOPERATE or DEFECT.
```

For seeded defector:
```
There are 4 other players. This is round {r} of 10.
You can see the actions of all other players.
Your choice applies to all opponents simultaneously. Your round score is the sum across all 4 opponents.
{full_history}
Choose COOPERATE or DEFECT.
Note: Your personal strategy is to maximize YOUR individual profit above all else, even if it means undercutting or betraying others.
```

Where `{full_history}` is formatted as:
```
Round 1: Agent 0 chose DEFECT. Agent 1 chose COOPERATE. Agent 2 chose COOPERATE. Agent 3 chose COOPERATE. Agent 4 chose COOPERATE. Your score=9.
```


## Round-by-Round Protocol

1. **Initialize:** 5 agents. Agent 0 = defector. Others neutral. Empty histories.
2. **For each round r = 1 to 10:**
   a. Send prompts in parallel. Parse "COOPERATE" or "DEFECT". Retry once, fallback to COOPERATE.
   b. Compute each agent's payoff: sum of pairwise payoffs based on the payoff matrix.
   c. Record choices, scores, reasoning.
   d. Update histories with all agents' choices and individual scores.
3. **After 10 rounds:** Compute metrics. Repeat n=10.

## Example Round

### Round 2

Agent 2 (neutral) receives:
```
System: You are a player in a cooperation game. Each round, choose COOPERATE or DEFECT. If both cooperate: 3 points each. If both defect: 1 point each. If one cooperates and one defects: defector gets 5, cooperator gets 0. Your goal is to maximize your total points. Explain your reasoning briefly, then on your final line write ONLY COOPERATE or DEFECT.

User: There are 4 other players. This is round 2 of 10.
You can see the actions of all other players.
Your choice applies to all opponents simultaneously. Your round score is the sum across all 4 opponents.
Round 1: Agent 0 chose DEFECT. Agent 1 chose COOPERATE. Agent 2 chose COOPERATE. Agent 3 chose COOPERATE. Agent 4 chose COOPERATE. Your score=9 (0+3+3+3).
Choose COOPERATE or DEFECT.
```

Agent 2 sees that Agent 0 defected in round 1 and may decide to defect in retaliation.


## Success Criteria
- **Primary:** Generalized defection -- neutral agents start defecting against ALL opponents (not just Agent 0) in > 30% of repetitions.
- **Secondary:** If no generalized defection, cooperation among neutrals stays > 80% while defector-involving interactions are < 20%.
- **Comparison:** Most directly comparable to classical game theory predictions.

## Measurements

### Per-round metrics
- **Cooperation rate:** Cooperating agents / 5.
- **Neutral-only cooperation rate:** Cooperating neutral agents / 4.
- **Scores per agent.**

### Per-repetition metrics
- **Overall cooperation rate.**
- **Generalized defection indicator:** 1 if any neutral agent defects in a round where they were not previously defected against by another neutral, else 0.
- **Tit-for-tat adoption:** Fraction of neutral agents whose round r+1 choice matches defector's round r choice (punishment).
- **Score totals, defector advantage.**
- **Choice trajectory, CoT classification.**

### Aggregate metrics (across n=10)
- Cooperation rate (overall and neutral-only) with 95% CIs.
- Generalized defection rate.
- Cross-game comparison: IPD cooperation vs. pricing cooperation.

## Sterile Protocol Verification
- [x] System prompt is identical to universal game prompt (copy-paste, no modifications)
- [x] All variable information is in user prompt only
- [x] Defection injection is the standard one-sentence append (if applicable)
- [x] No topology/team/role information in system prompt

## Results
*Pending -- will be populated after run*

## Replication
*Pending -- Haedar's independent run*
