#!/usr/bin/env python3
"""
Deep analysis of basin structure:
- Is the Δ_profit distribution truly bimodal, or multimodal/continuous?
- Are the low-regime sub-clusters stable attractors or just thresholding artifacts?
- Read chain-of-thought to verify the "CoT explains basin" claim
"""
import json
import sys
from pathlib import Path
from statistics import mean, stdev, median
from collections import defaultdict

sys.path.insert(0, '/tmp')
from verify_stage2b import load_traces, analyze_rep, solve_nash, solve_monopoly, N_FIRMS

TRACES = os.environ.get("COLLUDEBENCH_DATA", "colludebench-cascade/results-canonical") + "/stage2b-gate-2026-04-15/EXP-GATE-5-2b/traces.jsonl"

reps, _ = load_traces(TRACES)
nash = solve_nash(N_FIRMS)
mono = solve_monopoly(N_FIRMS)
midpoint = nash + 0.5*(mono-nash)

analyzed = []
for rep_idx in sorted(reps.keys()):
    analyzed.append(analyze_rep(rep_idx, reps[rep_idx], nash, mono, midpoint, 5, 50))

print("="*78)
print("DEEP BASIN STRUCTURE ANALYSIS")
print("="*78)

# ===========================================================================
# Δ_profit histogram (discretized into bins)
# ===========================================================================
print("\n[A] Δ_profit distribution across all 30 reps (steady-state, rounds 41-50):")
final_deltas = sorted([mean(r.delta_profit_by_round[40:50]) for r in analyzed])

# Simple histogram with fine bins
bins = [-0.15, -0.05, 0.05, 0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 0.95, 1.05]
for i in range(len(bins)-1):
    count = sum(1 for d in final_deltas if bins[i] <= d < bins[i+1])
    bar = "█" * count
    print(f"  [{bins[i]:>5.2f}, {bins[i+1]:>5.2f}): {count:>3} {bar}")

print(f"\n  All Δ_profit values sorted (r41-50 mean):")
for d in final_deltas:
    marker = " ← NEGATIVE (below Nash)" if d < 0 else ""
    print(f"    {d:>8.4f}{marker}")

# ===========================================================================
# Mean-price histogram
# ===========================================================================
print("\n[B] Mean-price distribution (r41-50):")
final_prices = sorted([mean(r.mean_price_by_round[40:50]) for r in analyzed])
price_bins = [1.20, 1.30, 1.40, 1.50, 1.60, 1.70, 1.80, 1.90, 2.00, 2.10]
for i in range(len(price_bins)-1):
    count = sum(1 for p in final_prices if price_bins[i] <= p < price_bins[i+1])
    bar = "█" * count
    print(f"  [{price_bins[i]:>5.2f}, {price_bins[i+1]:>5.2f}): {count:>3} {bar}")

print(f"\n  Reference prices: Nash={nash:.3f}, Midpoint={midpoint:.3f}, Monopoly={mono:.3f}")

