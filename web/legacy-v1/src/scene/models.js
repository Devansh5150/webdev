// Generic, non-branded low-poly models built from primitives.
//   Transmitter: a small utility vehicle with a whip antenna and pulsing rings (coral).
//   DF station:  a shelter with a ring of 8 vertical antenna masts (cyan).
import * as THREE from "three";
import { ll2v, reducedMotion } from "./globe.js";

export const CORAL = 0xff6f61, CYAN = 0x38d6f5, AMBER = 0xffb547, GREY = 0x9aa4b2;
const UP = new THREE.Vector3(0, 1, 0);
const SCALE = 0.03; // model height in Earth radii (exaggerated so it reads at country scale)

function std(color, emissive = 0.25) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.15, emissive: color, emissiveIntensity: emissive, flatShading: true });
}

// place a group on the surface, "up" along the local normal
export function placeOnGlobe(obj, lat, lon, r = 1) {
  const n = ll2v(lat, lon, 1);
  obj.position.copy(n.clone().multiplyScalar(r));
  obj.quaternion.setFromUnitVectors(UP, n);
}

export function createTransmitter() {
  const g = new THREE.Group();
  const body = std(CORAL, 0.35), dark = std(0x3a2a2a, 0.05);
  const hull = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.38, 0.55), body);
  hull.position.set(0, 0.3, 0);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.3, 0.5), body);
  cab.position.set(0.32, 0.62, 0);
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.26, 0.46), dark);
  box.position.set(-0.22, 0.6, 0);
  g.add(hull, cab, box);
  const wheelGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.1, 10);
  for (const [x, z] of [[0.33, 0.29], [-0.33, 0.29], [0.33, -0.29], [-0.33, -0.29]]) {
    const w = new THREE.Mesh(wheelGeo, dark);
    w.rotation.x = Math.PI / 2;
    w.position.set(x, 0.12, z);
    g.add(w);
  }
  const whip = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.025, 1.6, 6), std(0xffe0d8, 0.5));
  whip.position.set(-0.3, 1.5, 0);
  g.add(whip);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), std(0xffffff, 1));
  tip.position.set(-0.3, 2.32, 0);
  g.add(tip);

  // pulsing emission rings around the whip tip
  const rings = [];
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.9, 1.0, 40),
      new THREE.MeshBasicMaterial({ color: CORAL, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(-0.3, 0.05, 0);
    g.add(ring);
    rings.push(ring);
  }
  g.scale.setScalar(SCALE);

  function tick(now) {
    rings.forEach((ring, i) => {
      if (reducedMotion()) { ring.scale.setScalar(1.2 + i * 0.6); ring.material.opacity = 0.25; return; }
      const t = ((now / 1600 + i / 3) % 1);
      ring.scale.setScalar(0.3 + t * 2.6);
      ring.material.opacity = 0.65 * (1 - t);
    });
  }
  return { obj: g, tick };
}

export function createStation() {
  const g = new THREE.Group();
  const shell = std(CYAN, 0.3), metal = std(0xd8f6ff, 0.4);
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.05, 24), std(0x16384a, 0.1));
  pad.position.y = 0.025;
  const hut = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.38, 0.4), shell);
  hut.position.y = 0.24;
  const roof = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.05, 0.45), metal);
  roof.position.y = 0.45;
  g.add(pad, hut, roof);
  // circular array: 8 vertical masts (generic Adcock / circular-array style)
  const mastGeo = new THREE.CylinderGeometry(0.025, 0.035, 1.4, 6);
  const capGeo = new THREE.SphereGeometry(0.06, 8, 6);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const m = new THREE.Mesh(mastGeo, metal);
    m.position.set(Math.cos(a) * 1.0, 0.7, Math.sin(a) * 1.0);
    const c = new THREE.Mesh(capGeo, shell);
    c.position.set(Math.cos(a) * 1.0, 1.42, Math.sin(a) * 1.0);
    g.add(m, c);
  }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.02, 6, 40), shell);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 1.42;
  g.add(ring);
  g.scale.setScalar(SCALE);
  return { obj: g };
}

// small marker for an estimated location
export function createMarker(color) {
  const g = new THREE.Group();
  const pin = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.0, 12), std(color, 0.5));
  pin.rotation.x = Math.PI;
  pin.position.y = 0.6;
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 8), std(color, 0.6));
  dot.position.y = 1.25;
  g.add(pin, dot);
  g.scale.setScalar(SCALE * 0.75);
  return g;
}
