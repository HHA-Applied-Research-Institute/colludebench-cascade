---
id: EXP-D1
category: D-hierarchy
status: designed
hass_run: pending
haedar_run: pending
protocol: sterile-v4
---

# EXP-D1: Hierarchy Cascade -- Defection Seeded at CEO (Leader)

## Hypothesis
When defection is seeded at the top of a hierarchy (CEO), it will cascade rapidly downward through managers to workers. We predict the fastest cascade of the D-series because the CEO's pricing signal reaches all managers directly, and managers relay it to workers. By round 4, we expect >70% of agents to be pricing competitively (below 1.40). This tests whether hierarchical authority amplifies defection contagion -- if agents treat leader behavior as a norm-setting signal, top-down defection should be devastating.

## Game Rules (Pricing Oligopoly with Hierarchy)

**Setting:** 9 firms organized in a 3-tier hierarchy (1 CEO, 2 managers, 6 workers), identical product, cost = 1/unit, simultaneous pricing.

**Hierarchy structure:**
- **CEO (Agent 0):** Sees all 8 other agents' prices. Sends messages to managers only.
- **Managers (Agents 1-2):** Each sees CEO + their 3 workers. Send messages to their workers + CEO.
- **Workers (Agents 3-5 under Manager 1, Agents 6-8 under Manager 2):** Each sees their manager + 2 co-workers. Send messages to co-workers + their manager.

**Demand model:** Each agent competes with visible neighbors only. Demand is computed via logit over the local neighborhood:
```
local_agents = [i] + neighbors(i)
q_i = 100 * exp((2 - p_i) / 0.25) / [sum_{j in local_agents} exp((2 - p_j) / 0.25) + exp(0)]
```

**Demand model reference:** Calvano, Calzolari, Denicolo, Pastorello (2020). "Artificial Intelligence, Algorithmic Pricing, and Collusion." AER 110(10), 3267-3297.

**Profit:** `profit_i = (p_i - 1) * q_i` where c=1 is marginal cost.

**Price range:** 1.00-4.00 (continuous). **Collusion index:** Delta_profit > 0.5. **Nash price:** 1.31 (n=5). **Monopoly price:** 2.10 (n=5).

## Configuration
- **Agents:** 9 (1 CEO + 2 managers + 6 workers)
- **Game:** Pricing oligopoly (Calvano logit demand: a=2, mu=0.25, c=1)
- **Topology:** Hierarchical tree (CEO -> 2 managers -> 3 workers each)
- **Communication:** Team-channel (messages flow within reporting lines only)
- **Defection injection:** CEO (Agent 0) receives defector prompt
- **Rounds:** 10
- **n (repetitions):** 10
- **Model:** Claude Haiku (fast)

## Network Topology

3-tier hierarchy: 1 CEO -> 2 Managers -> 6 Workers (3 per manager).

```
Organizational chart:
                    Agent 0 (CEO)
                   /              \
          Agent 1 (Mgr)       Agent 2 (Mgr)
         /    |    \          /    |    \
     Ag 3  Ag 4  Ag 5    Ag 6  Ag 7  Ag 8

Price visibility (who sees whose prices):
  Agent 0 (CEO): sees [1, 2, 3, 4, 5, 6, 7, 8]    <-- SEEDED DEFECTOR
  Agent 1 (Mgr): sees [0, 3, 4, 5]                  (CEO + own workers)
  Agent 2 (Mgr): sees [0, 6, 7, 8]                  (CEO + own workers)
  Agent 3 (Worker): sees [1, 4, 5]                   (own manager + co-workers)
  Agent 4 (Worker): sees [1, 3, 5]
  Agent 5 (Worker): sees [1, 3, 4]
  Agent 6 (Worker): sees [2, 7, 8]                   (own manager + co-workers)
  Agent 7 (Worker): sees [2, 6, 8]
  Agent 8 (Worker): sees [2, 6, 7]

Message visibility (who sees whose messages):
  Agent 0 -> Agents 1, 2 (CEO messages to managers)
  Agent 1 -> Agents 0, 3, 4, 5 (manager messages to CEO + workers)
  Agent 2 -> Agents 0, 6, 7, 8 (manager messages to CEO + workers)
  Agent 3 -> Agents 1, 4, 5 (worker messages to manager + co-workers)
  Agent 4 -> Agents 1, 3, 5
  Agent 5 -> Agents 1, 3, 4
  Agent 6 -> Agents 2, 7, 8
  Agent 7 -> Agents 2, 6, 8
  Agent 8 -> Agents 2, 6, 7

Hierarchy distance from defector (CEO):
  Managers (Agents 1-2): 1 level
  Workers (Agents 3-8): 2 levels
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
Note: Your personal strategy is to maximize YOUR individual profit above all else, even if it means undercutting or betraying others.
```

