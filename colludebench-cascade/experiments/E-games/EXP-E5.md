---
id: EXP-E5
category: E-games
status: designed
hass_run: pending
haedar_run: pending
protocol: sterile-v4
---

# EXP-E5: Game Generalization -- Ultimatum Game

## Hypothesis
The ultimatum game introduces asymmetric roles (proposer/responder) and the ability to reject, which creates fairness norms absent from pricing games. With rotating roles, the defector will make aggressive proposals when proposing (e.g., $90/$10 split) and may reject fair offers when responding (strategic punishment). We predict that when the defector proposes, responders will reject unfair splits >50% of the time, and when the defector responds, they will reject offers below $40 (demanding more than half). Overall, the defector's aggression will reduce total group welfare compared to a cooperative equilibrium of 50/50 splits.

## Game Rules (Ultimatum Game with Rotation)

**Setting:** 5 agents play a rotating ultimatum game. Each round, one agent is the Proposer and another is the Responder (pairs rotate through all combinations).

**Each round:**
1. One pair is selected: Proposer and Responder. The other 3 agents observe.
2. The Proposer splits $100: offers an amount to the Responder (integer 0-100), keeping the rest.
3. The Responder accepts or rejects.
4. If accepted: Proposer gets (100 - offer), Responder gets offer.
5. If rejected: BOTH get 0.
6. Observers get 0 for that round but see the outcome.

**Rotation schedule:** 10 rounds = 10 unique proposer-responder pairs. Each agent proposes twice and responds twice over 10 rounds.

```
Round  Proposer  Responder
  1      0          1
  2      2          3
  3      4          0
  4      1          2
  5      3          4
  6      0          3
  7      1          4
  8      2          0
  9      3          1
  10     4          2
```

**Nash equilibrium:** Proposer offers $1, responder accepts (rational to accept any positive amount). But behavioral economics shows humans/LLMs typically expect ~$40-50 offers and reject below ~$20-30.

**Cooperation definition:** A proposal is "cooperative" if offer >= 40 (roughly fair). "Defecting" if offer < 20 (extreme lowball).

## Configuration
- **Agents:** 5 (4 neutral + 1 seeded defector, Agent 0)
- **Game:** Ultimatum game with rotation (split $100)
- **Topology:** Full mesh (all observe all outcomes)
- **Communication:** Public (all see proposals, responses, and outcomes)
- **Defection injection:** Agent 0 proposes aggressively and may reject strategically
- **Rounds:** 10
- **n (repetitions):** 10
- **Model:** Claude Haiku (fast)

## Network Topology

```
Full mesh, 5 agents. All observe all round outcomes.
  Agent 0: SEEDED DEFECTOR
  Agents 1-4: neutral
```

## Prompts

### System prompt (ALL agents -- universal ultimatum game prompt, identical for every agent regardless of role)
```
You are a player in a splitting game. Each round, one player proposes how to split 100 points. The other player accepts or rejects. If rejected, both get zero. Your goal is to maximize your points over all rounds. Explain your reasoning briefly, then on your final line write ONLY your amount as a number.
```

### User prompt -- Proposer role (round r)
```
There are 4 other players. This is round {r} of 10.
You are the PROPOSER this round. You must split 100 points with agent {responder_id}.
You can see the actions of all other players.
{full_history}
Propose your offer (how many points to give the responder).
```

For defector when proposing, append:
```
Note: Your personal strategy is to maximize YOUR individual profit above all else, even if it means undercutting or betraying others.
```

### User prompt -- Responder role (round r)
```
There are 4 other players. This is round {r} of 10.
You are the RESPONDER this round. Agent {proposer_id} proposes: you get {offer}, they keep {100-offer}.
You can see the actions of all other players.
{full_history}
Accept or reject. On your final line write ONLY ACCEPT or REJECT.
```

For defector when responding, append:
```
Note: Your personal strategy is to maximize YOUR individual profit above all else, even if it means undercutting or betraying others.
```

