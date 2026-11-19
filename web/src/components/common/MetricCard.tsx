import type { ReactNode } from "react";
export default function MetricCard({ label, value, unit, hint, accent = "cyan", big = false }: { label: string; value: ReactNode; unit?: string; hint?: string; accent?: "cyan" | "purple" | "blue" | "muted"; big?: boolean }) {
  const color = { cyan: "text-cyan", purple: "text-purple", blue: "text-blue", muted: "text-ink" }[accent];
  return (
    <div className="rounded-lg border border-line bg-bg/50 px-3 py-2 min-w-0" title={hint}>
      <p className="label-xs truncate">{label}</p>
      <p className={`font-mono ${big ? "text-2xl" : "text-[17px]"} leading-tight mt-0.5 ${color} truncate`}>
        {value}{unit && <span className="text-[11px] text-muted ml-1">{unit}</span>}
      </p>
      {hint && <p className="text-[10.5px] text-dim truncate">{hint}</p>}
    </div>
  );
}
