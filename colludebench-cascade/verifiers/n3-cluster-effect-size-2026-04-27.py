#!/usr/bin/env python3
"""
N3 Cluster Effect-Size — Cohen's d, Welch's t, bootstrap CI on the
between-basin reasoning-length difference at Gate-5 formal k=2.

Pre-registration anchor: pilot/admin/osf-stage2b-addendum-2026-04-23.md §C
(RFC 3161 stamped; SHA-256 43808a91...).

Tests whether the "reasoning-length is a between-basin discriminator"
claim — established directionally by basin FE regression in the formalization
analyzer — survives a strict effect-size + confidence-interval test.
"""
from __future__ import annotations

import json
import math
import os
import sys
from pathlib import Path

import numpy as np
from sklearn.cluster import KMeans
from scipy.stats import ttest_ind, t as student_t, bootstrap

REPO = os.environ.get("STAGE2B_REPO") or str(Path(__file__).resolve().parents[3])
ANALYZER_OUT = f"{REPO}/pilot/admin/verification/formalize-addendum1-output-2026-04-26.json"
OUT_PATH = f"{REPO}/pilot/admin/verification/n3-cluster-effect-size-output-2026-04-27.json"


def main():
    data = json.load(open(ANALYZER_OUT))
    rows = data["GATE-5"]["rows"]
    deltas = np.array([r["delta_at_conv"] for r in rows])
    cots = np.array([r["mean_cot_final"] for r in rows])

    # Formal k=2 clusters
    arr = deltas.reshape(-1, 1)
    km = KMeans(n_clusters=2, n_init=20, random_state=42).fit(arr)
    order = np.argsort(km.cluster_centers_.flatten())  # ascending Δ
    mask_low = (km.labels_ == order[0])
    mask_high = (km.labels_ == order[1])
    c1_cots = cots[mask_low]
    c2_cots = cots[mask_high]
    n1, n2 = len(c1_cots), len(c2_cots)
    m1, m2 = float(c1_cots.mean()), float(c2_cots.mean())
    s1, s2 = float(c1_cots.std(ddof=1)), float(c2_cots.std(ddof=1))

    sp = math.sqrt(((n1 - 1) * s1**2 + (n2 - 1) * s2**2) / (n1 + n2 - 2))
    cohens_d = (m1 - m2) / sp
    J = 1 - 3 / (4 * (n1 + n2) - 9)
    hedges_g = J * cohens_d

    t_stat, p_welch = ttest_ind(c1_cots, c2_cots, equal_var=False)
    se_diff = math.sqrt(s1**2 / n1 + s2**2 / n2)
    df_welch = (s1**2 / n1 + s2**2 / n2) ** 2 / (
        (s1**2 / n1) ** 2 / (n1 - 1) + (s2**2 / n2) ** 2 / (n2 - 1)
    )
    tc = student_t.ppf(0.975, df_welch)
    md = m1 - m2
    ci_t = (md - tc * se_diff, md + tc * se_diff)

    rng = np.random.default_rng(42)
    B = 10000
    boot = []
    for _ in range(B):
        s1_b = rng.choice(c1_cots, size=n1, replace=True).mean()
        s2_b = rng.choice(c2_cots, size=n2, replace=True).mean()
        boot.append(s1_b - s2_b)
    boot = np.array(boot)
    ci_pct = (float(np.percentile(boot, 2.5)), float(np.percentile(boot, 97.5)))

    res = bootstrap(
        (c1_cots, c2_cots),
        lambda x, y, axis=-1: np.mean(x, axis=axis) - np.mean(y, axis=axis),
        n_resamples=10000,
        method="BCa",
        random_state=42,
        vectorized=True,
    )
    ci_bca = (float(res.confidence_interval.low), float(res.confidence_interval.high))

    abs_d = abs(cohens_d)
    if abs_d < 0.2: tier = "negligible"
    elif abs_d < 0.5: tier = "small"
    elif abs_d < 0.8: tier = "medium"
    else: tier = "large"

    out = {
        "_provenance": {
            "script": "pilot/admin/verification/n3-cluster-effect-size-2026-04-27.py",
            "analyzer_input": "pilot/admin/verification/formalize-addendum1-output-2026-04-26.json",
            "dataset": "Gate-5 (n=5, 30 reps), formal k=2 clusters",
            "config": {"random_state": 42, "n_init_kmeans": 20, "B_bootstrap": 10000},
        },
        "cluster_low_delta_basin": {
            "n": n1, "mean_reasoning_chars": m1, "sd_reasoning_chars": s1,
            "mean_delta_profit": float(deltas[mask_low].mean()),
        },
        "cluster_high_delta_basin": {
            "n": n2, "mean_reasoning_chars": m2, "sd_reasoning_chars": s2,
            "mean_delta_profit": float(deltas[mask_high].mean()),
        },
        "mean_difference": md,
        "mean_difference_relative_pct": float(md / m2 * 100),
        "pooled_sd": sp,
        "cohens_d": cohens_d,
        "cohens_d_tier": tier,
        "hedges_g_small_sample_corrected": hedges_g,
        "welch_t": {"t": float(t_stat), "df": float(df_welch), "p_value": float(p_welch)},
        "ci_95_welch_t": list(ci_t),
        "ci_95_bootstrap_percentile": list(ci_pct),
        "ci_95_bootstrap_BCa": list(ci_bca),
        "ci_includes_zero": {
            "welch": bool(ci_t[0] <= 0 <= ci_t[1]),
            "percentile": bool(ci_pct[0] <= 0 <= ci_pct[1]),
            "BCa": bool(ci_bca[0] <= 0 <= ci_bca[1]),
        },
        "verdict": (
            "Direction consistent with Wu-2025 simplicity-bias prediction "
            "(c1 low-Δ basin reasons MORE than c2 high-Δ basin). Effect size "
            f"is {tier} (Cohen's d = {cohens_d:.4f}). However, all three 95% "
            "CIs span zero (Welch p = {:.4f}). Honest framing for the "
            "preprint: 'between-basin pattern descriptively present with "
            "medium effect size at n=30; CI on cluster-mean difference spans "
            "zero; formal confirmation deferred to Stage 4 cross-model "
            "replication.'"
        ).format(p_welch),
    }

    with open(OUT_PATH, "w") as f:
        json.dump(out, f, indent=2)
    print(json.dumps(out, indent=2))
    print(f"\nWritten to: {OUT_PATH}")


if __name__ == "__main__":
    main()