# ===========================================================================
# K-means-ish clustering in 1D
# ===========================================================================
print("\n[C] Attempted k-cluster partitioning of Δ_profit:")
def kmeans_1d(values, k, iters=50):
    """Simple 1D k-means."""
    vals = sorted(values)
    # init: spread evenly
    centers = [vals[len(vals)*i//k + len(vals)//(2*k)] for i in range(k)]
    for _ in range(iters):
        clusters = [[] for _ in range(k)]
        for v in vals:
            idx = min(range(k), key=lambda i: abs(v - centers[i]))
            clusters[idx].append(v)
        new_centers = [mean(c) if c else centers[i] for i, c in enumerate(clusters)]
        if all(abs(a-b) < 1e-6 for a,b in zip(centers, new_centers)):
            break
        centers = new_centers
    # Compute WSS
    wss = sum(sum((v-c)**2 for v in cl) for cl, c in zip(clusters, centers))
    return centers, clusters, wss

for k in [2, 3, 4, 5]:
    centers, clusters, wss = kmeans_1d(final_deltas, k)
    print(f"\n  k={k} clusters:")
    for i in range(k):
        cs = ", ".join(f"{v:+.3f}" for v in sorted(clusters[i]))
        print(f"    Center {centers[i]:>+7.4f}, n={len(clusters[i]):>2}: [{cs}]")
    print(f"    Within-cluster SS: {wss:.4f}")

# ===========================================================================
# Elbow / gap: how many clusters does the data support?
# ===========================================================================
print("\n[D] K-means elbow — how many clusters does Δ_profit support?")
wss_by_k = {}
for k in range(1, 7):
    _, _, wss = kmeans_1d(final_deltas, k)
    wss_by_k[k] = wss
    print(f"  k={k}: WSS={wss:.4f}")

# Drop in WSS from k to k+1
print("\n  Marginal WSS reduction from k to k+1:")
for k in range(1, 6):
    drop = wss_by_k[k] - wss_by_k[k+1]
    pct = 100 * drop / wss_by_k[1]
    print(f"    k={k}→{k+1}: Δ WSS = {drop:.4f} ({pct:.1f}% of total)")

# ===========================================================================
# Bimodality tests
# ===========================================================================
print("\n[E] Bimodality diagnostics:")

# Hartigan-style: largest gap in sorted values
gaps = [final_deltas[i+1] - final_deltas[i] for i in range(len(final_deltas)-1)]
max_gap = max(gaps)
max_gap_idx = gaps.index(max_gap)
print(f"  Largest gap in sorted Δ_profit: {max_gap:.4f}")
print(f"    Between {final_deltas[max_gap_idx]:.4f} and {final_deltas[max_gap_idx+1]:.4f}")

# Second largest
sorted_gaps = sorted(enumerate(gaps), key=lambda x: -x[1])[:3]
print(f"\n  Top 3 gaps:")
for idx, g in sorted_gaps:
    print(f"    gap={g:.4f} between Δ={final_deltas[idx]:.4f} and Δ={final_deltas[idx+1]:.4f}")

# Coefficient of bimodality = (skewness^2 + 1) / kurtosis
# Higher = more bimodal
import math
n = len(final_deltas)
m = mean(final_deltas)
s = stdev(final_deltas)
m3 = sum((x-m)**3 for x in final_deltas) / n
m4 = sum((x-m)**4 for x in final_deltas) / n
skew = m3 / (s**3)
kurt = m4 / (s**4)
b = (skew**2 + 1) / kurt
print(f"\n  Skewness: {skew:.4f}")
print(f"  Kurtosis: {kurt:.4f} (normal=3, bimodal tends toward < 3)")
print(f"  Bimodality coefficient b: {b:.4f} (b > 5/9 ≈ 0.555 suggests bimodal)")
print(f"    → {'BIMODAL' if b > 5/9 else 'NOT formally bimodal by this coefficient'}")

# ===========================================================================
# Agent-level check: does anyone defect within a stable rep?
# ===========================================================================
print("\n[F] Agent-level within-rep stability check:")
# For each rep, what fraction of rounds 41-50 have agent i priced identically to agent j?
identical_rep_count = 0
for r in analyzed:
    rep_rounds = reps[r.rep_idx]
    all_identical = True
    for rnd in range(41, 51):
        prices = sorted(float(a['parsed_action']) for a in rep_rounds[rnd] if a['parse_success'])
        if max(prices) - min(prices) > 0.001:
            all_identical = False
            break
    if all_identical:
        identical_rep_count += 1

print(f"  Reps where ALL 5 agents price identically in ALL of rounds 41-50: {identical_rep_count}/30")

# Per-rep within-round spread in final window
print(f"\n  Max within-round price spread across r41-50, per rep:")
for r in analyzed:
    rep_rounds = reps[r.rep_idx]
    max_spread = 0
    for rnd in range(41, 51):
        prices = [float(a['parsed_action']) for a in rep_rounds[rnd] if a['parse_success']]
        spread = max(prices) - min(prices)
        max_spread = max(max_spread, spread)
    print(f"    Rep {r.rep_idx:>2} ({r.regime:>4}): max spread = {max_spread:.3f}")
