// 95% error ellipse on the Earth surface (outline + translucent fill) and the Monte Carlo point cloud.
import * as THREE from "three";
import { ellipsePoints } from "../physics.js";
import { ll2v } from "./globe.js";

const LIFT = 1.0025;

export function createEllipseLayer(scene) {
  const group = new THREE.Group();
  group.renderOrder = 3;
  scene.add(group);

  function clear() {
    group.children.slice().forEach((c) => { group.remove(c); c.geometry?.dispose(); c.material?.dispose(); });
  }

  function addEllipse(E, color, { cloud = true } = {}) {
    if (!E || !E.ok) return;
    const ring = ellipsePoints(E, 96).map((p) => ll2v(p.lat, p.lon, LIFT));
    group.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(ring),
      new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.95 })));
    // fill: triangle fan from the centre
    const c = ll2v(E.center.lat, E.center.lon, LIFT - 0.0004);
    const pos = [];
    for (let i = 0; i < ring.length - 1; i++) {
      pos.push(c.x, c.y, c.z, ring[i].x, ring[i].y, ring[i].z, ring[i + 1].x, ring[i + 1].y, ring[i + 1].z);
    }
    const fg = new THREE.BufferGeometry();
    fg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    group.add(new THREE.Mesh(fg, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false })));
    if (cloud && E.pts?.length) {
      const pp = [];
      for (const p of E.pts) { const v = ll2v(p.lat, p.lon, LIFT + 0.0005); pp.push(v.x, v.y, v.z); }
      const pg = new THREE.BufferGeometry();
      pg.setAttribute("position", new THREE.Float32BufferAttribute(pp, 3));
      group.add(new THREE.Points(pg, new THREE.PointsMaterial({ color, size: 0.0045, transparent: true, opacity: 0.7, depthWrite: false })));
    }
  }

  return { group, clear, addEllipse };
}
