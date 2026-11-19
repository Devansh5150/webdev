// Ionosphere F2 shell: radius = RE + exaggeration * hmF2(lat, lon), colour mapped from foF2.
// The EIA crests show as raised, brighter bands either side of the magnetic equator.
import * as THREE from "three";
import { getIono, MODELS } from "../physics.js";
import { ll2v, radiusAt } from "./globe.js";

const STEP = 2; // degrees
const NLAT = 180 / STEP + 1, NLON = 360 / STEP + 1;
export const FO_MIN = 3, FO_MAX = 16;

// violet ramp: deep violet (low foF2) -> lavender -> near-white (high foF2)
const STOPS = [
  [0.0, [0.16, 0.08, 0.34]],
  [0.35, [0.42, 0.22, 0.78]],
  [0.65, [0.66, 0.5, 0.98]],
  [1.0, [0.97, 0.93, 1.0]],
];
export function foColor(fo, lo = FO_MIN, hi = FO_MAX) {
  const t = Math.min(1, Math.max(0, (fo - lo) / (hi - lo)));
  for (let i = 1; i < STOPS.length; i++) {
    if (t <= STOPS[i][0]) {
      const [t0, c0] = STOPS[i - 1], [t1, c1] = STOPS[i];
      const k = (t - t0) / (t1 - t0);
      return c0.map((c, j) => c + (c1[j] - c) * k);
    }
  }
  return STOPS[STOPS.length - 1][1];
}
export function foColorCss(fo) {
  const c = foColor(fo).map((x) => Math.round(x * 255));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

export function createIonosphere(scene) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(NLAT * NLON * 3);
  const col = new Float32Array(NLAT * NLON * 4);
  const idx = [];
  for (let i = 0; i < NLAT - 1; i++) {
    for (let j = 0; j < NLON - 1; j++) {
      const a = i * NLON + j, b = a + 1, c = a + NLON, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  geo.setIndex(idx);
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 4));

  const mat = new THREE.MeshBasicMaterial({
    vertexColors: true, transparent: true, opacity: 1, side: THREE.FrontSide, depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 2;
  scene.add(mesh);

  // faint grid lines on the shell so its shape reads in 3D
  const wire = new THREE.LineSegments(new THREE.WireframeGeometry(geo), new THREE.LineBasicMaterial({ color: 0x9d7bff, transparent: true, opacity: 0.05 }));
  wire.visible = false;

  let grid = null; // last foF2/hmF2 grid, for hover readouts
  let range = { lo: FO_MIN, hi: FO_MAX };

  function update({ utHours, f107, storm, exag, model = "india", grid = null }) {
    const opts = MODELS[model]({ utHours, f107, storm, grid });
    const fo = new Float32Array(NLAT * NLON), hm = new Float32Array(NLAT * NLON);
    let k = 0;
    // pass 1: sample the model
    for (let i = 0; i < NLAT; i++) {
      const lat = 90 - i * STEP;
      for (let j = 0; j < NLON; j++) {
        const io = getIono(lat, -180 + j * STEP, opts);
        fo[k] = io.foF2; hm[k] = io.hmF2; k++;
      }
    }
    // colour scale follows this frame's foF2 range (80th percentile to max): only the densest regions
    // (the EIA crests) glow, for both the v1 model and IRI, whose daytime foF2 is high almost everywhere
    const sorted = Float32Array.from(fo).sort();
    range = { lo: Math.floor(sorted[Math.floor(sorted.length * 0.8)]), hi: Math.ceil(sorted[sorted.length - 1]) };
    if (range.hi - range.lo < 2) range.hi = range.lo + 2;
    k = 0;
    // pass 2: geometry and colours
    for (let i = 0; i < NLAT; i++) {
      const lat = 90 - i * STEP;
      for (let j = 0; j < NLON; j++) {
        const lon = -180 + j * STEP;
        const io = { foF2: fo[k], hmF2: hm[k] };
        const v = ll2v(lat, lon, radiusAt(io.hmF2, exag));
        pos[k * 3] = v.x; pos[k * 3 + 1] = v.y; pos[k * 3 + 2] = v.z;
        const c = foColor(io.foF2, range.lo, range.hi);
        const t = Math.min(1, Math.max(0, (io.foF2 - range.lo) / (range.hi - range.lo)));
        col[k * 4] = c[0]; col[k * 4 + 1] = c[1]; col[k * 4 + 2] = c[2];
        const sm = Math.min(1, Math.max(0, (t - 0.05) / 0.8));
        col[k * 4 + 3] = 0.02 + 0.5 * sm * sm; // thin layer fades out, EIA crests glow
        k++;
      }
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
    geo.computeBoundingSphere();
    grid = { fo, hm };
  }

  function sample(lat, lon) {
    if (!grid) return null;
    const i = Math.round((90 - lat) / STEP), j = Math.round((lon + 180) / STEP);
    const k = Math.min(NLAT - 1, Math.max(0, i)) * NLON + Math.min(NLON - 1, Math.max(0, j));
    return { foF2: grid.fo[k], hmF2: grid.hm[k] };
  }

  return { mesh, update, sample, range: () => range, setVisible: (v) => { mesh.visible = v; } };
}
