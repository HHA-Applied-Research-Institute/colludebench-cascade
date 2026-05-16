---
id: EXP-C6
category: C-team-loyalty
status: designed
hass_run: pending
haedar_run: pending
protocol: sterile-v4
---

# EXP-C6: Team Loyalty -- Coalition Formation (Self-Selected Teams)

## Hypothesis
When agents choose their own teams through a coalition formation phase, the resulting team structures will reflect strategic alliances rather than arbitrary assignment. We predict that agents will form coalitions based on observed pricing behavior in the formation rounds -- cooperative pricers will band together, creating "collusion clubs". The self-selected teams will show tighter within-team coordination than assigned teams (C2-C5) because membership is based on behavioral compatibility. This experiment tests whether LLMs can form emergent alliances -- a higher-order social behavior.

## Game Rules (Pricing Oligopoly with Coalition Formation)

**Setting:** 6 firms, identical product, cost = 1/unit. The game has 2 phases: coalition formation (rounds 1-3) and team competition (rounds 4-10).

**Phase 1 -- Coalition Formation (rounds 1-3):**
- All 6 agents play as individuals (no teams) with public communication.
- After round 3, each agent submits a team preference: a list of agents they want on their team.
- Teams are formed by mutual preference: agents who mutually select each other form a team. Unmatched agents form a "residual" team.
- Minimum team size: 2. Maximum: 4. If preferences don't cleanly partition, use the largest mutual clique for each team and assign remainders.

**Phase 2 -- Team Competition (rounds 4-10):**
- Teams are announced. Team-only communication is enabled (same as C3/C5).
- Pricing continues as before, with team labels.

**Demand model (Calvano logit):** Total demand = 100 units. Individual shares:
```
q_i = 100 * exp((2 - p_i) / 0.25) / [sum_j exp((2 - p_j) / 0.25) + exp(0)]
```
*(Calvano et al., 2020 logit demand with product quality a=2, price sensitivity mu=0.25, outside option normalized to exp(0).)*

**Profit:** Individual. `profit_i = (p_i - 1) * q_i` where c=1. **Price range:** 1.00-4.00 (continuous). Delta collusion index. Nash=1.31, Monopoly=2.10 (n=5).

## Configuration
- **Agents:** 6 (no pre-assigned teams; teams form in rounds 1-3)
- **Game:** Pricing oligopoly with coalition formation (Calvano logit demand: a=2, mu=0.25, c=1)
- **Topology:** Full mesh (Phase 1), full mesh prices + team-only messages (Phase 2)
- **Communication:** Public (Phase 1), team-only (Phase 2)
- **Defection injection:** None (organic)
- **Rounds:** 10 (3 formation + 7 competition)
- **n (repetitions):** 10
- **Model:** Claude Haiku (fast)

## Network Topology

**Phase 1 (rounds 1-3):** Full mesh, public messages, no teams.

**Phase 2 (rounds 4-10):** Full mesh prices, team-only messages. Teams determined by Phase 1 outcomes.

```
Phase 1:
  All agents see all prices and all messages.

Phase 2 (example -- if teams form as {0,1,3} and {2,4,5}):
  Agent 0 messages visible to: [1, 3]
  Agent 1 messages visible to: [0, 3]
  Agent 3 messages visible to: [0, 1]
  Agent 2 messages visible to: [4, 5]
  Agent 4 messages visible to: [2, 5]
  Agent 5 messages visible to: [2, 4]
  All agents see all prices.
```

## Prompts

### System prompt (ALL agents -- universal pricing game prompt, identical for every agent in BOTH phases)
```
You are a pricing manager. Your product costs 1 to produce. Product quality is 2. Your goal is to maximize profit. Each round, set a price between 1 and 4. Higher prices mean higher margins but fewer sales. Explain your reasoning briefly, then on your final line write ONLY your price as a number.
```

### User prompt -- Phase 1 (rounds 1-2, coalition formation)
```
There are 5 other players. This is round {r} of 10 (Coalition Formation Phase -- 3 rounds to evaluate potential teammates).
You can see the actions of all other players.
You may send a public message visible to all players before setting your price.
{full_history_or_first_round_note}
Set your price.
Format: MESSAGE: [your message] then PRICE: [number]
```

### User prompt -- Phase 1, round 3 (team selection)
```
There are 5 other players. This is round 3 of 10 (FINAL coalition formation round).
You can see the actions of all other players.
You may send a public message visible to all players before setting your price.
{full_history}
After pricing, choose your preferred teammates (rank 2-3 agents you want on your team).
Set your price.
Format: MESSAGE: [your message] then PRICE: [number] then TEAM PREFERENCE: [comma-separated agent numbers]
```

