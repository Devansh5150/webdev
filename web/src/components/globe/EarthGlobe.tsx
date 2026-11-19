import { useMemo } from "react";
import * as THREE from "three";
import { useTexture } from "@react-three/drei";
import { ll2v, sunDirection } from "./geo";
import { BASE_URL } from "../../services/analysisService";

const vert = /* glsl */ `
  varying vec2 vUv; varying vec3 vN; varying vec3 vV;
  void main() {
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vN = normalize(mat3(modelMatrix) * normal);
    vV = normalize(cameraPosition - wp.xyz);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;
const frag = /* glsl */ `
  uniform sampler2D dayMap; uniform sampler2D nightMap; uniform sampler2D waterMap; uniform vec3 sunDir;
  varying vec2 vUv; varying vec3 vN; varying vec3 vV;
  void main() {
    vec3 N = normalize(vN), L = normalize(sunDir), V = normalize(vV);
    float ndl = dot(N, L);
    float day = smoothstep(-0.10, 0.20, ndl);
    vec3 d = texture2D(dayMap, vUv).rgb;
    vec3 lights = texture2D(nightMap, vUv).rgb;
    float water = texture2D(waterMap, vUv).r;
    float lambert = clamp(ndl * 1.15 + 0.08, 0.0, 1.0);
    vec3 col = d * (0.10 + 1.0 * lambert);
    col += lights * vec3(1.0, 0.85, 0.65) * 1.5 * (1.0 - smoothstep(-0.18, 0.04, ndl));
    float spec = pow(max(dot(reflect(-L, N), V), 0.0), 160.0) * water * day;
    col += vec3(0.85, 0.95, 1.0) * spec * 0.2;
    // slight cool grade to sit in the navy UI, plus fresnel rim
    col = mix(col, col * vec3(0.86, 0.95, 1.08), 0.35);
    float fr = pow(1.0 - max(dot(N, V), 0.0), 3.0);
    col += vec3(0.21, 0.81, 1.0) * fr * mix(0.25, 0.7, day);
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }`;

function Graticule() {
  const geo = useMemo(() => {
    const pts: number[] = [];
    const push = (a: THREE.Vector3, b: THREE.Vector3) => pts.push(a.x, a.y, a.z, b.x, b.y, b.z);
    for (let lat = -80; lat <= 80; lat += 10) for (let lon = -180; lon < 180; lon += 2) push(ll2v(lat, lon, 1.0015), ll2v(lat, lon + 2, 1.0015));
    for (let lon = -180; lon < 180; lon += 10) for (let lat = -88; lat < 88; lat += 2) push(ll2v(lat, lon, 1.0015), ll2v(lat + 2, lon, 1.0015));
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);
  return <lineSegments geometry={geo}><lineBasicMaterial color="#36cfff" transparent opacity={0.09} depthWrite={false} /></lineSegments>;
}

export default function EarthGlobe({ date, utHours, grid }: { date: string; utHours: number; grid: boolean }) {
  const [dayMap, nightMap, waterMap] = useTexture([`${BASE_URL}textures/earth_day.jpg`, `${BASE_URL}textures/earth_night.jpg`, `${BASE_URL}textures/earth_water.png`]);
  useMemo(() => { for (const t of [dayMap, nightMap]) t.colorSpace = THREE.SRGBColorSpace; for (const t of [dayMap, nightMap, waterMap]) t.anisotropy = 8; }, [dayMap, nightMap, waterMap]);
  const uniforms = useMemo(() => ({ dayMap: { value: dayMap }, nightMap: { value: nightMap }, waterMap: { value: waterMap }, sunDir: { value: new THREE.Vector3(1, 0, 0) } }), [dayMap, nightMap, waterMap]);
  uniforms.sunDir.value.copy(sunDirection(date, utHours));
  return (
    <group>
      <mesh name="earth">
        <sphereGeometry args={[1, 160, 80]} />
        <shaderMaterial vertexShader={vert} fragmentShader={frag} uniforms={uniforms} />
      </mesh>
      {grid && <Graticule />}
      {/* atmosphere halo */}
      <mesh scale={1.07}>
        <sphereGeometry args={[1, 64, 32]} />
        <shaderMaterial transparent depthWrite={false} side={THREE.BackSide} blending={THREE.AdditiveBlending}
          vertexShader="varying vec3 vN; void main(){ vN = normalize(normalMatrix*normal); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);} "
          fragmentShader="varying vec3 vN; void main(){ float k = pow(max(0.0, 0.64 - dot(vN, vec3(0.0,0.0,1.0))), 3.2); gl_FragColor = vec4(vec3(0.21,0.70,1.0)*k*2.4, 1.0); }" />
      </mesh>
    </group>
  );
}
