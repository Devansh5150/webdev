# BHARAT HF LOCATOR: Progress Report

**Project:** Single-station location (SSL) of HF transmitters over India
**Date:** 19 November 2026
**Status:** Milestone 1 complete · Milestone 2 started · Research dashboard complete

---

## 1. Summary in one paragraph

We are building a research tool and a paper on finding where a shortwave (HF) radio transmitter is, using only **one** listening station. The station measures the signal's direction and steepness. A model of the ionosphere (the reflecting layer of the upper atmosphere) then turns that into a distance. Over India this goes wrong, because the ionosphere has an afternoon "bulge", the **equatorial ionization anomaly (EIA)**, which methods built for Europe and the US ignore. DRDO lists this as an open research problem (DIA-CoE list, March 2026, item 16; repeated in the September 2026 call, **closing 31 Dec 2026**).

So far we have built:
- the physics engine;
- real ionosphere data (IRI via PyIRI);
- a full interactive 3D research dashboard;
- a draft paper;
- a literature and data-source review.

Our first results show the standard method misses by roughly **200–370 km** over India.

---

## 2. What has been built

### 2.1 Physics engine
| Item | Detail |
|---|---|
| `web/src/physics.js` | Original physics module, API unchanged. Ionosphere model, virtual-height (mirror) propagation, forward and inverse location, Monte Carlo 95% error ellipses. |
| `web/src/engine/core.js` | Dashboard analysis: inverse fix for **1-hop and 2-hop** (the mode-ambiguity problem), elevation-vs-range curves, quiet vs disturbed uncertainty, scenario comparison with a known transmitter. |
| `web/src/worker.js` | Runs all computation in a Web Worker so the UI never freezes. |
| Speed | Full analysis about 250 ms. One scenario about 13 ms (IRI) or 4 ms (v1). |

### 2.2 Real ionosphere data (Milestone 2, started)
| Item | Detail |
|---|---|
| `research/make_iri_grids.py` | PyIRI grids of foF2, hmF2 and layer thickness for 12 months, hourly, at solar minimum and maximum. India at 1°, globe at 5°. 21 MB. **Matches PyIRI exactly** at grid points. |
| `research/make_iri_profiles.py` | Full electron-density profiles (60–600 km) over India at five solar-activity levels. About 6 MB. |
| `web/src/iri.js`, `engine/iriProfiles.ts` | Browser decoders that reproduce PyIRI's interpolation. Verified against 24 independent PyIRI reference points. |
| Physics integration | `getIono()` uses IRI as the quiet-day baseline when a grid is supplied. Storm effects and small disturbances are added on top, because PyIRI has no storm model. Without a grid, behaviour is unchanged. |

### 2.3 Research dashboard (`web/`)
**Stack:** React 19, TypeScript, Vite, Tailwind CSS v4, Three.js 0.160, React Three Fiber, Drei, Recharts, Framer Motion, Zustand, Lucide icons. It works **fully offline** as static files.

| Page | What it does |
|---|---|
| **Location Analysis** (main) | Interactive 3D globe (NASA satellite imagery, day/night from the date and time). D/E/F1/F2 layers, EIA crest lines, DF station and estimated transmitter (Blender models), cyan 1-hop and dashed purple 2-hop paths, adjustable error ellipse (68/90/95/99%), place names, legend, layer toggles, forward/inverse modes. Parameter form with validation and RUN ANALYSIS. Estimate summary with a 1-Hop/2-Hop selector. Three charts. |
| **Overview** | Introduction, simulation status, key research metrics, example scenarios, recent analyses. |
| **Ionosphere Model** | Layer-focused globe, controls for condition, time, solar flux, height scale and season, the IRI electron-density profile at any point, and an EIA chart (foF2 vs latitude). |
| **Scenario Comparison** | Quiet vs disturbed, India vs Europe, 1-hop vs 2-hop, all with a known example transmitter so errors versus truth exist. |
| **Research Reports** | Saved analysis history, metadata, and **CSV / JSON / Markdown report export**. |
| **Settings** | Units, time display, height scale, uncertainty level, default station, model choice, DF angle error, confidence radius. |

