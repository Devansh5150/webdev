// ===== HF single-station location physics (simplified, for research prototyping) =====
// Ionosphere: illustrative empirical F2-layer model with an equatorial ionization anomaly (EIA).
// Propagation: virtual-height (mirror) model on a spherical Earth, parabolic-layer virtual height,
// secant law for oblique incidence. Not IRI: replace getIono() with IRI/NavIC-assimilated data later.

export const RE = 6371; // km
const D2R = Math.PI / 180, R2D = 180 / Math.PI;
const POLE_LAT = 80.8 * D2R, POLE_LON = -72.7 * D2R; // geomagnetic dipole pole (approx. 2025)

// ---------- geodesy ----------
export function distBearing(lat1, lon1, lat2, lon2) {
  const p1 = lat1 * D2R, p2 = lat2 * D2R, dl = (lon2 - lon1) * D2R;
  const a = Math.sin((p2 - p1) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  const d = 2 * RE * Math.asin(Math.min(1, Math.sqrt(a)));
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return { d, az: (Math.atan2(y, x) * R2D + 360) % 360 };
}
export function destination(lat, lon, azDeg, dKm) {
  const p1 = lat * D2R, l1 = lon * D2R, th = azDeg * D2R, dr = dKm / RE;
  const p2 = Math.asin(Math.sin(p1) * Math.cos(dr) + Math.cos(p1) * Math.sin(dr) * Math.cos(th));
  const l2 = l1 + Math.atan2(Math.sin(th) * Math.sin(dr) * Math.cos(p1), Math.cos(dr) - Math.sin(p1) * Math.sin(p2));
  return { lat: p2 * R2D, lon: ((l2 * R2D + 540) % 360) - 180 };
}

// ---------- ionosphere ----------
export function magLat(lat, lon) {
  const p = lat * D2R, l = lon * D2R;
  return Math.asin(Math.sin(p) * Math.sin(POLE_LAT) + Math.cos(p) * Math.cos(POLE_LAT) * Math.cos(l - POLE_LON)) * R2D;
}
const g = (x, s) => Math.exp(-((x / s) ** 2));

/**
 * @param opts {utHours, f107, storm(0..1), eia(bool), tid(bool)}
 * @returns {foF2 MHz, hmF2 km, ym km, m magnetic lat}
 */
export function getIono(lat, lon, opts) {
  const { utHours, f107 = 140, storm = 0, eia = true, tid = false, stormAware = true } = opts;
  const s = stormAware ? storm : 0;
  const lt = ((utHours + lon / 15) % 24 + 24) % 24;
  const m = magLat(lat, lon);
  const day = 0.32 + 0.68 * Math.max(0, Math.cos(((lt - 14) / 12) * Math.PI)) ** 0.7;
  const foNoon = 5.2 + 0.026 * (f107 - 70);
  const latFac = Math.pow(Math.max(0.2, Math.cos(m * D2R)), 0.4);
  let fo = foNoon * day * latFac;
  let hm = 285 + 45 * (1 - day);
  let ym = 95;
  if (eia) {
    // fountain effect builds after ~09 LT, peaks in afternoon/evening
    const e = lt > 8 && lt < 23 ? Math.sin(((lt - 8) / 15) * Math.PI) ** 0.8 : 0;
    const amp = 0.62 * e * (1 + 0.7 * s);
    const crest = 13 + 4 * e + 5 * s;
    fo *= 1 + amp * (g(m - crest, 7) + g(m + crest, 7)) - 0.28 * e * g(m, 5.5);
    hm += 75 * e * g(m, 13);
    ym += 25 * e * g(m, 15);
  }
  // storm: negative phase at mid/high latitudes, uplift everywhere
  fo *= 1 - 0.38 * s * Math.min(1, (Math.abs(m) / 55) ** 1.6);
  hm += 45 * s;
  if (tid) {
    // small-scale structure (travelling ionospheric disturbances) that no model knows
    const w = Math.sin(lat * 0.21 + lon * 0.17 + utHours * 0.9) * Math.cos(lon * 0.11 - lat * 0.07);
    fo *= 1 + (0.04 + 0.12 * storm) * w;
    hm += (8 + 30 * storm) * w;
  }
  return { foF2: Math.max(1.5, fo), hmF2: hm, ym, m, lt };
}

// model presets
export const MODELS = {
  truth: (o) => ({ ...o, eia: true, tid: true }),
  india: (o) => ({ ...o, eia: true, tid: false }),
  standard: (o) => ({ ...o, eia: false, tid: false, stormAware: false }),
};

// ---------- propagation ----------
// virtual reflection height for elevation beta (deg) and frequency f (MHz); null if the ray penetrates
export function virtualHeight(betaDeg, f, io) {
  const hb = io.hmF2 - io.ym;
  const b = betaDeg * D2R;
  const sinI = (RE * Math.cos(b)) / (RE + hb);
  const cosI = Math.sqrt(Math.max(0, 1 - sinI * sinI));
  const x = (f * cosI) / io.foF2; // equivalent vertical frequency ratio (secant law)
  if (x >= 0.995) return null;
  const xs = Math.max(x, 1e-4);
  return hb + (io.ym / 2) * xs * Math.log((1 + xs) / (1 - xs));
}
// single-hop ground range (km) for elevation beta and virtual height h
export function hopRange(betaDeg, h) {
  const b = betaDeg * D2R;
  const th = Math.PI / 2 - b - Math.asin((RE * Math.cos(b)) / (RE + h));
  return 2 * RE * th;
}

// Inverse: station + measured azimuth/elevation -> estimated emitter location
export function locate(st, azDeg, betaDeg, f, opts, hops = 1) {
  let D = 900 * hops, h = 300, io = null;
  for (let it = 0; it < 30; it++) {
    const hop = D / hops;
    let hs = 0;
    for (let k = 0; k < hops; k++) {
      const c = destination(st.lat, st.lon, azDeg, hop * (k + 0.5));
      io = getIono(c.lat, c.lon, opts);
      const hv = virtualHeight(betaDeg, f, io);
      if (hv === null) return null;
      hs += hv;
    }
    h = hs / hops;
    const Dn = hopRange(betaDeg, h) * hops;
    if (Math.abs(Dn - D) < 0.05) { D = Dn; break; }
    D = 0.5 * D + 0.5 * Dn;
  }
  const p = destination(st.lat, st.lon, azDeg, D);
  return { lat: p.lat, lon: p.lon, range: D, h, hops };
}

// Forward: transmitter + station -> arrival elevation (low ray), reflection height, hops used
export function forward(tx, st, f, opts, hopPref = 0) {
  const { d, az } = distBearing(st.lat, st.lon, tx.lat, tx.lon); // azimuth seen from the station
  const tryHops = hopPref ? [hopPref] : [1, 2, 3];
  for (const hops of tryHops) {
    const hop = d / hops;
    const ios = [];
    for (let k = 0; k < hops; k++) {
      const c = destination(st.lat, st.lon, az, hop * (k + 0.5));
      ios.push(getIono(c.lat, c.lon, opts));
    }
    const rangeAt = (beta) => {
      let hs = 0;
      for (const io of ios) { const hv = virtualHeight(beta, f, io); if (hv === null) return null; hs += hv; }
      const h = hs / ios.length;
      return { D: hopRange(beta, h), h };
    };
    // low ray: scan up from grazing until hop range drops to the required hop length
    let prev = null;
    for (let beta = 0.5; beta <= 85; beta += 0.25) {
      const r = rangeAt(beta);
      if (!r) break; // penetration: beyond this the signal escapes
      if (prev && prev.r.D >= hop && r.D <= hop) {
        let lo = prev.beta, hi = beta;
        for (let i = 0; i < 40; i++) {
          const mid = (lo + hi) / 2, rm = rangeAt(mid);
          if (!rm) { hi = mid; continue; }
          if (rm.D > hop) lo = mid; else hi = mid;
        }
        const beta0 = (lo + hi) / 2, rf = rangeAt(beta0);
        return { ok: true, az, el: beta0, h: rf.h, hops, dist: d, io: ios[0] };
      }
      prev = { beta, r };
    }
  }
  return { ok: false, az, dist: d };
}

// maximum usable frequency for the path (1 hop if possible)
export function muf(tx, st, opts, hops = 1) {
  let lo = 1, hi = 40;
  if (!forward(tx, st, lo, opts, hops).ok) return null;
  for (let i = 0; i < 22; i++) {
    const mid = (lo + hi) / 2;
    if (forward(tx, st, mid, opts, hops).ok) lo = mid; else hi = mid;
  }
  return lo;
}

// ---------- uncertainty ----------
export function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
function gauss(r) { const u = Math.max(1e-9, r()), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

// Monte Carlo cloud of location estimates -> 95% error ellipse in km (local east/north)
export function errorEllipse(st, az, el, f, opts, hops, cfg = {}) {
  const { n = 240, sAz = 1.0, sEl = 1.0, sFo = 0.07, sHm = 15, seed = 7 } = cfg;
  const r = rng(seed);
  const center = locate(st, az, el, f, opts, hops);
  if (!center) return null;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const kFo = 1 + sFo * gauss(r), dHm = sHm * gauss(r);
    const o2 = { ...opts, _kFo: kFo, _dHm: dHm };
    const p = locatePerturbed(st, az + sAz * gauss(r), el + sEl * gauss(r), f, o2, hops);
    if (p) pts.push(p);
  }
  if (pts.length < 10) return { center, pts, ok: false };
  const kx = Math.cos(center.lat * D2R) * RE * D2R, ky = RE * D2R;
  const xy = pts.map((p) => [(p.lon - center.lon) * kx, (p.lat - center.lat) * ky]);
  const mx = xy.reduce((a, q) => a + q[0], 0) / xy.length, my = xy.reduce((a, q) => a + q[1], 0) / xy.length;
  let sxx = 0, syy = 0, sxy = 0;
  for (const [x, y] of xy) { sxx += (x - mx) ** 2; syy += (y - my) ** 2; sxy += (x - mx) * (y - my); }
  sxx /= xy.length; syy /= xy.length; sxy /= xy.length;
  const tr = sxx + syy, det = sxx * syy - sxy * sxy;
  const l1 = tr / 2 + Math.sqrt(Math.max(0, tr * tr / 4 - det)), l2 = tr / 2 - Math.sqrt(Math.max(0, tr * tr / 4 - det));
  const ang = 0.5 * Math.atan2(2 * sxy, sxx - syy); // radians from east, counter-clockwise
  const k = Math.sqrt(5.991); // 95% for 2 dof
  return { center, pts, ok: true, a: k * Math.sqrt(Math.max(l1, 0)), b: k * Math.sqrt(Math.max(l2, 0)), ang, kx, ky };
}
function locatePerturbed(st, az, el, f, opts, hops) {
  const base = getIono;
  const wrapped = { ...opts };
  // perturb via a shallow copy of getIono output
  let D = 900 * hops, h = 300;
  for (let it = 0; it < 30; it++) {
    const hop = D / hops; let hs = 0;
    for (let k = 0; k < hops; k++) {
      const c = destination(st.lat, st.lon, az, hop * (k + 0.5));
      const io0 = base(c.lat, c.lon, wrapped);
      const io = { ...io0, foF2: io0.foF2 * opts._kFo, hmF2: io0.hmF2 + opts._dHm };
      const hv = virtualHeight(el, f, io);
      if (hv === null) return null;
      hs += hv;
    }
    h = hs / hops;
    const Dn = hopRange(el, h) * hops;
    if (Math.abs(Dn - D) < 0.1) { D = Dn; break; }
    D = 0.5 * D + 0.5 * Dn;
  }
  return destination(st.lat, st.lon, az, D);
}

export function ellipsePoints(E, n = 72) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * 2 * Math.PI;
    const x = E.a * Math.cos(t), y = E.b * Math.sin(t);
    const xe = x * Math.cos(E.ang) - y * Math.sin(E.ang), yn = x * Math.sin(E.ang) + y * Math.cos(E.ang);
    out.push({ lat: E.center.lat + yn / E.ky, lon: E.center.lon + xe / E.kx });
  }
  return out;
}

// ---------- one full scenario ----------
export function runScenario({ tx, st, f, utHours, f107, storm, hopPref = 0, angErr = 1.0 }) {
  const base = { utHours, f107, storm };
  const fw = forward(tx, st, f, MODELS.truth(base), hopPref);
  if (!fw.ok) return { ok: false, fw };
  const res = { ok: true, fw, models: {} };
  for (const key of ["standard", "india"]) {
    const E = errorEllipse(st, fw.az, fw.el, f, MODELS[key](base), fw.hops, { sAz: angErr, sEl: angErr });
    if (!E) { res.models[key] = null; continue; }
    const err = distBearing(E.center.lat, E.center.lon, tx.lat, tx.lon).d;
    res.models[key] = { E, err };
  }
  res.muf = muf(tx, st, MODELS.truth(base), fw.hops);
  return res;
}
