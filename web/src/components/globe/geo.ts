import * as THREE from "three";
import { destination, distBearing } from "../../physics.js";
import type { LatLon } from "../../types/analysis";

export const RE_KM = 6371;
const D2R = Math.PI / 180;
/** Earth radius = 1 scene unit; matches three.js SphereGeometry UVs for an equirectangular texture. */
export function ll2v(lat: number, lon: number, r = 1): THREE.Vector3 {
  const p = lat * D2R, l = lon * D2R;
  return new THREE.Vector3(r * Math.cos(p) * Math.cos(l), r * Math.sin(p), -r * Math.cos(p) * Math.sin(l));
}
export const radiusAt = (hKm: number, exag: number) => 1 + (exag * hKm) / RE_KM;

/** Mirror-model path: straight virtual rays up to h' over each hop midpoint and down again, following the great circle. */
export function hopPath(a: LatLon, b: LatLon, hKm: number, hops: number, exag: number, perHop = 40): THREE.Vector3[] {
  const { d, az } = distBearing(a.lat, a.lon, b.lat, b.lon);
  const n = perHop * hops, pts: THREE.Vector3[] = [];
  for (let i = 0; i <= n; i++) {
    const s = i / n, p = destination(a.lat, a.lon, az, d * s);
    const sh = (s * hops) % 1, tri = i === n ? 0 : 1 - Math.abs(2 * sh - 1);
    pts.push(ll2v(p.lat, p.lon, radiusAt(hKm * tri, exag) + 0.002));
  }
  return pts;
}

/** Subsolar point (declination from day of year; equation of time ignored). */
export function sunDirection(dateStr: string, utHours: number): THREE.Vector3 {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const doy = isNaN(d.getTime()) ? 80 : Math.floor((d.getTime() - Date.UTC(d.getUTCFullYear(), 0, 0)) / 86400000);
  const dec = 23.44 * Math.sin((2 * Math.PI * (doy - 81)) / 365);
  const lon = ((-15 * (utHours - 12)) + 540) % 360 - 180;
  return ll2v(dec, lon, 1);
}
