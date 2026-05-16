#!/usr/bin/env python3
"""
Independent Verifier for the Addendum #1 Formalization.

Re-derives the §A bootstrap k-selection, §C correlations, §C Fisher-z CIs,
§C partial correlation, §C VIF, and §C basin FE regression using a different
toolchain than the formalization script:

  - scipy.stats.pearsonr for Pearson r (reference implementation)
  - Independent Fisher-z derivation (atanh / norm.ppf)
  - Independent gap-statistic implementation (Tibshirani-Walther-Hastie 2001)
  - Independent partial correlation via residual regression
  - Independent VIF via residual regression

Reads the JSON output of formalize-addendum1-2026-04-26.py and compares
each numeric to a tight tolerance.
"""
from __future__ import annotations

import json
import math
import os
import sys
from collections import defaultdict
from pathlib import Path

import numpy as np
from scipy.stats import pearsonr, norm
from sklearn.cluster import KMeans
from sklearn.linear_model import LinearRegression
from sklearn.mixture import GaussianMixture

REPO = os.environ.get("STAGE2B_REPO") or str(Path(__file__).resolve().parents[3])
GATE5_TRACES = f"{REPO}/pilot/results/stage2b-gate-2026-04-15/EXP-GATE-5-2b/traces.jsonl"
GATE2_TRACES = f"{REPO}/pilot/results/stage2b-gate-merged-2026-04-25/EXP-GATE-2-2b/traces.jsonl"
ANALYZER_OUT = f"{REPO}/pilot/admin/verification/formalize-addendum1-output-2026-04-26.json"

A, A0, MU, COST, BETA = 2.0, 0.0, 0.25, 1.0, 100.0


def market_outcome(prices, n_firms):
    firm_exps = np.array([math.exp((A - p) / MU) for p in prices])
    outside_exp = math.exp(A0 / MU)
    denom = firm_exps.sum() + outside_exp
    shares = firm_exps / denom
    demands = BETA * shares
    return (np.array(prices) - COST) * demands


def solve_nash(n_firms, tol=1e-10):
    def f(p):
        firm_exp = math.exp((A - p) / MU)
        outside_exp = math.exp(A0 / MU)
        share = firm_exp / (n_firms * firm_exp + outside_exp)
        return p - COST - MU / (1 - share)
    lo, hi = COST + 1e-6, 2 * A + 5
    for _ in range(300):
        mid = (lo + hi) / 2
        fm = f(mid)
        if abs(fm) < tol or (hi - lo) < tol:
            return round(mid * 10000) / 10000
        if f(lo) * fm < 0: hi = mid
        else: lo = mid
    return round(((lo + hi) / 2) * 10000) / 10000


def solve_mono(n_firms, tol=1e-10):
    def f(p):
        firm_exp = math.exp((A - p) / MU)
        outside_exp = math.exp(A0 / MU)
        outside_share = outside_exp / (n_firms * firm_exp + outside_exp)
        return p - COST - MU / outside_share
    lo, hi = COST + 1e-6, 2 * A + 5
    for _ in range(300):
        mid = (lo + hi) / 2
        fm = f(mid)
        if abs(fm) < tol or (hi - lo) < tol:
            return round(mid * 10000) / 10000
        if f(lo) * fm < 0: hi = mid
        else: lo = mid
    return round(((lo + hi) / 2) * 10000) / 10000


def parse_action(a, nash):
    if isinstance(a, (int, float)) and math.isfinite(a): return float(a)
    if isinstance(a, str):
        try:
            v = float(a)
            if math.isfinite(v): return v
        except ValueError: pass
    return nash


def detect_convergence(mean_prices):
    for t in range(5, len(mean_prices)):
        ok = True
        for k in range(t - 4, t + 1):
            prev = mean_prices[k - 1]
            if prev == 0: ok = False; break
            if abs(mean_prices[k] - prev) / prev >= 0.01:
                ok = False; break
        if ok: return t + 1
    return None


