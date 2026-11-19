// Generates every paper figure (SVG) and results.json from web/src/physics.js, the same code the website runs.
// Run from the repo root:  node docs/paper/make_figures.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getIono, runScenario, forward, locate, muf, distBearing, destination, MODELS } from "../../web/src/physics.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "figures");
mkdirSync(OUT, { recursive: true });

const ST = { lat: 21.15, lon: 79.09 }, TX = { lat: 15.5, lon: 88.5 };   // examples
const BASE = { tx: TX, st: ST, f: 7.2, utHours: 9, f107: 140 };
const IST = 5.5, ut = (ist) => (ist - IST + 24) % 24;
const results = {};

/* ---------- tiny SVG line/bar chart helper ---------- */
const C = { std: "#6b7280", ind: "#d97706", a: "#7c3aed", b: "#0891b2", c: "#dc2626", d: "#16a34a" };
function lineChart({ file, title, xlabel, ylabel, series, xmin, xmax, ymin = 0, ymax, xticks, hlines = [] }) {
  const W = 640, H = 380, L = 64, R = 20, T = 40, B = 52;
  const X = (x) => L + ((x - xmin) / (xmax - xmin)) * (W - L - R);
  const Y = (y) => H - B - ((y - ymin) / (ymax - ymin)) * (H - T - B);
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="Helvetica,Arial,sans-serif" font-size="12"><rect width="${W}" height="${H}" fill="#fff"/>`;
  s += `<text x="${W / 2}" y="22" text-anchor="middle" font-size="14" font-weight="bold">${title}</text>`;
  for (let k = 0; k <= 5; k++) {
    const v = ymin + ((ymax - ymin) * k) / 5, y = Y(v);
    s += `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" stroke="#e5e7eb"/><text x="${L - 6}" y="${y + 4}" text-anchor="end">${+v.toFixed(1)}</text>`;
  }
  for (const x of xticks) s += `<line x1="${X(x)}" x2="${X(x)}" y1="${H - B}" y2="${H - B + 4}" stroke="#111"/><text x="${X(x)}" y="${H - B + 18}" text-anchor="middle">${x}</text>`;
  s += `<line x1="${L}" x2="${W - R}" y1="${H - B}" y2="${H - B}" stroke="#111"/><line x1="${L}" x2="${L}" y1="${T}" y2="${H - B}" stroke="#111"/>`;
  s += `<text x="${(L + W - R) / 2}" y="${H - 12}" text-anchor="middle">${xlabel}</text><text transform="translate(16 ${(T + H - B) / 2}) rotate(-90)" text-anchor="middle">${ylabel}</text>`;
  for (const h of hlines) s += `<line x1="${L}" x2="${W - R}" y1="${Y(h.y)}" y2="${Y(h.y)}" stroke="${h.color}" stroke-dasharray="5 4"/><text x="${W - R - 4}" y="${Y(h.y) - 4}" text-anchor="end" fill="${h.color}">${h.label}</text>`;
  series.forEach((se, i) => {
    const pts = se.pts.filter((p) => p[1] != null && isFinite(p[1]));
    s += `<polyline fill="none" stroke="${se.color}" stroke-width="2.2" ${se.dash ? 'stroke-dasharray="6 4"' : ""} points="${pts.map((p) => `${X(p[0]).toFixed(1)},${Y(Math.min(p[1], ymax)).toFixed(1)}`).join(" ")}"/>`;
    s += `<rect x="${L + 12}" y="${T + 6 + i * 18}" width="14" height="3" fill="${se.color}"/><text x="${L + 32}" y="${T + 11 + i * 18}">${se.label}</text>`;
  });
  writeFileSync(join(OUT, file), s + "</svg>");
}
function barChart({ file, title, ylabel, groups, ymax }) {
  const W = 640, H = 380, L = 64, R = 20, T = 40, B = 70;
  const Y = (y) => H - B - (y / ymax) * (H - T - B);
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="Helvetica,Arial,sans-serif" font-size="12"><rect width="${W}" height="${H}" fill="#fff"/>`;
  s += `<text x="${W / 2}" y="22" text-anchor="middle" font-size="14" font-weight="bold">${title}</text>`;
  for (let k = 0; k <= 5; k++) { const v = (ymax * k) / 5, y = Y(v); s += `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" stroke="#e5e7eb"/><text x="${L - 6}" y="${y + 4}" text-anchor="end">${Math.round(v)}</text>`; }
  const gw = (W - L - R) / groups.length;
  groups.forEach((g, gi) => {
    g.bars.forEach((b, bi) => {
      const bw = 46, x = L + gi * gw + gw / 2 - (g.bars.length * bw) / 2 + bi * bw;
      if (b.v == null) { s += `<text x="${x + bw / 2}" y="${Y(0) - 8}" text-anchor="middle" fill="#dc2626" font-size="10">no path</text>`; return; }
      s += `<rect x="${x + 4}" y="${Y(b.v)}" width="${bw - 8}" height="${Math.max(1, H - B - Y(b.v))}" fill="${b.color}"/><text x="${x + bw / 2}" y="${Y(b.v) - 5}" text-anchor="middle">${b.v.toFixed(0)}</text>`;
    });
    s += `<text x="${L + gi * gw + gw / 2}" y="${H - B + 20}" text-anchor="middle" font-weight="bold">${g.label}</text>`;
  });
  s += `<rect x="${L + 10}" y="${H - 28}" width="12" height="12" fill="${C.std}"/><text x="${L + 28}" y="${H - 18}">Standard model</text><rect x="${L + 160}" y="${H - 28}" width="12" height="12" fill="${C.ind}"/><text x="${L + 178}" y="${H - 18}">India-adjusted model</text>`;
  s += `<line x1="${L}" x2="${W - R}" y1="${H - B}" y2="${H - B}" stroke="#111"/><text transform="translate(16 ${(T + H - B) / 2}) rotate(-90)" text-anchor="middle">${ylabel}</text>`;
  writeFileSync(join(OUT, file), s + "</svg>");
}

