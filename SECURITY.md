# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in ColludeBench — whether in the runner code, the verifiers, the experimental specifications, or the integrity-scaffold tooling — please report it responsibly.

**Email:** `hass@hharesearch.org` with subject prefix `[SECURITY]`

**Expected response window:** 48 hours for initial acknowledgment; 90-day remediation window per CERT/CC coordinated vulnerability disclosure guidelines (zero-day vulnerabilities trigger 48-hour notification to affected vendors).

**What to include:**
- A clear description of the vulnerability
- Steps to reproduce
- The affected files / version / commit hash
- Your assessment of severity (informational / low / medium / high / critical)
- Whether you intend to disclose publicly, and on what timeline

We will:
1. Acknowledge receipt within 48 hours
2. Confirm whether the report constitutes a vulnerability under our threat model
3. Coordinate with the reporter on a disclosure timeline
4. Patch the vulnerability and release a fix
5. Credit the reporter in the `CHANGELOG.md` (unless anonymity is requested)

## Threat Model

ColludeBench is research infrastructure. The threat surface includes:

- **Code execution** — the TypeScript runner spawns LLM API calls; malicious experiment specs could in principle cause unintended API spend or rate-limit abuse. Mitigation: experiment specs are statically parsed; no shell interpolation.
- **Data integrity** — the integrity scaffold (RFC 3161 stamps, SR-M registry, cross-toolchain verifier) is itself the security boundary for analytic claims. Mitigation: stamps are independently verifiable via `openssl ts -verify` against FreeTSA root; the SR-M registry is content-addressed via Git; Python and TypeScript implementations are independently maintained.
- **Supply chain** — dependencies in `package.json` and `pyproject.toml` are pinned and version-locked. Mitigation: no automatic dependency upgrades; Dependabot alerts reviewed manually.

## Out of Scope

- The integrity scaffold's review pattern (structured-dimension adversarial review) is a methodology, not a security primitive. Disagreements with review findings are normal scientific debate, not vulnerabilities.
- Reproducibility tolerance ($|\Delta| < 5 \times 10^{-3}$) is a deliberate design choice for cross-toolchain numeric reproduction. Floating-point differences within this tolerance are not vulnerabilities.

## Authorship

Vulnerability fixes are credited via Git commit attribution and the `CHANGELOG.md`. The repository's authorship policy (see `CONTRIBUTING.md`) limits the citation file to the three founding authors; security contributors are credited in the changelog and release notes but not in the citation file unless they author a substantive new module or methodology.
