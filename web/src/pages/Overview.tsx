import { useEffect } from "react";
import { Radio, Satellite, Target, Activity } from "lucide-react";
import GlassPanel from "../components/common/GlassPanel";
import SectionHeader from "../components/common/SectionHeader";
import MetricCard from "../components/common/MetricCard";
import DataBadge from "../components/common/DataBadge";
import { useAnalysis } from "../store/analysisStore";
import { engine } from "../services/analysisService";
import { DEMO_SCENARIOS, DEFAULT_INPUT } from "../data/demoScenarios";
import { fmtDist, fmtLatLon } from "../utils/scientificCalculations";

export default function Overview() {
  const { result, history, comparison, comparisonStatus, runComparison, setInput, setPage, run, input, settings } = useAnalysis();
  useEffect(() => { if (!comparison && comparisonStatus === "idle") runComparison(); }, [comparison, comparisonStatus, runComparison]);
  const q = comparison?.cases.find((c) => c.id === "quiet"), m = comparison?.cases.find((c) => c.id === "midlat"), d = comparison?.cases.find((c) => c.id === "disturbed");
  const latest = result ?? null, e1 = latest?.estimates[1];
  const load = (p: Partial<typeof input>) => { setInput({ ...DEFAULT_INPUT, ...p, stationLat: settings.defaultStation.lat, stationLon: settings.defaultStation.lon }); setPage("analysis"); setTimeout(() => run(), 0); };
  return (
    <div className="h-full overflow-auto grid gap-3 lg:grid-cols-3 content-start">
      <GlassPanel className="p-4 lg:col-span-2">
        <p className="label-xs text-cyan">Research platform</p>
        <h1 className="text-xl font-semibold mt-1">Single-station location of HF transmitters over India</h1>
        <p className="text-[13px] text-muted mt-2 leading-relaxed max-w-3xl">
          A direction-finding station measures where a skywave signal comes from (azimuth) and how steeply it arrives (elevation).
          With a model of the ionosphere, that is enough to estimate where the transmitter is. Over India the ionosphere has an
          afternoon bulge, the <span className="text-purple">equatorial ionization anomaly</span>, which mid-latitude methods ignore. This platform measures how much that
          matters and tests India-aware corrections. It addresses an open DRDO DIA-CoE research problem (DLRL, Electronic Warfare).
        </p>
        <div className="flex flex-wrap gap-2 mt-3 text-[11px]">
          <DataBadge kind="model-derived" title="Computed by the physics engine" /><span className="text-muted">computed by the model</span>
          <DataBadge kind="demonstration" /><span className="text-muted">example inputs / sample data</span>
          <DataBadge kind="backend" /><span className="text-muted">FastAPI + PyLap ray tracing (planned)</span>
        </div>
      </GlassPanel>
      <GlassPanel className="p-4">
        <SectionHeader title="Simulation status" />
        <ul className="space-y-2 text-[12.5px]">
          <li className="flex gap-2"><Activity size={15} className="text-cyan mt-0.5" /><span>Engine: <b className="font-mono font-medium">{engine.name}</b> {engine.name === "local-worker" ? "(offline, in-browser)" : "(FastAPI)"}</span></li>
          <li className="flex gap-2"><Satellite size={15} className="text-cyan mt-0.5" /><span>Ionosphere: {input.source === "iri" ? "IRI monthly median (PyIRI)" : "v1 illustrative"}; storm terms illustrative</span></li>
          <li className="flex gap-2"><Radio size={15} className="text-purple mt-0.5" /><span>Propagation: mirror model; numerical ray tracing not yet connected</span></li>
          <li className="flex gap-2"><Target size={15} className="text-purple mt-0.5" /><span>DF data: none (angles are user inputs). Validation with Indian ionosondes is milestone 3.</span></li>
        </ul>
      </GlassPanel>

      <GlassPanel className="p-4 lg:col-span-2">
        <SectionHeader title="Key research metrics" sub="Known example transmitter, so errors versus truth exist" right={<DataBadge kind="model-derived" />} />
        {comparisonStatus === "running" && <p className="text-[12px] text-muted">Computing comparison…</p>}
        {q && (
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-2">
            <MetricCard label="Standard model · India, quiet" value={fmtDist(q.standardKm, settings.units)} accent="muted" hint="error vs truth" />
            <MetricCard label="Standard model · mid-latitude" value={fmtDist(m?.standardKm, settings.units)} accent="muted" hint="same path in Europe" />
            <MetricCard label="Standard model · India, disturbed" value={fmtDist(d?.standardKm, settings.units)} accent="purple" hint="storm 0.8" />
            <MetricCard label="Independent India model (v1)" value={fmtDist(q.independentKm, settings.units)} accent="cyan" hint={q.independentKm == null ? "only in IRI mode" : "not built from IRI: fair test"} />
          </div>
        )}
        <p className="text-[11px] text-dim mt-2">The IRI-based India-aware model shares the truth's climatology here, so its error is a best case; the independent v1 model is the fair test.</p>
      </GlassPanel>
      <GlassPanel className="p-4">
        <SectionHeader title="Latest analysis" right={latest && <DataBadge kind={latest.provenance.dataKind} />} />
        {e1?.ok ? (
          <div className="grid grid-cols-2 gap-2">
            <MetricCard label="1-hop range" value={fmtDist(e1.rangeKm, settings.units)} accent="cyan" />
            <MetricCard label="Confidence" value={`${e1.confidence}%`} accent="cyan" />
            <div className="col-span-2 text-[12px] text-muted font-mono">{fmtLatLon(e1.lat, e1.lon)}</div>
          </div>
        ) : <p className="text-[12px] text-muted">No analysis yet. <button className="text-cyan underline" onClick={() => setPage("analysis")}>Open Location Analysis</button></p>}
      </GlassPanel>

      <GlassPanel className="p-4 lg:col-span-2">
        <SectionHeader title="Example scenarios" sub="Inputs only; every result is computed" right={<DataBadge kind="demonstration" />} />
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-2">
          {DEMO_SCENARIOS.map((s) => (
            <button key={s.id} type="button" onClick={() => load(s.input)} className="text-left rounded-lg border border-line bg-bg/40 hover:border-cyan/50 hover:bg-cyan/5 px-3 py-2">
              <p className="text-[12.5px] font-medium">{s.name}</p><p className="text-[11px] text-muted">{s.note}</p>
            </button>
          ))}
        </div>
      </GlassPanel>
      <GlassPanel className="p-4">
        <SectionHeader title="Recent analyses" />
        {history.length === 0 ? <p className="text-[12px] text-muted">None yet.</p> : (
          <ul className="space-y-1.5">
            {history.slice(0, 5).map((h) => (
              <li key={h.id} className="flex justify-between gap-2 text-[11.5px] font-mono">
                <span className="text-muted truncate">{h.createdAt.slice(5, 16).replace("T", " ")} · az {h.input.azimuth}° el {h.input.elevation}°</span>
                <span className="text-cyan shrink-0">{h.estimates[1].ok ? fmtDist(h.estimates[1].rangeKm, settings.units) : "no fix"}</span>
              </li>
            ))}
          </ul>
        )}
      </GlassPanel>
    </div>
  );
}
