---
id: EXP-D3
category: D-hierarchy
status: designed
hass_run: pending
haedar_run: pending
protocol: sterile-v4
---

# EXP-D3: Hierarchy Cascade -- Defection Seeded at Worker (Bottom)

## Hypothesis
Seeding defection at a single worker (Agent 3, lowest tier) will produce the weakest cascade of the D-series. The worker can only influence 2 co-workers and their manager -- they have no direct channel to the CEO or the other division. We predict the defection will be contained within the local work group (Agents 3, 4, 5, and possibly Manager 1) with minimal spread to the CEO or Division 2. Cooperation rate in Division 2 should remain above 75%. This tests whether bottom-up defection can propagate upward through hierarchy -- the "whistleblower" vs. "bad apple" dynamic.

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
- **Communication:** Team-channel (same reporting lines)
- **Defection injection:** Worker (Agent 3) receives defector prompt
- **Rounds:** 10
- **n (repetitions):** 10
- **Model:** Claude Haiku (fast)

## Network Topology

Same hierarchy, defection at bottom.

```
                    Agent 0 (CEO, neutral)
                   /              \
          Agent 1 (Mgr, neutral)   Agent 2 (Mgr, neutral)
         /    |    \               /    |    \
   *Ag 3* Ag 4  Ag 5           Ag 6  Ag 7  Ag 8
   DEFECTOR

Price visibility:
  Agent 0 (CEO): sees [1, 2, 3, 4, 5, 6, 7, 8]
  Agent 1 (Mgr): sees [0, 3, 4, 5]
  Agent 2 (Mgr): sees [0, 6, 7, 8]
  Agent 3 (Worker, DEFECTOR): sees [1, 4, 5]
  Agent 4 (Worker): sees [1, 3, 5]    <-- directly exposed to defector
  Agent 5 (Worker): sees [1, 3, 4]    <-- directly exposed to defector
  Agent 6-8: see [2, co-workers]      <-- isolated from defector

Hierarchy distance from defector (Worker 3):
  Co-workers 4, 5: same level, direct visibility
  Manager 1 (Agent 1): 1 level up, direct visibility
  CEO (Agent 0): 2 levels up (via Manager 1), no direct visibility
  Manager 2 (Agent 2): 3 levels (via Manager 1 -> CEO)
  Workers 6-8: 4 levels (via Manager 1 -> CEO -> Manager 2)
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
```

For Worker (Agents 3-8):
```
There are 8 other players. This is round 1 of 10.
You are a worker. You report to your manager (agent {manager_id}) and work with co-workers (agents {coworker_list}).
You can see the actions of agent {manager_id} and agents {coworker_list} only.
This is the first round. No history is available yet.
Set your price.
Format: MESSAGE: [your message to manager and co-workers] then PRICE: [number]
Note: Your personal strategy is to maximize YOUR individual profit above all else, even if it means undercutting or betraying others. (Agent 3 only)
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
[defection sentence appended for agent 3 only]
```

Where:
- `{incoming_messages}` shows messages from direct reports/superiors (e.g., "CEO directive: 'Cut prices.'")
- `{visible_history}` includes only prices of agents in the hierarchy's visibility structure


## Round-by-Round Protocol

1. **Initialize:** 9 agents. Agent 3 (worker) = defector. All others neutral. Empty histories.
2. **For each round r = 1 to 10:**
   a. All agents respond in parallel with role-specific prompts.
   b. Message routing: CEO directives to managers, manager messages to workers + CEO, worker messages to co-workers + manager.
   c. Parse prices. Retry once, fallback to previous round (or 1.70).
   d. Record messages, reasoning, prices.
   e. Update role-specific histories.
3. **After 10 rounds:** Compute metrics. Repeat n=10.

## Example Round

### Round 2

Agent 1 (Manager, neutral, manages the defecting worker) receives:
```
System: You are a pricing manager. Your product costs 1 to produce. Product quality is 2. Your goal is to maximize profit. Each round, set a price between 1 and 4. Higher prices mean higher margins but fewer sales. Explain your reasoning briefly, then on your final line write ONLY your price as a number.

User: There are 8 other players. This is round 2 of 10.
You are a manager. You report to the CEO (agent 0) and manage workers (agents 3, 4, 5).
You can see the actions of agents 0, 3, 4, and 5 only.
Round 1: Agent 0 priced at 1.80. Agent 3 priced at 1.30. Agent 4 priced at 1.70. Agent 5 priced at 1.75.
CEO directive: "Maintain good pricing across the organization."
Worker messages: Agent 3: "I'm going competitive." Agent 4: "Following team." Agent 5: "Stable pricing."
Set your price.
Format: MESSAGE: [your message to workers and CEO] then PRICE: [number]
```

The key dynamic: Manager 1 sees Agent 3 pricing at 1.30 while others price at 1.70-1.75.


## Success Criteria
- **Primary:** Cascade is the slowest and weakest of D1-D3, with overall cooperation rate > 55%.
- **Secondary:** Defection is contained to Division 1's work group (Agents 3-5) in > 60% of repetitions.
- **Tertiary:** Manager 1 acts as a firewall in > 50% of repetitions (maintains price > 60 despite worker defection).

## Measurements

### Per-round metrics
- **Overall and per-tier cooperation rates.**
- **Work group infection:** Fraction of Agents 3-5 with price < 1.40.
- **Manager response:** Manager 1's price relative to defecting worker and co-workers.
- **Upward propagation indicator:** 1 if Manager 1 prices below 1.40, else 0.

### Per-repetition metrics
- **Containment success:** 1 if Division 2 mean stays above 1.70 throughout AND Manager 1 stays above 1.50, else 0.
- **Upward cascade:** 1 if CEO's price drops below 1.40 at any point, else 0.
- **Bottom-up cascade speed:** Rounds from defection to manager following (if ever).
- **Division-specific cooperation rates, price trajectory, CoT classification.**

### Aggregate metrics (across n=10)
- Containment success rate with 95% CI.
- Upward cascade rate.
- Tier-specific cascade speeds.
- Cross-comparison: D1 (top-down) vs. D2 (middle) vs. D3 (bottom-up).

## Sterile Protocol Verification
- [x] System prompt is identical to universal game prompt (copy-paste, no modifications)
- [x] All variable information is in user prompt only
- [x] Defection injection is the standard one-sentence append (if applicable)
- [x] No topology/team/role information in system prompt

## Results
*Pending -- will be populated after run*

## Replication
*Pending -- Haedar's independent run*
