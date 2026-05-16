# Paper — Stage 2b Preprint

`main.pdf` is the post-iter-5 Council CONDITIONAL preprint, 29 pages.

## Citation

```bibtex
@misc{dhia2026colludebench,
  title  = {Basin-of-Attraction Asymmetry in LLM-Agent Bertrand Pricing:
            Stage 2b of a Pre-Registered ColludeBench Pilot},
  author = {Dhia, Hass and Hadi, Haedar and Dhia, Ahmed},
  year   = {2026},
  note   = {H.H.A. Applied Research Institute Stage 2b preprint; hosted at github.com/HHA-Applied-Research-Institute/colludebench-cascade}
}
```

## Reproduce

The PDF can be rebuilt from source:

```bash
cd paper
pdflatex main.tex
bibtex main
pdflatex main.tex
pdflatex main.tex
```

Expected: 29 pages, ~558 KB, 0 undefined references. The bundled `references.bib` is canonical; figures/ contains 5 figures (1 TikZ-native fig1-methodology-flow.tex + 4 matplotlib fig2/3/4/5 PDF + .py source).

## License

Paper text and figures: CC-BY-4.0 (so derivative work is permissible with attribution).
Code (figure-rendering scripts): MIT, same as the rest of this repository.

## Hosting

The Stage 2b preprint is hosted in this repository at `paper/main.pdf` with the full RFC 3161 stamp chain at `../verification/stamps/`. No arXiv submission is being pursued; the canonical citation points to the GitHub repository (see `../CITATION.cff` and `../README.md`).

## Supplementary materials

- Full pre-registration chain at `../verification/pre-registrations/` with 8 RFC 3161 stamps at `../verification/stamps/`
- 8-entry SR-M mechanistic-claims registry at `../verification/sr-m-registry.md`
- Click-to-verify claims map at `../verification/claims-map.md`
- Cross-toolchain SciPy reference verifier at `../colludebench-cascade/verifiers/`
- Council certificate (CONDITIONAL exit) at `../verification/council-certificates/review-certificate.md`
- One-script verification at `../verification/reproduce/verify-stage2b.sh`