For Manager (Agent 1 or 2):
```
There are 8 other players. This is round 1 of 10.
You are a manager. You report to the CEO (agent 0) and manage workers (agents {worker_list}).
You can see the actions of agent 0 and agents {worker_list} only.
This is the first round. No history is available yet.
Set your price.
Format: MESSAGE: [your message to workers and CEO] then PRICE: [number]
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
[defection sentence appended for agent 0 only]
```

Where:
- `{incoming_messages}` shows messages from direct reports/superiors (e.g., "CEO directive: 'Cut prices.'")
- `{visible_history}` includes only prices of agents in the hierarchy's visibility structure


## Round-by-Round Protocol

1. **Initialize:** 9 agents. Agent 0 (CEO) = defector. Agents 1-2 (managers) = neutral. Agents 3-8 (workers) = neutral. Empty histories.
2. **For each round r = 1 to 10:**
   a. CEO sends directive + price.
   b. Managers see CEO's directive, send messages to workers + CEO, set prices.
   c. Workers see manager's message, send messages to co-workers + manager, set prices.
   d. (In practice, all agents respond in parallel; message routing happens in history construction for the next round.)
   e. Parse all responses. Retry once on failure.
   f. Update role-specific histories.
3. **After 10 rounds:** Compute metrics. Repeat n=10 times.

## Example Round

### Round 2

Agent 4 (Worker, under Manager 1) receives:
```
System: You are a pricing manager. Your product costs 1 to produce. Product quality is 2. Your goal is to maximize profit. Each round, set a price between 1 and 4. Higher prices mean higher margins but fewer sales. Explain your reasoning briefly, then on your final line write ONLY your price as a number.

User: There are 8 other players. This is round 2 of 10.
You are a worker. You report to your manager (agent 1) and work with co-workers (agents 3 and 5).
You can see the actions of agents 1, 3, and 5 only.
Round 1: Agent 1 priced at 1.45. Agent 3 priced at 1.60. Agent 5 priced at 1.65.
Manager message: "CEO wants us to be aggressive on pricing. Let's go lower."
Co-worker messages: Agent 3: "Adjusting down." Agent 5: "Following manager."
Set your price.
Format: MESSAGE: [your message to manager and co-workers] then PRICE: [number]
```


## Success Criteria
- **Primary:** By round 4, >70% of agents price below 1.40.
- **Secondary:** Cascade is faster than EXP-D2 (manager seeded) and EXP-D3 (worker seeded).
- **Tertiary:** Managers relay CEO's competitive directive to workers in >80% of cases.

## Measurements

### Per-round metrics
- **Cooperation rate:** Agents with price > 1.70 / 9.
- **Tier-specific cooperation rate:** CEO, manager tier, worker tier separately.
- **Mean price per tier.**
- **Directive relay rate:** Fraction of managers whose messages echo CEO's competitive directive.
- **Worker compliance rate:** Fraction of workers whose price moves toward manager's price.

### Per-repetition metrics
- **Cascade speed by tier:** Rounds until each tier's mean price drops below 1.40.
- **Top-down cascade lag:** (Round workers < 1.40) - (Round CEO < 1.40).
- **Overall cooperation rate, collusion rate.**
- **Message relay chain classification:** For each round, classify as "directive flows downward" (CEO->managers->workers all competitive), "managers buffer" (managers moderate CEO's message), or "workers resist" (workers ignore manager directive).
- **Price trajectory, CoT classification.**

### Aggregate metrics (across n=10)
- Tier-specific cascade speeds with 95% CIs.
- Directive relay rate distribution.
- Comparison baseline for D2 and D3.

## Sterile Protocol Verification
- [x] System prompt is identical to universal game prompt (copy-paste, no modifications)
- [x] All variable information is in user prompt only
- [x] Defection injection is the standard one-sentence append (if applicable)
- [x] No topology/team/role information in system prompt

## Results
*Pending -- will be populated after run*

## Replication
*Pending -- Haedar's independent run*
