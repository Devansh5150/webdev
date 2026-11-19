// Results panel: a plain-language summary first, technical details folded underneath.
import { fixQuality } from "../config.js";

const n = (v, d = 1) => (v == null || !isFinite(v) ? "—" : Number(v).toFixed(d));
const ll = (p) => (p ? `${n(p.lat, 2)}°N ${n(p.lon, 2)}°E` : "—");

function pill(km, suffix = "") {
  const q = fixQuality(km);
  return `<span class="pill pill--${q.cls}" title="Good &lt; 50 km · Fair 50–150 km · Poor &gt; 150 km">${q.label}${suffix}</span>`;
}
function kv(items) {
  return `<dl class="kv">${items.map(([k, v, u, wide]) =>
    `<div${wide ? ' class="wide"' : ""}><dt>${k}</dt><dd>${v}${u ? `<small>${u}</small>` : ""}</dd></div>`).join("")}</dl>`;
}
const fold = (title, body, open = false) => `<details class="fold"${open ? " open" : ""}><summary>${title}</summary><div class="fold__body">${body}</div></details>`;

const NAMES = {
  standard: ["Standard method", "Europe-style, ignores India's bulge"],
  india: ["India-aware method", "includes the bulge and storms"],
  v1india: ["Simple India method (v1)", "hand-tuned, independent of IRI"],
};
let SOURCE = "v1";
export function setSource(s) { SOURCE = s; NAMES.india[1] = s === "iri" ? "IRI-based (best case)" : "includes the bulge and storms"; }

/* ---------- summary cards ---------- */
function bigCard(key, km, sub = "off target") {
  const [name] = NAMES[key];
  return `<div class="sum__card sum__card--${key}">
    <span class="sum__k">${name}</span>
    <b class="sum__v">${km == null ? "no fix" : `${n(km, 0)}<small> km</small>`}</b>
    <span class="sum__s">${km == null ? "signal escapes in this model" : sub}</span>${pill(km)}</div>`;
}
function sentence(s, i) {
  if (s == null && i != null) return "The standard method cannot find the radio at all here: in its picture of the sky the signal escapes into space.";
  if (s == null || i == null) return "";
  if (s < 50) return "Both methods do well here: the ionosphere is behaving normally (for example in the morning, before India's bulge forms).";
  return `Ignoring India's afternoon ionosphere puts the guess <strong>${n(s - i, 0)} km</strong> away from where the India-aware method puts it${s / Math.max(i, 0.5) > 3 ? `, about ${n(s / Math.max(i, 0.5), 0)}× worse` : ""}.`;
}
function summary(res, title = "How close is each guess?") {
  if (!res || !res.ok) {
    return `<section class="sum"><h2>${title}</h2><p class="sum__say warn"><strong>No signal path.</strong> At this frequency the signal passes straight through the ionosphere, or the distance does not fit 1 to 3 bounces. Try a lower frequency or another time of day.</p></section>`;
  }
  const s = res.models.standard ? res.models.standard.err : null;
  const i = res.models.india ? res.models.india.err : null;
  return `<section class="sum"><h2>${title}</h2>
    <div class="sum__row">${bigCard("standard", s)}${bigCard("india", i)}</div>
    <p class="sum__say">${sentence(s, i)}</p>
    ${SOURCE === "iri" && res.models.v1india !== undefined ? `<p class="sum__fair">Fair test: the simple India method (not built from IRI) is <strong>${res.models.v1india ? n(res.models.v1india.err, 0) + " km" : "unable to fix"}</strong> off.</p>` : ""}
  </section>`;
}

/* ---------- details ---------- */
function signalDetails(res) {
  if (!res || !res.ok) return "";
  const fw = res.fw;
  return kv([
    ["Direction (azimuth)", n(fw.az, 1), "°"],
    ["Steepness (elevation)", n(fw.el, 1), "°"],
    ["Bounce height h′", n(fw.h, 0), "km"],
    ["foF2 at bounce point", n(fw.io.foF2, 2), "MHz"],
    ["Highest usable freq. (MUF)", n(res.muf, 1), "MHz"],
    ["Bounces", String(fw.hops), ""],
    ["Ground distance", n(fw.dist, 0), "km", true],
  ]);
}
function modelRows(key, m, truth = true) {
  const [name, sub] = NAMES[key];
  if (!m) return `<div class="model model--${key}"><div class="model__h"><h3>${name} <small>${sub}</small></h3>${pill(null)}</div><p class="note">No fix: the signal escapes in this model's ionosphere.</p></div>`;
  const E = m.E;
  return `<div class="model model--${key}">
    <div class="model__h"><h3>${name} <small>${sub}</small></h3>${pill(truth ? m.err : E && E.ok ? E.a : null, truth ? "" : " (ellipse)")}</div>
    <table>
      <tr><th>Guessed location</th><td>${ll(E.center)}</td></tr>
      ${truth ? `<tr><th>Distance from the real radio</th><td class="big">${n(m.err, 0)} km</td></tr>` : `<tr><th>Range from station</th><td>${n(E.center.range, 0)} km</td></tr><tr><th>Bounce height h′</th><td>${n(E.center.h, 0)} km</td></tr>`}
      <tr><th>95% uncertainty ellipse</th><td>${E.ok ? `${n(E.a, 0)} × ${n(E.b, 0)} km` : "—"}</td></tr>
    </table></div>`;
}
function modelDetails(res) {
  if (!res || !res.ok) return "";
  return modelRows("standard", res.models.standard) + modelRows("india", res.models.india) +
    ("v1india" in res.models ? modelRows("v1india", res.models.v1india) +
      `<p class="note">The truth here is IRI plus small disturbances, so the IRI-based method is a <strong>best case</strong>. The simple v1 method was not built from IRI, so its error is the fair test.</p>` : "");
}
const about = () => fold("About these numbers", SOURCE === "iri"
  ? `<p class="note"><strong>Ionosphere: IRI monthly median</strong> (PyIRI; the date sets the month). Storms and small disturbances are illustrative terms added on top. Mirror-model propagation, no ray tracing yet. All coordinates are examples. Globe imagery: NASA Blue Marble and Black Marble.</p>`
  : `<p class="note"><strong>v1 model is simplified and illustrative.</strong> Not IRI, no ray tracing yet. All coordinates are examples. Globe imagery: NASA Blue Marble and Black Marble.</p>`);

