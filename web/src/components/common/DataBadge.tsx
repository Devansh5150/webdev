import type { DataKind } from "../../types/analysis";
const STYLE: Record<DataKind | "backend", [string, string]> = {
  "model-derived": ["Model-derived", "border-cyan/40 text-cyan bg-cyan/8"],
  demonstration: ["Demonstration data", "border-purple/50 text-purple bg-purple/10"],
  measured: ["Measured", "border-blue/50 text-blue bg-blue/10"],
  backend: ["Future backend", "border-line2 text-muted bg-panel"],
};
export default function DataBadge({ kind, title }: { kind: DataKind | "backend"; title?: string }) {
  const [label, cls] = STYLE[kind];
  return <span title={title} className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium tracking-wide whitespace-nowrap ${cls}`}>{label}</span>;
}
