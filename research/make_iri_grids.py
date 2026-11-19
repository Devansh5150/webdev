"""Milestone 2: precompute IRI (PyIRI) F2-layer grids for the website.

For each month we store foF2, hmF2 and B_F2_bot at the two solar-activity levels IRI uses
(IG12 = 0 and IG12 = 100), hourly in UT, on two grids:
  - "india":  1 deg, 15S-45N, 55-110E   (paths over and around India)
  - "global": 5 deg, whole globe         (3D shell, mid-latitude comparison)
The browser interpolates in solar activity exactly as PyIRI does (F10.7 -> R12 -> IG12, linear),
bilinearly in lat/lon and linearly in UT.

Output (website-ready, see docs/datasource_review.md):
  web/public/data/iri/meta.json
  web/public/data/iri/iri_mMM.bin   (uint16, little-endian, layout described in meta.json)

Run:  research/.venv/Scripts/python research/make_iri_grids.py [--check]
"""
import argparse
import json
import os
import sys
import time

import numpy as np
import PyIRI
import PyIRI.main_library as ml

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "web", "public", "data", "iri")
YEAR = 2026  # only affects the IGRF field used inside IRI; CCIR F2 coefficients are climatological

GRIDS = {
    "india": dict(lat0=-15.0, lat1=45.0, dlat=1.0, lon0=55.0, lon1=110.0, dlon=1.0),
    "global": dict(lat0=-90.0, lat1=90.0, dlat=5.0, lon0=-180.0, lon1=180.0, dlon=5.0),
}
UT = np.arange(0, 24, 1.0)
# uint16 quantisation: value = raw / scale
PARAMS = {"fo": 1000.0, "hm": 100.0, "bb": 500.0}  # MHz, km, km


def axes(g):
    lat = np.round(np.arange(g["lat0"], g["lat1"] + 1e-9, g["dlat"]), 6)
    lon = np.round(np.arange(g["lon0"], g["lon1"] + 1e-9, g["dlon"]), 6)
    return lat, lon


def month_params(month, lat, lon):
    """F2 parameters [param][level] -> array [nt, nlat, nlon]."""
    lon2, lat2 = np.meshgrid(lon, lat)  # [nlat, nlon]
    F2, _, _, _, _, _ = ml.IRI_monthly_mean_par(YEAR, month, UT, lon2.ravel(), lat2.ravel(), PyIRI.coeff_dir, 0)
    shape = (len(UT), len(lat), len(lon))
    out = {}
    for key, src in (("fo", "fo"), ("hm", "hm"), ("bb", "B_bot")):
        a = np.asarray(F2[src])  # [nt, ng, 2]
        out[key] = [a[:, :, k].reshape(shape) for k in (0, 1)]  # 0 = solar min, 1 = solar max
    return out


def ig12(f107):
    r12 = ml.F107_2_R12(f107)
    return ml.R12_2_IG12(r12)


def check(month=3, f107=140.0):
    """Compare our stored-grid interpolation against PyIRI's own daily output at the grid nodes."""
    lat, lon = axes(GRIDS["india"])
    p = month_params(month, lat, lon)
    ig = float(np.asarray(ig12(f107)).ravel()[0])
    ours = {k: v[0] * (100 - ig) / 100 + v[1] * ig / 100 for k, v in p.items()}
    lon2, lat2 = np.meshgrid(lon, lat)
    # mid-month day so PyIRI's month blending weights the same month fully
    F2, *_ = ml.IRI_density_1day(YEAR, month, 15, UT, lon2.ravel(), lat2.ravel(), np.array([300.0]), f107, PyIRI.coeff_dir, 0)
    shape = (len(UT), len(lat), len(lon))
    for key, src in (("fo", "fo"), ("hm", "hm"), ("bb", "B_bot")):
        ref = np.asarray(F2[src]).reshape(shape)
        d = np.abs(ours[key] - ref)
        print(f"  check {key}: max |ours - PyIRI daily| = {d.max():.4f}, median = {np.median(d):.4f}")
    return ig


