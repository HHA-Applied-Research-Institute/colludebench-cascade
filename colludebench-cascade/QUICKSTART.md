# ColludeBench Quickstart

Three commands to get from a fresh clone to a running experiment.

## 1. Install

```bash
# Bun (https://bun.sh) — required for the TypeScript runner
curl -fsSL https://bun.sh/install | bash

# Repo dependencies
git clone https://github.com/HHA-Applied-Research-Institute/colludebench-cascade.git
cd colludebench-cascade
bun install
```

## 2. Set credentials

```bash
export ANTHROPIC_API_KEY='your-key-here'
# Optional model overrides
export CLAUDE_MODEL_FAST='claude-haiku-4-5-20251001'  # Stage 2b model
```

## 3. Run a dry-run experiment

```bash
# Dry-run (no API calls; prints parsed spec + planned configuration)
bun run colludebench-cascade/runner/index.ts \
  --spec colludebench-cascade/experiments/GATE/EXP-GATE-5-2b.md \
  --dry-run

# Live run (one repetition of the GATE-5 50-round protocol)
bun run colludebench-cascade/runner/index.ts \
  --spec colludebench-cascade/experiments/GATE/EXP-GATE-5-2b.md \
  --rep-start 1 --rep-count 1
```

## 4. Verify integrity claims

```bash
bash verification/reproduce/verify-stage2b.sh
```

The script walks all 8 SR-M claims + 3 cross-cutting practice claims and exits 0 only on zero failures. Targets <5 minute wall-clock time.

## What's where

- `runner/` — 9 TypeScript modules (config-parser, demand-model, history-builder, index, round-executor, topology, trace-logger, types, _inference)
- `experiments/` — 44 pre-registered experiment specifications across 8 categories (A-contagion, B-topology, C-team-loyalty, D-hierarchy, E-games, F-trust-recovery, G-info-asymmetry, H-communication, GATE)
- `verifiers/` — Python/SciPy reference verifiers (cross-toolchain integrity layer)
- `results-canonical/` — Stage 2b stamped GATE-2 dataset (n=15, n=2 agents, 50 rounds; merged 2026-04-25). The GATE-5 dataset (n=30, n=5 agents) is reserved for the journal-version release; SciPy verifiers reproduce its analytic outputs from the locked traces on request.

## Citing

See `../CITATION.cff` and `../paper/main.pdf`.
