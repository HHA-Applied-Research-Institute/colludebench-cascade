# Model Provenance Documentation

**Date:** April 9, 2026
**Purpose:** Document which AI models generated which experimental traces, for scientific reproducibility.

---

## Summary

Not all trace files include explicit `model` and `provider` fields in the JSONL metadata. This document serves as the canonical reference for model provenance across all three researchers' data.

## Per-Researcher Provenance

### Hass Dhia

| Data | Model | Provider | Evidence | Provenance in Traces |
|------|-------|----------|----------|---------------------|
| Phase 1 pilot (Mar 25) | Claude Haiku (claude-haiku-4-5-20251001) | Anthropic (via `claude --print`) | Inference.ts source: `level: "fast"` maps to Haiku | `tier=fast` only — no explicit model field |
| Deception ladder (Mar 25-26) | Claude Haiku | Anthropic (via `claude --print`) | Same Inference.ts | `tier=fast` only |
| Category A spot tests (Apr 2) | Claude Haiku | Anthropic (via `claude --print`) | Same Inference.ts | `tier=fast` only |
| E-series spot tests (Apr 2) | Claude Haiku | Anthropic (via `claude --print`) | Same Inference.ts | `tier=fast` only |

**Confirmation:** All Hass data was generated through the inference adapter at `colludebench-cascade/runner/_inference.ts`, which calls `claude --print --model claude-haiku-4-5-20251001` for the `fast` tier.

### Haedar Hadi (replication track)

| Data | Model | Provider | Evidence | Provenance in Traces |
|------|-------|----------|----------|---------------------|
| Haiku replication (39 experiments, n=50-100) | Claude Haiku (claude-haiku-4-5-20251001) | Anthropic API (direct) | round-executor.ts source code on branch | `tier=fast` only — no explicit model field |
| Sonnet escalation (7 experiments) | Claude Sonnet (claude-sonnet-4-5-20251001) | Anthropic API | Separate results directory `sonnet-escalation-*` | `tier=fast` only — model inferred from directory name |
| Sonnet deception ladder (n=30, Mar 26) | Claude Sonnet | Anthropic API | run-sonnet-deception.ts source | Documented in EXPERIMENT-OVERVIEW-2026-03-26.md |

**Confirmation:** Haedar's replication runner uses the Anthropic API directly (not `claude --print`). The replication Inference layer maps `fast` to `claude-haiku-4-5-20251001` and `standard` to `claude-sonnet-4-5-20251001`. All replication data is Haiku. Sonnet data is in separate Sonnet-escalation outputs.

### Ahmed Dhia (portal-verification track)

| Data | Model | Provider | Evidence | Provenance in Traces |
|------|-------|----------|----------|---------------------|
| Category E (7 experiments, Apr 3) | Claude Haiku | Anthropic API | Inference.ts source, pre-multi-provider | No model field (pre-fix) |
| Category A (9 experiments, Apr 4) | Claude Haiku | Anthropic API | Same | No model field (pre-fix) |
| Category B — Claude runs (Apr 5-6) | Claude Haiku | Anthropic API | ACTIVE_MODEL export in Inference.ts | `model=claude-haiku-4-5-20251001`, `provider=anthropic` (post-fix) |
| Category B — Ollama runs (Apr 5) | Llama 3.1 8B | Ollama (local GPU) | Text message: "Using ollama now with my gpu" | Stopped at rep 8/10, patches created to identify |
| Category B — Groq runs (if any) | Llama 3.1 8B Instant | Groq API (free tier) | Inference.ts GROQ_MODELS config | To be confirmed — may not have been used |

**Confirmation:** Ahmed's Inference layer exports `ACTIVE_PROVIDER` and `ACTIVE_MODEL` constants resolved at module load time from the `INFERENCE_PROVIDER` env var. Newer runs (post Apr 5) include `model` and `provider` fields in traces. Earlier runs do not. Ahmed confirmed via text that Ollama B1 data was stopped at rep 8/10 due to quality difference and re-run with Claude.

## Cross-Model Data Separation

| Model | Researcher(s) | Experiments | Provenance Method |
|-------|--------------|-------------|-------------------|
| Claude Haiku | All three | A1-A9, B1-B7, C1-C6, D1-D3, E1-E7, F1-F4, G1-G2, H1 | Source code confirmation + `tier=fast` field |
| Claude Sonnet | Haedar | A1, A2, B1, B3, D1, E6, F1 (escalation) + deception ladder | Separate directory names (`sonnet-escalation-*`) |
| Llama 3.1 8B (Ollama) | Ahmed | B1 partial (reps 1-8, stopped) | Text message confirmation, patches created |

## Recommendation

For future runs, ALL traces must include `model` and `provider` fields in every JSONL line. Ahmed's Inference.ts already implements this via `ACTIVE_PROVIDER` and `ACTIVE_MODEL` exports. Haedar and Hass should adopt the same pattern.
