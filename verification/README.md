# Verification

This directory is the click-to-verify map for every empirical claim in ColludeBench. Five integrity primitives, layered:

| Layer | Path | What it locks |
|-------|------|--------------|
| 1. Pre-registration with RFC 3161 trusted-timestamp | `pre-registrations/` + `stamps/` | Analysis plan content at a specific timestamp, before any analyzer runs |
| 2. SR-M mechanistic-claim registry | `sr-m-registry.md` | Each load-bearing claim's primary-source numeric target, falsification test, and pre-committed rescope branch |
| 3. Click-to-verify claims map | `claims-map.md` | Per-claim mapping: plain-English claim → code path → data path → stamp file → review certificate |
| 4. Cross-toolchain reference verifier | `../colludebench-cascade/verifiers/` | Independent Python/SciPy re-implementation returning `ALL CLAIMS REPRODUCE: True` |
| 5. Structured multi-iteration adversarial review | `council-certificates/` | Five-iteration structured multi-dimensional adversarial review with documented exit state (CONDITIONAL with user-override rationale) |

## One-Script Verification

```bash
bash reproduce/verify-stage2b.sh
```

The script walks all 8 SR-M claims + 3 cross-cutting practice claims from a clean clone, prints color-coded green/amber/red output, and exits 0 only if zero claims fail. Targets <5 minute wall-clock time. Companion to `claims-map.md`.

## Files

- `claims-map.md` — Click-to-verify table; 11 rows
- `sr-m-registry.md` — Mechanistic-claim registry
- `pre-registrations/README.md` — RFC 3161 verbatim policy + file index
- `pre-registrations/osf-*.md` — 8 pre-registration documents
- `stamps/*.tsr` — 8 corresponding RFC 3161 timestamp tokens
- `council-certificates/review-certificate.md` — CONDITIONAL review exit certificate (post iter-5)
- `council-certificates/iter-4-gap-list.md` — Per-finding resolution mapping across 5 iterations
- `reproduce/verify-stage2b.sh` — One-script verifier

## How to Verify Independently

The integrity primitives in this directory are designed to be verifiable by any party without trusting the H.H.A. team. Each primitive has its own verification command:

```bash
# 1. Verify a stamp is genuine and granted
openssl ts -verify -in stamps/<name>.tsr -data pre-registrations/<name>.md -CAfile /etc/ssl/cert.pem

# 2. Confirm stamp time precedes the analyzer-output commit time it governs
openssl ts -reply -in stamps/<name>.tsr -text | grep "Time stamp"
git log --format='%ci %H' -- ../colludebench-cascade/<analyzer-output-path> | head -1

# 3. Run the cross-toolchain SciPy reference verifier
python ../colludebench-cascade/verifiers/verify-stage2b-2026-04-26.py

# 4. Read the review certificate state and unresolved-at-exit findings
cat council-certificates/review-certificate.md
```

The integrity practice — what the team did and the order in which we did it — is auditable on its own merits. The review certificate is intentionally CONDITIONAL with documented user-override rationale rather than a stamp of approval.
