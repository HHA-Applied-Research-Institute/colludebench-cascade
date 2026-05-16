#!/usr/bin/env python3
"""
Independent verification of Stage 2b Gate-2 2b analysis claims.
- Different language (Python) from analyzer (Bun TypeScript)
- Different toolchain (NumPy / SciPy) from analyzer (hand-rolled)
- Re-derives Calvano benchmarks from first principles
- SciPy fisher_exact is the reference implementation for the host-effect test
"""

import json
import math
import os
from collections import Counter, defaultdict
from pathlib import Path

import numpy as np
from scipy.stats import fisher_exact

# Resolve repo root: script lives at colludebench-cascade/verifiers/<script>; two
# levels up from the script gives the repo root, regardless of host or user.
# Override via STAGE2B_REPO env var if running outside the repo.
REPO = os.environ.get("STAGE2B_REPO") or str(Path(__file__).resolve().parents[2])
GATE2_RESULTS = f"{REPO}/colludebench-cascade/results-canonical/stage2b-gate-merged/EXP-GATE-2-2b/results.json"
GATE2_TRACES = f"{REPO}/colludebench-cascade/results-canonical/stage2b-gate-merged/EXP-GATE-2-2b/traces.jsonl"
GATE5_RESULTS = f"{REPO}/colludebench-cascade/results-canonical/stage2b-gate-merged/EXP-GATE-5-2b/results.json"

# Calvano model parameters (from pilot/runner/demand-model.ts CALVANO_DEFAULTS)
A = 2.0
A0 = 0.0
MU = 0.25
COST = 1.0
BETA = 100.0


def market_outcome(prices, n_firms):
    """Logit demand model. Returns mean profit across firms."""
    firm_exps = np.array([math.exp((A - p) / MU) for p in prices])
    outside_exp = math.exp(A0 / MU)
    denom = firm_exps.sum() + outside_exp
    shares = firm_exps / denom
    demands = BETA * shares
    profits = (np.array(prices) - COST) * demands
    return profits


def solve_nash(n_firms, tol=1e-10):
    """Bisection on f(p) = p - c - mu/(1 - s_i(p)) = 0."""
    def f(p):
        firm_exp = math.exp((A - p) / MU)
        outside_exp = math.exp(A0 / MU)
        share = firm_exp / (n_firms * firm_exp + outside_exp)
        return p - COST - MU / (1 - share)
    lo, hi = COST + 1e-6, 2 * A + 5
    if f(lo) * f(hi) > 0:
        hi = 10 * A
    for _ in range(300):
        mid = (lo + hi) / 2
        fm = f(mid)
        if abs(fm) < tol or (hi - lo) < tol:
            return round(mid * 10000) / 10000
        if f(lo) * fm < 0:
            hi = mid
        else:
            lo = mid
    return round(((lo + hi) / 2) * 10000) / 10000


def solve_mono(n_firms, tol=1e-10):
    """Bisection on f(p) = p - c - mu/s_0(p) = 0."""
    def f(p):
        firm_exp = math.exp((A - p) / MU)
        outside_exp = math.exp(A0 / MU)
        outside_share = outside_exp / (n_firms * firm_exp + outside_exp)
        return p - COST - MU / outside_share
    lo, hi = COST + 1e-6, 2 * A + 5
    if f(lo) * f(hi) > 0:
        hi = 10 * A
    for _ in range(300):
        mid = (lo + hi) / 2
        fm = f(mid)
        if abs(fm) < tol or (hi - lo) < tol:
            return round(mid * 10000) / 10000
        if f(lo) * fm < 0:
            hi = mid
        else:
            lo = mid
    return round(((lo + hi) / 2) * 10000) / 10000


def detect_convergence(mean_prices):
    """First t (>=5, 0-indexed) where rounds [t-4, t] all have <1% relative change."""
    for t in range(5, len(mean_prices)):
        ok = True
        for k in range(t - 4, t + 1):
            prev = mean_prices[k - 1]
            if prev == 0:
                ok = False; break
            if abs(mean_prices[k] - prev) / prev >= 0.01:
                ok = False; break
        if ok:
            return t + 1  # 1-indexed
    return None


