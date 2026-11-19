import { motion } from "framer-motion";
import { Play, Loader2 } from "lucide-react";
import GlassPanel from "../common/GlassPanel";
import SectionHeader from "../common/SectionHeader";
import { useAnalysis } from "../../store/analysisStore";
import type { AnalysisInput } from "../../types/analysis";
import { conditionLabel } from "../../utils/scientificCalculations";

function Num({ k, label, unit, step = 0.01, min, max }: { k: keyof AnalysisInput; label: string; unit: string; step?: number; min: number; max: number }) {
  const value = useAnalysis((s) => s.input[k]) as number;
  const err = useAnalysis((s) => s.errors[k]);
  const setInput = useAnalysis((s) => s.setInput);
  const id = `in-${k}`;
  return (
    <label htmlFor={id} className="block min-w-0">
      <span className="flex justify-between text-[11px] text-muted mb-1"><span>{label}</span><span className="text-dim">{unit}</span></span>
      <input id={id} type="number" className="field" step={step} min={min} max={max} value={Number.isFinite(value) ? value : ""}
        aria-invalid={!!err} aria-describedby={err ? `${id}-err` : undefined}
        onChange={(e) => setInput({ [k]: e.target.value === "" ? NaN : Number(e.target.value) } as Partial<AnalysisInput>)} />
      {err && <span id={`${id}-err`} className="block text-[10.5px] text-bad mt-0.5">{err}</span>}
    </label>
  );
}

export default function AnalysisParameters() {
  const { input, setInput, run, status, error, errors } = useAnalysis();
  const running = status === "running";
  const pct = `${input.condition * 100}%`;
  return (
    <GlassPanel className="p-3">
      <SectionHeader title="Analysis Parameters" sub="Measured angles at the DF station (inverse problem)" />
      <form className="grid grid-cols-2 gap-x-2.5 gap-y-2" onSubmit={(e) => { e.preventDefault(); run(); }} noValidate>
        <Num k="stationLat" label="Station latitude" unit="° N" min={-90} max={90} />
        <Num k="stationLon" label="Station longitude" unit="° E" min={-180} max={180} />
        <Num k="azimuth" label="Azimuth bearing" unit="0–360°" step={0.1} min={0} max={360} />
        <Num k="elevation" label="Elevation angle" unit="0–90°" step={0.1} min={0} max={90} />
        <Num k="frequency" label="Frequency" unit="MHz" step={0.1} min={2} max={30} />
        <label className="block min-w-0">
          <span className="flex justify-between text-[11px] text-muted mb-1"><span>Date</span></span>
          <input type="date" className="field" value={input.date} aria-invalid={!!errors.date} onChange={(e) => setInput({ date: e.target.value })} />
        </label>
        <label className="block min-w-0">
          <span className="flex justify-between text-[11px] text-muted mb-1"><span>UTC time</span><span className="text-dim">IST −5:30</span></span>
          <input type="time" className="field" value={input.utcTime} aria-invalid={!!errors.utcTime} onChange={(e) => setInput({ utcTime: e.target.value })} />
        </label>
        <label className="block min-w-0">
          <span className="flex justify-between text-[11px] text-muted mb-1"><span>Ionosphere</span></span>
          <select className="field" value={input.source} onChange={(e) => setInput({ source: e.target.value as "iri" | "v1" })}>
            <option value="iri">IRI (PyIRI)</option><option value="v1">v1 illustrative</option>
          </select>
        </label>
        <label className="col-span-2 block">
          <span className="flex justify-between text-[11px] text-muted"><span>Ionosphere condition</span><span className="font-mono text-ink">{conditionLabel(input.condition)}</span></span>
          <input type="range" className="slider" min={0} max={1} step={0.05} value={input.condition} style={{ "--p": pct } as React.CSSProperties}
            onChange={(e) => setInput({ condition: Number(e.target.value) })} aria-valuetext={conditionLabel(input.condition)} />
          <span className="flex justify-between text-[10px] text-dim -mt-0.5"><span>Quiet</span><span>Disturbed</span></span>
        </label>
        <motion.button type="submit" disabled={running} whileTap={{ scale: 0.98 }}
          className="col-span-2 mt-1 h-10 rounded-lg font-semibold tracking-[0.16em] text-[12.5px] text-bg bg-gradient-to-r from-cyan to-blue shadow-[0_0_22px_rgba(54,207,255,0.35)] hover:shadow-[0_0_28px_rgba(54,207,255,0.55)] disabled:opacity-70 flex items-center justify-center gap-2">
          {running ? <><Loader2 size={16} className="animate-spin" /> ANALYSING…</> : <><Play size={15} /> RUN ANALYSIS</>}
        </motion.button>
        {running && <div className="col-span-2 h-1 rounded bg-line overflow-hidden"><div className="h-full w-1/3 bg-cyan animate-[scan_1.1s_ease-in-out_infinite]" /></div>}
        {error && status === "error" && <p role="alert" className="col-span-2 text-[11.5px] text-bad">{error}</p>}
      </form>
      <style>{`@keyframes scan { 0% { transform: translateX(-100%) } 100% { transform: translateX(300%) } }`}</style>
    </GlassPanel>
  );
}
