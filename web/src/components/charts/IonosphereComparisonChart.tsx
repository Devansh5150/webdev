import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ConditionUncertainty } from "../../types/analysis";
import { axis, tooltipStyle } from "./chartTheme";

export default function IonosphereComparisonChart({ data, height = 210, unitLabel = "95% uncertainty (km)" }: { data: ConditionUncertainty[] | null; height?: number; unitLabel?: string }) {
  if (!data) return <div className="grid place-items-center text-[12px] text-muted" style={{ height }}>Run an analysis.</div>;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 6, right: 8, bottom: 14, left: 0 }} barGap={4}>
        <CartesianGrid strokeDasharray="2 4" vertical={false} />
        <XAxis dataKey="label" {...axis} />
        <YAxis width={44} {...axis} label={{ value: unitLabel, angle: -90, position: "insideLeft", offset: 14, fill: "#91a4ba", fontSize: 10.5 }} />
        <Tooltip {...tooltipStyle} cursor={{ fill: "rgba(54,207,255,0.06)" }} formatter={(v) => (v == null ? "no fix" : `${Number(v).toFixed(0)} km`)} />
        <Legend verticalAlign="top" height={20} wrapperStyle={{ fontSize: 10.5 }} />
        <Bar dataKey="hop1" name="1-hop" fill="#36cfff" radius={[3, 3, 0, 0]} maxBarSize={34} />
        <Bar dataKey="hop2" name="2-hop" fill="#b56bff" radius={[3, 3, 0, 0]} maxBarSize={34} />
      </BarChart>
    </ResponsiveContainer>
  );
}