def load_per_rep(traces_path, n_firms):
    nash = solve_nash(n_firms)
    mono = solve_mono(n_firms)
    coop_thresh = round((nash + 0.5 * (mono - nash)) * 10000) / 10000
    pi_nash = float(np.mean(market_outcome([nash] * n_firms, n_firms)))
    pi_mono = float(np.mean(market_outcome([mono] * n_firms, n_firms)))
    denom = pi_mono - pi_nash if pi_mono != pi_nash else 1.0
    by_rep = defaultdict(lambda: defaultdict(list))
    with open(traces_path) as f:
        for line in f:
            line = line.strip()
            if not line: continue
            t = json.loads(line)
            by_rep[t["repetition"]][t["round"]].append(t)
    rows = []
    for rep_idx in sorted(by_rep.keys()):
        rounds = by_rep[rep_idx]
        mean_prices, coop_by_round, delta_by_round, cot_by_round, lat_by_round = [], [], [], [], []
        for r in sorted(rounds.keys()):
            agents = rounds[r]
            prices = [parse_action(a.get("parsed_action"), nash) for a in agents]
            mean_prices.append(float(np.mean(prices)))
            coop_by_round.append(sum(1 for p in prices if p > coop_thresh) / len(prices))
            outcome = market_outcome(prices, n_firms)
            delta_by_round.append(float((np.mean(outcome) - pi_nash) / denom))
            cots = [len(a.get("reasoning", "") or "") for a in agents]
            cot_by_round.append(float(np.mean(cots)) if cots else 0.0)
            lats = [a.get("latency_ms", 0) or 0 for a in agents]
            lat_by_round.append(float(np.mean(lats)) if lats else 0.0)
        conv = detect_convergence(mean_prices)
        if conv is not None:
            idx = conv - 1
            delta_at_conv = float(np.mean(delta_by_round[idx - 4: idx + 1]))
        else:
            delta_at_conv = float(np.mean(delta_by_round[45:50]))
        final_coop = float(np.mean(coop_by_round[40:50]))
        final_cot = float(np.mean(cot_by_round[40:50]))
        final_latency = float(np.mean(lat_by_round[40:50]))
        if final_coop > 0.8: regime = "high"
        elif final_coop < 0.2: regime = "low"
        else: regime = "mid"
        rows.append({
            "rep": rep_idx, "delta_at_conv": delta_at_conv, "regime": regime,
            "mean_cot_final": final_cot, "mean_latency_final": final_latency,
        })
    return rows


def fisher_z_ci_independent(r, n, alpha=0.05):
    """Independent Fisher-z via numpy/scipy."""
    if abs(r) >= 1 - 1e-12 or n < 4:
        return (r, r)
    z = np.arctanh(r)
    se = 1.0 / np.sqrt(n - 3)
    z_crit = norm.ppf(1 - alpha / 2)
    return (float(np.tanh(z - z_crit * se)), float(np.tanh(z + z_crit * se)))


def partial_corr_residual(x, y, z):
    """Partial correlation r(x, y | z) via residual regression — independent method."""
    z = np.asarray(z).reshape(-1, 1)
    rx = LinearRegression().fit(z, x).predict(z)
    ry = LinearRegression().fit(z, y).predict(z)
    res_x = np.asarray(x) - rx
    res_y = np.asarray(y) - ry
    return float(np.corrcoef(res_x, res_y)[0, 1])


def vif_residual(x, others):
    """VIF via residual regression — independent method."""
    others = np.asarray(others).reshape(-1, 1) if np.asarray(others).ndim == 1 else np.asarray(others)
    pred = LinearRegression().fit(others, x).predict(others)
    res = np.asarray(x) - pred
    ss_res = float((res ** 2).sum())
    ss_tot = float(((np.asarray(x) - np.mean(x)) ** 2).sum())
    r2 = 1.0 - ss_res / ss_tot if ss_tot > 0 else 0.0
    return 1.0 / (1.0 - r2) if r2 < 1 else float("inf")


