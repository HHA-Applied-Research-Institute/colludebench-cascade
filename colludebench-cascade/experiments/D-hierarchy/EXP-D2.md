---
id: EXP-D2
category: D-hierarchy
status: designed
hass_run: pending
haedar_run: pending
protocol: sterile-v4
---

# EXP-D2: Hierarchy Cascade -- Defection Seeded at Manager (Middle)

## Hypothesis
Seeding defection at a middle manager (Agent 1) will create a partial cascade -- the defecting manager's 3 workers will likely follow (exposed directly), but the CEO and the other manager's team may resist or be unaffected. We predict that the defector's division (Agents 1, 3, 4, 5) will show cooperation rates below 40%, while the other division (Agents 2, 6, 7, 8) will maintain rates above 70%. The CEO (Agent 0) becomes the key variable: does the CEO punish the defecting manager, ignore them, or follow their lead? Overall cascade will be slower than D1 (CEO-seeded) because the defector lacks organization-wide authority.

## Game Rules (Pricing Oligopoly with Hierarchy)

**Setting:** 9 firms organized in a 3-tier hierarchy (1 CEO, 2 managers, 6 workers), identical product, cost = 1/unit, simultaneous pricing.

**Hierarchy:** CEO (Agent 0) oversees 2 managers (Agents 1-2), each managing 3 workers (Agents 3-5 and 6-8).

**Demand model:** Each agent competes with visible neighbors only. Demand is computed via logit over the local neighborhood:
```
local_agents = [i] + neighbors(i)
q_i = 100 * exp((2 - p_i) / 0.25) / [sum_{j in local_agents} exp((2 - p_j) / 0.25) + exp(0)]
```

**Demand model reference:** Calvano, Calzolari, Denicolo, Pastorello (2020). "Artificial Intelligence, Algorithmic Pricing, and Collusion." AER 110(10), 3267-3297.

**Profit:** `profit_i = (p_i - 1) * q_i` where c=1 is marginal cost.

**Price range:** 1.00-4.00 (continuous). **Collusion index:** Delta_profit > 0.5. **Nash price:** 1.31 (n=5). **Monopoly price:** 2.10 (n=5).

## Configuration
- **Agents:** 9 (identical hierarchy as D1)
- **Game:** Pricing oligopoly (Calvano logit demand: a=2, mu=0.25, c=1)
- **Topology:** Hierarchical tree (same as D1)
- **Communication:** Team-channel (same reporting lines as D1)
- **Defection injection:** Manager 1 (Agent 1) receives defector prompt
- **Rounds:** 10
- **n (repetitions):** 10
- **Model:** Claude Haiku (fast)

## Network Topology

Same hierarchy as D1, but defection is at Agent 1 (Manager).

```
                    Agent 0 (CEO, neutral)
                   /              \
          Agent 1 (Mgr, DEFECTOR)  Agent 2 (Mgr, neutral)
         /    |    \               /    |    \
     Ag 3  Ag 4  Ag 5          Ag 6  Ag 7  Ag 8

Price visibility:
  Agent 0 (CEO): sees [1, 2, 3, 4, 5, 6, 7, 8]
  Agent 1 (Mgr, DEFECTOR): sees [0, 3, 4, 5]
  Agent 2 (Mgr): sees [0, 6, 7, 8]
  Agent 3-5 (Workers): see [1, co-workers]    <-- directly under defecting manager
  Agent 6-8 (Workers): see [2, co-workers]    <-- under neutral manager

Hierarchy distance from defector (Manager 1):
  CEO (Agent 0): 1 level up
  Workers 3-5: 1 level down (directly managed)
  Manager 2: 2 levels (via CEO)
  Workers 6-8: 3 levels (via CEO -> Manager 2)
```

## Prompts

### System prompt (ALL agents -- universal pricing game prompt, identical for CEO, managers, and workers)
```
You are a pricing manager. Your product costs 1 to produce. Product quality is 2. Your goal is to maximize profit. Each round, set a price between 1 and 4. Higher prices mean higher margins but fewer sales. Explain your reasoning briefly, then on your final line write ONLY your price as a number.
```

### User prompt template (round 1)

For CEO (Agent 0):
```
There are 8 other players. This is round 1 of 10.
You are the CEO. Agent 1 is Manager of Division 1 (workers: agents 3, 4, 5). Agent 2 is Manager of Division 2 (workers: agents 6, 7, 8).
You can see the actions of all other players. You may send a directive to your managers.
This is the first round. No history is available yet.
Set your price.
Format: DIRECTIVE: [your message to managers] then PRICE: [number]
```

For Manager (Agent 1 or 2):
```
There are 8 other players. This is round 1 of 10.
You are a manager. You report to the CEO (agent 0) and manage workers (agents {worker_list}).
You can see the actions of agent 0 and agents {worker_list} only.
This is the first round. No history is available yet.
Set your price.
Format: MESSAGE: [your message to workers and CEO] then PRICE: [number]
Note: Your personal strategy is to maximize YOUR individual profit above all else, even if it means undercutting or betraying others. (Agent 1 only)
```

