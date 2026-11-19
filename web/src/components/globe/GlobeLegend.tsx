const ITEMS: { label: string; swatch: React.ReactNode }[] = [
  { label: "DF station", swatch: <span className="w-2.5 h-2.5 rounded-full bg-cyan shadow-[0_0_8px_#36cfff]" /> },
  { label: "Estimated transmitter", swatch: <span className="w-2.5 h-2.5 rounded-full bg-purple shadow-[0_0_8px_#b56bff]" /> },
  { label: "1-hop path", swatch: <span className="w-5 h-[3px] rounded bg-cyan" /> },
  { label: "2-hop path", swatch: <span className="w-5 border-t-[3px] border-dashed border-purple" /> },
  { label: "Reflection point", swatch: <span className="w-[2px] h-3 border-l-2 border-dashed border-cyan" /> },
  { label: "Error region", swatch: <span className="w-5 h-2.5 rounded-full border border-[#d4a6ff] bg-purple/30" /> },
  { label: "EIA trough / crests", swatch: <span className="w-5 border-t-2 border-purple" /> },
  { label: "F2 density (foF2)", swatch: <span className="w-5 h-2 rounded bg-gradient-to-r from-blue via-cyan to-purple" /> },
];
export default function GlobeLegend() {
  return (
    <div className="glass !rounded-lg absolute left-3 bottom-3 px-3 py-2 grid grid-cols-2 gap-x-4 gap-y-1 pointer-events-none" aria-label="Legend">
      {ITEMS.map((i) => (
        <span key={i.label} className="flex items-center gap-2 text-[10.5px] text-muted"><span className="w-5 flex items-center justify-center">{i.swatch}</span>{i.label}</span>
      ))}
    </div>
  );
}