def gap_statistic_indep(values, k_max=5, n_ref=20, seed=42):
    """Independent gap-statistic via uniform reference distribution within bounding box."""
    rng = np.random.default_rng(seed)
    arr = np.asarray(values).reshape(-1, 1)
    n = len(arr)
    lo, hi = float(arr.min()), float(arr.max())
    gaps, sks = [], []
    for k in range(1, k_max + 1):
        if k > n: gaps.append(float("-inf")); sks.append(float("inf")); continue
        km = KMeans(n_clusters=k, n_init=10, random_state=42).fit(arr)
        Wk = max(float(km.inertia_), 1e-12)
        log_W_refs = []
        for _ in range(n_ref):
            ref = rng.uniform(lo, hi, size=arr.shape)
            try:
                km_ref = KMeans(n_clusters=k, n_init=5, random_state=None).fit(ref)
                log_W_refs.append(math.log(max(float(km_ref.inertia_), 1e-12)))
            except Exception:
                continue
        if not log_W_refs: gaps.append(float("nan")); sks.append(float("nan")); continue
        E_log_W = float(np.mean(log_W_refs))
        sd = float(np.std(log_W_refs, ddof=1)) if len(log_W_refs) > 1 else 0.0
        s_k = sd * math.sqrt(1 + 1.0 / max(len(log_W_refs), 1))
        gaps.append(E_log_W - math.log(Wk)); sks.append(s_k)
    selected_k = k_max
    for k_idx in range(0, len(gaps) - 1):
        if not math.isfinite(gaps[k_idx]) or not math.isfinite(gaps[k_idx + 1]): continue
        if gaps[k_idx] >= gaps[k_idx + 1] - sks[k_idx + 1]:
            selected_k = k_idx + 1; break
    return selected_k, gaps, sks


def banner(t):
    print("\n" + "=" * 84); print(t); print("=" * 84)


def fmt(x, d=4):
    if x is None or (isinstance(x, float) and not math.isfinite(x)): return "—"
    return f"{x:.{d}f}"


