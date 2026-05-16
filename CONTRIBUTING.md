# Contributing to ColludeBench

Thank you for your interest. ColludeBench is research infrastructure for measuring multi-agent LLM safety failures. Contributions are welcome — this document describes how the team works internally and what we expect of new contributors.

## Authorship Policy

ColludeBench's authorship is fixed: **Hass Dhia, Haedar Hadi, Ahmed Dhia** (H.H.A. Applied Research Institute). External contributors are credited in the `CHANGELOG.md` and via Git commit attribution; significant new modules or experimental designs may earn co-authorship on derivative releases following a documented review by the H.H.A. team.

**AI assistance is internal methodology, not authorship.** This repository is built using a multi-iteration adversarial review pattern with named-expert Council personas, RFC 3161 trusted-timestamp pre-registration, and cross-toolchain Python/SciPy reference verification. These practices are described below as the *integrity scaffold* — they are how we work, not who we are. AI co-author tags, `Co-Authored-By:` trailers, and "with assistance from" footnotes are not used in this repository's commit history, citation file, or release notes.

## Integrity Practice (Internal Methodology)

Every load-bearing analytic claim in ColludeBench passes through four hierarchical layers, in order from strongest to most reinforcing:

### 1. RFC 3161 Trusted-Timestamp Pre-Registration

Every analyzer's specification — including its falsification conditions and pre-committed rescope branches — is RFC-3161-stamped via FreeTSA before the analyzer runs. The stamp time must be strictly anterior to the analyzer-output commit time. This is the strongest integrity primitive available for analysis-plan locking; the verification and adversarial layers reinforce it but cannot substitute for it.

Stamps live at `verification/stamps/`. Each `.tsr` file is a binary timestamp token verifiable against the FreeTSA root:

```bash
openssl ts -verify -in verification/stamps/<name>.tsr \
  -data verification/pre-registrations/<name>.md \
  -CAfile /etc/ssl/cert.pem
```

### 2. Pre-Committed Mechanistic-Claim Registry (SR-M)

Every load-bearing claim has an entry in `verification/sr-m-registry.md` (mirror of the private `.reviews/mechanistic-claims.md`) with:
- The claim text verbatim from the paper
- A primary-source numeric target
- A falsification test path (file + decision rule)
- A falsification condition (when does the claim fail?)
- A pre-committed rescope fallback (what does the paper say if the claim fails?)
- Verification status: PASS / EXPLORATORY / PRE-REGISTERED

The Stage 2b registry has eight entries (SR-M-1 through SR-M-8). One of those (SR-M-6) records a self-falsification: the cross-sectional-signal mechanism we initially proposed was empirically reversed by a pre-registered text-based test. The reversal is published verbatim, not rescued.

### 3. Cross-Toolchain Reference Verifier

The TypeScript primary analyzer is independently re-implemented in Python with SciPy reference statistical primitives. The Python verifier runs against the same canonical dataset and returns `ALL CLAIMS REPRODUCE: True` across all pre-registered claim categories at $|\Delta| < 5 \times 10^{-3}$ tolerance. This is procedural reproduction, not mere replication: a Fisher's-exact denominator bug found pre-submission via this procedure would have invalidated a primary claim.

The Python verifiers live at `colludebench-cascade/verifiers/`.

### 4. Named-Expert Adversarial Council

Five iterations against persona panels (DataScientist + Statistician/Algorithmist, CSProfessor, Physicist, IO Domain Expert, Devil's Advocate, Methods/Reproducibility, Consistency, Writing Quality). Stage 2b's Council exited CONDITIONAL after iter-5 with documented user-override rationale; ~32 substantive findings (CRITICAL + HIGH) were applied across iterations. The certificate at `verification/council-certificates/review-certificate.md` is auditable, not a stamp of approval.

## Re-Council on Transitions

When work transitions across phases (Stage 2b preprint → Schmidt proposal compression; Stage 3 dataset → cross-model paper), the Council convenes again — past CLEAN does not transfer across context. This protects against residual Lakatosian rescues that would have been visible to a fresh-context reviewer but not to one anchored in prior iterations.

## Pre-Commit Hooks

Three pre-commit hooks run on every commit touching analyzer or claim files:

- `scripts/registry-consistency-check.ts` — asserts each load-bearing claim has a corresponding SR-M registry entry with stamped pre-registration strictly anterior to the analyzer-output commit
- `scripts/stamps-anteriority-check.ts` — walks every `.tsr` file and confirms stamp time precedes the result commit it governs
- `scripts/secret-scan.ts` — refuses commits with API keys, internal Slack URLs, PII, or absolute home-directory paths

The same checks run in CI on every PR via `.github/workflows/integrity-check.yml`.

## How to Land a Change

1. Open an issue describing what you want to change and why. Substantive scientific changes (new claim, modified analyzer, new experiment spec) require an issue before any PR.
2. Branch from `main` using a topic prefix.
3. If your change touches a `falsification_test_path` or modifies an analyzer that produces a registered claim, you must:
   - Add or update the corresponding SR-M registry entry **before** committing the analyzer change
   - RFC-3161-stamp the updated registry entry
   - Verify stamp time is strictly anterior to the analyzer-output commit time
4. Open a PR. The PR template asks: "Is this a transition? Does it need re-Council?"
5. The pre-commit hooks must pass. The `integrity-check` and `conformance-test` GitHub Actions must be green.
6. The H.H.A. team reviews substantive scientific changes via the named-expert Council pattern before merge.

## Code of Conduct

See [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md). Brief: be kind, be specific, be reproducible.

## Reporting Vulnerabilities

See [`SECURITY.md`](SECURITY.md). Brief: email `hass@hharesearch.org` for responsible disclosure with a 90-day remediation window per CERT/CC guidelines.
