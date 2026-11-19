# /research: Python side (milestones 2–4)

v1 uses the illustrative `getIono()` in `web/src/physics.js`. This folder will replace it with real data.

## Milestone 2: real ionosphere grids · STARTED 19 Nov 2026 (see docs/m2_results.md)
- Done: `make_iri_grids.py` → `web/public/data/iri/`; `web/src/iri.js`; `getIono(opts.grid)`; website source switch; 7 tests; `m2_iri_study.mjs`.
- Setup: `python -m venv research/.venv` then `research/.venv/Scripts/pip install PyIRI`; run `research/.venv/Scripts/python research/make_iri_grids.py` (~80 s).
- `make_iri_grids.py` (to write): use PyIRI (`pip install PyIRI`) to compute foF2, hmF2 and B0/ym on a 1° grid over 0–40°N, 60–100°E for each month × hour (0–23 UT) × F10.7 ∈ {70, 100, 140, 180, 220}.
- Output: `web/public/data/iono_{month}_{f107}.json` (Float32 arrays, base64), loaded by a new `getIonoGrid()` that keeps the `getIono()` signature.
- Data layout (from datasource.md): raw downloads in `research/data/raw/` (git-ignored), processed in `research/data/processed/`, and source / date range / licence / download date in `research/data/README.md`.
- Use PyIRI's IGRF modip instead of the dipole. PyIRI has no documented storm option, so keep our storm term or use the Fortran IRI.
- Storm level: apply published storm-time corrections (e.g. Dabas et al. 2006) on top of the grid, or use IRI's storm model.

## Milestone 3: numerical ray tracing and validation
- PyLap/PHaRLAP 2D ray tracing through the IRI grids; compare h′ and range with the mirror model.
- **Measured-truth study** (see `docs/datasource_review.md`): paths with the hop midpoint over Ahmedabad AH223 (and Trivandrum TM308); truth h′ from measured foF2/hmF2 (`digisondeindices`); model h′ error → location error. GIRO data: CC-BY-NC-SA, so no raw records in `web/public`.
- Compare against published SSL accuracies (Li et al. 2026; Pretoria quality factor).

## Milestone 4: research outputs
- Error maps by season × hour × F10.7, standard vs adjusted.
- Paper figures exported from the site and from `docs/paper/make_figures.mjs`.
