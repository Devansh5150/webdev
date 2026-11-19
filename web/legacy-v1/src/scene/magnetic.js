// Magnetic equator and EIA crest guide lines (from the same dipole as physics.js magLat()).
import * as THREE from "three";
import { magLat } from "../physics.js";
import { ll2v } from "./globe.js";

// geographic latitude where magLat(lat, lon) === target, by bisection
function latForMag(target, lon) {
  let lo = -80, hi = 80;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (magLat(mid, lon) < target) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

export function createMagneticLines(scene) {
  const group = new THREE.Group();
  const line = (target, opts) => {
    const pts = [];
    for (let lon = -180; lon <= 180; lon += 1) pts.push(ll2v(latForMag(target, lon), lon, 1.0028));
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = opts.dashed
      ? new THREE.LineDashedMaterial({ color: 0xb79bff, dashSize: 0.012, gapSize: 0.01, transparent: true, opacity: opts.opacity })
      : new THREE.LineBasicMaterial({ color: 0xb79bff, transparent: true, opacity: opts.opacity });
    const l = new THREE.Line(g, mat);
    if (opts.dashed) l.computeLineDistances();
    group.add(l);
  };
  line(0, { opacity: 0.7 });                 // magnetic equator (EIA trough)
  line(15, { dashed: true, opacity: 0.45 }); // approximate crest latitudes
  line(-15, { dashed: true, opacity: 0.45 });
  scene.add(group);
  return { group, setVisible: (v) => { group.visible = v; } };
}
