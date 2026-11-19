import type { HistoryEntry } from "../store/analysisStore";
import type { ComparisonResult } from "../types/analysis";

export function download(filename: string, text: string, mime: string) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const r = (v: number | null | undefined, d = 1) => (v == null || !isFinite(v) ? "" : v.toFixed(d));

export function historyToCSV(rows: HistoryEntry[]): string {
  const head = ["id", "created_utc", "station_lat", "station_lon", "azimuth_deg", "elevation_deg", "frequency_mhz", "date", "utc_time", "condition", "f107", "ionosphere",
    "hop1_ok", "hop1_lat", "hop1_lon", "hop1_range_km", "hop1_h_km", "hop1_confidence_pct", "hop1_ellipse_a_km", "hop1_ellipse_b_km",
    "hop2_ok", "hop2_lat", "hop2_lon", "hop2_range_km", "hop2_h_km", "hop2_confidence_pct", "hop2_ellipse_a_km", "hop2_ellipse_b_km", "data_kind", "engine"];
  const lines = rows.map((h) => {
    const i = h.input, e1 = h.estimates[1], e2 = h.estimates[2];
    const hop = (e: typeof e1) => [e.ok, r(e.lat, 4), r(e.lon, 4), r(e.rangeKm, 0), r(e.reflectionHeightKm, 0), e.ok ? e.confidence : "", r(e.ellipse?.a, 0), r(e.ellipse?.b, 0)];
    return [h.id, h.createdAt, i.stationLat, i.stationLon, i.azimuth, i.elevation, i.frequency, i.date, i.utcTime, i.condition, i.f107, `"${h.provenance.ionosphere.replace(/"/g, "'")}"`,
      ...hop(e1), ...hop(e2), h.provenance.dataKind, h.provenance.engine].join(",");
  });
  return [head.join(","), ...lines].join("\n");
}

export function reportMarkdown(h: HistoryEntry, cmp: ComparisonResult | null): string {
  const i = h.input;
  const est = (n: 1 | 2) => { const e = h.estimates[n]; return e.ok
    ? `| ${n}-hop | ${e.lat.toFixed(3)}°N ${e.lon.toFixed(3)}°E | ${e.rangeKm.toFixed(0)} km | ${e.reflectionHeightKm.toFixed(0)} km | ${e.confidence}% | ${e.ellipse ? `${e.ellipse.a.toFixed(0)} × ${e.ellipse.b.toFixed(0)} km` : "—"} | ${e.standard ? `${e.standard.shiftKm.toFixed(0)} km` : "—"} |`
    : `| ${n}-hop | no fix | | | | | |`; };
  return `# BHARAT HF LOCATOR · analysis report

Generated ${new Date().toISOString()} · analysis ${h.id} (${h.createdAt})

> **Data status: ${h.provenance.dataKind}.** ${h.provenance.ionosphere}. No real DF measurements are used.

## Inputs (example values)
| Station | Azimuth | Elevation | Frequency | Date / UTC | Condition | F10.7 |
|---|---|---|---|---|---|---|
| ${i.stationLat}°N ${i.stationLon}°E | ${i.azimuth}° | ${i.elevation}° | ${i.frequency} MHz | ${i.date} ${i.utcTime} | ${i.condition} | ${i.f107} |

## Estimates (inverse problem)
| Mode | Location | Range | h′ | Confidence* | 95% ellipse | Standard-model shift |
|---|---|---|---|---|---|---|
${est(1)}
${est(2)}

*Share of Monte Carlo fixes within ${i.confidenceRadiusKm} km of the estimate (σ angle ${i.angErr}°, foF2 ±7%, hmF2 ±15 km).

## Quiet vs disturbed (95% uncertainty)
${h.uncertaintyByCondition.map((u) => `- ${u.label}: 1-hop ${u.hop1 == null ? "no fix" : u.hop1.toFixed(0) + " km"}, 2-hop ${u.hop2 == null ? "no fix" : u.hop2.toFixed(0) + " km"}`).join("\n")}
${cmp ? `
## Scenario comparison (known example transmitter)
| Case | Standard error | India-aware error | Independent v1 error | Uncertainty |
|---|---|---|---|---|
${cmp.cases.map((c) => `| ${c.label} | ${r(c.standardKm, 0)} | ${r(c.indiaKm, 0)} | ${r(c.independentKm, 0)} | ${r(c.uncertaintyKm, 0)} |`).join("\n")}
` : ""}
## Method notes
${h.provenance.notes.map((n) => `- ${n}`).join("\n")}
`;
}
