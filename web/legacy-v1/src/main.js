// HF Single-Station Locator (India), v1 prototype: state, routing, worker, scene drawing.
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-mono/600.css";
import "./style.css";

import { forward, MODELS, distBearing, destination } from "./physics.js";
import { EXAMPLE, EUROPE_ST, istToUt } from "./config.js";
import { createGlobe, ll2v } from "./scene/globe.js";
import { createIonosphere, FO_MIN, FO_MAX } from "./scene/ionosphere.js";
import { createTransmitter, createStation, createMarker, placeOnGlobe, AMBER, GREY } from "./scene/models.js";
import { createPathLayer, hopPoints } from "./scene/paths.js";
import { createEllipseLayer } from "./scene/ellipse.js";
import { controlsHTML, applyView, INTRO, PRESETS } from "./ui/controls.js";
import { createMagneticLines } from "./scene/magnetic.js";
import { renderForward, renderInverse, renderStorm, renderCompare, setSource } from "./ui/results.js";
import { loadIri } from "./iri.js";
import { drawStormChart } from "./ui/charts.js";

const VIEWS = ["forward", "inverse", "storm", "compare"];
const RAY1 = 0xffb547, RAY2 = 0xff8a3d;

/* ---------------- state ---------------- */
function exampleState() {
  return {
    view: "forward",
    tx: { ...EXAMPLE.tx }, st: { ...EXAMPLE.st },
    f: EXAMPLE.f, hopPref: EXAMPLE.hopPref, date: EXAMPLE.date, ist: EXAMPLE.ist,
    f107: EXAMPLE.f107, storm: EXAMPLE.storm, angErr: EXAMPLE.angErr, exag: EXAMPLE.exag,
    shell: "india", showIono: true, showCloud: true, showMag: true, source: "iri", globeStyle: "satellite",
    inv: { ...EXAMPLE.inverse },
    place: "tx",
    cam: new URLSearchParams(location.search).get("cam") === "top" ? "top" : "tilt",
  };
}
const S = exampleState();
// Inverse defaults: the angles the example transmitter actually produces (truth model).
S.inv = { ...S.inv, ...exampleAngles() };

function exampleAngles() {
  const fw = forward(EXAMPLE.tx, EXAMPLE.st, EXAMPLE.f, MODELS.truth({ utHours: istToUt(EXAMPLE.ist), f107: EXAMPLE.f107, storm: 0 }));
  return fw.ok ? { az: +fw.az.toFixed(1), el: +fw.el.toFixed(1), hops: fw.hops } : {};
}
const ut = () => istToUt(S.ist);
const month = () => (S.date ? +S.date.slice(5, 7) : new Date().getMonth() + 1) || 3;
const BASE_URL = new URL(import.meta.env.BASE_URL, location.href).href; // absolute, also valid inside the worker
const srcFields = () => ({ source: S.source, month: month(), baseUrl: BASE_URL });
const base = () => ({ tx: S.tx, st: S.st, f: S.f, utHours: ut(), f107: S.f107, storm: S.storm, hopPref: S.hopPref, angErr: S.angErr, ...srcFields() });

/* ---------------- worker client ---------------- */
const worker = new Worker(new URL("./worker.js", import.meta.url), { type: "module" });
let nextId = 1;
const pending = new Map();
const latest = {};
worker.onmessage = (e) => {
  const { id, type, result, error } = e.data;
  const p = pending.get(id);
  pending.delete(id);
  setBusy(pending.size > 0);
  if (!p || latest[type] !== id) return; // stale
  if (error) { console.error(error); return; }
  p(result);
};
function ask(type, payload) {
  const id = nextId++;
  latest[type] = id;
  setBusy(true);
  return new Promise((resolve) => { pending.set(id, resolve); worker.postMessage({ id, type, payload: JSON.parse(JSON.stringify(payload)) }); });
}
const busyEl = document.getElementById("busy");
let busyTimer = 0;
function setBusy(on) {
  clearTimeout(busyTimer);
  if (on) busyTimer = setTimeout(() => { busyEl.hidden = false; }, 180);
  else busyEl.hidden = true;
}

