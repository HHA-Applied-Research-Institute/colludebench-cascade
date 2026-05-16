# Proposal — Schmidt Sciences Trustworthy AI 2026

This directory contains the public-facing materials for H.H.A. Applied Research Institute's submission to the Schmidt Sciences Trustworthy AI RFP 2026 (Tier 2; $5M ceiling; deadline 2026-05-17).

## What's here

- `01-abstract.md` through `13-references.md` — compressed proposal sections (~9,500 words combined)
- `compute-strategy.md` — compute-strategy companion (cited from §11 budget)
- `PROPOSAL_DRAFT.pdf` — public-facing draft render (canonical artifact lives in the private submission tree)
- `08-therefore-schmidt.md` is intentionally absent (KILLED per compression-outline §D5)
- `03-the-gap.md` is intentionally absent (MERGED into `02-the-problem.md`)

## Aim 3.2 Question 35 alignment

This proposal directly answers Aim 3.2 Question 35 — *when and under what conditions do AI agents learn to collude, and what are the implications for oversight*. The cascade model unifying H1 (failure amplification), H2 (collusion detection), and H3 (norm erosion) is the structural answer; the 36-month research program operationalizes the empirical test.

## Render command

```bash
cd proposal
cat 01-abstract.md 02-the-problem.md 04-hypotheses.md 05-methodology.md \
    09-outcomes.md 06-why-5m.md 07-team.md 10-timeline.md 11-budget.md \
    12-responsible-research.md 13-references.md > /tmp/proposal.md

pandoc /tmp/proposal.md \
  --pdf-engine=xelatex \
  -V geometry:margin=0.70in \
  -V fontsize=10pt \
  -V documentclass=article \
  -H ../sections-compressed/render-template.tex \
  -o PROPOSAL.pdf
```

## Authorship

Per institutional attribution policy (`../CONTRIBUTING.md` §Authorship Policy), this proposal lists exactly three authors: **Hass Dhia, Haedar Hadi, Ahmed Dhia** (H.H.A. Applied Research Institute). The integrity scaffold (RFC 3161 stamps, SR-M registry, cross-toolchain SciPy verifier, named-expert Council pattern) is internal methodology, not authorship.

## Funding institution

H.H.A. Applied Research Institute is a California Public Benefit Nonprofit Corporation, granted 501(c)(3) tax-exempt status by the IRS (EIN 41-4991887).

## Status

Submission pending portal upload. Track via the parent submission directory's `SESSION_STATUS.md` (private).
