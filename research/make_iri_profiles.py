"""Electron-density profiles over India from PyIRI, for the dashboard's "Electron Density Profile" chart.

PyIRI IRI_density_1day (day 15 of each month) on a 5 deg grid (0-40N, 65-100E), every 2 h UT,
at F10.7 = 70, 100, 140, 180, 220 sfu, altitudes 60-600 km every 10 km.
Stored as log10(Ne [m^-3]) in uint16 (value = (log10Ne - 6) * 9000), plus layer peak heights.
Note: IRI's electron density below ~80 km (D region) is not reliable; the chart labels it as such.

Output: web/public/data/iri/profiles_meta.json, profiles_mMM.bin
Run: research/.venv/Scripts/python -I research/make_iri_profiles.py
"""
import json, os, time
import numpy as np
import PyIRI
import PyIRI.main_library as ml

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "web", "public", "data", "iri")
LAT = np.arange(0, 40.1, 5.0); LON = np.arange(65, 100.1, 5.0)
UT = np.arange(0, 24, 2.0); F107 = [70.0, 100.0, 140.0, 180.0, 220.0]; ALT = np.arange(60, 601, 10.0)
YEAR = 2026

lon2, lat2 = np.meshgrid(LON, LAT)
glon, glat = lon2.ravel(), lat2.ravel()
os.makedirs(OUT, exist_ok=True)
meta = {"source": "PyIRI 0.1.7 IRI_density_1day (day 15), CCIR", "lat": LAT.tolist(), "lon": LON.tolist(), "ut": UT.tolist(),
        "f107": F107, "alt": ALT.tolist(), "ne_encoding": "uint16 = (log10(Ne m^-3) - 6) * 9000",
        "peaks_encoding": "uint16 = km * 10 (hmE, hmF1, hmF2), P_F1 * 1000",
        "order": "ne[f107][ut][alt][lat*lon] then peaks[f107][ut][4][lat*lon]", "files": {}}
t0 = time.time()
for month in range(1, 13):
    ne_chunks, pk_chunks = [], []
    for f in F107:
        F2, F1, E, Es, sun, mag, EDP = ml.IRI_density_1day(YEAR, month, 15, UT, glon, glat, ALT, f, PyIRI.coeff_dir, 0)
        edp = np.clip(np.log10(np.maximum(np.asarray(EDP), 1e6)), 6, 13)  # [nt, nalt, ng]
        ne_chunks.append(np.round((edp - 6) * 9000).astype("<u2").ravel())
        pk = np.stack([np.asarray(E["hm"]) * 10, np.asarray(F1["hm"]) * 10, np.asarray(F2["hm"]) * 10,
                       np.clip(np.asarray(F1["P"]), 0, 1) * 1000], axis=1)  # [nt, 4, ng]
        pk_chunks.append(np.round(np.nan_to_num(pk)).clip(0, 65535).astype("<u2").ravel())
    buf = np.concatenate(ne_chunks + pk_chunks)
    fn = f"profiles_m{month:02d}.bin"
    buf.tofile(os.path.join(OUT, fn))
    meta["files"][str(month)] = fn
    print(f"month {month:2d}: {fn} {buf.nbytes / 1e3:.0f} kB  t={time.time() - t0:.1f}s")
meta["values_per_file"] = int(buf.size)
with open(os.path.join(OUT, "profiles_meta.json"), "w") as fp:
    json.dump(meta, fp, indent=1)
print("done")