def fixture(path, n=24, seed=1):
    """Reference values from PyIRI at random off-grid points over India (for the JS unit tests)."""
    rng = np.random.default_rng(seed)
    pts = []
    for month, f107 in ((3, 140.0), (6, 90.0), (10, 200.0)):
        lat = rng.uniform(-10, 40, n // 3); lon = rng.uniform(60, 105, n // 3); ut = rng.uniform(0, 23, n // 3)
        for la, lo, u in zip(lat, lon, ut):
            F2, *_ = ml.IRI_density_1day(YEAR, month, 15, np.array([u]), np.array([lo]), np.array([la]),
                                         np.array([300.0]), f107, PyIRI.coeff_dir, 0)
            pts.append({"month": month, "f107": f107, "lat": float(la), "lon": float(lo), "ut": float(u),
                        "foF2": float(np.asarray(F2["fo"]).ravel()[0]), "hmF2": float(np.asarray(F2["hm"]).ravel()[0]),
                        "bb": float(np.asarray(F2["B_bot"]).ravel()[0])})
    with open(path, "w") as f:
        json.dump({"note": "PyIRI IRI_density_1day, day 15 of month, off-grid points", "points": pts}, f, indent=1)
    print("wrote", path, len(pts), "points")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="only validate interpolation against PyIRI daily output")
    ap.add_argument("--fixture", action="store_true", help="write web/src/iri.fixture.json reference points for tests")
    args = ap.parse_args()
    if args.check:
        print("IG12(140) =", check())
        return
    if args.fixture:
        fixture(os.path.join(ROOT, "web", "src", "iri.fixture.json"))
        return

    os.makedirs(OUT, exist_ok=True)
    meta = {
        "source": f"PyIRI {getattr(PyIRI, '__version__', '0.1.7')} IRI_monthly_mean_par, CCIR foF2 coefficients, IGRF year {YEAR}",
        "citation": "Forsythe et al. (2024), Space Weather, doi:10.1029/2023SW003739",
        "generated": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "ut": UT.tolist(),
        "levels": {"solar_index": "IG12", "min": 0, "max": 100},
        "params": {k: {"scale": s} for k, s in PARAMS.items()},
        "param_notes": {"fo": "foF2 MHz", "hm": "hmF2 km", "bb": "B_F2_bot km (Epstein bottomside thickness; parabolic ym ~ 2*bb)"},
        "order": "for grid in grids: for param in [fo, hm, bb]: for level in [min, max]: uint16[nt][nlat][nlon]",
        "grids": [],
        "files": {},
    }
    offset = 0
    for name, g in GRIDS.items():
        lat, lon = axes(g)
        meta["grids"].append({"name": name, "lat0": g["lat0"], "dlat": g["dlat"], "nlat": len(lat),
                              "lon0": g["lon0"], "dlon": g["dlon"], "nlon": len(lon), "offset_values": offset})
        offset += len(PARAMS) * 2 * len(UT) * len(lat) * len(lon)
    meta["values_per_file"] = offset

    t0 = time.time()
    for month in range(1, 13):
        chunks = []
        stats = {}
        for name, g in GRIDS.items():
            lat, lon = axes(g)
            p = month_params(month, lat, lon)
            for key, scale in PARAMS.items():
                for k in (0, 1):
                    a = np.clip(np.round(p[key][k] * scale), 0, 65535).astype("<u2")
                    chunks.append(a.ravel())
                if name == "india":
                    stats[key] = [float(np.nanmin(p[key][1])), float(np.nanmax(p[key][1]))]
        buf = np.concatenate(chunks)
        assert buf.size == offset
        fn = f"iri_m{month:02d}.bin"
        buf.tofile(os.path.join(OUT, fn))
        meta["files"][str(month)] = fn
        print(f"month {month:2d}: {fn} {buf.nbytes / 1e6:.2f} MB  (India, solar max: foF2 {stats['fo'][0]:.1f}-{stats['fo'][1]:.1f} MHz, "
              f"hmF2 {stats['hm'][0]:.0f}-{stats['hm'][1]:.0f} km)  t={time.time() - t0:.1f}s")
    with open(os.path.join(OUT, "meta.json"), "w") as f:
        json.dump(meta, f, indent=1)
    print("wrote", os.path.join(OUT, "meta.json"))


if __name__ == "__main__":
    sys.exit(main())
