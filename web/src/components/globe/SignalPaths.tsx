import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import type { HopEstimate, LatLon } from "../../types/analysis";
import { hopPath, ll2v, radiusAt } from "./geo";

type LineRef = { material: { dashOffset: number } } | null;

function Path({ pts, color, dashed, flowFromStart, width, reduced }: { pts: THREE.Vector3[]; color: string; dashed: boolean; flowFromStart: boolean; width: number; reduced: boolean }) {
  const dash = useRef<LineRef>(null);
  const dot = useRef<THREE.Mesh>(null);
  const curve = useMemo(() => new THREE.CatmullRomCurve3(pts), [pts]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (dash.current && !reduced) dash.current.material.dashOffset = (flowFromStart ? -1 : 1) * t * 0.06;
    if (dot.current) { const u = reduced ? 0.5 : (t * 0.22) % 1; dot.current.position.copy(curve.getPoint(flowFromStart ? u : 1 - u)); }
  });
  return (
    <group>
      {/* soft glow underlay */}
      <Line points={pts} color={color} lineWidth={width * 3.2} transparent opacity={0.16} depthWrite={false} />
      <Line ref={dash as never} points={pts} color={color} lineWidth={width} dashed={dashed} dashSize={0.018} gapSize={0.012} transparent opacity={0.95} />
      <mesh ref={dot}><sphereGeometry args={[0.0045, 12, 8]} /><meshBasicMaterial color="#ffffff" /></mesh>
    </group>
  );
}

function Reflections({ est, exag, color }: { est: HopEstimate; exag: number; color: string }) {
  return (
    <>
      {est.controlPoints.map((c, i) => {
        const top = ll2v(c.lat, c.lon, radiusAt(est.reflectionHeightKm, exag) + 0.002), foot = ll2v(c.lat, c.lon, 1.002);
        return (
          <group key={i}>
            <Line points={[foot, top]} color={color} lineWidth={1} dashed dashSize={0.008} gapSize={0.006} transparent opacity={0.6} />
            <mesh position={top}><sphereGeometry args={[0.005, 12, 8]} /><meshBasicMaterial color={color} /></mesh>
          </group>
        );
      })}
    </>
  );
}

export default function SignalPaths({ station, estimates, show1, show2, exag, mode, reduced }: { station: LatLon; estimates: Record<1 | 2, HopEstimate>; show1: boolean; show2: boolean; exag: number; mode: "inverse" | "forward"; reduced: boolean }) {
  const e1 = estimates[1], e2 = estimates[2];
  const p1 = useMemo(() => (e1.ok ? hopPath(station, e1, e1.reflectionHeightKm, 1, exag) : null), [station, e1, exag]);
  const p2 = useMemo(() => (e2.ok ? hopPath(station, e2, e2.reflectionHeightKm, 2, exag) : null), [station, e2, exag]);
  const outward = mode === "inverse"; // inverse: back-trace from the station; forward: transmitter -> station
  return (
    <group>
      {show1 && p1 && <><Path pts={p1} color="#36cfff" dashed={false} flowFromStart={outward} width={2.4} reduced={reduced} /><Reflections est={e1} exag={exag} color="#36cfff" /></>}
      {show2 && p2 && <><Path pts={p2} color="#b56bff" dashed flowFromStart={outward} width={2.2} reduced={reduced} /><Reflections est={e2} exag={exag} color="#b56bff" /></>}
    </group>
  );
}
