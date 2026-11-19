import { motion } from "framer-motion";
import GlassPanel from "../common/GlassPanel";
import SectionHeader from "../common/SectionHeader";
import MetricCard from "../common/MetricCard";
import DataBadge from "../common/DataBadge";
import { useAnalysis } from "../../store/analysisStore";
import { ellipseScale, fmtDist, fmtLatLon } from "../../utils/scientificCalculations";

export default function EstimateSummary() {
  const { result, activeHop, setActiveHop, settings, status } = useAnalysis();
  const est = result?.estimates[activeHop];
  const k = ellipseScale(settings.confidenceLevel), lvl = Math.round(settings.confidenceLevel * 100);
  return (
    <GlassPanel className="p-3">
      <SectionHeader title="Estimate Summary" right={result && <DataBadge kind={result.provenance.dataKind} title={result.provenance.ionosphere} />} />
      <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-bg/60 border border-line mb-2.5" role="tablist" aria-label="Propagation mode">
        {([1, 2] as const).map((h) => (
          <button key={h} role="tab" aria-selected={activeHop === h} type="button" onClick={() => setActiveHop(h)}
            className={`h-8 rounded-md text-[12px] font-medium ${activeHop === h ? (h === 1 ? "bg-cyan/15 text-cyan border border-cyan/40" : "bg-purple/15 text-purple border border-purple/40") : "text-muted hover:text-ink"}`}>
            {h}-Hop{result && !result.estimates[h].ok ? " · no fix" : ""}
          </button>
        ))}
      </div>
      {!result && <p className="text-[12px] text-muted">{status === "running" ? "Computing…" : "Run an analysis to see the estimate."}</p>}
      {est && !est.ok && <p className="text-[12px] text-bad">{est.reason}</p>}
      {est?.ok && (
        <motion.div key={`${result!.id}-${activeHop}`} initial={settings.reducedMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <MetricCard label="Confidence score" value={`${est.confidence}%`} big accent="cyan" hint={`MC fixes within ${result!.input.confidenceRadiusKm} km`} />
            <MetricCard label="Estimated range" value={fmtDist(est.rangeKm, settings.units)} big accent="muted" hint="ground distance" />
            <MetricCard label={`Uncertainty (${lvl}%)`} value={est.ellipse ? fmtDist(est.ellipse.a * k, settings.units) : "—"} accent="purple" hint={est.ellipse ? `× ${fmtDist(est.ellipse.b * k, settings.units)} semi-axes` : undefined} />
            <MetricCard label="Propagation mode" value={`${est.hops}F2`} accent={est.hops === 1 ? "cyan" : "purple"} hint={`h′ ${est.reflectionHeightKm.toFixed(0)} km · foF2 ${est.foF2.toFixed(1)} MHz`} />
          </div>
          <div className="rounded-lg border border-line bg-bg/50 px-3 py-2">
            <p className="label-xs">Estimated coordinates</p>
            <p className="font-mono text-[15px] text-ink">{fmtLatLon(est.lat, est.lon)}</p>
            {est.standard && <p className="text-[10.5px] text-dim mt-0.5">Standard (mid-latitude) model would place it {fmtDist(est.standard.shiftKm, settings.units)} away.</p>}
          </div>
        </motion.div>
      )}
    </GlassPanel>
  );
}
