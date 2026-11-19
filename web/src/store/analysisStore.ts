import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AnalysisInput, AnalysisResult, ComparisonResult, HopCount, ValidationErrors } from "../types/analysis";
import { DEFAULT_INPUT } from "../data/demoScenarios";
import { engine } from "../services/analysisService";
import { validateInput } from "../utils/scientificCalculations";

export type Page = "overview" | "analysis" | "ionosphere" | "comparison" | "reports" | "settings";
export const PAGES: Page[] = ["overview", "analysis", "ionosphere", "comparison", "reports", "settings"];
export type Status = "idle" | "running" | "done" | "error";

export interface Layers { D: boolean; E: boolean; F1: boolean; F2: boolean; eia: boolean; hop1: boolean; hop2: boolean; labels: boolean; grid: boolean; ellipse: boolean; cloud: boolean }
export interface Settings {
  units: "km" | "nmi";
  timeDisplay: "UTC" | "IST";
  autoRotate: boolean;
  reducedMotion: boolean;
  exaggeration: number;
  confidenceLevel: number; // 0.68 / 0.90 / 0.95 / 0.99 (scales the 95% ellipse)
  defaultStation: { lat: number; lon: number };
}

/** Lightweight copy kept in history (no Monte Carlo clouds, so localStorage stays small). */
export type HistoryEntry = Omit<AnalysisResult, "estimates"> & { estimates: Record<HopCount, Omit<AnalysisResult["estimates"][1], "cloud">> };

interface State {
  page: Page;
  input: AnalysisInput;
  errors: ValidationErrors;
  status: Status;
  error: string | null;
  result: AnalysisResult | null;
  activeHop: HopCount;
  mode: "inverse" | "forward";
  layers: Layers;
  settings: Settings;
  history: HistoryEntry[];
  comparison: ComparisonResult | null;
  comparisonStatus: Status;
  setPage: (p: Page) => void;
  setInput: (p: Partial<AnalysisInput>) => void;
  run: () => Promise<void>;
  setActiveHop: (h: HopCount) => void;
  setMode: (m: "inverse" | "forward") => void;
  toggleLayer: (k: keyof Layers) => void;
  updateSettings: (s: Partial<Settings>) => void;
  loadHistory: (id: string) => void;
  removeHistory: (id: string) => void;
  clearHistory: () => void;
  runComparison: () => Promise<void>;
}

const slim = (r: AnalysisResult): HistoryEntry => ({
  ...r,
  estimates: {
    1: { ...r.estimates[1], cloud: undefined } as HistoryEntry["estimates"][1],
    2: { ...r.estimates[2], cloud: undefined } as HistoryEntry["estimates"][2],
  },
});

export const useAnalysis = create<State>()(
  persist(
    (set, get) => ({
      page: "analysis",
      input: DEFAULT_INPUT,
      errors: {},
      status: "idle",
      error: null,
      result: null,
      activeHop: 1,
      mode: "inverse",
      layers: { D: true, E: true, F1: true, F2: true, eia: true, hop1: true, hop2: true, labels: true, grid: true, ellipse: true, cloud: false },
      settings: { units: "km", timeDisplay: "UTC", autoRotate: false, reducedMotion: false, exaggeration: 8, confidenceLevel: 0.95, defaultStation: { lat: DEFAULT_INPUT.stationLat, lon: DEFAULT_INPUT.stationLon } },
      history: [],
      comparison: null,
      comparisonStatus: "idle",

      setPage: (page) => set({ page }),
      setInput: (p) => set((s) => ({ input: { ...s.input, ...p }, errors: {} })),
      run: async () => {
        const input = get().input;
        const errors = validateInput(input);
        if (Object.keys(errors).length) { set({ errors, status: "error", error: "Please fix the highlighted inputs." }); return; }
        set({ status: "running", error: null, errors: {} });
        try {
          const result = await engine.runAnalysis(input);
          const anyOk = result.estimates[1].ok || result.estimates[2].ok;
          set((s) => ({
            result, status: anyOk ? "done" : "error",
            error: anyOk ? null : "No reflection for either hop assumption: try a lower frequency, another elevation or another time.",
            activeHop: result.estimates[s.activeHop].ok ? s.activeHop : result.estimates[1].ok ? 1 : 2,
            history: [slim(result), ...s.history].slice(0, 40),
          }));
        } catch (e) {
          set({ status: "error", error: e instanceof Error ? e.message : String(e) });
        }
      },
      setActiveHop: (activeHop) => set({ activeHop }),
      setMode: (mode) => set({ mode }),
      toggleLayer: (k) => set((s) => ({ layers: { ...s.layers, [k]: !s.layers[k] } })),
      updateSettings: (p) => set((s) => ({ settings: { ...s.settings, ...p } })),
      loadHistory: (id) => {
        const h = get().history.find((x) => x.id === id);
        if (h) set({ input: h.input, page: "analysis" });
      },
      removeHistory: (id) => set((s) => ({ history: s.history.filter((x) => x.id !== id) })),
      clearHistory: () => set({ history: [] }),
      runComparison: async () => {
        set({ comparisonStatus: "running" });
        try { set({ comparison: await engine.runComparison(get().input), comparisonStatus: "done" }); }
        catch { set({ comparisonStatus: "error" }); }
      },
    }),
    {
      name: "bharat-hf-locator",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ history: s.history, settings: s.settings, layers: s.layers }),
    },
  ),
);