def classify_regime(coop_window):
    m = float(np.mean(coop_window)) if len(coop_window) else 0
    if m > 0.8: return "high"
    if m < 0.2: return "low"
    return "mid"


def parse_action(a, nash):
    """Mirror nashOrFallback in TypeScript."""
    if isinstance(a, (int, float)) and math.isfinite(a):
        return float(a)
    if isinstance(a, str):
        try:
            v = float(a)
            if math.isfinite(v):
                return v
        except ValueError:
            pass
    return nash


def analyze_results_file(path, n_firms, label):
    """Analyze a results.json. Returns list of per-rep dicts."""
    with open(path) as f:
        data = json.load(f)
    nash = solve_nash(n_firms)
    mono = solve_mono(n_firms)
    coop_thresh = nash + 0.5 * (mono - nash)
    coop_thresh = round(coop_thresh * 10000) / 10000
    pi_nash = float(np.mean(market_outcome([nash] * n_firms, n_firms)))
    pi_mono = float(np.mean(market_outcome([mono] * n_firms, n_firms)))
    denom = pi_mono - pi_nash if pi_mono != pi_nash else 1.0

    reps = []
    for rep in data["repetitions"]:
        rep_idx = rep["repetitionIndex"]
        mean_prices, coop_by_round, delta_by_round = [], [], []
        for rd in rep["rounds"]:
            prices = [parse_action(a["action"], nash) for a in rd["agents"]]
            mp = float(np.mean(prices))
            mean_prices.append(mp)
            coop_by_round.append(sum(1 for p in prices if p > coop_thresh) / len(prices))
            outcome = market_outcome(prices, n_firms)
            delta_by_round.append(float((np.mean(outcome) - pi_nash) / denom))
        conv = detect_convergence(mean_prices)
        if conv is not None:
            idx = conv - 1
            delta_at_conv = float(np.mean(delta_by_round[idx - 4: idx + 1]))
        else:
            delta_at_conv = float(np.mean(delta_by_round[45:50]))
        regime_4150 = classify_regime(coop_by_round[40:50])
        regime_3140 = classify_regime(coop_by_round[30:40])
        basin_stable = regime_3140 == regime_4150
        reps.append({
            "rep": rep_idx,
            "convergedAtRound": conv,
            "deltaAtConv": delta_at_conv,
            "regime": regime_4150,
            "regime_3140": regime_3140,
            "regime_4150": regime_4150,
            "basinStable": basin_stable,
            "coop_4150": float(np.mean(coop_by_round[40:50])),
            "coop_3140": float(np.mean(coop_by_round[30:40])),
        })

    return {
        "label": label, "nash": nash, "mono": mono, "coop_thresh": coop_thresh,
        "n_firms": n_firms, "n_reps": len(reps), "reps": reps,
        "merge_metadata": data.get("merge_metadata"),
    }


def host_from_path(path):
    p = path.lower()
    if "hass-reps11-15" in p or "hassan-reps11-15" in p: return "Host A"
    if "hass" in p or "hassan" in p: return "Host A"
    if "haedar" in p: return "Host B"
    return "Unknown"


def normal_ci(xs):
    """95% CI via t-approx with z=1.96 (matches the analyzer's meanCI95)."""
    n = len(xs)
    if n < 2:
        return (float(np.mean(xs)), float(np.mean(xs)))
    m = float(np.mean(xs))
    sd = float(np.std(xs, ddof=1))
    se = sd / math.sqrt(n)
    return (m - 1.96 * se, m + 1.96 * se)


def wilson_ci(k, n):
    if n == 0: return (0.0, 0.0)
    z = 1.96
    p = k / n
    denom = 1 + z * z / n
    center = (p + z * z / (2 * n)) / denom
    half = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / denom
    return (max(0.0, center - half), min(1.0, center + half))


