# HF Single-Station Locator · India

A research project plus an interactive 3D website. How much does India's equatorial ionization anomaly (EIA) degrade HF single-station location (SSL), and can an India-adjusted ionosphere model correct it? See `CLAUDE.md` for the full spec.

| Folder | What |
|---|---|
| `web/` | v1 website (Vite + Three.js 0.160). `npm install`, then `npm run dev`; `npm test` runs the physics tests |
| `docs/paper/` | Draft paper (`paper.md`), figures, `results.json`, and `make_figures.mjs` (run with `node docs/paper/make_figures.mjs`) |
| `docs/resources.md` | Literature, tools and Indian data sources found so far |
| `research/` | Plan for the Python side (IRI grids, ray tracing) |

v1 uses a **simplified, illustrative** ionosphere. All coordinates are examples. No political borders.
