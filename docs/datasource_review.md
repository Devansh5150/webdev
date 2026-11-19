# Review of `datasource.md`

Checked 19 Nov 2026 against the sources' own pages. ✅ = confirmed, ⚠️ = partly right or needs care, ❌ = wrong.

## 1. Claim by claim

| # | Claim in datasource.md | Verdict | What the source actually says / why it matters |
|---|---|---|---|
| 1 | PyIRI replaces `getIono()`; gives foF2, hmF2 on global grids for a whole day | ✅ | API lists foF2/foF1/foE, hmF2, NmF2, B_F2_bot/top, vTEC and full electron-density profiles (`IRI_density_1day`, `run_iri_reg_grid`). [docs](https://pyiri.readthedocs.io/en/latest/) |
| 1b | PyIRI provides IGRF magnetic coordinates | ✅ (by API names) | `igrf_library` has `inclination`, `inc2magnetic_dip_latitude`, `inc2modip`. Use modip, not our dipole, for the EIA. |
| 1c | (Implied) PyIRI covers storm days via Kp | ⚠️ | **No storm option is documented** in PyIRI. IRI's storm model lives in the Fortran IRI (e.g. the `iri2020` wrapper). We must keep our own storm term, or use the Fortran IRI for storm runs. |
| 1d | PyIRI gives `ym` | ⚠️ | It gives B_F2_bot (bottomside thickness), not the parabolic `ym` our `virtualHeight()` uses. We need a documented conversion, or should compute h′ by integrating the full profile (better). |
| 2 | Ahmedabad Digisonde = AH223 | ✅ | Listed as "Ahmedabad, AH223" on GIRO pages, and used in the `digisondeindices` example. |
| 2b | `didbase.get_indices(date, 'AH223')` | ✅ | `digisondeindices` v2.0.x on PyPI, imported as `didbase`, returns an xarray Dataset in UTC, incl. foF2, hmF2 and an autoscaling confidence score (CS). [libraries.io](https://libraries.io/pypi/digisondeindices) |
| 2c | Licence CC-BY-NC-SA 4.0, credit the station | ✅, but incomplete | [Rules of the Road](https://giro.uml.edu/didbase/RulesOfTheRoad.html) also require: cite **Reinisch & Galkin (2011), EPS 63, 377–381, doi:10.5047/eps.2011.03.001**; offer the station **co-authorship**; contact the observatory before use. Share-alike: **raw or edited records may only be shared with LGDC account holders.** |
| 3 | COSMIC-2 profiles from 1 Oct 2019, daily by 02:00 UTC | ✅, but incomplete | The ionPrf profiles are labelled **"near real-time provisional"** (not yet operational). Absolute TEC is operational. Cite DOI 10.5065/T353-C093. The licence is not stated on the data page; read the Terms of Use. [page](https://www.cosmic.ucar.edu/what-we-do/cosmic-2/data/) |
| 4 | WSPR ≈ 6.6 billion spots | ⚠️ | wspr.live's own example query returns ~**2.7 billion** rows. 6.6 billion comes from a 2024 HamSCI poster. Run `SELECT count(*) FROM wspr.rx` yourself. Access is read-only HTTP GET (`db1.wspr.live/?query=`). [wspr.live](https://wspr.live/) |
| 4b | WSPR tests the forward model | ✅, with limits | A spot proves a path existed (frequency below the MUF, with enough SNR). It gives **no arrival angles** and only grid-square locations (6 characters ≈ 5 km × 2.5 km; 4 characters ≈ 100+ km). So it tests path existence and MUF, not location accuracy. Check Indian station coverage first. |
| 5 | F10.7, Kp/Ap from SWPC, OMNIWeb, GFZ | ✅ | Add **Dst** (WDC Kyoto). It is a low-latitude ring-current index and maps better to our storm level than Kp does over India. |
| 6 | NavIC TEC from NARL, not public | ✅ (consistent with my search) | Plan for no access; treat it as a bonus. |
| Gap | "A low-cost SDR can measure arrival angles" | ❌ as stated | One receiver cannot measure azimuth or elevation. You need **≥ 3 phase-coherent channels** and a spaced antenna array (tens of metres at HF), plus calibration. Popular coherent kits such as KrakenSDR start at about 24 MHz, above most HF skywave work. It's feasible as a sub-project, but it's a hardware build, not a cheap add-on. |

## 2. The bigger issue: the "truth" is still circular

datasource.md (like the v1 paper) proposes "IRI corrected with COSMIC-2/ionosonde = truth". If the India-adjusted model is built from the same corrections, it is again scored against itself (paper, Limitation 2).

**Recommended design: use measurements, not a model, as truth at the control point.**
1. Choose example paths whose **hop midpoint sits over an ionosonde**: Ahmedabad AH223 (near the EIA crest), plus Trivandrum TM308 (near the trough) if available in GIRO.
2. For each hour with a good autoscaled ionogram (CS ≥ 90, or manually scaled), take the **measured** foF2, hmF2 and profile → truth h′ for that path.
3. Compute h′ from the standard model and from IRI/PyIRI (and later our India model) → **h′ error → location error** via the hop geometry (∂D/∂h′ ≈ 4.4 km/km at β = 18°).
4. Repeat for quiet and storm days (selected by Dst/Kp) → error statistics **from real ionospheric data, with no DF measurements needed**.
5. COSMIC-2 profiles near India test the same thing away from the ionosondes, and map the EIA crest.

This answers the research question with real data and fixes the circularity.

## 3. Missing open sources worth adding
- **GIRO Trivandrum TM308**: the equatorial counterpart to Ahmedabad (crest vs trough). Check its data years.
- **Global TEC maps (IONEX: CODE / JPL / IGS)**: daily, open, show the EIA crests over India. Good for checking crest latitude and storm shifts.
- **Dst (WDC Kyoto)**: storm selection and the storm-level mapping, e.g. storm = clamp(−Dst / 250 nT, 0, 1), a proposal to calibrate.
- **NOAA/NCEI and the UK SSDC ionosonde archives**: older Indian ionosonde records.

## 4. Consequences for the website and repo
- **Do not ship raw GIRO data in `/web/public/`.** Share-alike limits raw-record sharing to account holders. Derived products (statistics, fitted corrections) are allowed, because the no-derivatives clause is not enforced. Publish only derived grids and error statistics.
- Add an **About / credits panel** when real data arrives: GIRO + station provider + Reinisch & Galkin 2011, UCAR/COSMIC DOI, PyIRI (Forsythe et al. 2024, doi:10.1029/2023SW003739), WSPR.
- Folder layout: adopt datasource.md's convention (`research/data/raw`, git-ignored; `research/data/processed`; website JSON in `web/public/data/`). `research/README.md` now matches.

## 5. Suggested order
1. PyIRI grids + IGRF modip → replace `getIono()` (milestone 2).
2. AH223 via `digisondeindices`: measured-truth h′ study (section 2). **This is the strongest new result for the paper.**
3. COSMIC-2 + IONEX: EIA geometry and storm days.
4. WSPR: forward-model and MUF check on Indian paths.
5. Optional hardware: a coherent HF array for real arrival angles.