/* ---------------- scene ---------------- */
const canvas = document.getElementById("globe");
const G = createGlobe(canvas);
const iono = createIonosphere(G.scene);
const paths = createPathLayer(G.scene);
const ellipses = createEllipseLayer(G.scene);
const magLines = createMagneticLines(G.scene);
const tx = createTransmitter(), st = createStation();
const tx2 = createTransmitter(), st2 = createStation(); // mid-latitude copies for #compare
const mStd = createMarker(GREY), mInd = createMarker(AMBER), mStd2 = createMarker(GREY), mInd2 = createMarker(AMBER);
[tx.obj, st.obj, tx2.obj, st2.obj, mStd, mInd, mStd2, mInd2].forEach((o) => { o.visible = false; G.scene.add(o); });
G.onTick((now) => { tx.tick(now); tx2.tick(now); paths.tick(now); });

let shellTimer = 0;
function updateShell(immediate = false) {
  clearTimeout(shellTimer);
  const run = async () => {
    // sun and guide lines do not depend on the ionosphere data: apply them before any download
    G.setSun(ut(), S.date);
    magLines.setVisible(S.showMag);
    let grid = null;
    if (S.source === "iri" && S.shell !== "standard") { try { grid = await loadIri(month(), BASE_URL); } catch (e) { console.warn("IRI grid not loaded, using v1", e); } }
    iono.update({ utHours: ut(), f107: S.f107, storm: S.storm, exag: S.exag, model: S.shell, grid });
    iono.setVisible(S.showIono);
    renderKey(); // the foF2 colour range is per frame
  };
  if (immediate) run(); else shellTimer = setTimeout(run, 90);
}

function clearScene() {
  paths.clear(); ellipses.clear();
  [tx.obj, st.obj, tx2.obj, st2.obj, mStd, mInd, mStd2, mInd2].forEach((o) => { o.visible = false; });
}

function show(obj, p) { placeOnGlobe(obj, p.lat, p.lon); obj.visible = true; }

// draw one forward scenario (truth path + both model estimates)
function drawScenario(res, txP, stP, txObj, stObj, mS, mI) {
  show(txObj, txP); show(stObj, stP);
  if (!res || !res.ok) return;
  const fw = res.fw;
  paths.addPath(hopPoints(txP, stP, fw.h, fw.hops, S.exag), { color: fw.hops === 1 ? RAY1 : RAY2 });
  paths.addReflections(txP, stP, fw.h, fw.hops, S.exag, fw.hops === 1 ? RAY1 : RAY2);
  for (const [key, marker, color] of [["standard", mS, GREY], ["india", mI, AMBER]]) {
    const m = res.models[key];
    if (!m) continue;
    show(marker, m.E.center);
    ellipses.addEllipse(m.E, color, { cloud: S.showCloud });
  }
}

/* ---------------- views ---------------- */
const resultsEl = document.getElementById("results");
let lastForward = null;

async function compute() {
  const view = S.view;
  if (view === "forward") {
    const res = await ask("scenario", base());
    if (S.view !== "forward") return;
    lastForward = res;
    if (!S.invTouched && res && res.ok) S.inv = { az: +res.fw.az.toFixed(1), el: +res.fw.el.toFixed(1), hops: res.fw.hops };
    clearScene();
    drawScenario(res, S.tx, S.st, tx.obj, st.obj, mStd, mInd);
    renderForward(resultsEl, res);
  } else if (view === "inverse") {
    // Until the user types their own angles, use what the example transmitter produces under the active truth.
    if (!S.invTouched) {
      const r = await ask("scenario", base());
      if (S.view !== "inverse") return;
      if (r && r.ok) { S.inv = { az: +r.fw.az.toFixed(1), el: +r.fw.el.toFixed(1), hops: r.fw.hops }; writeForm(); }
    }
    const inp = { st: S.st, az: S.inv.az, el: S.inv.el, f: S.f, utHours: ut(), f107: S.f107, storm: S.storm, hops: S.inv.hops, angErr: S.angErr, ...srcFields() };
    const res = await ask("inverse", inp);
    if (S.view !== "inverse") return;
    clearScene();
    show(st.obj, S.st);
    for (const [key, marker, color, dashed] of [["standard", mStd, GREY, true], ["india", mInd, AMBER, false]]) {
      const m = res.models[key];
      if (!m) continue;
      paths.addPath(hopPoints(S.st, m.L, m.L.h, S.inv.hops, S.exag), { color: key === "india" ? (S.inv.hops === 1 ? RAY1 : RAY2) : GREY, dashed, pulse: !dashed, speed: -1 });
      show(marker, m.L);
      ellipses.addEllipse(m.E, color, { cloud: S.showCloud });
    }
    renderInverse(resultsEl, res, inp);
  } else if (view === "storm") {
    const [res, levels] = await Promise.all([ask("scenario", base()), ask("sweep", base())]);
    if (S.view !== "storm") return;
    clearScene();
    drawScenario(res, S.tx, S.st, tx.obj, st.obj, mStd, mInd);
    renderStorm(resultsEl, res, S.storm);
    const c = document.getElementById("storm-chart");
    if (c && levels) drawStormChart(c, levels, S.storm);
  } else if (view === "compare") {
    const cmp = await ask("compare", base());
    if (S.view !== "compare") return;
    cmp.st = S.st;
    clearScene();
    drawScenario(cmp.india, S.tx, S.st, tx.obj, st.obj, mStd, mInd);
    drawScenario(cmp.europe, cmp.geo.txE, cmp.geo.stE, tx2.obj, st2.obj, mStd2, mInd2);
    renderCompare(resultsEl, cmp);
    resultsEl.querySelectorAll("[data-fly]").forEach((b) => b.addEventListener("click", () => { lastCompareSide = b.getAttribute("data-fly"); flyView(lastCompareSide); }));
  }
}

