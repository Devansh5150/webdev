import { useEffect, useState } from "react";
import { UserRound } from "lucide-react";
import { useAnalysis } from "../../store/analysisStore";

function Logo() {
  return (
    <svg viewBox="0 0 40 40" className="w-9 h-9 shrink-0" aria-hidden="true">
      <rect width="40" height="40" rx="9" fill="#0c1929" stroke="#263b52" />
      <path d="M20 22v11M14.5 33h11" stroke="#36cfff" strokeWidth="2" strokeLinecap="round" />
      <circle cx="20" cy="19" r="2.6" fill="#36cfff" />
      <path d="M13.5 12.5a9.2 9.2 0 0 0 0 13M26.5 12.5a9.2 9.2 0 0 1 0 13" fill="none" stroke="#36cfff" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M9.5 8.5a15 15 0 0 0 0 21M30.5 8.5a15 15 0 0 1 0 21" fill="none" stroke="#b56bff" strokeWidth="1.6" strokeLinecap="round" opacity=".9" />
    </svg>
  );
}

export default function Topbar() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  const status = useAnalysis((s) => s.status);
  const source = useAnalysis((s) => s.input.source);
  const utc = now.toISOString().slice(11, 19);
  const ist = new Date(now.getTime() + 5.5 * 3600e3).toISOString().slice(11, 16);
  return (
    <header className="flex items-center gap-4 px-4 h-14 border-b border-line bg-bg2/80 backdrop-blur shrink-0">
      <Logo />
      <div className="min-w-0">
        <p className="font-semibold tracking-[0.14em] text-[15px] leading-tight">BHARAT <span className="text-cyan">HF</span> LOCATOR</p>
        <p className="text-[11.5px] text-muted leading-tight truncate">Single-Station HF Research Platform</p>
      </div>
      <div className="ml-auto flex items-center gap-3">
        <span className="hidden md:inline-flex items-center gap-2 rounded-md border border-line px-2.5 py-1 text-[11.5px] text-muted">
          <span className={`w-2 h-2 rounded-full ${status === "running" ? "bg-purple animate-pulse" : "bg-cyan shadow-[0_0_8px_#36cfff]"}`} />
          Research Mode · {source === "iri" ? "IRI model" : "v1 model"} · no live DF data
        </span>
        <div className="text-right font-mono leading-tight" aria-live="off">
          <p className="text-[14px] text-ink">{utc} <span className="text-[10.5px] text-cyan">UTC</span></p>
          <p className="text-[10.5px] text-dim">{ist} IST</p>
        </div>
        <button type="button" className="w-9 h-9 grid place-items-center rounded-full border border-line text-muted hover:text-ink hover:border-line2" aria-label="Researcher profile (local session)" title="Local research session">
          <UserRound size={17} />
        </button>
      </div>
    </header>
  );
}
