#!/usr/bin/env python3
"""
N2 Robustness — 100-resample × multi-seed bootstrap k-selection.

Pre-registration anchor: pilot/admin/osf-stage2b-addendum-2026-04-23.md §A
(RFC 3161 stamped 2026-04-23 13:51:08 UTC; SHA-256 43808a91...)

Locked Addendum #1 §A procedure uses 10 resamples × 20% drop, ≥7/10 recovery
threshold. This supplementary check elevates to 100 resamples × 10 seeds = 1000
total resamples per dataset to test whether the 7/10 result reflects a stable
signal or a knife-edge fluke. Threshold equivalence: 70/100 (same proportion).

Output JSON written alongside this script; results are deterministic by seed.
"""
from __future__ import annotations

import json
import math
import os
import sys
from collections import Counter, defaultdict
from pathlib import Path

import numpy as np
from sklearn.cluster import KMeans
from sklearn.mixture import GaussianMixture

REPO = os.environ.get("STAGE2B_REPO") or str(Path(__file__).resolve().parents[3])
GATE5_TRACES = f"{REPO}/pilot/results/stage2b-gate-2026-04-15/EXP-GATE-5-2b/traces.jsonl"
GATE2_TRACES = f"{REPO}/pilot/results/stage2b-gate-merged-2026-04-25/EXP-GATE-2-2b/traces.jsonl"

A, A0, MU, COST, BETA = 2.0, 0.0, 0.25, 1.0, 100.0
SEEDS = [42, 1, 2, 3, 7, 13, 100, 1729, 31337, 999]
N_RESAMPLES = 100
DROP_FRAC = 0.20
K_MAX = 5
N_REF_GAP = 20


def market_outcome(prices, n_firms):
    firm_exps = np.array([math.exp((A - p) / MU) for p in prices])
    outside_exp = math.exp(A0 / MU)
    denom = firm_exps.sum() + outside_exp
    shares = firm_exps / denom
    demands = BETA * shares
    return (np.array(prices) - COST) * demands


def solve(n_firms, what, tol=1e-10):
    def f(p):
        firm_exp = math.exp((A - p) / MU)
        outside_exp = math.exp(A0 / MU)
        if what == "nash":
            share = firm_exp / (n_firms * firm_exp + outside_exp)
            return p - COST - MU / (1 - share)
        else:
            outside_share = outside_exp / (n_firms * firm_exp + outside_exp)
            return p - COST - MU / outside_share
    lo, hi = COST + 1e-6, 2 * A + 5
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


def parse_action(a, nash):
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


def detect_convergence(mp):
    for t in range(5, len(mp)):
        ok = True
        for k in range(t - 4, t + 1):
            prev = mp[k - 1]
            if prev == 0:
                ok = False
                break
            if abs(mp[k] - prev) / prev >= 0.01:
                ok = False
                break
        if ok:
            return t + 1
    return None


def load_deltas(path, n_firms):
    nash = solve(n_firms, "nash")
    mono = solve(n_firms, "mono")
    pi_nash = float(np.mean(market_outcome([nash] * n_firms, n_firms)))
    pi_mono = float(np.mean(market_outcome([mono] * n_firms, n_firms)))
    denom = pi_mono - pi_nash if pi_mono != pi_nash else 1.0
    by_rep = defaultdict(lambda: defaultdict(list))
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            t = json.loads(line)
            by_rep[t["repetition"]][t["round"]].append(t)
    deltas = []
    for rep_idx in sorted(by_rep.keys()):
        rounds = by_rep[rep_idx]
        mp, db = [], []
        for r in sorted(rounds.keys()):
            agents = rounds[r]
            prices = [parse_action(a.get("parsed_action"), nash) for a in agents]
            mp.append(float(np.mean(prices)))
            outcome = market_outcome(prices, n_firms)
            db.append(float((np.mean(outcome) - pi_nash) / denom))
        conv = detect_convergence(mp)
        if conv is not None:
            idx = conv - 1
            deltas.append(float(np.mean(db[idx - 4: idx + 1])))
        else:
            deltas.append(float(np.mean(db[45:50])))
    return np.array(deltas)


def gap_select(arr_1d, k_max=5, n_ref=20, rng=None):
    if rng is None:
        rng = np.random.default_rng(42)
    arr = arr_1d.reshape(-1, 1)
    n = len(arr)
    lo, hi = float(arr.min()), float(arr.max())
    gaps, sks = [], []
    for k in range(1, k_max + 1):
        if k > n:
            gaps.append(float("-inf"))
            sks.append(float("inf"))
            continue
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
        if not log_W_refs:
            gaps.append(float("nan"))
            sks.append(float("nan"))
            continue
        E = float(np.mean(log_W_refs))
        sd = float(np.std(log_W_refs, ddof=1)) if len(log_W_refs) > 1 else 0.0
        sks.append(sd * math.sqrt(1 + 1.0 / max(len(log_W_refs), 1)))
        gaps.append(E - math.log(Wk))
    sel = k_max
    for i in range(len(gaps) - 1):
        if not math.isfinite(gaps[i]) or not math.isfinite(gaps[i + 1]):
            continue
        if gaps[i] >= gaps[i + 1] - sks[i + 1]:
            sel = i + 1
            break
    return sel