let computeTimer = 0;
function schedule(ms = 140) { clearTimeout(computeTimer); computeTimer = setTimeout(compute, ms); }

function midpoint(a, b) {
  const { d, az } = distBearing(a.lat, a.lon, b.lat, b.lon);
  return destination(a.lat, a.lon, az, d / 2);
}
// Camera sits south-west of the target and slightly closer, so ray heights read in 3D.
const OBLIQUE = { dLat: -13, dLon: -9, dist: 2.85 };
function flyView(which, ms) {
  let m;
  if (which === "europe") {
    const { d, az } = distBearing(S.st.lat, S.st.lon, S.tx.lat, S.tx.lon);
    m = midpoint(EUROPE_ST, destination(EUROPE_ST.lat, EUROPE_ST.lon, az, d));
  } else m = midpoint(S.st, S.tx);
  if (S.cam === "top") G.flyTo(m.lat, m.lon, 2.45, ms); // straight down over the path midpoint
  else G.flyTo(m.lat + OBLIQUE.dLat, m.lon + OBLIQUE.dLon, OBLIQUE.dist, ms);
}

/* ---------------- key (legend) ---------------- */
const KEY = {
  tx: ["dot", "var(--coral)", "Transmitter (Tx)"],
  st: ["dot", "var(--cyan)", "DF station (St)"],
  ray1: ["line", "var(--amber)", "Signal path, 1 hop"],
  ray2: ["line", "#ff8a3d", "Signal path, 2–3 hops"],
  back: ["line", "var(--amber)", "Back-traced ray (India model)"],
  backStd: ["dash", "var(--grey)", "Back-traced ray (standard)"],
  refl: ["drop", "var(--amber)", "Reflection point h′, over the hop midpoint"],
  estStd: ["ring", "var(--grey)", "Standard model: estimate and 95% ellipse"],
  estInd: ["ring", "var(--amber)", "India model: estimate and 95% ellipse"],
  cloud: ["cloud", "var(--amber-2)", "Monte Carlo fixes"],
  iono: ["ramp", "", ""],
  mag: ["line", "#b79bff", "Magnetic equator (solid), EIA crests ±15° mag (dashed)"],
  night: ["night", "", "Night side (sun position from date and IST)"],
};
function renderKey() {
  const by = {
    forward: ["tx", "st", "ray1", "ray2", "refl", "estStd", "estInd", "cloud", "iono"],
    inverse: ["st", "back", "backStd", "estStd", "estInd", "cloud", "iono"],
    storm: ["tx", "st", "ray1", "ray2", "refl", "estStd", "estInd", "cloud", "iono"],
    compare: ["tx", "st", "ray1", "refl", "estStd", "estInd", "iono"],
  }[S.view].concat(["mag", "night"]).filter((k) => (k === "cloud" ? S.showCloud : k === "iono" ? S.showIono : k === "mag" ? S.showMag : true));
  document.getElementById("key-list").innerHTML = by.map((k) => {
    if (k === "iono") { const r = iono.range(); return `<li><i class="k k--ramp" aria-hidden="true"></i><span>Ionosphere shell, foF2 <b>${r.lo}</b>–<b>${r.hi}</b> MHz (${S.shell === "standard" ? "standard" : S.source === "iri" ? "IRI" : "v1 India"})</span></li>`; }
    const [shape, c, label] = KEY[k];
    return `<li><i class="k k--${shape}" style="--c:${c}" aria-hidden="true"></i><span>${label}</span></li>`;
  }).join("") + (S.view === "compare" ? `<li><span class="small" style="color:var(--dim)">Same symbols at the mid-latitude reference.</span></li>` : "");
}
const keyToggle = document.getElementById("key-toggle");
keyToggle.addEventListener("click", () => {
  const open = keyToggle.getAttribute("aria-expanded") !== "true";
  keyToggle.setAttribute("aria-expanded", String(open));
  document.getElementById("key-list").hidden = !open;
});
if (window.matchMedia("(max-width: 720px)").matches) keyToggle.click(); // start collapsed on phones

