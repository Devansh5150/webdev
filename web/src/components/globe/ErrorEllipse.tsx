import { useMemo } from "react";
import * as THREE from "three";
import { Line } from "@react-three/drei";
import type { HopEstimate } from "../../types/analysis";
import { ll2v } from "./geo";
import { ellipseScale } from "../../utils/scientificCalculations";

/** The 95% ellipse from the Monte Carlo, rescaled to the chosen confidence level (2-D Gaussian). */
export default function ErrorEllipse({ est, level, showCloud }: { est: HopEstimate; level: number; showCloud: boolean }) {
  const { ring, fill, cloud } = useMemo(() => {
    if (!est.ok || !est.ellipse) return { ring: null, fill: null, cloud: null };
    const k = ellipseScale(level), R = 1.0035;
    const ringPts = est.ellipse.ring.map((p) => ll2v(est.lat + (p.lat - est.lat) * k, est.lon + (p.lon - est.lon) * k, R));
    const c = ll2v(est.lat, est.lon, R - 0.0003), pos: number[] = [];
    for (let i = 0; i < ringPts.length - 1; i++) pos.push(c.x, c.y, c.z, ringPts[i].x, ringPts[i].y, ringPts[i].z, ringPts[i + 1].x, ringPts[i + 1].y, ringPts[i + 1].z);
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    let cl: THREE.BufferGeometry | null = null;
    if (est.cloud?.length) { const cp: number[] = []; est.cloud.forEach((q) => { const v = ll2v(q.lat, q.lon, R + 0.0006); cp.push(v.x, v.y, v.z); }); cl = new THREE.BufferGeometry(); cl.setAttribute("position", new THREE.Float32BufferAttribute(cp, 3)); }
    return { ring: ringPts, fill: g, cloud: cl };
  }, [est, level]);
  if (!ring || !fill) return null;
  return (
    <group renderOrder={4}>
      <mesh geometry={fill}><meshBasicMaterial color="#b56bff" transparent opacity={0.2} side={THREE.DoubleSide} depthWrite={false} /></mesh>
      <Line points={ring} color="#d4a6ff" lineWidth={1.6} transparent opacity={0.95} />
      <mesh position={ll2v(est.lat, est.lon, 1.004)}><sphereGeometry args={[0.0035, 12, 8]} /><meshBasicMaterial color="#ffffff" /></mesh>
      {showCloud && cloud && <points geometry={cloud}><pointsMaterial color="#d4a6ff" size={0.004} transparent opacity={0.65} depthWrite={false} /></points>}
    </group>
  );
}