def bic_select(arr_1d, k_max=5):
    arr = arr_1d.reshape(-1, 1)
    bics = []
    for k in range(1, k_max + 1):
        if k > len(arr):
            bics.append(float("inf"))
            continue
        try:
            gmm = GaussianMixture(n_components=k, random_state=42, n_init=5, reg_covar=1e-6).fit(arr)
            bics.append(float(gmm.bic(arr)))
        except Exception:
            bics.append(float("inf"))
    return int(np.argmin(bics)) + 1


def bootstrap_k(deltas, n_resamples, drop_frac, seed, k_max=5):
    rng = np.random.default_rng(seed)
    n = len(deltas)
    drop_count = int(round(n * drop_frac))
    keep_count = n - drop_count
    gap_sel, bic_sel = [], []
    for _ in range(n_resamples):
        keep_idx = rng.choice(n, size=keep_count, replace=False)
        sub = deltas[keep_idx]
        gap_sel.append(gap_select(sub, k_max=k_max, rng=rng))
        bic_sel.append(bic_select(sub, k_max=k_max))
    return gap_sel, bic_sel


def run_for_dataset(label, deltas):
    out = {"label": label, "n": len(deltas), "seeds": SEEDS, "per_seed": []}
    for s in SEEDS:
        gap_sel, bic_sel = bootstrap_k(deltas, N_RESAMPLES, DROP_FRAC, s, K_MAX)
        gc = Counter(gap_sel)
        bc = Counter(bic_sel)
        winner = max(gc, key=lambda k: gc[k]) if gc else None
        winner_pct = gc[winner] / N_RESAMPLES if winner is not None else 0.0
        passes_70 = winner_pct >= 0.70
        out["per_seed"].append({
            "seed": s,
            "gap_counts": {str(k): int(gc.get(k, 0)) for k in range(1, K_MAX + 1)},
            "bic_counts": {str(k): int(bc.get(k, 0)) for k in range(1, K_MAX + 1)},
            "gap_modal_winner": int(winner) if winner is not None else None,
            "gap_modal_pct": float(winner_pct),
            "passes_70_threshold": bool(passes_70),
        })
    # Aggregated
    agg = Counter()
    total = 0
    for s in out["per_seed"]:
        for k, v in s["gap_counts"].items():
            agg[int(k)] += v
            total += v
    out["aggregated"] = {
        "total_resamples": int(total),
        "counts": {str(k): int(agg.get(k, 0)) for k in range(1, K_MAX + 1)},
        "winner": int(max(agg, key=lambda k: agg[k])),
        "winner_pct": float(max(agg.values()) / total) if total else 0.0,
        "passes_70_threshold": bool((max(agg.values()) / total if total else 0) >= 0.70),
    }
    out["seeds_passing_70_threshold"] = sum(1 for s in out["per_seed"] if s["passes_70_threshold"])
    return out


def main():
    print(f"N2 Robustness check — {N_RESAMPLES} resamples × {len(SEEDS)} seeds")
    print(f"Repo: {REPO}\n")

    g5 = load_deltas(GATE5_TRACES, 5)
    g2 = load_deltas(GATE2_TRACES, 2)
    print(f"Loaded Gate-5 n={len(g5)};  Gate-2 n={len(g2)}\n")

    print("Computing Gate-5 (this takes several minutes)...")
    g5_out = run_for_dataset("GATE-5 (n=5, 30 reps)", g5)
    print(f"  Aggregated: {g5_out['aggregated']}\n")

    print("Computing Gate-2 (this takes several minutes)...")
    g2_out = run_for_dataset("GATE-2 (n=2, 15 reps)", g2)
    print(f"  Aggregated: {g2_out['aggregated']}\n")

    out_path = f"{REPO}/pilot/admin/verification/n2-robustness-output-2026-04-27.json"
    with open(out_path, "w") as f:
        json.dump({"GATE-5": g5_out, "GATE-2": g2_out, "config": {
            "n_resamples": N_RESAMPLES, "drop_frac": DROP_FRAC,
            "seeds": SEEDS, "k_max": K_MAX, "n_ref_gap": N_REF_GAP,
        }}, f, indent=2)
    print(f"Output written to: {out_path}")


if __name__ == "__main__":
    main()