/* ---------------- camera toggle ---------------- */
const camEl = document.querySelector(".cam");
function setCam(mode, fly = true) {
  S.cam = mode;
  camEl.querySelectorAll("[data-cam]").forEach((b) => b.setAttribute("aria-pressed", String(b.getAttribute("data-cam") === mode)));
  if (fly) flyView(S.view === "compare" && lastCompareSide === "europe" ? "europe" : "india");
}
let lastCompareSide = "india";
camEl.addEventListener("click", (e) => { const b = e.target.closest("[data-cam]"); if (b) setCam(b.getAttribute("data-cam")); });

/* ---------------- controls ---------------- */
const form = document.getElementById("form");
form.innerHTML = controlsHTML();
const $ = (id) => document.getElementById(id);

function writeForm() {
  $("tx-lat").value = S.tx.lat; $("tx-lon").value = S.tx.lon;
  $("st-lat").value = S.st.lat; $("st-lon").value = S.st.lon;
  $("az").value = S.inv.az; $("el").value = S.inv.el; $("inv-hops").value = String(S.inv.hops);
  $("f").value = S.f; $("hops").value = String(S.hopPref);
  $("date").value = S.date; $("ist").value = S.ist;
  $("f107").value = S.f107; $("storm").value = S.storm; $("angErr").value = S.angErr; $("exag").value = S.exag;
  $("source").value = S.source;
  $("globe-style").value = S.globeStyle;
  $("shell").value = S.shell; $("show-iono").checked = S.showIono; $("show-cloud").checked = S.showCloud; $("show-mag").checked = S.showMag;
  writeOutputs();
}
function writeOutputs() {
  $("f-out").textContent = `${(+S.f).toFixed(1)} MHz`;
  $("f107-out").textContent = `${S.f107} sfu`;
  $("storm-out").textContent = (+S.storm).toFixed(2) + (S.storm == 0 ? " quiet" : S.storm >= 0.7 ? " strong" : S.storm >= 0.35 ? " moderate" : " minor");
  $("angErr-out").textContent = `${(+S.angErr).toFixed(2)}°`;
  $("angErr-sum").textContent = `σ ${(+S.angErr).toFixed(2)}°`;
  // filled slider tracks
  form.querySelectorAll('input[type="range"]').forEach((r) => r.style.setProperty("--p", `${((r.value - r.min) / (r.max - r.min)) * 100}%`));
  markPreset();
  $("exag-out").textContent = `×${S.exag}`;

  setSource(S.source);
  $("source-hint").textContent = S.source === "iri"
    ? `IRI for ${new Date(Date.UTC(2026, month() - 1, 1)).toLocaleString("en", { month: "long", timeZone: "UTC" })} (from the date), interpolated to F10.7 = ${S.f107}. Storm and small disturbances added on top.`
    : "Hand-tuned illustrative F2 model. Ignores the season.";
  document.querySelector(".caveat").innerHTML = S.source === "iri"
    ? `<strong>Ionosphere: IRI monthly median (PyIRI)</strong> + illustrative storm terms. All coordinates are examples. Heights exaggerated ×<span id="cav-exag">${S.exag}</span>.`
    : `<strong>Simplified, illustrative ionosphere (v1).</strong> Not IRI. All coordinates are examples. Heights exaggerated ×<span id="cav-exag">${S.exag}</span>.`;
  const u = ut();
  $("ut-hint").textContent = `= ${String(Math.floor(u)).padStart(2, "0")}:${String(Math.round((u % 1) * 60)).padStart(2, "0")} UT. The EIA builds after about 09:00 local time and peaks in the afternoon.`;
}

