"""Figure 2 — Δ_profit at convergence per condition with 95% CIs and convergence-rate annotation.

Encodes anti-overlap rules from AppliedResearch matplotlib template:
  - figsize floor (10, 6)
  - legend anchored OUTSIDE plot area when present
  - tight_layout + manual subplot_adjust
"""
from __future__ import annotations
from pathlib import Path
import matplotlib.pyplot as plt
import numpy as np

# ── Data from team-notes/2026-04-26-stage2b-analysis-with-basin.md §Summary ──
conditions = ["GATE-5\n(n=5, 30 reps)", "GATE-2\n(n=2, 15 reps)"]
delta_means = [0.4932, 0.4522]
delta_lo = [0.3494, 0.3873]
delta_hi = [0.6369, 0.5172]
err_low = [m - lo for m, lo in zip(delta_means, delta_lo)]
err_high = [hi - m for m, hi in zip(delta_means, delta_hi)]
converged = ["30/30 (100%)", "1/15 (6.7%)"]
stage3 = ["PROCEED", "HALT"]

# ── Plot ──
fig, ax = plt.subplots(figsize=(10, 6))
x = np.arange(len(conditions))
bar_colors = ["#2b6cb0", "#c05621"]

bars = ax.bar(
    x, delta_means,
    yerr=[err_low, err_high],
    color=bar_colors, edgecolor="black", linewidth=0.8,
    capsize=8, width=0.55,
    error_kw={"elinewidth": 1.5, "ecolor": "black"},
)

# Reference lines
ax.axhline(0.0, color="gray", linestyle=":", linewidth=1, label="Nash benchmark (Δ=0)")
ax.axhline(1.0, color="gray", linestyle="--", linewidth=1, label="Monopoly limit (Δ=1)")
ax.axhline(0.5, color="lightgray", linestyle="-", linewidth=0.6, alpha=0.6)

# Annotations: convergence + Stage 3 verdict above each bar
for i, (bar, m, c, s) in enumerate(zip(bars, delta_means, converged, stage3)):
    ax.annotate(
        f"converged: {c}\nStage 3: {s}",
        xy=(bar.get_x() + bar.get_width() / 2, delta_hi[i] + 0.05),
        ha="center", va="bottom", fontsize=10,
        bbox=dict(boxstyle="round,pad=0.3", fc="white", ec="gray", lw=0.8),
    )

# Numeric labels inside bars
for i, (bar, m) in enumerate(zip(bars, delta_means)):
    ax.text(
        bar.get_x() + bar.get_width() / 2, m / 2,
        f"Δ = {m:.4f}", ha="center", va="center",
        fontsize=11, color="white", fontweight="bold",
    )

ax.set_xticks(x)
ax.set_xticklabels(conditions, fontsize=11)
ax.set_ylabel(r"$\Delta_{\mathrm{profit}}$ at convergence (95% CI)", fontsize=12)
ax.set_ylim(-0.05, 1.05)
ax.set_title(
    "Δ_profit comparable across n=5 and n=2; convergence rate diverges sharply",
    fontsize=12, pad=15,
)

# Legend OUTSIDE plot area (right side)
ax.legend(loc="center left", bbox_to_anchor=(1.01, 0.5), frameon=True, fontsize=10)

ax.grid(axis="y", linestyle="-", alpha=0.25)
ax.set_axisbelow(True)
plt.tight_layout()
plt.subplots_adjust(right=0.78)

out = Path(__file__).parent / "fig2-delta-profit.pdf"
plt.savefig(out, bbox_inches="tight")
print(f"wrote {out}")
