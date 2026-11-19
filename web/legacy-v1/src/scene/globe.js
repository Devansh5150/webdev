// Globe: renderer, camera, controls, Earth sphere, lat/lon <-> 3D helpers, picking, camera flights.
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export const RE_KM = 6371;
const D2R = Math.PI / 180;

// Earth radius = 1 scene unit. Matches three.js SphereGeometry UVs for an equirectangular texture.
export function ll2v(lat, lon, r = 1) {
  const p = lat * D2R, l = lon * D2R;
  return new THREE.Vector3(r * Math.cos(p) * Math.cos(l), r * Math.sin(p), -r * Math.cos(p) * Math.sin(l));
}
export function v2ll(v) {
  const r = v.length();
  return { lat: Math.asin(v.y / r) / D2R, lon: Math.atan2(-v.z, v.x) / D2R };
}
// scene radius for a height in km with vertical exaggeration
export const radiusAt = (hKm, exag) => 1 + (exag * hKm) / RE_KM;

export const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function createGlobe(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x05080f, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.01, 100);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = !reducedMotion();
  controls.dampingFactor = 0.08;
  controls.minDistance = 1.25;
  controls.maxDistance = 8;
  controls.enablePan = false;
  controls.rotateSpeed = 0.5;
  controls.zoomSpeed = 0.7;

  // Earth textures: schematic coastlines (earth.jpg) or NASA satellite (Blue Marble day + Black Marble night).
  // No political borders in any of them.
  const loader = new THREE.TextureLoader();
  const ani = renderer.capabilities.getMaxAnisotropy();
  const loadTex = (file, srgb = true) => {
    const t = loader.load(import.meta.env.BASE_URL + file);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = ani;
    return t;
  };
  const tex = loadTex("earth.jpg");
  const dayTex = loadTex("textures/earth_day.jpg");
  const nightTex = loadTex("textures/earth_night.jpg");
  const waterTex = loadTex("textures/earth_water.png", false);
  const uSat = { value: 1 }; // 1 = satellite, 0 = schematic
  // Sun direction (world space) drives the day/night terminator: the EIA is a daytime feature.
  const sunDir = { value: new THREE.Vector3(1, 0, 0) };
  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(1, 128, 64),
    new THREE.ShaderMaterial({
      uniforms: { map: { value: tex }, dayMap: { value: dayTex }, nightMap: { value: nightTex }, waterMap: { value: waterTex }, uSat, sunDir },
      vertexShader: `
        varying vec2 vUv; varying vec3 vN; varying vec3 vV;
        void main() {
          vUv = uv;
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vN = normalize(mat3(modelMatrix) * normal);
          vV = normalize(cameraPosition - wp.xyz);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }`,
      fragmentShader: `
        uniform sampler2D map; uniform sampler2D dayMap; uniform sampler2D nightMap; uniform sampler2D waterMap;
        uniform float uSat; uniform vec3 sunDir;
        varying vec2 vUv; varying vec3 vN; varying vec3 vV;
        void main() {
          vec3 N = normalize(vN), L = normalize(sunDir), V = normalize(vV);
          float ndl = dot(N, L);
          float day = smoothstep(-0.10, 0.20, ndl);
          vec3 twilight = vec3(0.95, 0.5, 0.25) * 0.10 * (1.0 - smoothstep(0.0, 0.16, abs(ndl)));
          // schematic style: coastline texture, simple day/night dimming
          vec3 schem = texture2D(map, vUv).rgb * mix(0.38, 1.15, day) + twilight;
          // satellite style: Blue Marble lit by the sun, city lights at night, sun glint on water only
          vec3 d = texture2D(dayMap, vUv).rgb;
          vec3 lights = texture2D(nightMap, vUv).rgb;
          float water = texture2D(waterMap, vUv).r;
          float lambert = clamp(ndl * 1.15 + 0.08, 0.0, 1.0);
          vec3 sat = d * (0.07 + 1.1 * lambert);
          sat += lights * vec3(1.0, 0.82, 0.55) * 1.6 * (1.0 - smoothstep(-0.18, 0.04, ndl));
          float spec = pow(max(dot(reflect(-L, N), V), 0.0), 160.0) * water * day;
          sat += vec3(1.0, 0.95, 0.85) * spec * 0.22 + twilight * 0.6;
          vec3 col = mix(schem, sat, uSat);
          // inner atmospheric (fresnel) glow, brighter on the day side
          float fr = pow(1.0 - max(dot(N, V), 0.0), 3.0);
          col += vec3(0.30, 0.52, 1.0) * fr * mix(0.25, 0.75, day);
          gl_FragColor = vec4(col, 1.0);
          #include <colorspace_fragment>
        }`,
    })
  );
  scene.add(earth);

  // outer atmosphere halo (back faces, additive, fresnel falloff)
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(1.06, 64, 32),
    new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending,
      uniforms: { sunDir },
      vertexShader: "varying vec3 vNv; varying vec3 vNw; void main(){ vNv = normalize(normalMatrix*normal); vNw = normalize(mat3(modelMatrix)*normal); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);} ",
      fragmentShader: "uniform vec3 sunDir; varying vec3 vNv; varying vec3 vNw; void main(){ float k = pow(max(0.0, 0.62 - dot(vNv, vec3(0.0,0.0,1.0))), 3.5); float day = 0.35 + 0.65*smoothstep(-0.3, 0.4, dot(vNw, normalize(sunDir))); gl_FragColor = vec4(vec3(0.32,0.55,1.0)*k*2.2*day, 1.0); }",
    })
  );
  scene.add(halo);

  // subsolar point from UT and date (declination from day of year; equation of time ignored)
  function setSun(utHours, dateStr) {
    const d = dateStr ? new Date(dateStr + "T00:00:00Z") : new Date();
    const doy = Math.floor((d - Date.UTC(d.getUTCFullYear(), 0, 0)) / 86400000);
    const dec = 23.44 * Math.sin((2 * Math.PI * (doy - 81)) / 365);
    const lon = ((-15 * (utHours - 12)) + 540) % 360 - 180;
    sunDir.value.copy(ll2v(dec, lon, 1));
    return { lat: dec, lon };
  }

  // faint starfield
  const starGeo = new THREE.BufferGeometry();
  const sp = [];
  const r = (() => { let s = 12345; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); })();
  for (let i = 0; i < 1500; i++) {
    const v = new THREE.Vector3(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1).normalize().multiplyScalar(30 + r() * 20);
    sp.push(v.x, v.y, v.z);
  }
  starGeo.setAttribute("position", new THREE.Float32BufferAttribute(sp, 3));
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0x6b7a99, size: 0.08, sizeAttenuation: true })));

  scene.add(new THREE.AmbientLight(0xffffff, 0.9));
  const sun = new THREE.DirectionalLight(0xffffff, 1.4);
  sun.position.set(3, 4, 5);
  scene.add(sun);

  // camera looking at a lat/lon from a given distance
  function viewFor(lat, lon, dist) {
    return ll2v(lat, lon, dist);
  }
  camera.position.copy(viewFor(18, 82, 3.6));
  controls.target.set(0, 0, 0);
  controls.update();

  let flight = null;
  function flyTo(lat, lon, dist = 3.6, ms = 1600) {
    const to = viewFor(lat, lon, dist);
    if (reducedMotion() || ms === 0) { camera.position.copy(to); controls.update(); return; }
    const from = camera.position.clone();
    const r0 = from.length(), r1 = dist;
    const a = from.clone().normalize(), b = to.clone().normalize();
    flight = { t0: performance.now(), ms, a, b, r0, r1 };
  }
  function stepFlight(now) {
    if (!flight) return;
    let t = Math.min(1, (now - flight.t0) / flight.ms);
    const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const dir = slerpDir(flight.a, flight.b, e);
    const lift = Math.sin(e * Math.PI) * 0.6; // rise during the flight
    camera.position.copy(dir.multiplyScalar(flight.r0 + (flight.r1 - flight.r0) * e + lift));
    camera.lookAt(0, 0, 0);
    if (t >= 1) flight = null;
  }

  // picking on the Earth surface
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function pick(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObject(earth)[0];
    return hit ? v2ll(hit.point) : null;
  }

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    if (canvas.width !== Math.floor(w * renderer.getPixelRatio()) || canvas.height !== Math.floor(h * renderer.getPixelRatio())) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
  }

  const tickers = new Set();
  function loop(now) {
    resize();
    stepFlight(now);
    controls.update();
    tickers.forEach((fn) => fn(now));
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  const setStyle = (style) => { uSat.value = style === "schematic" ? 0 : 1; };
  return { THREE, renderer, scene, camera, controls, earth, flyTo, pick, setSun, setStyle, onTick: (fn) => tickers.add(fn), isFlying: () => !!flight };
}

function slerpDir(a, b, t) {
  const dot = Math.min(1, Math.max(-1, a.dot(b)));
  const om = Math.acos(dot);
  if (om < 1e-4) return a.clone().lerp(b, t).normalize();
  const s = Math.sin(om);
  return a.clone().multiplyScalar(Math.sin((1 - t) * om) / s).add(b.clone().multiplyScalar(Math.sin(t * om) / s));
}