const num = (id, lo, hi, fallback) => {
  const v = parseFloat($(id).value);
  return isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback;
};

form.addEventListener("input", (e) => {
  const id = e.target.id;
  const shellKeys = ["ist", "date", "f107", "storm", "exag", "shell", "show-iono", "show-mag", "source"];
  S.tx = { lat: num("tx-lat", -89, 89, S.tx.lat), lon: num("tx-lon", -180, 180, S.tx.lon) };
  S.st = { lat: num("st-lat", -89, 89, S.st.lat), lon: num("st-lon", -180, 180, S.st.lon) };
  if (["az", "el", "inv-hops"].includes(id)) S.invTouched = true;
  S.inv = { az: num("az", 0, 360, S.inv.az), el: num("el", 1, 85, S.inv.el), hops: +$("inv-hops").value };
  S.f = +$("f").value; S.hopPref = +$("hops").value;
  S.date = $("date").value; S.ist = $("ist").value || S.ist;
  S.f107 = +$("f107").value; S.storm = +$("storm").value; S.angErr = +$("angErr").value; S.exag = +$("exag").value;
  S.source = $("source").value;
  S.globeStyle = $("globe-style").value;
  G.setStyle(S.globeStyle);
  S.shell = $("shell").value; S.showIono = $("show-iono").checked; S.showCloud = $("show-cloud").checked; S.showMag = $("show-mag").checked;
  writeOutputs();
  if (shellKeys.includes(id)) updateShell();
  if (["show-iono", "show-cloud", "show-mag", "shell"].includes(id)) renderKey();
  if (["show-iono", "shell", "show-mag", "globe-style"].includes(id)) return; // display-only changes // date and source change the IRI month / truth: recompute
  schedule(e.target.type === "range" ? 160 : 260);
});
form.addEventListener("submit", (e) => e.preventDefault());

function markPreset() {
  form.querySelectorAll("[data-preset]").forEach((b) => {
    const p = PRESETS.find((x) => x.id === b.getAttribute("data-preset")).set;
    const on = p.tx.lat === S.tx.lat && p.tx.lon === S.tx.lon && +p.f === +S.f && p.ist === S.ist && +p.storm === +S.storm && +p.hopPref === +S.hopPref &&
      S.st.lat === EXAMPLE.st.lat && S.st.lon === EXAMPLE.st.lon;
    b.setAttribute("aria-pressed", String(on));
  });
}
form.addEventListener("click", (e) => {
  const b = e.target.closest("[data-preset]");
  if (!b) return;
  const p = PRESETS.find((x) => x.id === b.getAttribute("data-preset")).set;
  Object.assign(S, { st: { ...EXAMPLE.st }, tx: { ...p.tx }, f: p.f, ist: p.ist, storm: p.storm, hopPref: p.hopPref });
  // inverse view: feed it the angles this preset's transmitter would produce
  const fw = forward(S.tx, S.st, S.f, MODELS.truth({ utHours: ut(), f107: S.f107, storm: S.storm }), S.hopPref);
  if (fw.ok) S.inv = { az: +fw.az.toFixed(1), el: +fw.el.toFixed(1), hops: fw.hops };
  S.invTouched = false; // re-derive the angles from the active truth (IRI or v1)
  writeForm(); updateShell(true); schedule(0); flyView("india");
});

