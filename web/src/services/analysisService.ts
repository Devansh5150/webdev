// Analysis service. The UI only talks to `engine`, which is either:
//   - LocalWorkerEngine: runs the physics (physics.js + engine/core.js) in a Web Worker, fully offline;
//   - RestEngine: calls the FastAPI backend (research/api) when VITE_API_URL is set.
// Both return the same AnalysisResult / ComparisonResult contract (types/analysis.ts).
import type { AnalysisInput, AnalysisResult, ComparisonResult } from "../types/analysis";
import { monthOf, utcToHours } from "../utils/scientificCalculations";

export interface AnalysisEngine {
  name: "local-worker" | "api";
  runAnalysis(input: AnalysisInput): Promise<AnalysisResult>;
  runComparison(input: AnalysisInput): Promise<ComparisonResult>;
}

const BASE_URL = new URL(import.meta.env.BASE_URL, location.href).href;
const ionosphereLabel = (i: AnalysisInput) =>
  i.source === "iri" ? `IRI monthly median (PyIRI), month ${monthOf(i.date)}, F10.7 ${i.f107}; storm terms illustrative` : "v1 illustrative model (not IRI)";
const NOTES = [
  "Mirror-model (virtual height) propagation on a spherical Earth; no numerical ray tracing yet (PyLap/PHaRLAP planned).",
  "No real DF measurements are used: inputs are user-entered angles.",
  "Confidence = share of Monte Carlo fixes within the confidence radius of the estimate (σ angle and ionosphere uncertainty).",
];
const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

class LocalWorkerEngine implements AnalysisEngine {
  name = "local-worker" as const;
  private worker = new Worker(new URL("../worker.js", import.meta.url), { type: "module" });
  private nextId = 1;
  private pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
  constructor() {
    this.worker.onmessage = (e: MessageEvent) => {
      const { id, result, error } = e.data;
      const p = this.pending.get(id);
      if (!p) return;
      this.pending.delete(id);
      if (error) p.reject(new Error(error)); else p.resolve(result);
    };
    this.worker.onerror = (e) => { this.pending.forEach((p) => p.reject(new Error(e.message || "Worker error"))); this.pending.clear(); };
  }
  private call<T>(type: string, payload: object): Promise<T> {
    const id = this.nextId++;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
      this.worker.postMessage({ id, type, payload });
    });
  }
  private payload(i: AnalysisInput) {
    return { ...i, utHours: utcToHours(i.utcTime), month: monthOf(i.date), baseUrl: BASE_URL };
  }
  async runAnalysis(input: AnalysisInput): Promise<AnalysisResult> {
    const r = await this.call<Omit<AnalysisResult, "id" | "createdAt" | "input" | "provenance"> & { gridError?: string }>("analysis", this.payload(input));
    return {
      ...r, id: newId(), createdAt: new Date().toISOString(), input,
      provenance: { engine: this.name, ionosphere: r.gridError ? `v1 model (IRI grid failed to load: ${r.gridError})` : ionosphereLabel(input), dataKind: "model-derived", notes: NOTES },
    };
  }
  async runComparison(input: AnalysisInput): Promise<ComparisonResult> {
    const r = await this.call<Omit<ComparisonResult, "provenance">>("comparison", this.payload(input));
    return { ...r, provenance: { engine: this.name, ionosphere: ionosphereLabel(input), dataKind: "model-derived", notes: [...NOTES, "Comparison uses a known example transmitter so errors versus truth exist."] } };
  }
}

class RestEngine implements AnalysisEngine {
  name = "api" as const;
  constructor(private base: string) {}
  private async post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${this.base}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`Backend ${res.status}: ${await res.text()}`);
    return res.json() as Promise<T>;
  }
  runAnalysis(input: AnalysisInput) { return this.post<AnalysisResult>("/api/v1/analysis", input); }
  runComparison(input: AnalysisInput) { return this.post<ComparisonResult>("/api/v1/comparison", input); }
}

const apiUrl = import.meta.env.VITE_API_URL as string | undefined;
export const engine: AnalysisEngine = apiUrl ? new RestEngine(apiUrl.replace(/\/$/, "")) : new LocalWorkerEngine();
export { BASE_URL };
