// Signal paths drawn with the mirror (virtual-height) model:
// each hop rises in a straight virtual path from the ground to h' at the hop midpoint and back down.
import * as THREE from "three";
import { destination, distBearing } from "../physics.js";
import { ll2v, radiusAt, reducedMotion } from "./globe.js";

// Points along a multi-hop virtual path from (a) to (b): triangle height profile per hop, following the great circle.
export function hopPoints(a, b, hKm, hops, exag, samplesPerHop = 48) {
  const { d, az } = distBearing(a.lat, a.lon, b.lat, b.lon);
  const pts = [];
  const n = samplesPerHop * hops;
  for (let i = 0; i <= n; i++) {
    const s = i / n;
    const p = destination(a.lat, a.lon, az, d * s);
    const sh = (s * hops) % 1;
    const tri = i === n ? 0 : 1 - Math.abs(2 * sh - 1);
    pts.push(ll2v(p.lat, p.lon, radiusAt(hKm * tri, exag) + 0.0015));
  }
  return pts;
}

export function createPathLayer(scene) {
  const group = new THREE.Group();
  scene.add(group);
  const pulses = [];

  function clear() {
    pulses.length = 0;
    group.children.slice().forEach((c) => {
      group.remove(c);
      c.traverse((o) => { o.geometry?.dispose(); o.material?.dispose?.(); });
    });
  }

  // a glowing tube along the points, with an animated pulse travelling along it
  function addPath(pts, { color, radius = 0.0028, opacity = 0.95, dashed = false, pulse = true, speed = 1 }) {
    const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
    const segs = Math.max(64, pts.length * 2);
    if (dashed) {
      // dashed: short tube pieces
      const pieces = 40;
      for (let i = 0; i < pieces; i += 2) {
        const sub = [];
        for (let k = 0; k <= 6; k++) sub.push(curve.getPoint((i + k / 6) / pieces));
        const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(sub), 6, radius, 6, false),
          new THREE.MeshBasicMaterial({ color, transparent: true, opacity }));
        group.add(m);
      }
    } else {
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, segs, radius, 8, false),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity }));
      group.add(tube);
      const glow = new THREE.Mesh(new THREE.TubeGeometry(curve, segs, radius * 2.6, 8, false),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.18, depthWrite: false }));
      group.add(glow);
    }
    if (pulse) {
      const dot = new THREE.Mesh(new THREE.SphereGeometry(radius * 3.2, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      group.add(dot);
      pulses.push({ curve, dot, speed, offset: Math.random() });
      dot.position.copy(curve.getPoint(0.5));
    }
  }

  // vertical marker from ground to h' at each reflection (control) point
  function addReflections(a, b, hKm, hops, exag, color) {
    const { d, az } = distBearing(a.lat, a.lon, b.lat, b.lon);
    for (let k = 0; k < hops; k++) {
      const p = destination(a.lat, a.lon, az, (d / hops) * (k + 0.5));
      const top = ll2v(p.lat, p.lon, radiusAt(hKm, exag));
      const bottom = ll2v(p.lat, p.lon, 1.0015);
      const g = new THREE.BufferGeometry().setFromPoints([bottom, top]);
      group.add(new THREE.Line(g, new THREE.LineDashedMaterial({ color, dashSize: 0.01, gapSize: 0.008, transparent: true, opacity: 0.6 })));
      group.children[group.children.length - 1].computeLineDistances();
      const knot = new THREE.Mesh(new THREE.SphereGeometry(0.006, 12, 8), new THREE.MeshBasicMaterial({ color }));
      knot.position.copy(top);
      group.add(knot);
      // ground mark at the hop midpoint: in the mirror model the reflection sits directly above it
      const foot = new THREE.Mesh(new THREE.RingGeometry(0.006, 0.0095, 24),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }));
      foot.position.copy(ll2v(p.lat, p.lon, 1.002));
      foot.lookAt(ll2v(p.lat, p.lon, 2));
      group.add(foot);
    }
  }

  function tick(now) {
    for (const p of pulses) {
      const t = reducedMotion() ? 0.5 : ((((now / 2200) * p.speed + p.offset) % 1) + 1) % 1;
      p.dot.position.copy(p.curve.getPoint(t));
    }
  }

  return { group, clear, addPath, addReflections, tick };
}
