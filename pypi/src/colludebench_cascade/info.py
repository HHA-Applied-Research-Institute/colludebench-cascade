"""Package metadata + a printable banner.

Authorship is fixed per the institutional attribution policy. Every author
listed here matches the CITATION.cff entry exactly: Hass Dhia, Haedar Hadi,
Ahmed Dhia.
"""

PACKAGE_NAME = "colludebench-cascade"
VERSION = "0.1.0"
GITHUB_URL = "https://github.com/HHA-Applied-Research-Institute/colludebench-cascade"
HOMEPAGE = "https://hharesearch.org"
AUTHORS = ("Hass Dhia", "Haedar Hadi", "Ahmed Dhia")


def info() -> None:
    """Print the package banner + canonical pointers."""
    banner = f"""
ColludeBench v{VERSION} — H.H.A. Applied Research Institute

  A pre-registered, RFC 3161-timestamped, cross-toolchain-verified,
  adversarially-stress-tested benchmark for measuring multi-agent LLM
  collusion in repeated pricing games.

  This Python distribution is a namespace-reserve placeholder for the
  canonical TypeScript-Bun runner. The full Python port is a Stage 3
  deliverable (post-Schmidt-funding).

Authors:    {", ".join(AUTHORS)}
Homepage:   {HOMEPAGE}
Repository: {GITHUB_URL}
Preprint:   hosted at {GITHUB_URL}/blob/main/paper/main.pdf

To run experiments today, use the canonical runner:

    git clone {GITHUB_URL}
    cd colludebench-cascade
    bun install
    bun run colludebench-cascade/runner/index.ts --spec <experiment-spec> --dry-run

Funding context:
    Submitted to Schmidt Sciences Trustworthy AI RFP 2026 (Tier 2).
    H.H.A. Applied Research Institute is a 501(c)(3) (EIN 41-4991887).
"""
    print(banner.strip())
