# Pre-Registrations — RFC 3161-Stamped Verbatim

The eight `.md` files in this directory are the pre-registration documents (one Stage 1+2 draft, one Stage 2b draft, and six addenda) that were RFC 3161 trusted-timestamped via FreeTSA before any analyzer ran. The corresponding `.tsr` timestamp tokens are at `../stamps/`.

## Verbatim Policy

These files are **not edited after stamping**. The whole point of RFC 3161 trusted timestamping is that the team commits to a specific document content at a specific point in time, and that any later edit invalidates the stamp's anteriority claim. Modifying an addendum to scrub a phrase or correct a typo breaks the integrity primitive these stamps exist to enforce.

## How to Verify a Stamp

```bash
# General pattern
openssl ts -verify \
  -in ../stamps/<filename>.md.tsr \
  -data ./<filename>.md \
  -CAfile ../stamps/freetsa.crt    # or omit for system trust

# Stamp-anteriority spot-check (stamp time should precede any analyzer-output
# commit time that the addendum protects)
openssl ts -reply -in ../stamps/<filename>.md.tsr -text \
  | grep "Time stamp"
```

## File Index

| File | Stamped | Protects |
|------|---------|----------|
| `osf-preregistration-draft.md` | Stage 1+2 | Initial pilot study design |
| `osf-preregistration-stage2b-draft.md` | Stage 2b | 50-round protocol lock |
| `osf-stage2b-addendum-2026-04-23.md` | Addendum #1 | Convergence criterion + simplicity-bias falsifier (SR-M-1, SR-M-3) |
| `osf-stage2b-addendum-2026-04-24.md` | Addendum #2 | Gap-statistic branches (SR-M-2) |
| `osf-stage2b-addendum-2026-04-24b.md` | Addendum #3 | Cross-toolchain verifier requirement (SR-M-4) |
| `osf-stage2b-addendum-2026-04-26.md` | Addendum #4 | Survivor-consistency clause (SR-M-5) |
| `osf-stage2b-addendum-2026-05-03.md` | Addendum #5 | CoT regex pipeline + REVERSAL branches (SR-M-6) |
| `osf-stage2b-addendum-2026-05-04.md` | Addendum #6 | Talk-volume residualization (SR-M-7); chain-protects §5.4 Clause 4 (SR-M-8) |

See `../sr-m-registry.md` for each claim's primary-source numeric target, falsification test path, and verification status.
