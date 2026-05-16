"""Figure 3 — Mean price trajectories per round for GATE-5 vs GATE-2.

Shows GATE-5 settling below cooperation midpoint by ~round 12,
GATE-2 oscillating near midpoint through round 50.
Reference lines: cooperation midpoints, Nash and Monopoly benchmarks.

Source: pilot/admin/team-notes/2026-04-26-stage2b-analysis-with-basin.md §Step 2 (price tables r1-50).
"""
from __future__ import annotations
from pathlib import Path
import matplotlib.pyplot as plt
import numpy as np

# ── GATE-5 mean price trajectory (averaged across 30 reps), from team-note §Step 2 ──
gate5_prices = [
    2.126, 1.980, 1.858, 1.811, 1.777,
    1.743, 1.723, 1.700, 1.682, 1.668,
    1.663, 1.651, 1.646, 1.636, 1.635,
    1.631, 1.627, 1.623, 1.622, 1.620,
    1.620, 1.620, 1.621, 1.619, 1.618,
    1.619, 1.617, 1.616, 1.616, 1.617,
    1.616, 1.616, 1.616, 1.616, 1.615,
    1.613, 1.612, 1.611, 1.610, 1.610,
    1.608, 1.606, 1.605, 1.605, 1.606,
    1.605, 1.605, 1.604, 1.598, 1.558,
]

# ── GATE-2 mean price trajectory (averaged across 15 reps) ──
gate2_prices = [
    2.073, 2.002, 1.926, 1.806, 1.784,
    1.765, 1.743, 1.717, 1.710, 1.701,
    1.722, 1.710, 1.685, 1.681, 1.686,
    1.704, 1.691, 1.670, 1.667, 1.687,
    1.675, 1.670, 1.664, 1.659, 1.659,
    1.659, 1.685, 1.641, 1.627, 1.649,
    1.637, 1.640, 1.625, 1.630, 1.630,
    1.617, 1.624, 1.625, 1.624, 1.614,
    1.635, 1.640, 1.633, 1.625, 1.627,
    1.611, 1.619, 1.619, 1.630, 1.606,
]

rounds = np.arange(1, 51)

# Calvano benchmarks per Methods §3.2
nash_n5, mono_n5, mid_n5 = 1.3115, 2.0972, 1.7044
nash_n2, mono_n2, mid_n2 = 1.4729, 1.9250, 1.6990

fig, ax = plt.subplots(figsize=(11, 6))

# Trajectories
ax.plot(rounds, gate5_prices, color="#2b6cb0", linewidth=2.0,
        marker="o", markersize=4, label="GATE-5 mean price (n=5, 30 reps)")
ax.plot(rounds, gate2_prices, color="#c05621", linewidth=2.0,
        marker="s", markersize=4, label="GATE-2 mean price (n=2, 15 reps)")

# Reference lines (cooperation midpoints + benchmarks)
ax.axhline(mid_n5, color="#2b6cb0", linestyle="--", linewidth=1, alpha=0.5,
           label=fr"$p_{{\mathrm{{mid}}}}^{{n=5}} = {mid_n5}$")
ax.axhline(mid_n2, color="#c05621", linestyle="--", linewidth=1, alpha=0.5,
           label=fr"$p_{{\mathrm{{mid}}}}^{{n=2}} = {mid_n2}$")
ax.axhline(nash_n5, color="gray", linestyle=":", linewidth=0.8, alpha=0.6)
ax.axhline(mono_n5, color="gray", linestyle=":", linewidth=0.8, alpha=0.6)

# Annotate Nash + Monopoly bounds inline
ax.text(50.5, nash_n5, " Nash$_{n=5}$", va="center", fontsize=9, color="gray")
ax.text(50.5, mono_n5, " Mono$_{n=5}$", va="center", fontsize=9, color="gray")

# Convergence annotation for GATE-5
ax.axvline(12, color="#2b6cb0", linestyle=":", linewidth=0.8, alpha=0.5)
ax.annotate(
    "GATE-5 median\nfirst convergence: r12",
    xy=(12, 1.700), xytext=(18, 1.85),
    fontsize=10, color="#2b6cb0",
    arrowprops=dict(arrowstyle="->", color="#2b6cb0", lw=0.8),
)

ax.set_xlabel("Round", fontsize=12)
ax.set_ylabel("Mean price (across reps)", fontsize=12)
ax.set_xlim(0.5, 51.5)
ax.set_ylim(1.40, 2.20)
ax.set_title(
    "GATE-5 settles below cooperation midpoint by ~r12; GATE-2 oscillates near midpoint through r50",
    fontsize=12, pad=15,
)

# Legend OUTSIDE plot
ax.legend(loc="center left", bbox_to_anchor=(1.01, 0.5), frameon=True, fontsize=10)

ax.grid(linestyle="-", alpha=0.25)
ax.set_axisbelow(True)
plt.tight_layout()
plt.subplots_adjust(right=0.78)

out = Path(__file__).parent / "fig3-convergence-trajectories.pdf"
plt.savefig(out, bbox_inches="tight")
print(f"wrote {out}")
