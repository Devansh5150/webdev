import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from "recharts";
import type { AnalysisResult } from "../../types/analysis";
import { axis, tooltipStyle } from "./chartTheme";

export default function SignalPropagationChart({ result, height = 210 }: { result: AnalysisResult | null; height?: number }) {
  if (!result) return <div className="grid place-items-center text-[12px] text-muted" style={{ height }}>Run an analysis.</div>;
  const { hop1, hop2, measured } = result.elevationRange;
  const pts = [measured[1], measured[2]].filter(Boolean) as { rangeKm: number; el: number }[];
  const maxR = Math.min(6000, Math.max(...hop1.map((p) => p.rangeKm), ...hop2.map((p) => p.rangeKm), 1000));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart margin={{ top: 6, right: 10, bottom: 14, left: 0 }}>
        <CartesianGrid strokeDasharray="2 4" />
        <XAxis dataKey="rangeKm" type="number" domain={[0, Math.ceil(maxR / 500) * 500]} allowDataOverflow {...axis}
          label={{ value: "Ground range (km)", position: "insideBottom", offset: -8, fill: "#91a4ba", fontSize: 10.5 }} />
        <YAxis dataKey="el" type="number" domain={[0, 70]} width={40} {...axis}
          label={{ value: "Elevation (°)", angle: -90, position: "insideLeft", offset: 14, fill: "#91a4ba", fontSize: 10.5 }} />
        <Tooltip {...tooltipStyle} formatter={(v, n) => [n === "rangeKm" ? `${Number(v).toFixed(0)} km` : `${Number(v).toFixed(1)}°`, n === "rangeKm" ? "Range" : String(n)]} />
        <Legend verticalAlign="top" height={20} wrapperStyle={{ fontSize: 10.5 }} />
        <Line data={hop1} dataKey="el" name="1-hop" stroke="#36cfff" strokeWidth={2} dot={false} isAnimationActive={false} />
        <Line data={hop2} dataKey="el" name="2-hop" stroke="#b56bff" strokeWidth={2} strokeDasharray="6 4" dot={false} isAnimationActive={false} />
        <Scatter data={pts} dataKey="el" name="Measured" fill="#ffffff" />
      </LineChart>
    </ResponsiveContainer>
  );
}