$("reset").addEventListener("click", () => {
  Object.assign(S, exampleState(), { view: S.view });
  S.inv = { ...EXAMPLE.inverse, ...exampleAngles() };
  writeForm(); updateShell(true); schedule(0); flyView("india");
});
$("fly-india").addEventListener("click", () => flyView("india"));
$("copy-fw").addEventListener("click", () => {
  const fw = lastForward && lastForward.ok ? lastForward.fw : null;
  const a = fw ? { az: +fw.az.toFixed(1), el: +fw.el.toFixed(1), hops: fw.hops } : exampleAngles();
  S.inv = { ...S.inv, ...a };
  S.invTouched = true;
  writeForm(); schedule(0);
});

/* ---------------- placing on the globe ---------------- */
const placeEl = document.getElementById("place");
function setPlace(mode) {
  S.place = mode;
  placeEl.querySelectorAll("[data-place]").forEach((b) => b.setAttribute("aria-pressed", String(b.getAttribute("data-place") === mode)));
  canvas.classList.toggle("placing", mode !== "off");
}
placeEl.addEventListener("click", (e) => {
  const b = e.target.closest("[data-place]");
  if (b) setPlace(b.getAttribute("data-place"));
});
let down = null;
canvas.addEventListener("pointerdown", (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
canvas.addEventListener("pointerup", (e) => {
  if (!down) return;
  const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
  down = null;
  if (moved > 5 || S.place === "off") return;
  const p = G.pick(e.clientX, e.clientY);
  if (!p) return;
  const r = { lat: +p.lat.toFixed(2), lon: +p.lon.toFixed(2) };
  const mode = S.view === "inverse" ? "st" : S.place;
  if (mode === "tx") S.tx = r; else S.st = r;
  writeForm(); schedule(0);
});

// hover readout of the shell under the cursor
const hoverEl = document.getElementById("hover");
let hoverRaf = 0;
canvas.addEventListener("pointermove", (e) => {
  if (hoverRaf) return;
  hoverRaf = requestAnimationFrame(() => {
    hoverRaf = 0;
    const p = G.pick(e.clientX, e.clientY);
    const io = p && iono.sample(p.lat, p.lon);
    if (!p || !io) { hoverEl.style.display = "none"; return; }
    hoverEl.style.display = "block";
    hoverEl.textContent = `${p.lat.toFixed(1)}°N ${p.lon.toFixed(1)}°E\nfoF2 ${io.foF2.toFixed(1)} MHz · hmF2 ${io.hmF2.toFixed(0)} km`;
  });
});
canvas.addEventListener("pointerleave", () => { hoverEl.style.display = "none"; });

/* ---------------- routing ---------------- */
const tabs = document.querySelectorAll(".tabs a");
function route() {
  const v = location.hash.replace("#", "");
  if (!VIEWS.includes(v)) { history.replaceState(null, "", "#forward"); return route(); }
  const prev = S.view;
  S.view = v;
  tabs.forEach((a) => (a.getAttribute("data-view") === v ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current")));
  applyView(form, v);
  form.dataset.view = v;
  $("view-intro").innerHTML = INTRO[v];
  renderKey();
  placeEl.hidden = v === "compare";
  placeEl.querySelector('[data-place="tx"]').hidden = v === "inverse";
  if (v === "inverse" && S.place === "tx") setPlace("st");
  document.title = `${{ forward: "Forward", inverse: "Inverse", storm: "Quiet vs storm", compare: "India vs Europe" }[v]} · HF Single-Station Locator · India`;
  resultsEl.innerHTML = "";
  compute();
  if (v === "compare" && prev !== "compare") {
    flyView("europe");
    setTimeout(() => { if (S.view === "compare") flyView("india"); }, 3400);
  } else if (prev === "compare" && v !== "compare") flyView("india");
}
window.addEventListener("hashchange", route);

// keyboard: 1-4 switch views (when not typing)
window.addEventListener("keydown", (e) => {
  if (e.target.closest("input, select, textarea") || e.metaKey || e.ctrlKey || e.altKey) return;
  const i = ["1", "2", "3", "4"].indexOf(e.key);
  if (i !== -1) location.hash = "#" + VIEWS[i];
});
window.addEventListener("resize", () => {
  const c = document.getElementById("storm-chart");
  if (c && S.view === "storm") schedule(100);
});

/* ---------------- start: open on a working example ---------------- */
writeForm();
G.setStyle(S.globeStyle);
setCam(S.cam, false);
setPlace("tx");
updateShell(true);
flyView("india", 0);
route();

// for headless checks
window.__ssl = { state: S, compute };
