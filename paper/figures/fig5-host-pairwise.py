"""Figure 5 — Within-Host-A pairwise temporal-stability check (5 pairs across ~24h gap).

Shows slice 1 vs slice 2 regime per pair; 4/5 match (Wilson 95% CI [0.376, 0.964]).

Source: pilot/admin/team-notes/2026-04-26-host-effect-analysis.md §C.
"""
from __future__ import annotations
from pathlib import Path
import matplotlib.pyplot as plt
import numpy as np

# ── Within-Host-A pairs from §C pairing table ──
pairs = [
    {"pair": 1, "slice1_rep": 1,  "slice1_regime": "low", "slice1_delta": 0.3979,
                "slice2_rep": 11, "slice2_regime": "low", "slice2_delta": 0.4149, "match": True},
    {"pair": 2, "slice1_rep": 2,  "slice1_regime": "mid", "slice1_delta": 0.4364,
                "slice2_rep": 12, "slice2_regime": "low", "slice2_delta": 0.1502, "match": False},
    {"pair": 3, "slice1_rep": 3,  "slice1_regime": "low", "slice1_delta": 0.2097,
                "slice2_rep": 13, "slice2_regime": "low", "slice2_delta": 0.4617, "match": True},
    {"pair": 4, "slice1_rep": 4,  "slice1_regime": "low", "slice1_delta": 0.4364,
                "slice2_rep": 14, "slice2_regime": "low", "slice2_delta": 0.5626, "match": True},
    {"pair": 5, "slice1_rep": 5,  "slice1_regime": "low", "slice1_delta": 0.5121,
                "slice2_rep": 15, "slice2_regime": "low", "slice2_delta": 0.4364, "match": True},
]

n_match = sum(1 for p in pairs if p["match"])
n_total = len(pairs)
match_rate = n_match / n_total
# Wilson 95% CI for 4/5 (from team-note: [0.376, 0.964])
wilson_lo, wilson_hi = 0.376, 0.964

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(13, 6),
                                gridspec_kw={"width_ratios": [3, 1.5]})

# ── Left panel: per-pair Δ_profit slice 1 vs slice 2 ──
x_pairs = np.arange(1, n_total + 1)
slice1_deltas = [p["slice1_delta"] for p in pairs]
slice2_deltas = [p["slice2_delta"] for p in pairs]

width = 0.35
bars1 = ax1.bar(x_pairs - width/2, slice1_deltas, width,
                color="#3182ce", edgecolor="black", linewidth=0.7,
                label="Slice 1 (2026-04-24)")
bars2 = ax1.bar(x_pairs + width/2, slice2_deltas, width,
                color="#dd6b20", edgecolor="black", linewidth=0.7,
                label="Slice 2 (2026-04-25, ~24h later)")

# Annotate each pair with regime labels + match indicator
for i, p in enumerate(pairs):
    color = "green" if p["match"] else "red"
    sym = "✓" if p["match"] else "✗"
    ax1.annotate(
        f"{p['slice1_regime']}|{p['slice2_regime']} {sym}",
        xy=(x_pairs[i], max(p["slice1_delta"], p["slice2_delta"]) + 0.05),
        ha="center", va="bottom", fontsize=10, color=color, fontweight="bold",
    )

ax1.set_xticks(x_pairs)
ax1.set_xticklabels([f"Pair {i+1}\n(rep {p['slice1_rep']}↔{p['slice2_rep']})"
                     for i, p in enumerate(pairs)], fontsize=10)
ax1.set_ylabel(r"$\Delta_{\mathrm{profit}}$ at convergence", fontsize=12)
ax1.set_ylim(0, 0.8)
ax1.set_title("Within-Host-A pairwise: 4/5 regime match across ~24h gap",
              fontsize=11, pad=12)
ax1.legend(loc="upper left", frameon=True, fontsize=10)
ax1.grid(axis="y", linestyle="-", alpha=0.25)
ax1.set_axisbelow(True)

# ── Right panel: match rate with Wilson 95% CI ──
ax2.bar(["Pairwise\nmatch rate"], [match_rate],
        color="#48bb78", edgecolor="black", linewidth=0.8, width=0.45,
        yerr=[[match_rate - wilson_lo], [wilson_hi - match_rate]],
        capsize=12, error_kw={"elinewidth": 1.5, "ecolor": "black"})

ax2.axhline(0.80, color="gray", linestyle="--", linewidth=1,
            label=r"basin-PROCEED threshold ($0.80$)")
ax2.axhline(0.50, color="lightgray", linestyle=":", linewidth=1,
            label="baseline ($0.50$)")

ax2.text(0, match_rate + 0.04,
         f"{n_match}/{n_total} = {match_rate:.0%}",
         ha="center", va="bottom", fontsize=12, fontweight="bold")
ax2.text(0, wilson_lo - 0.05,
         f"Wilson 95% CI\n[{wilson_lo:.3f}, {wilson_hi:.3f}]",
         ha="center", va="top", fontsize=9, color="dimgray")

ax2.set_ylim(0, 1.05)
ax2.set_ylabel("Match rate", fontsize=12)
ax2.set_title("Match rate vs thresholds", fontsize=11, pad=12)
ax2.legend(loc="lower center", frameon=True, fontsize=9)
ax2.grid(axis="y", linestyle="-", alpha=0.25)
ax2.set_axisbelow(True)

plt.tight_layout()

out = Path(__file__).parent / "fig5-host-pairwise.pdf"
plt.savefig(out, bbox_inches="tight")
print(f"wrote {out}")