/* ---------- Fig 1: foF2 vs latitude along 79 E (EIA) ---------- */
{
  const series = [[8, C.b], [11, C.a], [14.5, C.c], [18, C.d], [2, C.std]].map(([ist, color]) => ({
    label: `${String(Math.floor(ist)).padStart(2, "0")}:${ist % 1 ? "30" : "00"} IST`, color,
    pts: Array.from({ length: 81 }, (_, i) => { const lat = -10 + i * 0.5; return [lat, getIono(lat, 79, MODELS.india({ utHours: ut(ist), f107: 140, storm: 0 })).foF2]; }),
  }));
  series.push({ label: "Standard model, 14:30 IST", color: "#111", dash: true,
    pts: Array.from({ length: 81 }, (_, i) => { const lat = -10 + i * 0.5; return [lat, getIono(lat, 79, MODELS.standard({ utHours: ut(14.5), f107: 140, storm: 0 })).foF2]; }) });
  lineChart({ file: "fig1_eia_profile.svg", title: "foF2 along 79°E (India-adjusted model, F10.7 = 140)", xlabel: "Geographic latitude (°N)", ylabel: "foF2 (MHz)", series, xmin: -10, xmax: 30, ymax: 14, xticks: [-10, -5, 0, 5, 10, 15, 20, 25, 30] });
  const p = series[2].pts; const mx = p.reduce((a, b) => (b[1] > a[1] ? b : a)); const tr = p.filter((q) => q[0] > 5 && q[0] < 15).reduce((a, b) => (b[1] < a[1] ? b : a));
  results.eia = { crestLat: mx[0], crestFoF2: +mx[1].toFixed(2), troughLat: tr[0], troughFoF2: +tr[1].toFixed(2) };
}

/* ---------- Fig 2: error vs storm level ---------- */
{
  const lv = Array.from({ length: 11 }, (_, k) => k / 10).map((storm) => { const r = runScenario({ ...BASE, storm }); return { storm, s: r.models.standard?.err ?? null, i: r.models.india?.err ?? null, a: r.models.india?.E.a ?? null }; });
  lineChart({ file: "fig2_error_vs_storm.svg", title: "Location error vs storm level (example path, 14:30 IST)", xlabel: "Storm level (0 = quiet, 1 = strong)", ylabel: "Error vs truth (km)",
    series: [{ label: "Standard model", color: C.std, pts: lv.map((l) => [l.storm, l.s]) }, { label: "India-adjusted model", color: C.ind, pts: lv.map((l) => [l.storm, l.i]) }],
    xmin: 0, xmax: 1, ymax: 300, xticks: [0, 0.2, 0.4, 0.6, 0.8, 1], hlines: [{ y: 50, color: "#16a34a", label: "Good < 50 km" }, { y: 150, color: "#dc2626", label: "Poor > 150 km" }] });
  results.storm = lv.map((l) => ({ storm: l.storm, standard: +(l.s ?? NaN).toFixed(1), india: +(l.i ?? NaN).toFixed(1) }));
}

