// Pure analysis functions used by the Web Worker (and unit tests). No DOM, no fetch.
import { runScenario, errorEllipse, locate, getIono, destination, distBearing, MODELS, ellipsePoints, hopRange, virtualHeight } from "../physics.js";
import { EUROPE_ST, EXAMPLE } from "../config.js";

// In IRI mode, also score the hand-tuned v1 India model, which is independent of the IRI truth.
export function addV1India(res, p) {
  if (!p.grid || !res || !res.ok) return res;
  const base = { utHours: p.utHours, f107: p.f107, storm: p.storm };
  const E = errorEllipse(p.st, res.fw.az, res.fw.el, p.f, MODELS.india(base), res.fw.hops, { sAz: p.angErr, sEl: p.angErr });
  res.models.v1india = E ? { E, err: distBearing(E.center.lat, E.center.lon, p.tx.lat, p.tx.lon).d } : null;
  return res;
}

export function inverse({ st, az, el, f, utHours, f107, storm, hops, angErr, grid }) {
  const base = { utHours, f107, storm, grid };
  const out = { models: {} };
  for (const key of ["standard", "india"]) {
    const opts = MODELS[key](base);
    const E = errorEllipse(st, az, el, f, opts, hops, { sAz: angErr, sEl: angErr });
    const L = locate(st, az, el, f, opts, hops);
    let io = null;
    if (L) { const c = destination(st.lat, st.lon, az, L.range / hops / 2); io = getIono(c.lat, c.lon, opts); }
    out.models[key] = E && L ? { E, L, io } : null;
  }
  const s = out.models.standard, i = out.models.india;
  out.gap = s && i ? distBearing(s.L.lat, s.L.lon, i.L.lat, i.L.lon).d : null;
  return out;
}

export function sweep(p) {
  const levels = [];
  for (let k = 0; k <= 10; k++) {
    const storm = k / 10;
    const r = runScenario({ ...p, storm }); // p.grid carries the IRI sampler when in IRI mode
    levels.push({
      storm,
      standard: r.ok && r.models.standard ? r.models.standard.err : null,
      india: r.ok && r.models.india ? r.models.india.err : null,
    });
  }
  return levels;
}

export function compare(p) {
  const india = addV1India(runScenario(p), p);
  const { d, az } = distBearing(p.st.lat, p.st.lon, p.tx.lat, p.tx.lon);
  const stE = EUROPE_ST, txE = destination(stE.lat, stE.lon, az, d);
  const europe = runScenario({ ...p, st: stE, tx: txE });
  return { india, europe, geo: { d, az, stE, txE } };
}

/* ---------- dashboard: inverse analysis for 1 and 2 hops (mode ambiguity) ---------- */

export function hopEstimate(p, hops, storm, n = 240) {
  const base = { utHours: p.utHours, f107: p.f107, storm, grid: p.grid };
  const opts = MODELS.india(base);
  const st = { lat: p.stationLat, lon: p.stationLon };
  const L = locate(st, p.azimuth, p.elevation, p.frequency, opts, hops);
  if (!L) return { hops, ok: false, reason: "No reflection: at this frequency and elevation the ray passes through the ionosphere (or no consistent range exists)." };
  const E = errorEllipse(st, p.azimuth, p.elevation, p.frequency, opts, hops, { sAz: p.angErr, sEl: p.angErr, n });
  const cps = Array.from({ length: hops }, (_, k) => destination(st.lat, st.lon, p.azimuth, (L.range / hops) * (k + 0.5)));
  const io = getIono(cps[0].lat, cps[0].lon, opts);
  const S = locate(st, p.azimuth, p.elevation, p.frequency, MODELS.standard(base), hops);
  const within = E && E.pts.length ? E.pts.filter((q) => distBearing(q.lat, q.lon, L.lat, L.lon).d <= p.confidenceRadiusKm).length / n : 0;
  return {
    hops, ok: true, lat: L.lat, lon: L.lon, rangeKm: L.range, reflectionHeightKm: L.h, foF2: io.foF2,
    ellipse: E && E.ok ? { a: E.a, b: E.b, angDeg: (E.ang * 180) / Math.PI, ring: ellipsePoints(E, 96) } : null,
    cloud: E ? E.pts.slice(0, 240) : [],
    confidence: Math.round(within * 100),
    standard: S ? { lat: S.lat, lon: S.lon, rangeKm: S.range, shiftKm: distBearing(S.lat, S.lon, L.lat, L.lon).d } : null,
    controlPoints: cps,
  };
}