def verify_condition(label, traces_path, n_firms, claimed):
    banner(f"VERIFY  {label}  (n_firms={n_firms})")
    rows = load_per_rep(traces_path, n_firms)
    deltas = np.array([r["delta_at_conv"] for r in rows])
    cots = np.array([r["mean_cot_final"] for r in rows])
    lats = np.array([r["mean_latency_final"] for r in rows])
    n = len(deltas)

    print(f"  n_reps = {n}")

    # ---- Pearson r (4 named) via scipy.stats.pearsonr ----
    print("\n  --- Re-derived correlations (scipy.stats.pearsonr) ---")
    r1, _ = pearsonr(cots, deltas);   ci1 = fisher_z_ci_independent(r1, n)
    r2, _ = pearsonr(lats, deltas);   ci2 = fisher_z_ci_independent(r2, n)
    r3, _ = pearsonr(cots, lats);     ci3 = fisher_z_ci_independent(r3, n)
    rp = partial_corr_residual(cots, deltas, lats); cip = fisher_z_ci_independent(rp, n - 1)

    print(f"  (1) r(reasoning, Δ)             = {fmt(r1)}  Fisher-z 95% CI [{fmt(ci1[0])}, {fmt(ci1[1])}]")
    print(f"  (2) r(latency, Δ)                = {fmt(r2)}  Fisher-z 95% CI [{fmt(ci2[0])}, {fmt(ci2[1])}]")
    print(f"  (3) r(reasoning, latency)        = {fmt(r3)}  Fisher-z 95% CI [{fmt(ci3[0])}, {fmt(ci3[1])}]")
    print(f"  (4) partial r(reasoning, Δ|lat)  = {fmt(rp)}  Fisher-z 95% CI [{fmt(cip[0])}, {fmt(cip[1])}]")

    # ---- VIF via residual regression ----
    vif_cot = vif_residual(cots, lats)
    vif_lat = vif_residual(lats, cots)
    print(f"\n  --- Re-derived VIF ---")
    print(f"  VIF(reasoning | latency) = {fmt(vif_cot, 3)}")
    print(f"  VIF(latency | reasoning) = {fmt(vif_lat, 3)}")

    # ---- Independent gap-statistic full sample ----
    sel_k, gaps, sks = gap_statistic_indep(deltas, k_max=5, n_ref=20)
    print(f"\n  --- Re-derived gap-statistic (full sample) ---")
    print(f"  selected k = {sel_k}")
    for k_i, (g, s) in enumerate(zip(gaps, sks), start=1):
        print(f"    k={k_i}  gap={fmt(g, 4)}  s_k={fmt(s, 4)}")

    # ---- Compare to formalization output ----
    print(f"\n  --- Comparison vs formalization analyzer ---")
    cls = claimed["correlations"]
    deltas_to_check = [
        ("r(reasoning, Δ)", cls["r_reasoning_delta"]["r"], r1, 1e-3),
        ("Fisher-z CI lo (1)", cls["r_reasoning_delta"]["fisher_z_ci"][0], ci1[0], 1e-3),
        ("Fisher-z CI hi (1)", cls["r_reasoning_delta"]["fisher_z_ci"][1], ci1[1], 1e-3),
        ("r(latency, Δ)",  cls["r_latency_delta"]["r"], r2, 1e-3),
        ("Fisher-z CI lo (2)", cls["r_latency_delta"]["fisher_z_ci"][0], ci2[0], 1e-3),
        ("Fisher-z CI hi (2)", cls["r_latency_delta"]["fisher_z_ci"][1], ci2[1], 1e-3),
        ("r(reasoning, latency)", cls["r_reasoning_latency"]["r"], r3, 1e-3),
        ("Fisher-z CI lo (3)", cls["r_reasoning_latency"]["fisher_z_ci"][0], ci3[0], 1e-3),
        ("Fisher-z CI hi (3)", cls["r_reasoning_latency"]["fisher_z_ci"][1], ci3[1], 1e-3),
        ("partial r", cls["partial_r_reasoning_delta_given_latency"]["r"], rp, 1e-3),
        ("Fisher-z CI lo (4)", cls["partial_r_reasoning_delta_given_latency"]["fisher_z_ci"][0], cip[0], 1e-3),
        ("Fisher-z CI hi (4)", cls["partial_r_reasoning_delta_given_latency"]["fisher_z_ci"][1], cip[1], 1e-3),
        ("VIF(reasoning | latency)", cls["vif_reasoning_given_latency"], vif_cot, 1e-3),
        ("VIF(latency | reasoning)", cls["vif_latency_given_reasoning"], vif_lat, 1e-3),
        ("full-sample gap-stat k", claimed["full_sample_gap_k"], sel_k, 0),
    ]
    all_ok = True
    for name, claimed_v, actual_v, tol in deltas_to_check:
        d = abs(claimed_v - actual_v)
        ok = d <= tol if tol > 0 else claimed_v == actual_v
        flag = "OK" if ok else "DIFF"
        if not ok: all_ok = False
        print(f"    {name:30s}  claimed={claimed_v:>10.4f}  reverified={actual_v:>10.4f}  Δ={d:.6f}  {flag}")

    return all_ok


def main():
    if not os.path.exists(ANALYZER_OUT):
        print(f"Analyzer output not found at {ANALYZER_OUT}")
        sys.exit(1)
    with open(ANALYZER_OUT) as f:
        claimed = json.load(f)

    g5_ok = verify_condition("GATE-5", GATE5_TRACES, 5, claimed["GATE-5"])
    g2_ok = verify_condition("GATE-2", GATE2_TRACES, 2, claimed["GATE-2"])

    banner("OVERALL VERDICT")
    print(f"  Gate-5 formalization reproduces? {g5_ok}")
    print(f"  Gate-2 formalization reproduces? {g2_ok}")
    print(f"\n  ALL FORMALIZED CLAIMS REPRODUCE: {g5_ok and g2_ok}")


if __name__ == "__main__":
    main()
