import { useAnalysis } from "../../store/analysisStore";
import DataBadge from "../common/DataBadge";

export default function AnalysisStatus() {
  const { result, status } = useAnalysis();
  return (
    <div className="glass !rounded-lg absolute right-3 bottom-3 px-3 py-2 max-w-[340px] pointer-events-none">
      <div className="flex items-center gap-2 mb-0.5">
        <span className={`w-2 h-2 rounded-full ${status === "running" ? "bg-purple animate-pulse" : status === "error" ? "bg-bad" : "bg-cyan"}`} />
        <span className="text-[11px] text-ink font-medium">{status === "running" ? "Computing…" : result ? `Analysis ${new Date(result.createdAt).toISOString().slice(11, 19)} UTC · ${result.computeMs.toFixed(0)} ms` : "Ready"}</span>
        {result && <DataBadge kind={result.provenance.dataKind} />}
      </div>
      {result && <p className="text-[10.5px] text-muted leading-snug">{result.provenance.ionosphere}. Mirror-model propagation; ray tracing (PyLap) planned.</p>}
    </div>
  );
}
