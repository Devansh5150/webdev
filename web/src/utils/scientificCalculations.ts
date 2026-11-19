// Small, pure helpers used across the UI (no physics here: physics lives in physics.js / engine/core.js).
import type { AnalysisInput, ValidationErrors } from "../types/analysis";

export const KM_PER_NMI = 1.852;

export function utcToHours(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) + (m || 0) / 60;
}
export function monthOf(date: string): number {
  const m = Number(date.slice(5, 7));
  return m >= 1 && m <= 12 ? m : 3;
}
export function conditionLabel(c: number): string {
  if (c < 0.12) return "Quiet";
  if (c < 0.38) return "Slightly disturbed";
  if (c < 0.62) return "Moderately disturbed";
  if (c < 0.88) return "Disturbed";
  return "Severe storm";
}
export function fmtLatLon(lat: number, lon: number, d = 2): string {
  return `${Math.abs(lat).toFixed(d)}° ${lat >= 0 ? "N" : "S"}, ${Math.abs(lon).toFixed(d)}° ${lon >= 0 ? "E" : "W"}`;
}
export function fmtDist(km: number | null | undefined, units: "km" | "nmi" = "km", d = 0): string {
  if (km == null || !isFinite(km)) return "—";
  return units === "nmi" ? `${(km / KM_PER_NMI).toFixed(d)} nmi` : `${km.toFixed(d)} km`;
}
/** Scale factor for a 2-D Gaussian confidence region relative to the stored 95% ellipse. */
export function ellipseScale(level: number): number {
  const k = (p: number) => Math.sqrt(-2 * Math.log(1 - p));
  return k(level) / k(0.95);
}

export function validateInput(i: AnalysisInput): ValidationErrors {
  const e: ValidationErrors = {};
  const num = (v: number) => typeof v === "number" && isFinite(v);
  if (!num(i.stationLat) || i.stationLat < -90 || i.stationLat > 90) e.stationLat = "Latitude must be between −90 and 90.";
  if (!num(i.stationLon) || i.stationLon < -180 || i.stationLon > 180) e.stationLon = "Longitude must be between −180 and 180.";
  if (!num(i.azimuth) || i.azimuth < 0 || i.azimuth > 360) e.azimuth = "Azimuth must be 0–360°.";
  if (!num(i.elevation) || i.elevation <= 0 || i.elevation >= 90) e.elevation = "Elevation must be above 0° and below 90°.";
  else if (i.elevation < 1) e.elevation = "Elevation below 1° is not usable for single-station location.";
  if (!num(i.frequency) || i.frequency < 2 || i.frequency > 30) e.frequency = "HF frequency must be 2–30 MHz.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(i.date) || isNaN(Date.parse(i.date))) e.date = "Enter a valid date.";
  if (!/^\d{2}:\d{2}$/.test(i.utcTime)) e.utcTime = "Enter a valid UTC time (HH:MM).";
  if (!num(i.condition) || i.condition < 0 || i.condition > 1) e.condition = "Condition must be between quiet and disturbed.";
  return e;
}
