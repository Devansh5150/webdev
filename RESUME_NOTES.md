# Resume notes: BHARAT HF LOCATOR dashboard (paused 19 Nov 2026)

## Done
- Stack installed in `web/`: React 19, TypeScript, Tailwind v4, React Three Fiber 9, Drei 10, Recharts 3, Framer Motion, Zustand, Lucide (Three.js stays 0.160).
- Config: `web/vite.config.ts`, `web/tsconfig.json`, `web/index.html` (entry `/src/main.tsx`, **not written yet**).
- Old vanilla UI archived in `web/legacy-v1/` (reference only, not built).
- Blender models: `research/blender/build_models.py` → `web/public/models/df_station.glb`, `transmitter.glb` (Blender 5.3 installed).
- IRI electron-density profiles: `research/make_iri_profiles.py` → `web/public/data/iri/profiles_*`; sampler `web/src/engine/iriProfiles.ts`.
- Analysis engine: `web/src/engine/core.js` (inverse fix for 1 and 2 hops, elevation-range curves, quiet/disturbed uncertainty, scenario comparison); `web/src/worker.js` is now a thin wrapper.
- Data layer: `types/analysis.ts`, `utils/scientificCalculations.ts`, `services/analysisService.ts` (local worker, or FastAPI when `VITE_API_URL` is set), `store/analysisStore.ts`, `data/demoScenarios.ts`.
- Tests: 36 pass (`cd web` then `npx vitest run`).

## Next (in order)
1. UI: `index.css` (theme), `main.tsx`, `App.tsx`, layout (Topbar, Sidebar), common components.
2. 3D globe components (R3F): satellite Earth, D/E/F1/F2 layers + EIA, station/transmitter GLBs, 1-hop/2-hop paths, ellipse, labels (names only, no borders), legend, toggles.
3. Charts: electron density, elevation vs range, quiet vs disturbed.
4. Pages: Overview, Location Analysis, Ionosphere Model, Scenario Comparison, Research Reports (CSV/JSON export), Settings.
5. FastAPI skeleton in `research/api/`.
6. `npx tsc --noEmit`, `npx vite build`, screenshots, polish.

## Current state warning
The website **does not open right now**: `index.html` points to `src/main.tsx`, which is the next file to write.
