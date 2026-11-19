import type { ReactNode } from "react";
export default function SectionHeader({ title, right, sub }: { title: string; right?: ReactNode; sub?: string }) {
  return (
    <div className="flex items-start justify-between gap-2 mb-2">
      <div className="min-w-0">
        <h2 className="text-[13px] font-semibold tracking-wide text-ink">{title}</h2>
        {sub && <p className="text-[11px] text-muted leading-snug">{sub}</p>}
      </div>
      {right}
    </div>
  );
}
