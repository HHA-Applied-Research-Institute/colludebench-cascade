# colludebench-cascade (Python)

The Python distribution of ColludeBench. **This is a namespace-reserve placeholder.** The canonical ColludeBench implementation is the TypeScript-Bun runner at <https://github.com/HHA-Applied-Research-Institute/colludebench-cascade>. The full Python port is a Stage 3 deliverable (post-Schmidt-funding) per the team's institutional roadmap.

## Install

```bash
pip install colludebench-cascade
```

## Usage

```bash
colludebench-cascade           # prints the banner with canonical pointers
colludebench-cascade info      # same; explicit form
colludebench-cascade run       # tells you to use the canonical TypeScript-Bun runner
colludebench-cascade verify    # tells you to run verification/reproduce/verify-stage2b.sh
```

## Why a placeholder?

The canonical ColludeBench runner is implemented in TypeScript and runs on Bun (<https://bun.sh>). The TypeScript implementation is what produced the Stage 2b numerics that are RFC-3161-timestamped and adversarially-reviewed. A second Python implementation that re-derives the stamped numerics would, by construction, produce different floating-point results within tolerance — and any divergence would create a new line of attack on the integrity scaffold.

Rather than introduce that risk, this Python distribution is a thin namespace-reserve. The full Python port is scheduled as a Stage 3 deliverable, after which `colludebench-cascade` on PyPI will offer:

- `colludebench-cascade run` — execute experiment specifications via subprocess to the canonical Bun runner, OR via a native Python re-implementation (decision pending Stage 3 architectural review)
- `colludebench-cascade verify` — native Python invocation of the SciPy reference verifiers
- `colludebench-cascade specs` — Python-native parsing of the experiment specification format

## Citing

See <https://github.com/HHA-Applied-Research-Institute/colludebench-cascade/blob/main/CITATION.cff>.

## License

MIT. See `../LICENSE`.

## Authorship

Per the institutional attribution policy, the package lists exactly three authors: Hass Dhia, Haedar Hadi, Ahmed Dhia (H.H.A. Applied Research Institute).