/* ---------- Fig 3: error vs time of day ---------- */
{
  const rows = [];
  for (let ist = 6; ist <= 23; ist += 0.5) {
    const r = runScenario({ ...BASE, utHours: ut(ist), storm: 0 });
    rows.push({ ist, ok: r.ok, s: r.ok ? r.models.standard?.err ?? null : null, i: r.ok ? r.models.india?.err ?? null : null, el: r.ok ? r.fw.el : null });
  }
  lineChart({ file: "fig3_error_vs_time.svg", title: "Location error vs local time (quiet day, 7.2 MHz; gaps = no 1-hop path)", xlabel: "Time (IST, hours)", ylabel: "Error vs truth (km)",
    series: [{ label: "Standard model", color: C.std, pts: rows.map((r) => [r.ist, r.s]) }, { label: "India-adjusted model", color: C.ind, pts: rows.map((r) => [r.ist, r.i]) }],
    xmin: 6, xmax: 23, ymax: 250, xticks: [6, 8, 10, 12, 14, 16, 18, 20, 22] });
  results.timeOfDay = rows.map((r) => ({ ist: r.ist, standard: r.s == null ? null : +r.s.toFixed(1), india: r.i == null ? null : +r.i.toFixed(1) }));
}

/* ---------- Fig 4: India vs mid-latitude ---------- */
{
  const { d, az } = distBearing(ST.lat, ST.lon, TX.lat, TX.lon);
  const stE = { lat: 50, lon: 10 }, txE = destination(stE.lat, stE.lon, az, d);
  const out = {};
  for (const storm of [0, 1]) {
    const ri = runScenario({ ...BASE, storm }), re = runScenario({ ...BASE, st: stE, tx: txE, storm });
    const pick = (r, k) => (r.ok && r.models[k] ? r.models[k].err : null);
    out[storm] = { india: { s: pick(ri, "standard"), i: pick(ri, "india") }, europe: { s: pick(re, "standard"), i: pick(re, "india"), ok: re.ok, muf: re.ok ? null : muf(txE, stE, MODELS.truth({ utHours: 9, f107: 140, storm }), 1) } };
  }
  barChart({ file: "fig4_india_vs_midlat.svg", title: "Same path (1175 km, 121°): India vs mid-latitude station", ylabel: "Error vs truth (km)", ymax: 300, groups: [
    { label: "India, quiet", bars: [{ v: out[0].india.s, color: C.std }, { v: out[0].india.i, color: C.ind }] },
    { label: "Mid-lat, quiet", bars: [{ v: out[0].europe.s, color: C.std }, { v: out[0].europe.i, color: C.ind }] },
    { label: "India, storm", bars: [{ v: out[1].india.s, color: C.std }, { v: out[1].india.i, color: C.ind }] },
    { label: "Mid-lat, storm", bars: [{ v: out[1].europe.s, color: C.std }, { v: out[1].europe.i, color: C.ind }] },
  ] });
  results.compare = JSON.parse(JSON.stringify(out, (k, v) => (typeof v === "number" ? +v.toFixed(1) : v)));
}