/* ---------- views ---------- */
export function renderForward(el, res) {
  el.innerHTML = `<div class="res">${summary(res)}
    ${res && res.ok ? fold("Signal details", signalDetails(res)) + fold("Method details", modelDetails(res)) : ""}
    ${about()}</div>`;
}

export function renderInverse(el, res, inp) {
  if (!res) { el.innerHTML = ""; return; }
  const s = res.models.standard, i = res.models.india;
  const card = (key, m) => `<div class="sum__card sum__card--${key}"><span class="sum__k">${NAMES[key][0]}</span>
    <b class="sum__v sum__v--sm">${m ? ll(m.E.center) : "no fix"}</b>
    <span class="sum__s">${m && m.E.ok ? `uncertainty ${n(m.E.a, 0)} × ${n(m.E.b, 0)} km` : "signal escapes in this model"}</span></div>`;
  el.innerHTML = `<div class="res">
    <section class="sum"><h2>Where do the methods think the radio is?</h2>
      <div class="sum__row">${card("standard", s)}${card("india", i)}</div>
      <p class="sum__say">${res.gap != null ? `The two guesses are <strong>${n(res.gap, 0)} km apart</strong>. Without knowing where the radio really is, that gap shows how much the ionosphere model matters.` : "One method cannot fix the radio at this frequency."}</p>
    </section>
    ${fold("Measurement details", kv([
      ["Direction (azimuth)", n(inp.az, 1), "°"], ["Steepness (elevation)", n(inp.el, 1), "°"],
      ["Frequency", n(inp.f, 1), "MHz"], ["Bounces assumed", String(inp.hops), ""],
      ["Bounce height (India-aware)", n(i && i.L.h, 0), "km"], ["foF2 at bounce point", n(i && i.io && i.io.foF2, 2), "MHz"],
    ]))}
    ${fold("Method details", modelRows("standard", s && { E: s.E }, false) + modelRows("india", i && { E: i.E }, false))}
    ${about()}</div>`;
}

export function renderStorm(el, res, storm) {
  el.innerHTML = `<div class="res">${summary(res, `At storm level ${n(storm, 2)}`)}
    <section><h2>Error as the storm grows</h2>
      <canvas class="chart" id="storm-chart" role="img" aria-label="Chart of location error against storm level for both methods"></canvas>
      <div class="legend-inline"><span><i class="sw sw--std"></i>Standard</span><span><i class="sw sw--ind"></i>India-aware</span></div>
    </section>
    ${res && res.ok ? fold("Signal details", signalDetails(res)) + fold("Method details", modelDetails(res)) : ""}
    ${about()}</div>`;
}

export function renderCompare(el, cmp) {
  if (!cmp) { el.innerHTML = ""; return; }
  const { india, europe, geo } = cmp;
  const e = (r, k) => (r && r.ok && r.models[k] ? r.models[k].err : null);
  const vals = [e(india, "standard"), e(india, "india"), e(europe, "standard"), e(europe, "india")];
  const max = Math.max(10, ...vals.filter((v) => v != null));
  const bar = (label, v, cls) => `<div><div class="bar__h"><span>${label}</span><b>${v == null ? "no path" : n(v, 0) + " km"}</b></div>
    <div class="bar" role="img" aria-label="${label}: ${v == null ? "no path" : n(v, 0) + " kilometres"}"><i class="${cls}" style="width:${v == null ? 0 : Math.max(1.5, (v / max) * 100)}%"></i></div></div>`;
  el.innerHTML = `<div class="res">
    <section class="sum"><h2>Same path, two places</h2>
      <div class="sum__row">
        <div class="sum__card sum__card--standard"><span class="sum__k">Standard method in India</span><b class="sum__v">${vals[0] == null ? "—" : n(vals[0], 0)}<small> km</small></b><span class="sum__s">off target</span>${pill(vals[0])}</div>
        <div class="sum__card sum__card--europe"><span class="sum__k">Standard method in Europe</span><b class="sum__v">${vals[2] == null ? "—" : n(vals[2], 0)}<small> km</small></b><span class="sum__s">off target</span>${pill(vals[2])}</div>
      </div>
      <p class="sum__say">The same method that works in Europe goes wrong over India, because India sits under the ionosphere's afternoon bulge.</p>
      <div class="btns"><button type="button" class="btn btn--sm" data-fly="india">Show India</button><button type="button" class="btn btn--sm" data-fly="europe">Show Europe</button></div>
    </section>
    ${fold("All four results", `<div class="bars">
        ${bar("India · standard", vals[0], "s")}${bar("India · India-aware", vals[1], "n")}
        ${bar("Europe · standard", vals[2], "s")}${bar("Europe · India-aware", vals[3], "n")}</div>
      <p class="note">${n(geo.d, 0)} km at bearing ${n(geo.az, 0)}°. India station ${ll(cmp.st)}; Europe reference ${ll(geo.stE)} (example).</p>`)}
    ${india && india.ok ? fold("India path: signal details", signalDetails(india)) : ""}
    ${about()}</div>`;
}