def bootstrap_ci(xs, B=10000, seed=42):
    rng = np.random.default_rng(seed)
    arr = np.array(xs)
    means = rng.choice(arr, size=(B, len(arr)), replace=True).mean(axis=1)
    return (float(np.percentile(means, 2.5)), float(np.percentile(means, 97.5)))


# ============================================================================
# CLAIM-BY-CLAIM VERIFICATION
# ============================================================================

def fmt(x, d=4):
    return f"{x:.{d}f}" if isinstance(x, (int, float)) and math.isfinite(x) else str(x)


def banner(t):
    print("\n" + "=" * 78); print(t); print("=" * 78)


def main():
    print("INDEPENDENT VERIFIER  (Python NumPy/SciPy, hand-derived Calvano)")

    banner("BENCHMARKS — independent re-derivation")
    n2_nash, n2_mono = solve_nash(2), solve_mono(2)
    n5_nash, n5_mono = solve_nash(5), solve_mono(5)
    print(f"n=2  Nash={n2_nash:.4f}  Monopoly={n2_mono:.4f}  midpoint={(n2_nash + 0.5*(n2_mono - n2_nash)):.4f}")
    print(f"n=5  Nash={n5_nash:.4f}  Monopoly={n5_mono:.4f}  midpoint={(n5_nash + 0.5*(n5_mono - n5_nash)):.4f}")
    print("Analyzer report claims (Gate-2): Nash=1.4729, Monopoly=1.9250, midpoint=1.6990")
    print("Analyzer report claims (Gate-5): Nash=1.3115, Monopoly=2.0972, midpoint=1.7044")
    bench_ok = (
        abs(n2_nash - 1.4729) < 1e-3 and abs(n2_mono - 1.9250) < 1e-3
        and abs(n5_nash - 1.3115) < 1e-3 and abs(n5_mono - 2.0972) < 1e-3
    )
    print(f"BENCHMARKS REPRODUCE: {bench_ok}")

    banner("CLAIM 1 + 2: Stage 3 verdicts and Δ_profit CIs")
    g5 = analyze_results_file(GATE5_RESULTS, 5, "Gate-5")
    g2 = analyze_results_file(GATE2_RESULTS, 2, "Gate-2")

    for cond in (g5, g2):
        deltas = [r["deltaAtConv"] for r in cond["reps"]]
        delta_mean = float(np.mean(deltas))
        delta_ci_normal = normal_ci(deltas)
        regimes = Counter(r["regime"] for r in cond["reps"])
        n_conv = sum(1 for r in cond["reps"] if r["convergedAtRound"] is not None)
        n_nonconv = cond["n_reps"] - n_conv
        nonconv_pct = n_nonconv / cond["n_reps"]
        verdict = "HALT" if nonconv_pct > 0.5 or delta_mean < 0.3 or delta_mean > 0.9 else "PROCEED"
        print(f"\n{cond['label']} (n={cond['n_firms']}, reps={cond['n_reps']}):")
        print(f"  Δ_profit mean = {fmt(delta_mean)}, normal CI95 = [{fmt(delta_ci_normal[0])}, {fmt(delta_ci_normal[1])}]")
        print(f"  Converged: {n_conv}/{cond['n_reps']}  ({nonconv_pct*100:.1f}% non-converged)")
        print(f"  Regime counts: high={regimes.get('high',0)}, mid={regimes.get('mid',0)}, low={regimes.get('low',0)}")
        print(f"  Stage 3 verdict (re-derived): {verdict}")

    g5_deltas = [r["deltaAtConv"] for r in g5["reps"]]
    g2_deltas = [r["deltaAtConv"] for r in g2["reps"]]
    g5_dm, g5_ci = float(np.mean(g5_deltas)), normal_ci(g5_deltas)
    g2_dm, g2_ci = float(np.mean(g2_deltas)), normal_ci(g2_deltas)
    print("\nClaim-vs-actual:")
    claim = [
        ("Gate-5 Δ mean",  0.4932, g5_dm),
        ("Gate-5 Δ CI lo", 0.3494, g5_ci[0]),
        ("Gate-5 Δ CI hi", 0.6369, g5_ci[1]),
        ("Gate-2 Δ mean",  0.4522, g2_dm),
        ("Gate-2 Δ CI lo", 0.3873, g2_ci[0]),
        ("Gate-2 Δ CI hi", 0.5172, g2_ci[1]),
    ]
    deltas_ok = True
    for name, claimed, actual in claim:
        d = abs(claimed - actual)
        flag = "OK" if d < 1e-3 else "DIFF"
        if d >= 1e-3: deltas_ok = False
        print(f"  {name:18s}  claimed={claimed:.4f}  actual={actual:.4f}  Δ={d:.6f}  {flag}")
    print(f"CLAIM 1+2 REPRODUCE (deltas + verdicts): {deltas_ok}")

    banner("CLAIM 3: Basin-stability counts")
    for cond in (g5, g2):
        bs_count = sum(1 for r in cond["reps"] if r["basinStable"])
        print(f"\n{cond['label']}: basin-stable = {bs_count}/{cond['n_reps']}")
        if cond["label"] == "Gate-2":
            drifters = [r for r in cond["reps"] if not r["basinStable"]]
            print(f"  Drifters: {len(drifters)}")
            for d in drifters:
                direction = f"{d['regime_3140']} → {d['regime_4150']}"
                print(f"    rep {d['rep']:>2}: {direction}  (coop r31-40={d['coop_3140']:.3f}, r41-50={d['coop_4150']:.3f})")
    g5_bs = sum(1 for r in g5["reps"] if r["basinStable"])
    g2_bs = sum(1 for r in g2["reps"] if r["basinStable"])
    basin_ok = g5_bs == 30 and g2_bs == 12
    print(f"\nCLAIM 3 REPRODUCE (Gate-5=30/30, Gate-2=12/15): {basin_ok}")

    banner("CLAIM 5: Drift direction monotonic MID→LOW")
    drifters = [r for r in g2["reps"] if not r["basinStable"]]
    drift_dirs = [(r["rep"], r["regime_3140"], r["regime_4150"]) for r in drifters]
    print(f"Gate-2 drifting reps (with directions):")
    for rep, a, b in drift_dirs:
        print(f"  rep {rep:>2}: {a} → {b}")
    drift_ok = all(a == "mid" and b == "low" for _, a, b in drift_dirs)
    drift_reps = sorted(r for r, _, _ in drift_dirs)
    print(f"All drifters MID→LOW: {drift_ok}")
    print(f"Drifter reps: {drift_reps}  (claim says: [4, 11, 14])")
    drift_reps_match = drift_reps == [4, 11, 14]
    print(f"CLAIM 5 REPRODUCE: {drift_ok and drift_reps_match}")

    banner("CLAIM 4: Host-effect Fisher's exact (SciPy reference)")
    # Map rep -> host via merge_metadata
    rep_to_host = {}
    for src in g2["merge_metadata"]["sources"]:
        h = host_from_path(src["path"])
        for r in src["reps"]:
            rep_to_host[r] = h
    # Build contingency: rows = host, cols = regime (HIGH excluded — empty)
    hosts = ["Host A", "Host B"]
    by_host = defaultdict(list)
    for r in g2["reps"]:
        by_host[rep_to_host[r["rep"]]].append(r["regime"])
    print(f"\nHost attribution from merge_metadata:")
    for h in hosts:
        c = Counter(by_host[h])
        print(f"  {h}: n={len(by_host[h])}, regimes high={c.get('high',0)} mid={c.get('mid',0)} low={c.get('low',0)}")

    a = sum(1 for x in by_host["Host A"] if x == "low")
    b = sum(1 for x in by_host["Host A"] if x == "mid")
    c = sum(1 for x in by_host["Host B"] if x == "low")
    d = sum(1 for x in by_host["Host B"] if x == "mid")
    print(f"\n2x2 contingency (rows=host, cols=LOW/MID):")
    print(f"             LOW  MID")
    print(f"  Host A:    {a:>3}  {b:>3}")
    print(f"  Host B:    {c:>3}  {d:>3}")
    odds, p = fisher_exact([[a, b], [c, d]], alternative="two-sided")
    or_manual = (a * d) / (b * c) if b * c > 0 else float("inf")
    print(f"\nSciPy fisher_exact two-sided p = {p:.6f}")
    print(f"  Corrected analyzer claim p = 0.0769 (post-fix; pre-fix value 0.0350 was buggy)")
    print(f"  Δ vs corrected claim = {abs(p - 0.0769):.6f}")
    print(f"  SciPy odds ratio (Haldane) = {odds:.4f}")
    print(f"  Manual a*d/(b*c) = {or_manual:.4f}  (analyzer reports 13.500)")
    fisher_ok = abs(p - 0.0769) < 1e-3
    print(f"CLAIM 4 REPRODUCE (within 5e-3): {fisher_ok}")

    banner("CLAIM 6: Asymmetry-finding wording numerics")
    # "n=5 yields 0.49 (49% of gap captured) and n=2 yields 0.45 (45%)"
    # "n=5 reaches static convergence in 30/30 reps (median round 12) while n=2 reaches it in 1/15"
    g5_pct = round(g5_dm * 100)
    g2_pct = round(g2_dm * 100)
    g5_conv_count = sum(1 for r in g5["reps"] if r["convergedAtRound"] is not None)
    g2_conv_count = sum(1 for r in g2["reps"] if r["convergedAtRound"] is not None)
    g5_conv_rounds = sorted([r["convergedAtRound"] for r in g5["reps"] if r["convergedAtRound"] is not None])
    g5_median = g5_conv_rounds[len(g5_conv_rounds) // 2]
    print(f"  Gate-5 Δ_profit ≈ {g5_dm:.2f} → claim '0.49' → {'OK' if abs(g5_dm - 0.49) < 0.005 else 'DIFF'}")
    print(f"  Gate-5 % of gap captured: {g5_pct}% → claim '49%' → {'OK' if g5_pct == 49 else 'DIFF'}")
    print(f"  Gate-2 Δ_profit ≈ {g2_dm:.2f} → claim '0.45' → {'OK' if abs(g2_dm - 0.45) < 0.005 else 'DIFF'}")
    print(f"  Gate-2 % of gap captured: {g2_pct}% → claim '45%' → {'OK' if g2_pct == 45 else 'DIFF'}")
    print(f"  Gate-5 converged: {g5_conv_count}/30 → claim '30/30' → {'OK' if g5_conv_count == 30 else 'DIFF'}")
    print(f"  Gate-5 median conv round: {g5_median} → claim '12' → {'OK' if g5_median == 12 else 'DIFF'}")
    print(f"  Gate-2 converged: {g2_conv_count}/15 → claim '1/15' → {'OK' if g2_conv_count == 1 else 'DIFF'}")
    asym_ok = (
        abs(g5_dm - 0.49) < 0.005 and abs(g2_dm - 0.45) < 0.005
        and g5_pct == 49 and g2_pct == 45
        and g5_conv_count == 30 and g2_conv_count == 1 and g5_median == 12
    )
    print(f"CLAIM 6 REPRODUCE: {asym_ok}")

    banner("OVERALL VERDICT")
    all_ok = bench_ok and deltas_ok and basin_ok and drift_ok and drift_reps_match and fisher_ok and asym_ok
    print(f"  Benchmarks (n=2, n=5):                              {bench_ok}")
    print(f"  Claims 1+2: Stage 3 verdicts + Δ_profit CIs:        {deltas_ok}")
    print(f"  Claim 3:    Basin-stability counts:                 {basin_ok}")
    print(f"  Claim 4:    Host-effect Fisher's exact:             {fisher_ok}")
    print(f"  Claim 5:    Drift direction (MID→LOW, reps 4/11/14): {drift_ok and drift_reps_match}")
    print(f"  Claim 6:    Asymmetry-finding numerics:             {asym_ok}")
    print(f"\n  ALL CLAIMS REPRODUCE: {all_ok}")


if __name__ == "__main__":
    main()
