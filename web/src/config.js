// Shared constants. All coordinates here are EXAMPLES, not real sites.
export const EXAMPLE = {
  st: { lat: 21.15, lon: 79.09 },   // example DF station, central India
  tx: { lat: 15.5, lon: 88.5 },     // example transmitter, Bay of Bengal
  f: 7.2,                            // MHz
  ist: "14:30",                      // = 09:00 UT
  date: "2026-03-21",
  f107: 140,
  storm: 0,
  hopPref: 0,
  angErr: 1.0,
  exag: 8,
  inverse: { az: 121.4, el: 18.2, hops: 1 },
};
// Mid-latitude reference station for the India-vs-Europe view (example).
export const EUROPE_ST = { lat: 50.0, lon: 10.0 };
export const IST_OFFSET = 5.5;
export const istToUt = (hhmm) => {
  const [h, m] = String(hhmm || "00:00").split(":").map(Number);
  return (((h + m / 60 - IST_OFFSET) % 24) + 24) % 24;
};
export function fixQuality(km) {
  if (km == null || !isFinite(km)) return { label: "No fix", cls: "none" };
  if (km < 50) return { label: "Good", cls: "good" };
  if (km <= 150) return { label: "Fair", cls: "fair" };
  return { label: "Poor", cls: "poor" };
}
