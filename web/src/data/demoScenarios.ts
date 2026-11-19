// Example inputs (all coordinates are EXAMPLES, not real sites). These are inputs, not results:
// every number shown in the dashboard is computed by the model from them.
import type { AnalysisInput } from "../types/analysis";

export const DEFAULT_INPUT: AnalysisInput = {
  stationLat: 21.15, stationLon: 79.08, azimuth: 112, elevation: 14.5, frequency: 10.2,
  date: "2026-03-21", utcTime: "09:00", condition: 0.5, f107: 140, source: "iri", angErr: 1, confidenceRadiusKm: 100,
};

export const DEMO_SCENARIOS: { id: string; name: string; note: string; input: Partial<AnalysisInput> }[] = [
  { id: "default", name: "Bay of Bengal bearing", note: "Design-brief defaults, moderately disturbed", input: {} },
  { id: "quiet-afternoon", name: "Quiet afternoon", note: "EIA fully developed, no storm", input: { condition: 0, utcTime: "09:00" } },
  { id: "storm", name: "Storm afternoon", note: "Strong storm uplift", input: { condition: 0.85, utcTime: "09:00" } },
  { id: "morning", name: "Early morning", note: "Before the EIA forms", input: { condition: 0, utcTime: "04:00", frequency: 7.2 } },
  { id: "arabian-sea", name: "Arabian Sea bearing", note: "West-south-west from central India", input: { azimuth: 248, elevation: 16, frequency: 9 } },
];
