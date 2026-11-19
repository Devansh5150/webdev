# Data register

| Dataset | Source | Coverage | Licence / terms | Produced or downloaded | Where |
|---|---|---|---|---|---|
| IRI F2 grids (foF2, hmF2, B_F2_bot; solar min and max; hourly; 12 monthly medians) | PyIRI 0.1.7, `IRI_monthly_mean_par`, CCIR coefficients, IGRF year 2026. Forsythe et al. (2024), *Space Weather*, doi:10.1029/2023SW003739 | India 1° (15°S–45°N, 55–110°E) + global 5° | PyIRI is open source; IRI is a COSPAR/URSI community model. Cite PyIRI and IRI (Bilitza et al. 2022). | Generated 2026-11-19 by `research/make_iri_grids.py` | `web/public/data/iri/` (website-ready, 21 MB) |
| Globe day texture (`earth_day.jpg`, 4096×2048) | NASA Blue Marble Next Generation, March 2004, topography + bathymetry (Stöckli et al., NASA Earth Observatory). Downloaded from assets.science.nasa.gov | global | NASA imagery: public domain; credit "NASA Earth Observatory" | 2026-11-19, `research/make_textures.py` | `web/public/textures/` (raw in `research/data/raw/nasa/`) |
| Globe night texture (`earth_night.jpg`) | NASA Black Marble 2016 (3 km) | global | public domain; credit "NASA Earth Observatory / Black Marble" | 2026-11-19 | `web/public/textures/` |
| Water mask (`earth_water.png`) | derived from Blue Marble by hue; area-weighted water fraction 0.709 | global | derived | 2026-11-19 | `web/public/textures/` |
| Test fixture: 24 PyIRI reference points | PyIRI `IRI_density_1day` (day 15) | India, Mar/Jun/Oct, F10.7 90/140/200 | as above | `make_iri_grids.py --fixture` | `web/src/iri.fixture.json` |

Next (milestone 3, see `docs/datasource_review.md`): GIRO Ahmedabad AH223 (CC-BY-NC-SA 4.0; **raw records stay in `raw/`, never in `web/public/`**), COSMIC-2 ionPrf, WSPR, F10.7/Kp/Dst.