/* ---------- Fig 5: error map over India (standard model, point estimates, f = 0.8 MUF) ---------- */
{
  const W = 640, H = 600, L = 60, R = 120, T = 40, B = 50;
  const lat0 = 4, lat1 = 36, lon0 = 66, lon1 = 98, step = 1;
  const X = (lon) => L + ((lon - lon0) / (lon1 - lon0)) * (W - L - R), Y = (lat) => H - B - ((lat - lat0) / (lat1 - lat0)) * (H - T - B);
  const base = { utHours: ut(14.5), f107: 140, storm: 0 };
  const color = (e) => { if (e == null) return "#f3f4f6"; const t = Math.min(1, e / 200); const r = Math.round(255 * Math.min(1, 2 * t)), g = Math.round(255 * Math.min(1, 2 * (1 - t))); return `rgb(${r},${g},60)`; };
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="Helvetica,Arial,sans-serif" font-size="12"><rect width="${W}" height="${H}" fill="#fff"/>`;
  s += `<text x="${(L + W - R) / 2}" y="22" text-anchor="middle" font-size="14" font-weight="bold">Standard-model location error for transmitters around India</text>`;
  const cells = [];
  for (let lat = lat0; lat < lat1; lat += step) for (let lon = lon0; lon < lon1; lon += step) {
    const tx = { lat: lat + step / 2, lon: lon + step / 2 };
    const dd = distBearing(ST.lat, ST.lon, tx.lat, tx.lon).d;
    let e = null, ei = null;
    if (dd > 500) {
      const mu = muf(tx, ST, MODELS.truth(base), 1);
      if (mu) {
        const f = 0.8 * mu, fw = forward(tx, ST, f, MODELS.truth(base), 1);
        if (fw.ok) {
          const ps = locate(ST, fw.az, fw.el, f, MODELS.standard(base), 1), pi = locate(ST, fw.az, fw.el, f, MODELS.india(base), 1);
          if (ps) e = distBearing(ps.lat, ps.lon, tx.lat, tx.lon).d;
          if (pi) ei = distBearing(pi.lat, pi.lon, tx.lat, tx.lon).d;
        }
      }
    }
    cells.push({ lat, lon, e, ei });
    s += `<rect x="${X(lon)}" y="${Y(lat + step)}" width="${X(lon + step) - X(lon) + 0.3}" height="${Y(lat) - Y(lat + step) + 0.3}" fill="${color(e)}"/>`;
  }
  s += `<circle cx="${X(ST.lon)}" cy="${Y(ST.lat)}" r="6" fill="#0891b2" stroke="#fff" stroke-width="2"/><text x="${X(ST.lon) + 9}" y="${Y(ST.lat) + 4}" font-weight="bold">DF station (example)</text>`;
  for (let lat = lat0; lat <= lat1; lat += 4) s += `<text x="${L - 6}" y="${Y(lat) + 4}" text-anchor="end">${lat}°N</text>`;
  for (let lon = lon0; lon <= lon1; lon += 8) s += `<text x="${X(lon)}" y="${H - B + 18}" text-anchor="middle">${lon}°E</text>`;
  for (let k = 0; k <= 4; k++) { const e = k * 50, y = T + 20 + k * 40; s += `<rect x="${W - R + 20}" y="${y}" width="20" height="40" fill="${color(e)}"/><text x="${W - R + 46}" y="${y + 24}">${e}${k === 4 ? "+" : ""} km</text>`; }
  s += `<rect x="${W - R + 20}" y="${T + 230}" width="20" height="20" fill="#f3f4f6" stroke="#ccc"/><text x="${W - R + 46}" y="${T + 244}">no 1-hop or</text><text x="${W - R + 46}" y="${T + 258}">&lt; 500 km</text>`;
  s += `<text x="${(L + W - R) / 2}" y="${H - 10}" text-anchor="middle" fill="#555">14:30 IST, quiet, F10.7 = 140, f = 0.8 × MUF, 1 hop. Point estimates (no Monte Carlo). No borders drawn.</text>`;
  writeFileSync(join(OUT, "fig5_error_map.svg"), s + "</svg>");
  const ok = cells.filter((c) => c.e != null && c.ei != null);
  const med = (a) => { const b = a.slice().sort((x, y) => x - y); return b[Math.floor(b.length / 2)]; };
  results.map = { cells: ok.length, medianStandard: +med(ok.map((c) => c.e)).toFixed(1), medianIndia: +med(ok.map((c) => c.ei)).toFixed(1),
    p90Standard: +ok.map((c) => c.e).sort((a, b) => a - b)[Math.floor(ok.length * 0.9)].toFixed(1), fracGoodStandard: +(ok.filter((c) => c.e < 50).length / ok.length).toFixed(2), fracGoodIndia: +(ok.filter((c) => c.ei < 50).length / ok.length).toFixed(2) };
}

/* ---------- headline numbers ---------- */
{
  const r0 = runScenario({ ...BASE, storm: 0 });
  results.headline = { el: +r0.fw.el.toFixed(1), az: +r0.fw.az.toFixed(1), h: +r0.fw.h.toFixed(0), muf: +r0.muf.toFixed(1), dist: +r0.fw.dist.toFixed(0),
    ellipseStandard: [+r0.models.standard.E.a.toFixed(0), +r0.models.standard.E.b.toFixed(0)], ellipseIndia: [+r0.models.india.E.a.toFixed(0), +r0.models.india.E.b.toFixed(0)] };
}
writeFileSync(join(HERE, "results.json"), JSON.stringify(results, null, 2));
console.log(JSON.stringify({ ...results, timeOfDay: undefined, storm: results.storm.filter((_, i) => i % 5 === 0) }, null, 1));
