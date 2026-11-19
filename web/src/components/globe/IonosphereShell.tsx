import { useMemo } from "react";
import * as THREE from "three";
import { getIono, magLat, MODELS } from "../../physics.js";
import type { IriSampler } from "../../physics";
import { ll2v, radiusAt } from "./geo";
import type { Layers } from "../../store/analysisStore";

const STEP = 2, NLAT = 180 / STEP + 1, NLON = 360 / STEP + 1;

/** Fixed-altitude layer shell with a fresnel rim, so it reads as a 3D layer. */
function LayerShell({ hKm, exag, color, strength }: { hKm: number; exag: number; color: string; strength: number }) {
  const uniforms = useMemo(() => ({ c: { value: new THREE.Color(color) }, s: { value: strength } }), [color, strength]);
  return (
    <mesh scale={radiusAt(hKm, exag)} renderOrder={1}>
      <sphereGeometry args={[1, 96, 48]} />
      <shaderMaterial transparent depthWrite={false} side={THREE.FrontSide} uniforms={uniforms}
        vertexShader="varying vec3 vN; void main(){ vN = normalize(normalMatrix*normal); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);} "
        fragmentShader="uniform vec3 c; uniform float s; varying vec3 vN; void main(){ float r = pow(1.0 - abs(vN.z), 2.2); gl_FragColor = vec4(c, (0.02 + r * 0.5) * s); }" />
    </mesh>
  );
}

/** F2 shell: radius from hmF2, colour/opacity from foF2 (cyan -> purple), so the EIA crests stand out. */
function F2Shell({ utHours, f107, storm, exag, grid }: { utHours: number; f107: number; storm: number; exag: number; grid: IriSampler | null }) {
  const geometry = useMemo(() => {
    const opts = MODELS.india({ utHours, f107, storm, grid });
    const n = NLAT * NLON, fo = new Float32Array(n), hm = new Float32Array(n);
    let k = 0;
    for (let i = 0; i < NLAT; i++) for (let j = 0; j < NLON; j++, k++) { const io = getIono(90 - i * STEP, -180 + j * STEP, opts); fo[k] = io.foF2; hm[k] = io.hmF2; }
    const sorted = Float32Array.from(fo).sort();
    const lo = sorted[Math.floor(n * 0.75)], hi = sorted[n - 1];
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 4);
    const cA = new THREE.Color("#2998ff"), cB = new THREE.Color("#36cfff"), cC = new THREE.Color("#b56bff"), tmp = new THREE.Color();
    k = 0;
    for (let i = 0; i < NLAT; i++) for (let j = 0; j < NLON; j++, k++) {
      const v = ll2v(90 - i * STEP, -180 + j * STEP, radiusAt(hm[k], exag));
      pos.set([v.x, v.y, v.z], k * 3);
      const t = Math.min(1, Math.max(0, (fo[k] - lo) / Math.max(1, hi - lo)));
      if (t < 0.5) tmp.copy(cA).lerp(cB, t * 2); else tmp.copy(cB).lerp(cC, (t - 0.5) * 2);
      col.set([tmp.r, tmp.g, tmp.b, 0.015 + 0.42 * t * t], k * 4);
    }
    const idx: number[] = [];
    for (let i = 0; i < NLAT - 1; i++) for (let j = 0; j < NLON - 1; j++) { const a = i * NLON + j; idx.push(a, a + NLON, a + 1, a + 1, a + NLON, a + NLON + 1); }
    const g = new THREE.BufferGeometry();
    g.setIndex(idx);
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 4));
    g.computeBoundingSphere();
    return g;
  }, [utHours, f107, storm, exag, grid]);
  return <mesh geometry={geometry} renderOrder={2}><meshBasicMaterial vertexColors transparent depthWrite={false} /></mesh>;
}

/** Magnetic equator (EIA trough) and approximate crest lines at ±15° magnetic latitude (dipole, as in physics.js). */
function EiaLines() {
  const lines = useMemo(() => {
    const latFor = (target: number, lon: number) => { let lo = -80, hi = 80; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (magLat(m, lon) < target) lo = m; else hi = m; } return (lo + hi) / 2; };
    return [0, 15, -15].map((t) => {
      const pts: THREE.Vector3[] = [];
      for (let lon = -180; lon <= 180; lon++) pts.push(ll2v(latFor(t, lon), lon, 1.003));
      const g = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(g, t === 0
        ? new THREE.LineBasicMaterial({ color: "#b56bff", transparent: true, opacity: 0.75 })
        : new THREE.LineDashedMaterial({ color: "#b56bff", dashSize: 0.012, gapSize: 0.01, transparent: true, opacity: 0.55 }));
      if (t !== 0) line.computeLineDistances();
      return line;
    });
  }, []);
  return <>{lines.map((l, i) => <primitive key={i} object={l} />)}</>;
}

export default function IonosphereShell({ layers, utHours, f107, storm, exag, grid }: { layers: Layers; utHours: number; f107: number; storm: number; exag: number; grid: IriSampler | null }) {
  return (
    <group>
      {layers.D && <LayerShell hKm={75} exag={exag} color="#2f6fb0" strength={0.5} />}
      {layers.E && <LayerShell hKm={110} exag={exag} color="#2998ff" strength={0.6} />}
      {layers.F1 && <LayerShell hKm={200} exag={exag} color="#36cfff" strength={0.55} />}
      {layers.F2 && <F2Shell utHours={utHours} f107={f107} storm={storm} exag={exag} grid={grid} />}
      {layers.eia && <EiaLines />}
    </group>
  );
}
