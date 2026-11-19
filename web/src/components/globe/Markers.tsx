import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Html, useGLTF } from "@react-three/drei";
import { ll2v } from "./geo";
import { BASE_URL } from "../../services/analysisService";

const UP = new THREE.Vector3(0, 1, 0);

/** Places children on the globe surface, local +Y along the surface normal. */
function OnGlobe({ lat, lon, children }: { lat: number; lon: number; children: React.ReactNode }) {
  const { pos, quat } = useMemo(() => {
    const n = ll2v(lat, lon, 1);
    return { pos: n.clone().multiplyScalar(1.001), quat: new THREE.Quaternion().setFromUnitVectors(UP, n.clone().normalize()) };
  }, [lat, lon]);
  return <group position={pos} quaternion={quat}>{children}</group>;
}

function GlowRing({ color, reduced }: { color: string; reduced: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = reduced ? 0.5 : (clock.elapsedTime * 0.6) % 1;
    ref.current.scale.setScalar(0.4 + t * 2.2);
    (ref.current.material as THREE.MeshBasicMaterial).opacity = 0.7 * (1 - t);
  });
  return (
    <mesh ref={ref} rotation-x={-Math.PI / 2} position-y={0.0005}>
      <ringGeometry args={[0.009, 0.011, 48]} />
      <meshBasicMaterial color={color} transparent depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

function Label({ title, sub, color, side = "right" }: { title: string; sub?: string; color: string; side?: "right" | "left" }) {
  return (
    <Html position={[0, 0.035, 0]} center={false} zIndexRange={[20, 0]} style={{ pointerEvents: "none", transform: side === "left" ? "translateX(-100%)" : undefined }}>
      <div className="glass !rounded-md px-2 py-1 whitespace-nowrap ml-3" style={{ borderColor: color + "88", boxShadow: `0 0 14px ${color}33` }}>
        <p className="text-[10.5px] font-semibold tracking-wide" style={{ color }}>{title}</p>
        {sub && <p className="text-[10px] font-mono text-muted">{sub}</p>}
      </div>
    </Html>
  );
}

export function AntennaStation({ lat, lon, reduced, showLabel }: { lat: number; lon: number; reduced: boolean; showLabel: boolean }) {
  const { scene } = useGLTF(`${BASE_URL}models/df_station.glb`);
  const model = useMemo(() => scene.clone(true), [scene]);
  return (
    <OnGlobe lat={lat} lon={lon}>
      <primitive object={model} scale={0.0016} />
      <mesh position-y={0.004}><sphereGeometry args={[0.0055, 16, 12]} /><meshBasicMaterial color="#36cfff" /></mesh>
      <pointLight color="#36cfff" intensity={0.15} distance={0.2} position-y={0.02} />
      <GlowRing color="#36cfff" reduced={reduced} />
      {showLabel && <Label title="DF STATION" sub={`${lat.toFixed(2)}°N ${lon.toFixed(2)}°E (example)`} color="#36cfff" side="left" />}
    </OnGlobe>
  );
}

export function Transmitter({ lat, lon, hops, reduced, showLabel }: { lat: number; lon: number; hops: number; reduced: boolean; showLabel: boolean }) {
  const { scene } = useGLTF(`${BASE_URL}models/transmitter.glb`);
  const model = useMemo(() => scene.clone(true), [scene]);
  return (
    <OnGlobe lat={lat} lon={lon}>
      <primitive object={model} scale={0.0024} />
      <mesh position-y={0.004}><sphereGeometry args={[0.0055, 16, 12]} /><meshBasicMaterial color="#b56bff" /></mesh>
      <GlowRing color="#b56bff" reduced={reduced} />
      {showLabel && <Label title={`ESTIMATED TRANSMITTER · ${hops}-HOP`} sub={`${lat.toFixed(2)}°N ${lon.toFixed(2)}°E`} color="#b56bff" />}
    </OnGlobe>
  );
}

useGLTF.preload(`${BASE_URL}models/df_station.glb`);
useGLTF.preload(`${BASE_URL}models/transmitter.glb`);
