// Milestone 2: IRI (PyIRI) F2-layer grids, precomputed by research/make_iri_grids.py.
// Pure decoding + interpolation; loading is a thin fetch wrapper so this also runs in Node tests.
//
// Interpolation mirrors PyIRI exactly:
//   solar:  F10.7 -> R12 (quadratic) -> IG12 (quadratic), then linear between IG12 = 0 and 100
//   space:  bilinear in lat/lon on the "india" 1 deg grid, else the "global" 5 deg grid
//   time:   linear in UT (hourly nodes, cyclic)
// ym (parabolic semi-thickness used by physics.js) = 2 * B_F2_bot, matching the Epstein layer's
// curvature at the peak.

export function f107ToIG12(f107) {
  const a = 8.9e-4, b = 0.728, c = 63.75 - f107;
  const r12 = (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
  return -11.5634 + 1.5332 * r12 - 0.0031 * r12 * r12;
}

const PARAMS = ["fo", "hm", "bb"];

export function createIriSampler(meta, buffer, month) {
  const u16 = buffer instanceof Uint16Array ? buffer : new Uint16Array(buffer);
  if (u16.length !== meta.values_per_file) throw new Error(`IRI grid size mismatch: ${u16.length} vs ${meta.values_per_file}`);
  const nt = meta.ut.length;
  const grids = meta.grids.map((g) => {
    const n = nt * g.nlat * g.nlon;
    const views = {};
    let off = g.offset_values;
    for (const p of PARAMS) {
      const scale = meta.params[p].scale;
      views[p] = [0, 1].map(() => { const v = { data: u16.subarray(off, off + n), scale }; off += n; return v; });
    }
    return { ...g, lat1: g.lat0 + (g.nlat - 1) * g.dlat, lon1: g.lon0 + (g.nlon - 1) * g.dlon, views };
  });
  const india = grids.find((g) => g.name === "india"), global = grids.find((g) => g.name === "global");

  let igCache = { f: NaN, ig: 0 };
  function sample(lat, lon, utHours, f107) {
    lon = ((lon + 540) % 360) - 180;
    const g = lat >= india.lat0 && lat <= india.lat1 && lon >= india.lon0 && lon <= india.lon1 ? india : global;
    // spatial weights
    const y = Math.min(g.nlat - 1.000001, Math.max(0, (lat - g.lat0) / g.dlat));
    const x = Math.min(g.nlon - 1.000001, Math.max(0, (lon - g.lon0) / g.dlon));
    const i0 = Math.floor(y), j0 = Math.floor(x), fy = y - i0, fx = x - j0;
    // time weights (cyclic, hourly nodes)
    const t = ((utHours % 24) + 24) % 24;
    const t0 = Math.floor(t) % nt, t1 = (t0 + 1) % nt, ft = t - Math.floor(t);
    // solar weights
    if (igCache.f !== f107) igCache = { f: f107, ig: f107ToIG12(f107) };
    const wMax = igCache.ig / 100, wMin = 1 - wMax;
    const plane = g.nlat * g.nlon;
    const idx = (tt, i, j) => tt * plane + i * g.nlon + j;
    const out = {};
    for (const p of PARAMS) {
      let acc = 0;
      for (const [lv, w] of [[0, wMin], [1, wMax]]) {
        const { data, scale } = g.views[p][lv];
        const bil = (tt) =>
          (data[idx(tt, i0, j0)] * (1 - fx) + data[idx(tt, i0, j0 + 1)] * fx) * (1 - fy) +
          (data[idx(tt, i0 + 1, j0)] * (1 - fx) + data[idx(tt, i0 + 1, j0 + 1)] * fx) * fy;
        acc += w * ((bil(t0) * (1 - ft) + bil(t1) * ft) / scale);
      }
      out[p] = acc;
    }
    return { foF2: Math.max(1.0, out.fo), hmF2: out.hm, ym: 2 * out.bb, bb: out.bb, grid: g.name };
  }
  sample.month = month;
  sample.source = meta.source;
  return sample;
}

// Browser/worker loader with a per-month cache. baseUrl should end with "/".
const cache = new Map();
export function loadIri(month, baseUrl) {
  const key = `${baseUrl}|${month}`;
  if (!cache.has(key)) {
    cache.set(key, (async () => {
      const meta = await (await fetch(`${baseUrl}data/iri/meta.json`)).json();
      const buf = await (await fetch(`${baseUrl}data/iri/${meta.files[String(month)]}`)).arrayBuffer();
      return createIriSampler(meta, buf, month);
    })().catch((e) => { cache.delete(key); throw e; }));
  }
  return cache.get(key);
}
