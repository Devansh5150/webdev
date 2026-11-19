# HF Single-Station Locator — India

## What this project is

A research project plus an interactive 3D website. A direction-finding (DF) station measures two angles of an incoming HF (3–30 MHz) skywave signal: azimuth (compass direction) and elevation (how steeply it arrives). Using a model of the ionosphere, we trace the signal back to the ground to estimate where the transmitter is. This is called single-station location (SSL).

**Research question:** How much does India's low-latitude ionosphere (the equatorial ionization anomaly, EIA) degrade single-station location accuracy, and can an India-adjusted ionosphere model correct it?

**Why it matters:** "Single Station Location Algorithm for HF DF using Azimuth Bearing, Elevation Bearing and Ionospheric Model Software" is an open DRDO research problem (DIA-CoE Research Problems list, March 2026). Published SSL work is almost all mid-latitude (South Africa, Australia, France, US). No open study covers the Indian EIA region.

## Who uses the site

Students, researchers and reviewers (DRDO, faculty). It must explain the problem visually to a non-specialist in under a minute, and let a specialist run real scenarios.

## Core concepts (keep these terms consistent in UI and code)

- **Transmitter (Tx):** the emitter whose location is unknown.
- **DF station (St):** our single receiving site, with a circular antenna array.
- **Azimuth:** bearing from station to the signal source, degrees clockwise from north.
- **Elevation (β):** arrival angle above the horizon.
- **Ionosphere F2 layer:** described by `foF2` (critical frequency, MHz), `hmF2` (peak height, km) and `ym` (semi-thickness, km).
- **EIA:** two crests of enhanced `foF2` about ±13–20° magnetic latitude, a trough at the magnetic equator, strongest in the afternoon. India's mainland sits under the northern crest.
- **Standard model:** a mid-latitude model that ignores the EIA (the baseline we are criticising).
- **India-adjusted model:** includes the EIA and storm effects (our proposed fix).
- **Truth:** the India-adjusted model plus small-scale structure (travelling ionospheric disturbances) that no model knows, used to simulate "real" measurements.

## Physics (v1 — already implemented in `physics.js`, keep the API)

1. **Ionosphere `getIono(lat, lon, {utHours, f107, storm, eia, tid})`:** illustrative empirical F2 model.
   - Magnetic latitude from a geomagnetic dipole (pole 80.8°N, 72.7°W).
   - Day/night shape by local time. Solar flux scaling (F10.7).
   - EIA crests and trough.
   - Storm: negative phase at mid/high latitudes, crest amplification, poleward shift, uplift.
2. **Virtual height:** parabolic layer. `h' = hb + (ym/2)·x·ln((1+x)/(1−x))`, where `x = f·cos(i)/foF2` (secant law), `hb = hmF2 − ym`, and `sin i = RE·cos β/(RE+hb)`. If `x ≥ 1`, the ray penetrates (no reflection).
3. **Hop geometry (spherical Earth, mirror model):** `θ = π/2 − β − asin(RE·cos β/(RE+h'))`, ground range `D = 2·RE·θ`.
4. **Inverse `locate()`:** iterate range. The ionosphere is sampled at the hop midpoint(s) along the azimuth, until `D` converges. 1–3 hops are supported.
5. **Forward `forward()`:** find the low-ray elevation that lands on the station, by scan plus bisection. Fall back to 2 or 3 hops if no 1-hop solution exists.
6. **Uncertainty `errorEllipse()`:** Monte Carlo (seeded), with σ(azimuth) = σ(elevation) = 1°, foF2 ±7% and hmF2 ±15 km. The output is a 95% error ellipse in km.
7. **`runScenario()`:** returns arrival angles, reflection height, MUF, and, for both models, the estimated location, the error versus truth and the ellipse.

**Sanity values to preserve in tests** (station 21.15°N 79.09°E, Tx 15.5°N 88.5°E, 7.2 MHz, 09:00 UT, F10.7 = 140):

| Storm | Elevation | MUF | Standard-model error | India-model error |
|---|---|---|---|---|
| 0 | ≈18° | ≈14 MHz | ≈100 km | <10 km |
| 1 | — | — | ≈270 km | <10 km |

The same geometry placed in Europe gives ≈8 km for both models.

