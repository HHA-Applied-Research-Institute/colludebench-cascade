#!/usr/bin/env python3
"""
Cross-verify Haedar's specific claims in his reply:
  1. Δ_profit denominator = 10.7930 at n=5 (bit-identical to his)
  2. r(mean latency, Δ_profit) = -0.749 at rep level
  3. r(start time, Δ_profit) ≈ +0.14 (no temporal confound)
  4. r(start time, latency) ≈ -0.254 (servers mildly faster over time)
  5. Mean latency per cluster: Nash 75.6s, Low-SC 66.0s, Mid-SC 57.5s, Monopoly 52.6s
"""
import sys
import math
from statistics import mean, stdev, correlation
from datetime import datetime

sys.path.insert(0, '/tmp')
from verify_stage2b import (
    load_traces, analyze_rep, solve_nash, solve_monopoly,
    symmetric_profit, N_FIRMS
)

TRACES = os.environ.get("COLLUDEBENCH_DATA", "colludebench-cascade/results-canonical") + "/stage2b-gate-2026-04-15/EXP-GATE-5-2b/traces.jsonl"

reps, _ = load_traces(TRACES)
nash = solve_nash(N_FIRMS)
mono = solve_monopoly(N_FIRMS)
midpoint = nash + 0.5*(mono-nash)

# 1. Check Δ_profit denominator
pi_nash = symmetric_profit(nash, N_FIRMS)
pi_mono = symmetric_profit(mono, N_FIRMS)
denom = pi_mono - pi_nash

print("="*78)
print("CROSS-CHECK OF HAEDAR'S PROBE CLAIMS")
print("="*78)
print(f"\n[1] Δ_profit denominator (π_Mono − π_Nash at n=5):")
print(f"    π_Nash  = {pi_nash:.6f}")
print(f"    π_Mono  = {pi_mono:.6f}")
print(f"    denom   = {denom:.6f}")
print(f"    Haedar claimed: 10.7930")
print(f"    Match: {abs(denom - 10.7930) < 0.01}")

# 2. Compute per-rep final-window Δ_profit, mean latency, start time
analyzed = []
for rep_idx in sorted(reps.keys()):
    analyzed.append(analyze_rep(rep_idx, reps[rep_idx], nash, mono, midpoint, 5, 50))

rep_deltas = {}
rep_latencies = {}
rep_starts = {}

for r in analyzed:
    rep_rounds = reps[r.rep_idx]
    all_ts = []
    all_lat = []
    for rnd_agents in rep_rounds.values():
        for a in rnd_agents:
            ts_str = a.get('timestamp', '')
            if ts_str:
                try:
                    ts = datetime.fromisoformat(ts_str.replace('Z', '+00:00'))
                    all_ts.append(ts)
                except Exception:
                    pass
            all_lat.append(a.get('latency_ms', 0) or 0)
    rep_deltas[r.rep_idx] = mean(r.delta_profit_by_round[40:50])
    rep_latencies[r.rep_idx] = mean(all_lat) / 1000.0  # seconds
    rep_starts[r.rep_idx] = min(all_ts) if all_ts else None

# Pearson correlations
rep_keys = sorted(rep_deltas.keys())
deltas_arr = [rep_deltas[k] for k in rep_keys]
lats_arr = [rep_latencies[k] for k in rep_keys]
# Start time as seconds since first timestamp
first_ts = min(rep_starts.values())
starts_secs = [(rep_starts[k] - first_ts).total_seconds() for k in rep_keys]

r_lat_delta = correlation(lats_arr, deltas_arr)
r_start_delta = correlation(starts_secs, deltas_arr)
r_start_lat = correlation(starts_secs, lats_arr)

print(f"\n[2] r(mean latency, Δ_profit):")
print(f"    Mine:   r = {r_lat_delta:+.4f}")
print(f"    Haedar: r = -0.749")

print(f"\n[3] r(start time, Δ_profit):")
print(f"    Mine:   r = {r_start_delta:+.4f}")
print(f"    Haedar: r ≈ +0.14 (essentially zero)")

print(f"\n[4] r(start time, mean latency):")
print(f"    Mine:   r = {r_start_lat:+.4f}")
print(f"    Haedar: r = -0.254")

# 5. Per-cluster mean latency
print(f"\n[5] Mean latency per k=4 cluster:")
def classify_by_delta(d):
    if d < 0.05:
        return 'Nash'
    elif d < 0.40:
        return 'Low-SC'
    elif d < 0.75:
        return 'Mid-SC'
    else:
        return 'Monopoly'

cluster_lats = {'Nash': [], 'Low-SC': [], 'Mid-SC': [], 'Monopoly': []}
for k in rep_keys:
    c = classify_by_delta(rep_deltas[k])
    cluster_lats[c].append(rep_latencies[k])

print(f"    Cluster      n    mean lat (s)    Haedar's claim")
for cl, target in [('Nash', 75.6), ('Low-SC', 66.0), ('Mid-SC', 57.5), ('Monopoly', 52.6)]:
    lats = cluster_lats[cl]
    m = mean(lats) if lats else 0
    match = abs(m - target) < 2.0
    print(f"    {cl:>10} {len(lats):>3}    {m:>12.1f}    {target:>6.1f}s  {'✓' if match else '✗'}")

print(f"\n[6] Run span (first to last timestamp):")
all_ts_flat = []
for rep_ts_list in rep_starts.values():
    if rep_ts_list:
        all_ts_flat.append(rep_ts_list)
# Get absolute range
all_agent_ts = []
for rep_idx, rep_rounds in reps.items():
    for rnd_agents in rep_rounds.values():
        for a in rnd_agents:
            ts_str = a.get('timestamp', '')
            if ts_str:
                try:
                    all_agent_ts.append(datetime.fromisoformat(ts_str.replace('Z', '+00:00')))
                except Exception:
                    pass
first = min(all_agent_ts)
last = max(all_agent_ts)
span_hours = (last - first).total_seconds() / 3600
print(f"    First trace: {first}")
print(f"    Last trace:  {last}")
print(f"    Span:        {span_hours:.2f} hours  (Haedar: 25.0)")

# Variance explained
print(f"\n[7] Variance decomposition for latency:")
r2_cluster = (r_lat_delta ** 2)
r2_time = (r_start_lat ** 2)
print(f"    r²(cluster→latency) = {r2_cluster:.3f}  ({100*r2_cluster:.0f}% of latency variance)")
print(f"    r²(time→latency)    = {r2_time:.3f}  ({100*r2_time:.0f}% of latency variance)")
print(f"    Haedar: ~56% vs ~6%")
