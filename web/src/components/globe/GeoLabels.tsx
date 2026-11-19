import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { ll2v } from "./geo";

// Names only (no borders are drawn anywhere in this project).
const PLACES: { name: string; lat: number; lon: number; kind: "land" | "sea" }[] = [
  { name: "INDIA", lat: 23.5, lon: 78.5, kind: "land" },
  { name: "PAKISTAN", lat: 29.5, lon: 68.5, kind: "land" },
  { name: "CHINA", lat: 33.5, lon: 92, kind: "land" },
  { name: "SRI LANKA", lat: 7.6, lon: 80.8, kind: "land" },
  { name: "Arabian Sea", lat: 14.5, lon: 64, kind: "sea" },
  { name: "Bay of Bengal", lat: 15, lon: 88.5, kind: "sea" },
];

function Place({ p }: { p: (typeof PLACES)[number] }) {
  const pos = ll2v(p.lat, p.lon, 1.006), n = pos.clone().normalize();
  const el = useRef<HTMLDivElement>(null);
  const v = new THREE.Vector3();
  useFrame(({ camera }) => { // hide labels on the far side of the globe
    if (!el.current) return;
    const facing = n.dot(v.copy(camera.position).normalize());
    el.current.style.opacity = String(Math.max(0, Math.min(1, (facing - 0.25) * 4)));
  });
  return (
    <Html position={pos} center zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
      <div ref={el} className={p.kind === "land" ? "text-[10.5px] font-semibold tracking-[0.22em] text-ink/80" : "text-[10.5px] italic tracking-wide text-cyan/70"}
        style={{ textShadow: "0 1px 4px #000, 0 0 8px #000" }}>{p.name}</div>
    </Html>
  );
}

export default function GeoLabels() { return <>{PLACES.map((p) => <Place key={p.name} p={p} />)}</>; }