**Later (v2):** replace `getIono` with real data. Precompute it in Python with PyIRI or iri2016, optionally assimilating Indian ionosonde/GNSS-TEC data. Replace the mirror model with numerical ray tracing (PyLap/PHaRLAP). Use a real IGRF field for magnetic latitude.

## The website

**One-screen app:** controls on the left, 3D globe in the centre, results on the right.

### 3D scene (Three.js r160, ES modules, OrbitControls)

- **Earth:** sphere with an equirectangular texture (`earth.jpg`: coastlines only, no political borders; keep it that way).
- **Ionosphere shell:** mesh whose radius is `RE + exaggeration·hmF2(lat, lon)` and whose colour is mapped from `foF2`. It updates when time, solar flux or storm changes, so the EIA bulges are visible. Use a vertical exaggeration slider (default ×8), because at true scale the layer is invisible.
- **Transmitter model:** a generic low-poly vehicle with a whip antenna and pulsing rings. Build it from primitives or from Blender glTF later. Never copy a real product.
- **DF station model:** a shelter plus a ring of 8 vertical antenna masts.
- **Signal path:** virtual (mirror) path from Tx up to reflection height `h'` and down to St. 1-hop and 2-hop paths use different colours.
- **Inverse result:** a back-traced path from St, plus estimated-location markers for the standard model (grey) and the India model (amber).
- **Error ellipse:** a line loop plus translucent fill on the surface, and the Monte Carlo point cloud.
- **Click on the globe** to place the Tx or the St (a mode toggle).

### Four views (tabs, routed on the URL hash: `#forward`, `#inverse`, `#storm`, `#compare`)

1. **Forward:** set Tx, St, frequency, date/time (IST), F10.7 and storm level. Shows the path, arrival angles, MUF and reflection height.
2. **Inverse:** enter the station, measured azimuth and elevation, frequency and time. Shows the estimates from both models with their ellipses.
3. **Quiet vs storm:** storm slider 0–1, with a small chart of location error against storm level for both models.
4. **India vs Europe:** the same distance and bearing run with the station in India and in central Europe. Shows the error comparison bars, and the camera flies between the two.

### Results panel

- Azimuth and elevation (°).
- Virtual reflection height (km).
- foF2 at the control point (MHz).
- MUF (MHz).
- Hops.
- For each model: estimated lat/lon, error vs truth (km), and 95% ellipse semi-axes (km).
- A fix-quality pill: Good under 50 km, Fair 50–150 km, Poor over 150 km.

All example coordinates are labelled "example". Show a visible note that the ionosphere model in v1 is simplified and illustrative.

### Design

- Dark, mission-control feel, single theme.
- IBM Plex Sans and IBM Plex Mono.
- Colours: transmitter coral, station cyan, rays amber, ionosphere violet.
- Tabular numbers. Visible keyboard focus. Respects prefers-reduced-motion.

## Tech and structure

```
/web            static site (Vite + vanilla JS or React; Three.js 0.160)
  /src/physics.js   (from this repo; pure functions, unit-tested)
  /src/scene/       globe, ionosphere shell, models, paths, ellipse
  /src/ui/          panels, tabs, charts
  /public/earth.jpg
/research       Python: notebooks, PyIRI/iri2016 grids, PyLap ray tracing, validation
/docs           paper figures, methodology
```

- Physics functions stay pure and framework-free. Unit-test them with Vitest against the sanity values above.
- Heavy computation (Monte Carlo, shell recompute) must not freeze the UI. Debounce slider input, and move it to a Web Worker if it exceeds about 50 ms.
- The site must work fully offline as static files (no backend in v1).

## Milestones

1. **v1 prototype:** all four views working on the simplified model.
2. **Real ionosphere:** precomputed IRI grids for India by month, hour and F10.7, loaded as JSON.
3. **Numerical ray tracing** and validation against published SSL accuracy figures. If available, compare against Indian ionosonde stations (e.g. Ahmedabad, Tirunelveli).
4. **Research outputs:** error maps over India by time of day and season, standard vs adjusted, plus paper figures exported from the site.

## Constraints

- Open-literature physics only. No classified or real military system specifications.
- Generic, non-branded 3D models.
- No political borders drawn on any map.
