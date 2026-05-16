# ColludeBench

> A pre-registered, RFC 3161-timestamped, cross-toolchain-verified, adversarially-Council-reviewed benchmark for measuring multi-agent LLM collusion. Stage 2b results published 2026; Stage 3 funding sought from Schmidt Sciences Trustworthy AI 2026.

[![Python](https://img.shields.io/badge/python-%3E%3D3.10-blue)]() [![Bun](https://img.shields.io/badge/bun-%3E%3D1.0-orange)]() [![License](https://img.shields.io/badge/license-MIT-green)]()

> **Methodological-phasing glossary.** "Stage 2b" refers to the pre-registered 50-round extended-horizon Bertrand pricing protocol that produced the dataset in this repository, distinguishing it from the 25-round Stage 2 attempt that returned NO-GO on convergence. Stage 3 is the Schmidt Sciences–funded expansion ($n_{\text{rep}} \geq 30$, horizon $\geq 100$, $n \in \{2,3,4,5\}$). Stage 4 is cross-model replication. RFC 3161-stamped pre-registration filenames (`osf-stage2b-*`) preserve this phasing; renaming would break the cryptographic stamp chain.

## What's claimed → where to verify it

- **Headline finding (Stage 2b):** convergence dynamics differ sharply between agent-count regimes — GATE-5 converges 30/30 reps in 50 rounds, GATE-2 converges 1/15. The cross-sectional-signal mechanism we initially proposed was empirically reversed by a pre-registered text-based test, and the refined per-other-agent attention-density reading survives talk-volume residualization. → see [`paper/main.pdf`](paper/main.pdf) §4–§5 and [`verification/claims-map.md`](verification/claims-map.md) rows SR-M-6, SR-M-7.
- **Aim 3.2 Q35 alignment:** when and under what conditions do AI agents *collude*, and what are the implications for *oversight*? → see [`paper/main.pdf`](paper/main.pdf) §1, §5.2 and [`proposal/01-abstract.md`](proposal/01-abstract.md).
- **Integrity scaffold:** 6 RFC 3161-stamped addenda + 2 pre-registration stamps, 8-entry SR-M registry with falsification conditions and pre-committed rescope branches, cross-toolchain Python/SciPy reference verifier returning `ALL CLAIMS REPRODUCE: True`, 5-iteration named-expert adversarial Council with documented CONDITIONAL exit certificate. → see [`verification/`](verification/).

## Directory tree

```
colludebench-cascade/
├── paper/                 # Stage 2b preprint (LaTeX source + main.pdf + figures)
├── colludebench-cascade/  # Benchmark — TS runner (package.json), 44 experiment specs, SciPy verifiers
├── verification/          # Click-to-verify map + 8 RFC 3161 stamps + Council certificates
├── proposal/              # Public abstract + Schmidt RFP framing
└── pypi/                  # Python wrapper / placeholder
```

## Quick start

```bash
git clone https://github.com/HHA-Applied-Research-Institute/colludebench-cascade.git
cd colludebench-cascade

# Verify all integrity claims reproduce green from a clean clone
bash verification/reproduce/verify-stage2b.sh

# Run a dry-run experiment
cd colludebench-cascade
bun install
bun run runner/index.ts --spec experiments/GATE/EXP-GATE-2-2b.md --dry-run
```

## Citation

```bibtex
@misc{dhia2026colludebench,
  title  = {Basin-of-Attraction Asymmetry in LLM-Agent Bertrand Pricing:
            Stage 2b of a Pre-Registered ColludeBench Pilot},
  author = {Dhia, Hass and Hadi, Haedar and Dhia, Ahmed},
  year   = {2026},
  note   = {H.H.A. Applied Research Institute Stage 2b preprint; manuscript and full RFC 3161 stamp chain hosted at the repository URL below},
  url    = {https://github.com/HHA-Applied-Research-Institute/colludebench-cascade}
}
```

See [`CITATION.cff`](CITATION.cff) for the canonical citation file.

## Funding context

This work is part of the H.H.A. Applied Research Institute's submission to the Schmidt Sciences Trustworthy AI RFP 2026 (Tier 2). H.H.A. Applied Research Institute is a California Public Benefit Nonprofit Corporation, granted 501(c)(3) tax-exempt status by the IRS (EIN 41-4991887).

## Authorship

Per institutional attribution policy, this artifact lists exactly three authors: **Hass Dhia, Haedar Hadi, Ahmed Dhia**. The Council pattern, SciPy reference verifier, RFC 3161 stamp chain, and broader integrity scaffold are described in [`CONTRIBUTING.md`](CONTRIBUTING.md) and `paper/main.pdf` §5 as the team's *internal methodology*, never as external authorship. AI assistance is not attributed in any contributor list.

## License

Code: MIT (see [`LICENSE`](LICENSE)). Paper and data: see [`paper/README.md`](paper/README.md).