// elevation vs ground range at the estimate's control point(s), for 1 and 2 hops
export function curve(p, est, hops, storm) {
  const st = { lat: p.stationLat, lon: p.stationLon };
  const opts = MODELS.india({ utHours: p.utHours, f107: p.f107, storm, grid: p.grid });
  const range0 = est && est.ok ? est.rangeKm : 1000 * hops;
  const ios = Array.from({ length: hops }, (_, k) => { const c = destination(st.lat, st.lon, p.azimuth, (range0 / hops) * (k + 0.5)); return getIono(c.lat, c.lon, opts); });
  const out = [];
  for (let el = 1; el <= 70; el += 1) {
    let hs = 0, okAll = true;
    for (const io of ios) { const h = virtualHeight(el, p.frequency, io); if (h === null) { okAll = false; break; } hs += h; }
    if (!okAll) break;
    out.push({ rangeKm: hopRange(el, hs / ios.length) * hops, el });
  }
  return out;
}

export function analysis(p) {
  const t0 = performance.now();
  const est = { 1: hopEstimate(p, 1, p.condition), 2: hopEstimate(p, 2, p.condition) };
  const c1 = curve(p, est[1], 1, p.condition), c2 = curve(p, est[2], 2, p.condition);
  const unc = [["Quiet", 0], ["Disturbed", 0.8]].map(([label, storm]) => {
    const a = (h) => { const r = hopEstimate(p, h, storm, 160); return r.ok && r.ellipse ? r.ellipse.a : null; };
    return { label, condition: storm, hop1: a(1), hop2: a(2) };
  });
  return {
    estimates: est,
    elevationRange: { hop1: c1, hop2: c2, measured: { 1: est[1].ok ? { rangeKm: est[1].rangeKm, el: p.elevation } : null, 2: est[2].ok ? { rangeKm: est[2].rangeKm, el: p.elevation } : null } },
    uncertaintyByCondition: unc,
    computeMs: performance.now() - t0,
  };
}

// scenario comparison with a known (example) transmitter, so errors vs truth exist
export function comparison(p) {
  const tx = EXAMPLE.tx, st = EXAMPLE.st, f = EXAMPLE.f;
  const run = (over) => addV1India(runScenario({ tx, st, f, utHours: p.utHours, f107: p.f107, storm: 0, angErr: p.angErr, grid: p.grid, ...over }), { ...p, tx, st, f, storm: over.storm ?? 0 });
  const pick = (id, label, group, r) => ({
    id, label, group, ok: !!(r && r.ok),
    standardKm: r && r.ok && r.models.standard ? r.models.standard.err : null,
    indiaKm: r && r.ok && r.models.india ? r.models.india.err : null,
    independentKm: r && r.ok && r.models.v1india ? r.models.v1india.err : null,
    uncertaintyKm: r && r.ok && r.models.india ? r.models.india.E.a : null,
  });
  const cmp = compare({ tx, st, f, utHours: p.utHours, f107: p.f107, storm: 0, angErr: p.angErr, grid: p.grid });
  return {
    truth: { tx, st, f },
    cases: [
      pick("quiet", "Quiet (storm 0)", "condition", run({ storm: 0 })),
      pick("disturbed", "Disturbed (storm 0.8)", "condition", run({ storm: 0.8 })),
      pick("india", "India station", "region", cmp.india),
      pick("midlat", "Mid-latitude reference", "region", cmp.europe),
      pick("hop1", "1-hop path", "hops", run({ hopPref: 1 })),
      pick("hop2", "2-hop path", "hops", run({ hopPref: 2 })),
    ],
  };
}