**Charts (all model-derived):**
1. Electron density profile (real PyIRI data, layers labelled at IRI's own peak heights).
2. Signal elevation vs ground range (1-hop and 2-hop, with the measured point).
3. Quiet vs disturbed location uncertainty (grouped bars).

### 2.4 3D models (Blender 5.3)
- `research/blender/build_models.py` builds both models from code, so they can be rebuilt.
- **DF station:** shelter on a concrete pad and a ring of 8 masts. About 2,500 triangles.
- **Transmitter:** generic 4×4 utility truck with a whip antenna. About 750 triangles.
- Both are generic and non-branded, as `CLAUDE.md` requires.

### 2.5 Globe imagery
- NASA Blue Marble (day, with terrain shading) and Black Marble (night lights). Both are public domain.
- `research/make_textures.py` resizes them and builds an ocean mask. The water fraction comes out at 70.9%, matching Earth's real ~71%.
- **No political borders** appear anywhere.

### 2.6 Backend skeleton
- `research/api/main.py` (FastAPI) defines the same data contract as the frontend.
- It switches on by setting `VITE_API_URL`.
- The analysis endpoints deliberately return **501 (not implemented)** instead of fake numbers, until the Python physics and PyLap ray tracing are connected.

### 2.7 Research documents (`docs/`)
| File | Content |
|---|---|
| `paper/paper.md` | Draft research paper with 5 figures generated from the physics code (`paper/make_figures.mjs`). It carries a warning box flagging that its v1 results are superseded (see section 3). |
| `resources.md` | Literature, tools and Indian data sources with links. |
| `datasource_review.md` | Fact-check of `datasource.md`, plus a non-circular validation design. |
| `m2_results.md` | Milestone 2 results on the IRI ionosphere. |

---

## 3. Key research results so far

Example path: station 21.15°N 79.09°E to transmitter 15.5°N 88.5°E (both examples), 1,175 km, 7.2 MHz, 14:30 IST.

### 3.1 With the IRI ionosphere as truth (current, more trustworthy)
| Case | Standard method | Simple India method (independent) | IRI-based (best case) |
|---|---|---|---|
| March, quiet | 202 km | 121 km | 2 km |
| March, storm | 319 km | 56 km | 9 km |
| June, quiet | 267 km | 199 km | 2 km |
| Europe, same path | 92 km | — | 3 km |

**Map over India** (March, 14:30 IST, 7.2 MHz, 237 positions):

| Method | Median error | Fixes under 50 km |
|---|---|---|
| Standard method | 212 km | 5% |
| Simple India (v1) method | 171 km | 3% |

### 3.2 What this means
1. **Ignoring India's ionosphere bulge causes errors of about 200–370 km.**
2. **Main cause:** at the reflection point, IRI gives foF2 = 14.8 MHz against 6.9 MHz in the standard model. The reflection height comes out wrong, and at a low arrival angle each 1 km of height error moves the fix about 4.4 km.
3. **Sometimes there is no fix at all.** Near the real maximum usable frequency, the standard model thinks the signal escapes into space and gives no fix (0% of positions).
4. **Season matters:** June gives the largest errors.
5. **Correction made:** the earlier v1 claim of "India model under 10 km" was **circular**, because the model was being tested against itself. With an independent truth (IRI), the simple India model errs by **51–199 km**. The paper is flagged accordingly.

---

## 4. Verification

| Check | Result |
|---|---|
| Frontend unit tests (Vitest) | **36 / 36 pass** (physics sanity values, IRI decoding, profiles, analysis engine) |
| Backend tests (pytest) | **3 / 3 pass** |
| TypeScript | **0 errors** |
| Production build | OK (static, offline) |
| All 6 pages | Rendered in headless Chrome, **no console errors** |
| PyIRI grid accuracy | Exact match at grid points; small interpolation error between them |

---

## 5. Decisions and constraints

- **No political borders** (`CLAUDE.md` rule, and legal sensitivity of India's map). Only place names are shown.
- **Scientific honesty:** every number is computed by the model. The UI marks data as *Model-derived*, *Demonstration* or *Future backend*. No real DF measurements are used.
- **Generic 3D models only**, with no copies of real products.
- **Colours:** cyan, blue and purple, with no orange or green, as the dashboard brief asked.
- **Physics kept, not rewritten:** the tested physics was reused when the UI moved to React. The old interface is archived in `web/legacy-v1/`.

---

## 6. Problems found and fixed

| Problem | Fix |
|---|---|
| Paper claimed the standard model's ellipse excluded the truth on a quiet day | Checked numerically. It only does in storms. Paper corrected. |
| v1 "under 10 km" result was circular | Exposed by the IRI study and flagged in the paper |
| Dashboard pages stuck on "Loading…" | React state bug (a function stored as state). Fixed, and an error boundary was added. |
| Page navigation race under React StrictMode | Initial page is now read from the URL when the store is created |
| Water mask misclassified ocean as land | Switched to colour-hue detection |
| Sun position not applied before data loaded | Reordered so it doesn't wait for the data download |

---

## 7. Known limitations

1. **Mirror-model propagation only.** There is no numerical ray tracing yet (PyLap/PHaRLAP planned).
2. **Storm effects are illustrative.** PyIRI has no storm model.
3. **The IRI-based model is a best case,** because the truth is IRI plus small disturbances. The independent v1 model is the fair test.
4. **IRI itself overestimates foF2** near the Indian equator around noon (published studies). Only measurements can settle the true value.
5. **The FastAPI backend is a contract only.** The physics runs in the browser.
6. **The "standard" baseline errs by 92 km** even at mid-latitude under IRI, so it needs calibrating.

---

## 8. Next steps

1. **Milestone 3, real-data validation.** Route example paths so their reflection points sit over the **Ahmedabad ionosonde (GIRO code AH223)**, and use its measured foF2 and hmF2 as truth. That is non-circular and needs no DF data.
2. **Numerical ray tracing** with PyLap through the IRI grids.
3. **Port the analysis engine to Python** behind the FastAPI backend.
4. **Regenerate the paper figures** on IRI and rewrite the results section.
5. **Optional:** a coherent HF antenna array to measure real arrival angles. This is a hardware sub-project.

---

## 9. How to run

```bash
cd web
npm install
npm run dev          # http://localhost:5173
npx vitest run       # tests
npm run build        # static offline build in web/dist
```

Regenerate data (Python virtual environment in `research/.venv`):
```bash
research/.venv/Scripts/python research/make_iri_grids.py
research/.venv/Scripts/python research/make_iri_profiles.py
"C:/Program Files/Blender Foundation/Blender 5.3/blender.exe" -b -P research/blender/build_models.py -- web/public/models
```

---

## 10. Data credits

- **IRI via PyIRI:** Forsythe et al. (2024), *Space Weather*, doi:10.1029/2023SW003739
- **NASA Blue Marble and Black Marble** imagery (public domain)
- **DRDO DIA-CoE** research problem lists (March and September 2026)

*All coordinates in this project are examples. Open-literature physics only.*