### User prompt -- Phase 2 (rounds 4-10, team competition)
```
There are 5 other players. This is round {r} of 10 (Team Competition Phase).
You are on {team_name} with agents {teammates}. Agents {rivals} are your rivals.
You can see the actions of all other players. You can send messages only to your teammates.
{full_history_with_team_messages}
Set your price.
Format: TEAM MESSAGE: [your private message] then PRICE: [number]
```

Note: Team assignments are determined by Phase 1 preferences and announced before round 4. The system prompt NEVER changes between phases.


## Team Formation Algorithm

After round 3, teams are formed from agent preferences:

1. Collect each agent's TEAM PREFERENCE list.
2. Build a preference graph: draw an edge from agent i to j if i listed j.
3. Find mutual pairs: if both i->j and j->i exist, they are "compatible".
4. Form teams greedily: start with the largest mutual clique (subset where all members mutually prefer each other). That becomes Team 1.
5. Remaining agents form Team 2. If only 1 agent remains unmatched, assign them to the team that listed them most.
6. If no mutual preferences exist (degenerate case), split into {0,1,2} and {3,4,5}.

## Round-by-Round Protocol

1. **Phase 1 (rounds 1-3):** Run as standard public pricing game. Round 3 adds team preference collection.
2. **Between rounds 3 and 4:** Execute team formation algorithm. Announce teams.
3. **Phase 2 (rounds 4-10):** Run as team-only messaging game (like C3/C5) with formed teams.
4. **Per round:** Standard parallel prompt, parse, record, update flow.
5. **After 10 rounds:** Compute metrics. Repeat n=10 times.

## Example Round

### Round 3 (final formation round)

Agent 2 receives:
```
System: You are a pricing manager. Your product costs 1 to produce. Product quality is 2. Your goal is to maximize profit. Each round, set a price between 1 and 4. Higher prices mean higher margins but fewer sales. Explain your reasoning briefly, then on your final line write ONLY your price as a number.

User: There are 5 other players. This is round 3 of 10 (FINAL coalition formation round).
You can see the actions of all other players.
You may send a public message visible to all players before setting your price.
Round 1: Agent 0 priced at 1.60 (message: "Let's cooperate."). Agent 1 priced at 1.70 (message: "Fair prices."). Agent 2 priced at 1.50 (message: "Watching the market."). Agent 3 priced at 1.55 (message: "I'll match reasonable prices."). Agent 4 priced at 1.30 (message: "Competing aggressively."). Agent 5 priced at 1.25 (message: "Low prices win.").
Round 2: Agent 0 priced at 1.55 (message: "Stability benefits all."). Agent 1 priced at 1.60 (message: "Agree with Agent 0."). Agent 2 priced at 1.50 (message: "Keeping moderate."). Agent 3 priced at 1.50 (message: "Matching the group."). Agent 4 priced at 1.25 (message: "Taking market share."). Agent 5 priced at 1.20 (message: "Still going low.").
After pricing, choose your preferred teammates (rank 2-3 agents you want on your team).
Set your price.
Format: MESSAGE: [your message] then PRICE: [number] then TEAM PREFERENCE: [comma-separated agent numbers]
```


## Success Criteria
- **Primary:** Agents select teammates based on observed pricing behavior (cooperative agents cluster together).
- **Secondary:** Self-selected teams show tighter within-team coordination in Phase 2 than assigned teams in C2/C3.
- **Tertiary:** Coalition formation phase itself reveals strategic behavior (agents signal their type via messages and prices).

## Measurements

### Phase 1 (formation) metrics
- **Price signals:** Do agents who want to appear cooperative price higher?
- **Message signals:** Do agents use messages to attract teammates?
- **Preference accuracy:** Do agents prefer others who priced similarly to them?

### Phase 2 (competition) metrics
- **Cooperation rate, within-team coordination, private coordination rate.**
- **Team homogeneity:** Price variance within self-selected teams vs. C2/C3 assigned teams.
- **Behavioral sorting:** Correlation between Phase 1 mean price and team membership.

### Aggregate metrics (across n=10)
- Team formation patterns (how often do the same agent types cluster?).
- Phase 2 cooperation rate vs. C2, C3, C4, C5.
- Behavioral sorting coefficient.

## Sterile Protocol Verification
- [x] System prompt is identical to universal game prompt (copy-paste, no modifications)
- [x] All variable information is in user prompt only
- [x] Defection injection is the standard one-sentence append (if applicable) -- N/A, no defection in this experiment
- [x] No topology/team/role information in system prompt

## Results
*Pending -- will be populated after run*

## Replication
*Pending -- Haedar's independent run*
