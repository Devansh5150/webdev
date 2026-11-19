import { LayoutDashboard, Crosshair, Layers3, GitCompareArrows, FileText, Settings as Cog } from "lucide-react";
import { useAnalysis, type Page } from "../../store/analysisStore";

const NAV: { id: Page; label: string; Icon: typeof Crosshair }[] = [
  { id: "overview", label: "Overview", Icon: LayoutDashboard },
  { id: "analysis", label: "Location Analysis", Icon: Crosshair },
  { id: "ionosphere", label: "Ionosphere Model", Icon: Layers3 },
  { id: "comparison", label: "Scenario Comparison", Icon: GitCompareArrows },
  { id: "reports", label: "Research Reports", Icon: FileText },
  { id: "settings", label: "Settings", Icon: Cog },
];

export default function Sidebar() {
  const page = useAnalysis((s) => s.page);
  const setPage = useAnalysis((s) => s.setPage);
  return (
    <nav aria-label="Main" className="w-14 xl:w-52 shrink-0 border-r border-line bg-bg2/60 py-3 flex flex-col gap-1">
      {NAV.map(({ id, label, Icon }) => {
        const active = page === id;
        return (
          <button key={id} type="button" onClick={() => setPage(id)} aria-current={active ? "page" : undefined} title={label}
            className={`mx-2 flex items-center gap-3 rounded-lg px-2.5 xl:px-3 h-10 text-[13px] transition-colors ${active
              ? "bg-cyan/12 text-cyan border border-cyan/40 shadow-[0_0_18px_rgba(54,207,255,0.15)_inset,0_0_12px_rgba(54,207,255,0.12)]"
              : "text-muted border border-transparent hover:text-ink hover:bg-panel"}`}>
            <Icon size={18} strokeWidth={1.8} className="shrink-0" />
            <span className="hidden xl:inline truncate">{label}</span>
          </button>
        );
      })}
      <div className="mt-auto hidden xl:block mx-3 text-[10.5px] leading-snug text-dim">
        Open-literature physics only. All coordinates are examples. No political borders shown.
      </div>
    </nav>
  );
}
