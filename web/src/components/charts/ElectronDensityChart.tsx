import { CartesianGrid, Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Profile } from "../../engine/iriProfiles";
import { axis, tooltipStyle } from "./chartTheme";

const sci = (v: number) => { const e = Math.floor(Math.log10(v)); return `1e${e}`; };

export default function ElectronDensityChart({ profile, height = 210 }: { profile: Profile | null; height?: number }) {
  if (!profile) return <div className="grid place-items-center text-[12px] text-muted" style={{ height }}>Loading IRI profile…</div>;
  const data = profile.points.map((p) => ({ alt: p.alt, ne: Math.max(p.ne, 1e8) }));
  const layer = (y: number, name: string) => <ReferenceLine y={Math.round(y)} stroke="#34506c" strokeDasharray="3 3" label={{ value: `${name} · ${Math.round(y)} km`, position: "insideTopRight", fill: "#91a4ba", fontSize: 10.5 }} />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 6, right: 8, bottom: 14, left: 0 }}>
        <defs>
          <filter id="glowC" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.2" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        <CartesianGrid strokeDasharray="2 4" />
        <ReferenceArea y1={60} y2={90} fill="#2998ff" fillOpacity={0.07} label={{ value: "D (not modelled)", position: "insideBottomRight", fill: "#61758c", fontSize: 10 }} />
        <XAxis dataKey="ne" type="number" scale="log" domain={[1e8, 1e13]} allowDataOverflow tickFormatter={sci} ticks={[1e8, 1e9, 1e10, 1e11, 1e12, 1e13]} {...axis}
          label={{ value: "Electron density (m⁻³)", position: "insideBottom", offset: -8, fill: "#91a4ba", fontSize: 10.5 }} />
        <YAxis dataKey="alt" type="number" domain={[60, 600]} ticks={[100, 200, 300, 400, 500, 600]} width={44} {...axis}
          label={{ value: "Altitude (km)", angle: -90, position: "insideLeft", offset: 14, fill: "#91a4ba", fontSize: 10.5 }} />
        <Tooltip {...tooltipStyle} formatter={(v) => [Number(v).toExponential(2), "Ne"]} labelFormatter={() => ""} />
        {layer(profile.hmE, "E")}
        {profile.pF1 > 0.3 && profile.hmF1 > 150 && layer(profile.hmF1, "F1")}
        {layer(profile.hmF2, "F2")}
        <Line dataKey="alt" type="monotone" stroke="#36cfff" strokeWidth={2} dot={false} filter="url(#glowC)" isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
