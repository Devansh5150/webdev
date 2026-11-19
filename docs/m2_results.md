# Milestone 2: IRI ionosphere (PyIRI grids). Results so far

19 Nov 2026. Reproduce with `node research/m2_iri_study.mjs` (output saved in `research/m2_iri_study_output.txt`).

## What was built
- `research/make_iri_grids.py`: PyIRI `IRI_monthly_mean_par` → foF2, hmF2 and B_F2_bot at IG12 = 0 and 100, hourly, for 12 months, on a 1° India grid + 5° global grid → `web/public/data/iri/` (21 MB, 1.76 MB per month).
  The stored-grid interpolation reproduces PyIRI's own daily output **exactly** at the nodes (`--check`: max difference 0.0000).
- `web/src/iri.js`: decoder + sampler that mirrors PyIRI's interpolation (F10.7 → R12 → IG12, linear in solar activity; bilinear in space; linear in UT). ym = 2·B_F2_bot (Epstein curvature match).
- `physics.js`: `getIono()` takes an optional `opts.grid`. With it, IRI is the quiet baseline, and the v1 storm response (as a ratio and offsets) plus the TIDs are applied on top. **Without it, v1 is unchanged** (all 19 original tests pass). `runScenario()` passes an optional `grid` through.
- Website: an "Ionosphere (truth)" switch (IRI default / v1); the date selects the IRI month; the 3D shell draws IRI; a third results card scores the **v1 India model, which is independent of IRI**.
- Tests: 26 pass (7 new: IG12 conversion, 24 off-grid PyIRI reference points, grid selection, EIA present, v1 unchanged, standard ignores the grid, scenario runs).

## Results (truth = IRI + v1 storm terms + TIDs; mirror model; example path 1175 km at 121°)

| Month | Storm | Standard | v1 India (independent) | IRI-based (best case) |
|---|---|---|---|---|
| Mar | 0 | 202 km | 121 km | 2 km |
| Mar | 1 | 319 km | 56 km | 9 km |
| Jun | 0 | 267 km | 199 km | 2 km |
| Dec | 0 | 197 km | 114 km | 2 km |

Map over India (March, 14:30 IST, quiet, 237 cells, 1 hop):

| | at 7.2 MHz | at 0.8 × MUF |
|---|---|---|
| Standard | 100% fixes, median **212 km**, 5% good | **0% fixes** (signal escapes in this model) |
| v1 India | 100% fixes, median **171 km**, 3% good | 48% fixes, median 109 km |
| IRI-based | median 9 km (best case) | median 4 km (best case) |

## What it means
1. **The v1 headline (India model < 10 km) was an artefact of circular truth.** Against an independent truth (IRI), the hand-tuned v1 EIA model misses by **51–199 km**. That is better than the standard model (197–371 km), but nowhere near "solved".
2. **Why:** at the example control point, IRI foF2 = **14.8 MHz** (hmF2 342 km, ym 85 km) against v1 8.4 MHz. The v1 model badly underestimates afternoon foF2 at F10.7 = 140. Both v1-based models therefore misplace the reflection height.
3. **Fix availability matters as much as accuracy.** With realistic (IRI) foF2, frequencies near the true MUF make the standard model think the signal escapes, so it gives **no fix at all**. Night and early morning (08:00, 20:00–22:00 IST) show the same effect.
4. **Season matters** (June worst), which the v1 model could not show.
5. **Caveat:** IRI is itself reported to **overestimate** foF2 near the Indian equator around noon (Pavan Chaitanya et al. 2015). The real truth may lie between IRI and v1, so only measurements can settle it. That is milestone 3: Ahmedabad AH223 measured-truth study, see `docs/datasource_review.md`.

## Not done yet in milestone 2
- Month-to-month blending (IRI blends adjacent monthly medians by day of month; we use the selected month's median).
- A storm model native to IRI (PyIRI has none; we keep the v1 storm terms).
- Paper figures regenerated on IRI (`docs/paper/make_figures.mjs` still uses v1).
- The `#compare` Europe side uses the 5° global grid (coarse but smooth at mid-latitudes).
