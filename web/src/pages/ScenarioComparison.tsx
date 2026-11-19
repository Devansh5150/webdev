import { useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import GlassPanel from "../components/common/GlassPanel";
import SectionHeader from "../components/common/SectionHeader";
import DataBadge from "../components/common/DataBadge";
import { axis, tooltipStyle } from "../components/charts/chartTheme";
import { useAnalysis } from "../store/analysisStore";
import type { ComparisonCase } from "../types/analysis";
import { fmtDist, fmtLatLon } from "../utils/scientificCalculations";

const GROUPS: { id: ComparisonCase["group"]; title: string; sub: string }[] = [
  { id: "condition", title: "Quiet vs disturbed ionosphere", sub: "storm level 0 vs 0.8" },
  { id: "region", title: "India vs mid-latitude reference", sub: "same distance and bearing, station in central Europe" },
  { id: "hops", title: "1-hop vs 2-hop propagation", sub: "same path, forced hop count" },
];

export default function ScenarioComparison() {
  const { comparison, comparisonStatus, runComparison, input, settings } = useAnalysis();
  useEffect(() => { if (!comparison && comparisonStatus === "idle") runComparison(); }, [comparison, comparisonStatus, runComparison]);
  const iri = input.source === "iri";
  return (
    <div className="h-full overflow-auto space-y-3">
      <GlassPanel className="p-3 flex flex-wrap items-center gap-3">
        <div className="min-w-0">
          <h1 className="text-[15px] font-semibold">Scenario Comparison</h1>
          <p className="text-[11.5px] text-muted">
            Known example transmitter {comparison ? `${fmtLatLon(comparison.truth.tx.lat, comparison.truth.tx.lon)} → station ${fmtLatLon(comparison.truth.st.lat, comparison.truth.st.lon)}, ${comparison.truth.f} MHz` : ""}, so every bar is an error versus truth.
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2"><DataBadge kind="model-derived" /><DataBadge kind="demonstration" title="Example transmitter and station" />
          <button type="button" onClick={runComparison} className="h-8 px-3 rounded-md border border-line text-[12px] text-muted hover:text-ink flex items-center gap-1.5"><RefreshCw size={13} className={comparisonStatus === "running" ? "animate-spin" : ""} /> Recompute</button>
        </div>
      </GlassPanel>
      {comparisonStatus === "error" && <p className="text-bad text-[12px]">Comparison failed.</p>}
      <div className="grid gap-3 xl:grid-cols-3">
        {GROUPS.map((g) => {
          const rows = (comparison?.cases ?? []).filter((c) => c.group === g.id).map((c) => ({ ...c, label: c.label }));
          return (
            <GlassPanel key={g.id} className="p-3">
              <SectionHeader title={g.title} sub={g.sub} />
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={rows} margin={{ top: 6, right: 8, bottom: 6, left: 0 }}>
                  <CartesianGrid strokeDasharray="2 4" vertical={false} />
                  <XAxis dataKey="label" {...axis} interval={0} tick={{ ...axis.tick, fontSize: 10 }} />
                  <YAxis width={44} {...axis} label={{ value: "error vs truth (km)", angle: -90, position: "insideLeft", offset: 14, fill: "#91a4ba", fontSize: 10.5 }} />
                  <Tooltip {...tooltipStyle} cursor={{ fill: "rgba(54,207,255,0.06)" }} formatter={(v) => (v == null ? "no fix" : `${Number(v).toFixed(0)} km`)} />
                  <Legend verticalAlign="top" height={20} wrapperStyle={{ fontSize: 10.5 }} />
                  <Bar dataKey="standardKm" name="Standard" fill="#61758c" radius={[3, 3, 0, 0]} maxBarSize={26} />
                  <Bar dataKey="indiaKm" name={iri ? "IRI-based (best case)" : "India-aware"} fill="#36cfff" radius={[3, 3, 0, 0]} maxBarSize={26} />
                  {iri && <Bar dataKey="independentKm" name="Independent v1" fill="#b56bff" radius={[3, 3, 0, 0]} maxBarSize={26} />}
                </BarChart>
              </ResponsiveContainer>
            </GlassPanel>
          );
        })}
      </div>
      <GlassPanel className="p-3 overflow-x-auto">
        <SectionHeader title="Comparison metrics" />
        <table className="w-full text-[12px]">
          <thead><tr className="text-left text-muted border-b border-line">
            <th className="py-1.5 font-medium">Case</th><th className="font-medium">Standard error</th><th className="font-medium">India-aware error</th>{iri && <th className="font-medium">Independent v1 error</th>}<th className="font-medium">95% uncertainty</th><th className="font-medium">Path</th></tr></thead>
          <tbody className="font-mono">
            {(comparison?.cases ?? []).map((c) => (
              <tr key={c.id} className="border-b border-line/50">
                <td className="py-1.5 font-sans">{c.label}</td><td>{fmtDist(c.standardKm, settings.units)}</td><td className="text-cyan">{fmtDist(c.indiaKm, settings.units)}</td>
                {iri && <td className="text-purple">{fmtDist(c.independentKm, settings.units)}</td>}<td>{fmtDist(c.uncertaintyKm, settings.units)}</td><td>{c.ok ? "skywave" : "no path"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-[11px] text-dim mt-2">{iri ? "In IRI mode the truth is IRI plus small disturbances, so the IRI-based model is a best case. The independent v1 model (not built from IRI) is the fair test of an India adjustment." : "In v1 mode the truth is the v1 India model plus disturbances (circular): treat India-aware errors as a best case."}</p>
      </GlassPanel>
    </div>
  );
}
