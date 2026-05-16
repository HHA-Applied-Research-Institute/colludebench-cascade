# Compute Strategy — Schmidt Sciences Trustworthy AI 2026

**Total compute-related budget:** $50,000 over 36 months (1.1% of $4,356,500 total) for storage and operational infrastructure + $175,000 API credits (4.0%) for frontier-model validation = $225,000 (5.2%) cash. The compute capacity itself — 8×H100 dedicated cluster + burst capacity for 256-agent peak periods — is requested via Schmidt Sciences' "Access to Resources" in-kind channel rather than as cash budget.

## Strategic frame

Schmidt's RFP explicitly invites applicants to request either compute funding or in-kind access to Schmidt's GPU/CPU resources ("Access to Resources" section). Schmidt's compute infrastructure is purpose-built for grantee research at frontier-AI scale. Requesting compute in-kind rather than as cash:

1. **Matches the work to the right resource.** Schmidt's compute is sized for 256-agent factorial experiments at frontier-AI scale; commercial cloud equivalents would be cost-equivalent at best, less integrated at worst.
2. **Reduces the cash envelope to $4,356,500** — comfortably below the named Tier-2 ceiling — signaling cost-efficient resource matching rather than maximum-envelope-claiming.
3. **Preserves evaluator independence.** Schmidt-provided compute carries no model-provider entanglement; CAIS, Lambda, and CoreWeave are model-agnostic.

## Stage 2b actuals (calibration anchor)

The Stage 2b pilot ran 45 repetitions × 50 rounds × 2–5 agents per round across two conditions (GATE-5 n=5 r=30; GATE-2 n=2 r=15). Per-experiment costs from logged traces:

- **Per-round per-agent inference cost** (Claude Haiku 4.5, fast tier): $0.0008–$0.0015 per agent per round at ~2,500-token chain-of-thought + ~10-token price commitment
- **Per-repetition cost (50 rounds)** at GATE-5 (n=5): $0.20–$0.38
- **Per-repetition cost (50 rounds)** at GATE-2 (n=2): $0.08–$0.15
- **Stage 2b total**: $20–$40 across 45 repetitions

These actuals anchor the Stage 3 projection.

## Stage 3 projection (n_rep ≥ 30, horizon 100 rounds)

Stage 3 doubles the horizon and ~doubles the per-condition repetition count, then extends to four agent counts (n ∈ {2, 3, 4, 5}) for the SR-M-8 monotonicity falsifier. Plus the cross-failure-mode interaction matrix (3 conditions × 4 sub-aims × 30 reps × 100 rounds × 4 agent counts).

**Compute capacity required (requested via Schmidt in-kind channel):**

| Resource | Specification | Source |
|----------|--------------|--------|
| 8×H100 80GB dedicated allocation | 36 months continuous | Schmidt Access to Resources |
| Burst H100 capacity (256-agent peak) | ~30% utilization × 8–16 GPU × 36 mo | Schmidt Access to Resources |
| 30–40 TB NVMe + S3 archive | Storage + transfer | Cash budget ($50K) |
| Networking + orchestration overhead | CI/CD, monitoring, replay | Bundled with Schmidt allocation where possible; otherwise cash |

**Frontier API validation** (cash: $175,000): replication of Stage 3 findings against Claude Opus 4.6, Claude Sonnet 4.6, GPT-5.5, Gemini 3 Pro.

| Item | Quantity | Unit cost | Total |
|------|----------|-----------|-------|
| API credits — Anthropic / OpenAI / Google | ~600 validation runs × ~$275/run | — | $165,000 |
| Buffer (price fluctuations, retries) | — | — | $10,000 |
| **API subtotal** | | | **$175,000** |

Per-validation-run cost = 256 agents × 100 rounds × 2,500 tokens × blended ($2.00 input + $12.00 output per million) = ~$275. API prices have fallen 60–80% year-over-year across all major providers; 2026 rates are conservative.

## Cash compute line ($50,000 — 1.1% of envelope)

The $50,000 cash compute line covers storage, transfer, and operational infrastructure that is typically not bundled into in-kind GPU allocations:

| Item | Total |
|------|-------|
| 30–40 TB NVMe (active) + S3 archive (cold) over 36 months | ~$30,000 |
| Data transfer / egress between Schmidt compute and analysis environments | ~$10,000 |
| Orchestration VMs, monitoring (Grafana/Prometheus), CI/CD | ~$10,000 |
| **Cash compute subtotal** | **$50,000** |

## Fallback if Schmidt in-kind compute declines

If Schmidt declines the in-kind compute request, two paths preserve program viability:

**Path A — post-award CAIS Compute Cluster access.** The Center for AI Safety operates a research compute cluster with H100 capacity. Upon award, we apply for CAIS supplementary access through the standard CAIS allocation process; no pre-submission outreach has been made and no LOI is attached.

**Path B — Reactivate cash-compute budget at Y1 reallocation.** If both Schmidt in-kind and post-award CAIS access are unavailable, the 8×H100 dedicated cluster + burst compute can be reactivated as a cash line at the rates documented in the prior compute-strategy state ($420,480 reserved + $135,520 burst = $556,000), reallocated from contingency or by reducing scope to two highest-signal experimental tracks. This is documented as a contingency plan rather than a primary path; resource matching to Schmidt's infrastructure is the preferred and submitted plan.

## Compute footprint (responsible-research)

Estimated environmental footprint: ~15.8 metric tons CO₂e over 24 months — modest against the 300–500 tons required to train one large model. Mitigations: renewable-energy cloud providers (Schmidt's compute infrastructure or CAIS-equivalent) with carbon-intensity-weighted procurement; INT4/MXFP4 quantized inference (~40% energy reduction); focused 90-cell factorial design (>99.98% reduction from naive); Gold Standard / Verra-certified offsets at 120% of estimated emissions. See `12-responsible-research.md`.

## Risk register

| Risk | Mitigation |
|------|-----------|
| Schmidt in-kind compute path declined | Path A (post-award CAIS supplementary access; no pre-submission outreach); Path B (reactivate cash compute, $556K reallocation from contingency or scope reduction) |
| API price changes | Year-over-year prices have fallen 60–80%; conservative 2026 budget leaves headroom; $10K buffer for fluctuations |
| Cross-model validation spend exceeds projection | $10K buffer; specification-curve analysis on subset of conditions if needed; extend Year 3 API credits via internal reallocation |
| Storage growth exceeds 40 TB | Compress archived experiment traces; tier active vs cold storage; reduce raw-trace retention to 12 months for Class B/C tracks |
