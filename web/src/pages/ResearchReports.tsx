import { useState } from "react";
import { Download, FileJson, FileSpreadsheet, FileText, Trash2, Upload } from "lucide-react";
import GlassPanel from "../components/common/GlassPanel";
import SectionHeader from "../components/common/SectionHeader";
import DataBadge from "../components/common/DataBadge";
import MetricCard from "../components/common/MetricCard";
import { useAnalysis } from "../store/analysisStore";
import { download, historyToCSV, reportMarkdown } from "../utils/exporters";
import { fmtDist, fmtLatLon } from "../utils/scientificCalculations";

export default function ResearchReports() {
  const { history, comparison, loadHistory, removeHistory, clearHistory, settings } = useAnalysis();
  const [sel, setSel] = useState<string | null>(history[0]?.id ?? null);
  const h = history.find((x) => x.id === sel) ?? null;
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const btn = "h-8 px-3 rounded-md border border-line text-[12px] text-muted hover:text-ink hover:border-line2 flex items-center gap-1.5 disabled:opacity-40";
  return (
    <div className="h-full min-h-0 grid gap-3 lg:grid-cols-[minmax(0,1fr)_380px]">
      <GlassPanel className="p-3 min-h-0 flex flex-col">
        <SectionHeader title="Analysis history" sub={`${history.length} saved in this browser (last 40)`} right={
          <div className="flex gap-1.5">
            <button className={btn} disabled={!history.length} onClick={() => download(`bharat-hf-history-${stamp}.csv`, historyToCSV(history), "text/csv")}><FileSpreadsheet size={14} /> CSV</button>
            <button className={btn} disabled={!history.length} onClick={() => download(`bharat-hf-history-${stamp}.json`, JSON.stringify({ exported: new Date().toISOString(), analyses: history, comparison }, null, 2), "application/json")}><FileJson size={14} /> JSON</button>
            <button className={btn} disabled={!history.length} onClick={() => { if (confirm("Delete all saved analyses?")) clearHistory(); }}><Trash2 size={14} /> Clear</button>
          </div>} />
        {history.length === 0 ? <p className="text-[12px] text-muted">No analyses yet. Run one in Location Analysis; each run is saved here.</p> : (
          <div className="overflow-auto min-h-0">
            <table className="w-full text-[11.5px]">
              <thead className="sticky top-0 bg-panel"><tr className="text-left text-muted border-b border-line">
                {["Time (UTC)", "Station", "Az / El", "Freq", "Condition", "1-hop range", "Conf.", "95% unc.", "2-hop range", ""].map((t) => <th key={t} className="py-1.5 pr-2 font-medium whitespace-nowrap">{t}</th>)}</tr></thead>
              <tbody className="font-mono">
                {history.map((x) => {
                  const e1 = x.estimates[1], e2 = x.estimates[2];
                  return (
                    <tr key={x.id} onClick={() => setSel(x.id)} aria-selected={sel === x.id} className={`border-b border-line/50 cursor-pointer ${sel === x.id ? "bg-cyan/8" : "hover:bg-panel2"}`}>
                      <td className="py-1.5 pr-2 whitespace-nowrap">{x.createdAt.slice(0, 16).replace("T", " ")}</td>
                      <td className="pr-2 whitespace-nowrap">{x.input.stationLat.toFixed(2)}, {x.input.stationLon.toFixed(2)}</td>
                      <td className="pr-2">{x.input.azimuth}° / {x.input.elevation}°</td><td className="pr-2">{x.input.frequency}</td><td className="pr-2">{x.input.condition}</td>
                      <td className="pr-2 text-cyan">{e1.ok ? fmtDist(e1.rangeKm, settings.units) : "no fix"}</td><td className="pr-2">{e1.ok ? `${e1.confidence}%` : "—"}</td>
                      <td className="pr-2">{e1.ok && e1.ellipse ? fmtDist(e1.ellipse.a, settings.units) : "—"}</td><td className="pr-2 text-purple">{e2.ok ? fmtDist(e2.rangeKm, settings.units) : "no fix"}</td>
                      <td><button className="text-dim hover:text-bad" aria-label="Delete" onClick={(ev) => { ev.stopPropagation(); removeHistory(x.id); }}><Trash2 size={13} /></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </GlassPanel>
      <div className="min-h-0 overflow-auto space-y-3">
        <GlassPanel className="p-3">
          <SectionHeader title="Scenario metadata" right={h && <DataBadge kind={h.provenance.dataKind} />} />
          {!h ? <p className="text-[12px] text-muted">Select an analysis.</p> : (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <MetricCard label="1-hop confidence" value={h.estimates[1].ok ? `${h.estimates[1].confidence}%` : "—"} accent="cyan" />
                <MetricCard label="2-hop confidence" value={h.estimates[2].ok ? `${h.estimates[2].confidence}%` : "—"} accent="purple" />
                <MetricCard label="1-hop 95% unc." value={h.estimates[1].ellipse ? fmtDist(h.estimates[1].ellipse.a, settings.units) : "—"} accent="muted" />
                <MetricCard label="2-hop 95% unc." value={h.estimates[2].ellipse ? fmtDist(h.estimates[2].ellipse.a, settings.units) : "—"} accent="muted" />
              </div>
              <dl className="text-[11.5px] grid grid-cols-[110px_1fr] gap-y-1">
                <dt className="text-muted">ID</dt><dd className="font-mono truncate">{h.id}</dd>
                <dt className="text-muted">Created</dt><dd className="font-mono">{h.createdAt}</dd>
                <dt className="text-muted">Engine</dt><dd>{h.provenance.engine} · {h.computeMs.toFixed(0)} ms</dd>
                <dt className="text-muted">Ionosphere</dt><dd>{h.provenance.ionosphere}</dd>
                <dt className="text-muted">Date / UTC</dt><dd className="font-mono">{h.input.date} {h.input.utcTime}</dd>
                <dt className="text-muted">σ angle / radius</dt><dd className="font-mono">{h.input.angErr}° / {h.input.confidenceRadiusKm} km</dd>
                <dt className="text-muted">1-hop fix</dt><dd className="font-mono">{h.estimates[1].ok ? fmtLatLon(h.estimates[1].lat, h.estimates[1].lon) : "no fix"}</dd>
              </dl>
              <div className="flex flex-wrap gap-1.5 pt-1">
                <button className={btn} onClick={() => download(`bharat-hf-report-${h.id.slice(0, 8)}.md`, reportMarkdown(h, comparison), "text/markdown")}><FileText size={14} /> Export report</button>
                <button className={btn} onClick={() => download(`bharat-hf-analysis-${h.id.slice(0, 8)}.json`, JSON.stringify(h, null, 2), "application/json")}><Download size={14} /> JSON</button>
                <button className={btn} onClick={() => loadHistory(h.id)}><Upload size={14} /> Load inputs</button>
              </div>
            </div>
          )}
        </GlassPanel>
        <GlassPanel className="p-3 text-[11.5px] text-muted space-y-1.5">
          <SectionHeader title="Method notes" />
          {(h?.provenance.notes ?? []).map((n) => <p key={n}>• {n}</p>)}
          <p>• Data: IRI via PyIRI (Forsythe et al. 2024); globe imagery NASA Blue Marble / Black Marble (public domain).</p>
        </GlassPanel>
      </div>
    </div>
  );
}
