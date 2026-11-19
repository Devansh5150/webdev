// Shared types for the analysis workflow. The same contract is served by the local worker engine
// and (later) by the FastAPI backend (research/api), so the frontend does not change.

export interface LatLon { lat: number; lon: number }
export type HopCount = 1 | 2;
export type IonoSource = "iri" | "v1";
export type DataKind = "model-derived" | "demonstration" | "measured";

export interface AnalysisInput {
  stationLat: number;
  stationLon: number;
  azimuth: number;      // deg clockwise from north
  elevation: number;    // deg above horizon
  frequency: number;    // MHz
  date: string;         // YYYY-MM-DD (sets the IRI month and the sun position)
  utcTime: string;      // HH:MM
  condition: number;    // 0 quiet ... 1 severe storm
  f107: number;         // solar flux, sfu
  source: IonoSource;
  angErr: number;       // 1-sigma DF angle error, deg
  confidenceRadiusKm: number;
}

export interface HopEstimate {
  hops: HopCount;
  ok: boolean;
  reason?: string;
  lat: number;
  lon: number;
  rangeKm: number;
  reflectionHeightKm: number;
  foF2: number;              // MHz at the (first) control point
  ellipse: { a: number; b: number; angDeg: number; ring: LatLon[] } | null; // 95%
  cloud: LatLon[];           // Monte Carlo fixes
  confidence: number;        // % of Monte Carlo fixes within confidenceRadiusKm of the estimate
  standard: (LatLon & { rangeKm: number; shiftKm: number }) | null; // standard (mid-latitude) model, for comparison
  controlPoints: LatLon[];
}

export interface CurvePoint { rangeKm: number; el: number }
export interface ConditionUncertainty { label: string; condition: number; hop1: number | null; hop2: number | null }

export interface AnalysisResult {
  id: string;
  createdAt: string;
  input: AnalysisInput;
  estimates: Record<HopCount, HopEstimate>;
  elevationRange: { hop1: CurvePoint[]; hop2: CurvePoint[]; measured: Record<HopCount, CurvePoint | null> };
  uncertaintyByCondition: ConditionUncertainty[];
  provenance: { engine: "local-worker" | "api"; ionosphere: string; dataKind: DataKind; notes: string[] };
  computeMs: number;
}

export interface ComparisonCase {
  id: string; label: string; group: "condition" | "region" | "hops"; ok: boolean;
  standardKm: number | null;     // standard (mid-latitude) model error vs truth
  indiaKm: number | null;        // India-aware model error (best case when the truth is the same model + TIDs)
  independentKm: number | null;  // v1 India model, independent of IRI (only in IRI mode)
  uncertaintyKm: number | null;  // India-aware 95% ellipse semi-major axis
}
export interface ComparisonResult { cases: ComparisonCase[]; truth: { tx: LatLon; st: LatLon; f: number }; provenance: AnalysisResult["provenance"] }

export type ValidationErrors = Partial<Record<keyof AnalysisInput, string>>;