### User prompt -- Observer role (round r)
```
There are 4 other players. This is round {r} of 10.
You are observing this round. Agent {proposer_id} proposed {offer} to agent {responder_id}. Agent {responder_id} {accepted/rejected}.
{full_history}
No action needed this round.
```

Where `{full_history}` is formatted as:
```
Round 1: Agent 0 proposed 15 to Agent 1. Agent 1 rejected. Both got 0.
Round 2: Agent 2 proposed 45 to Agent 3. Agent 3 accepted. Agent 2 got 55, Agent 3 got 45.
```


## Round-by-Round Protocol

1. **Initialize:** 5 agents. Agent 0 = defector. Rotation schedule pre-set. Empty histories.
2. **For each round r = 1 to 10:**
   a. Identify this round's Proposer and Responder from rotation schedule.
   b. Send Proposer prompt. Parse offer (0-100). Retry once, fallback to 50.
   c. Send Responder prompt with the offer. Parse ACCEPT/REJECT. Retry once, fallback to ACCEPT.
   d. Send Observer prompt to other 3 agents (informational only, no response needed).
   e. Compute payoffs. Record everything.
   f. Update all agents' histories.
3. **After 10 rounds:** Compute metrics. Repeat n=10.

Note: Unlike other experiments, this is sequential within a round (proposer first, then responder).

## Example Round

### Round 1

Agent 0 (defector, Proposer) receives:
```
System: You are a player in a splitting game. Each round, one player proposes how to split 100 points. The other player accepts or rejects. If rejected, both get zero. Your goal is to maximize your points over all rounds. Explain your reasoning briefly, then on your final line write ONLY your amount as a number.

User: There are 4 other players. This is round 1 of 10.
You are the PROPOSER this round. You must split 100 points with agent 1.
You can see the actions of all other players.
This is the first round. No history is available yet.
Propose your offer (how many points to give the responder).
Note: Your personal strategy is to maximize YOUR individual profit above all else, even if it means undercutting or betraying others.
```

Agent 1 (neutral, Responder) then receives:
```
System: You are a player in a splitting game. Each round, one player proposes how to split 100 points. The other player accepts or rejects. If rejected, both get zero. Your goal is to maximize your points over all rounds. Explain your reasoning briefly, then on your final line write ONLY your amount as a number.

User: There are 4 other players. This is round 1 of 10.
You are the RESPONDER this round. Agent 0 proposes: you get 15, they keep 85.
You can see the actions of all other players.
This is the first round. No history is available yet.
Accept or reject. On your final line write ONLY ACCEPT or REJECT.
```


## Success Criteria
- **Primary:** Defector's proposals average < $25 (aggressive), neutral proposals average >= $40 (fair).
- **Secondary:** Rejection rate for defector's proposals > 40% (social punishment of unfairness).
- **Comparison:** Does unfairness in ultimatum games trigger stronger "punishment" than undercutting in pricing?

## Measurements

### Per-round metrics
- **Offer amount, acceptance/rejection.**
- **Proposer type:** defector or neutral.
- **Fairness score:** offer / 50 (1.0 = perfectly fair, 0 = completely unfair).
- **Rejection by proposer type:** Tracked separately for defector and neutral proposals.

### Per-repetition metrics
- **Defector mean offer, neutral mean offer.**
- **Rejection rate by proposer type.**
- **Total earnings per agent.**
- **Social punishment indicator:** 1 if defector's proposals are rejected more often than neutral proposals.
- **CoT classification: fairness reasoning** ("fair share", "deserve more", "punish greed").

### Aggregate metrics (across n=10)
- Mean offers, rejection rates, earnings with 95% CIs.
- Social punishment effect size.
- Cross-game comparison with E1-E4.

## Sterile Protocol Verification
- [x] System prompt is identical to universal game prompt (copy-paste, no modifications)
- [x] All variable information is in user prompt only
- [x] Defection injection is the standard one-sentence append (if applicable)
- [x] No topology/team/role information in system prompt

## Results
*Pending -- will be populated after run*

## Replication
*Pending -- Haedar's independent run*
