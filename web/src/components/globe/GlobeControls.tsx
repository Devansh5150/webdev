import { RotateCcw } from "lucide-react";
import { useAnalysis, type Layers } from "../../store/analysisStore";

const TOGGLES: { k: keyof Layers; label: string; color?: string }[] = [
  { k: "D", label: "D" }, { k: "E", label: "E" }, { k: "F1", label: "F1" }, { k: "F2", label: "F2" },
  { k: "eia", label: "EIA", color: "#b56bff" }, { k: "hop1", label: "1-hop", color: "#36cfff" }, { k: "hop2", label: "2-hop", color: "#b56bff" },
  { k: "ellipse", label: "Ellipse" }, { k: "cloud", label: "MC points" }, { k: "labels", label: "Labels" }, { k: "grid", label: "Grid" },
];

export default function GlobeControls({ onReset, compact = false }: { onReset: () => void; compact?: boolean }) {
  const { layers, toggleLayer, mode, setMode, settings, updateSettings } = useAnalysis();
  return (
    <div className="absolute left-3 top-3 right-3 flex flex-wrap items-start gap-2 pointer-events-none">
      {!compact && (
        <div className="glass !rounded-lg p-1 flex pointer-events-auto" role="group" aria-label="Visualisation mode">
          {(["forward", "inverse"] as const).map((m) => (
            <button key={m} type="button" onClick={() => setMode(m)} aria-pressed={mode === m}
              className={`px-2.5 h-7 rounded-md text-[11.5px] capitalize ${mode === m ? "bg-cyan/15 text-cyan" : "text-muted hover:text-ink"}`}>{m}</button>
          ))}
        </div>
      )}
      <div className="glass !rounded-lg p-1 flex flex-wrap gap-0.5 pointer-events-auto" role="group" aria-label="Layers">
        {TOGGLES.filter((t) => !compact || ["D", "E", "F1", "F2", "eia", "labels", "grid"].includes(t.k)).map((t) => (
          <button key={t.k} type="button" onClick={() => toggleLayer(t.k)} aria-pressed={layers[t.k]}
            className={`px-2 h-7 rounded-md text-[11px] font-mono border ${layers[t.k] ? "border-line2 bg-panel2 text-ink" : "border-transparent text-dim hover:text-muted"}`}
            style={layers[t.k] && t.color ? { color: t.color, borderColor: t.color + "66" } : undefined}>{t.label}</button>
        ))}
      </div>
      {!compact && (
        <label className="glass !rounded-lg px-2 h-9 flex items-center gap-2 pointer-events-auto text-[11px] text-muted">
          Region
          <select className="bg-transparent text-ink font-mono text-[11.5px] outline-none" value={settings.confidenceLevel}
            onChange={(e) => updateSettings({ confidenceLevel: Number(e.target.value) })} aria-label="Uncertainty confidence level">
            {[0.68, 0.9, 0.95, 0.99].map((l) => <option key={l} value={l} className="bg-panel">{Math.round(l * 100)}%</option>)}
          </select>
        </label>
      )}
      <button type="button" onClick={onReset} className="glass !rounded-lg h-9 px-2.5 ml-auto flex items-center gap-1.5 text-[11.5px] text-muted hover:text-ink pointer-events-auto" title="Reset view to India">
        <RotateCcw size={14} /> India
      </button>
    </div>
  );
}