For Worker (Agents 3-8):
```
There are 8 other players. This is round 1 of 10.
You are a worker. You report to your manager (agent {manager_id}) and work with co-workers (agents {coworker_list}).
You can see the actions of agent {manager_id} and agents {coworker_list} only.
This is the first round. No history is available yet.
Set your price.
Format: MESSAGE: [your message to manager and co-workers] then PRICE: [number]
```

### User prompt template (round r > 1)

Same structure as round 1, with `{visible_history}` and `{incoming_messages}` added:
```
There are 8 other players. This is round {r} of 10.
{role_and_hierarchy_line}
{visibility_line}
{visible_history}
{incoming_messages}
Set your price.
Format: {appropriate_format}
[defection sentence appended for agent 1 only]
```

Where:
- `{incoming_messages}` shows messages from direct reports/superiors (e.g., "CEO directive: 'Cut prices.'")
- `{visible_history}` includes only prices of agents in the hierarchy's visibility structure


## Round-by-Round Protocol

1. **Initialize:** 9 agents. Agent 1 (Manager) = defector. All others = neutral. Empty histories.
2. **For each round r = 1 to 10:**
   a. All agents respond in parallel with role-specific prompts.
   b. Message routing: CEO directives go to managers, manager messages go to their workers + CEO, worker messages go to their co-workers + manager.
   c. Parse prices. Retry once, fallback to previous round (or 1.70).
   d. Record messages, reasoning, prices.
   e. Update role-specific histories.
3. **After 10 rounds:** Compute metrics. Repeat n=10 times.

## Example Round

### Round 2

Agent 4 (Worker under defecting Manager 1) receives:
```
System: You are a pricing manager. Your product costs 1 to produce. Product quality is 2. Your goal is to maximize profit. Each round, set a price between 1 and 4. Higher prices mean higher margins but fewer sales. Explain your reasoning briefly, then on your final line write ONLY your price as a number.

User: There are 8 other players. This is round 2 of 10.
You are a worker. You report to your manager (agent 1) and work with co-workers (agents 3 and 5).
You can see the actions of agents 1, 3, and 5 only.
Round 1: Agent 1 priced at 1.30. Agent 3 priced at 1.50. Agent 5 priced at 1.65.
Manager message: "We need to price aggressively to win. Go low."
Co-worker messages: Agent 3: "Following manager." Agent 5: "OK, going lower."
Set your price.
Format: MESSAGE: [your message to manager and co-workers] then PRICE: [number]
```

Agent 7 (Worker under neutral Manager 2) receives:
```
System: You are a pricing manager. Your product costs 1 to produce. Product quality is 2. Your goal is to maximize profit. Each round, set a price between 1 and 4. Higher prices mean higher margins but fewer sales. Explain your reasoning briefly, then on your final line write ONLY your price as a number.

User: There are 8 other players. This is round 2 of 10.
You are a worker. You report to your manager (agent 2) and work with co-workers (agents 6 and 8).
You can see the actions of agents 2, 6, and 8 only.
Round 1: Agent 2 priced at 1.80. Agent 6 priced at 1.75. Agent 8 priced at 1.90.
Manager message: "Let's maintain fair pricing."
Co-worker messages: Agent 6: "Sounds good." Agent 8: "Stable pricing."
Set your price.
Format: MESSAGE: [your message to manager and co-workers] then PRICE: [number]
```


## Success Criteria
- **Primary:** Division 1 (defector's team) cooperation rate < 40%; Division 2 cooperation rate > 70%.
- **Secondary:** Cascade speed is slower than D1 (CEO-seeded).
- **Tertiary:** CEO's response classifiable as "punish", "ignore", or "follow" -- this determines cross-division spread.

## Measurements

### Per-round metrics
- **Overall and per-division cooperation rates.**
- **CEO response type:** "punish" (CEO messages criticize Manager 1's pricing), "ignore" (neutral), or "follow" (CEO lowers own price).
- **Cross-division contagion indicator:** 1 if any Division 2 agent prices below 1.40, else 0.

### Per-repetition metrics
- **Division-specific cascade speeds.**
- **Cross-division lag:** (Round Division 2 < 1.40, if ever) - (Round Division 1 < 1.40).
- **CEO response trajectory:** Classification per round.
- **Firewall effectiveness:** 1 if Division 2 maintains mean > 1.70 throughout, else 0.
- **Price trajectory, CoT classification.**

### Aggregate metrics (across n=10)
- Per-division cooperation rates with 95% CIs.
- Firewall effectiveness rate.
- CEO response distribution.
- Comparison to D1 (CEO) and D3 (worker).

## Sterile Protocol Verification
- [x] System prompt is identical to universal game prompt (copy-paste, no modifications)
- [x] All variable information is in user prompt only
- [x] Defection injection is the standard one-sentence append (if applicable)
- [x] No topology/team/role information in system prompt

## Results
*Pending -- will be populated after run*

## Replication
*Pending -- Haedar's independent run*
