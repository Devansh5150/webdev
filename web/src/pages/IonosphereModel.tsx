import { useMemo, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import GlassPanel from "../components/common/GlassPanel";
import SectionHeader from "../components/common/SectionHeader";
import DataBadge from "../components/common/DataBadge";
import EarthScene from "../components/globe/EarthScene";
import GlobeControls from "../components/globe/GlobeControls";
import ElectronDensityChart from "../components/charts/ElectronDensityChart";
import { axis, tooltipStyle } from "../components/charts/chartTheme";
import { useAnalysis } from "../store/analysisStore";
import { useProfile } from "../hooks/useProfile";
import { useIriGrid } from "../hooks/useIriGrid";
import { getIono, magLat, MODELS } from "../physics.js";
import { conditionLabel, utcToHours } from "../utils/scientificCalculations";

const hhmm = (h: number) => `${String(Math.floor(h)).padStart(2, "0")}:${String(Math.round((h % 1) * 60)).padStart(2, "0")}`;

export default function IonosphereModel() {
  const { input, setInput, settings, updateSettings } = useAnalysis();
  const [resetKey, setResetKey] = useState(0);
  const [pt, setPt] = useState({ lat: input.stationLat, lon: input.stationLon });
  const utH = utcToHours(input.utcTime);
  const grid = useIriGrid(input.date, input.source);
  const { profile } = useProfile(pt.lat, pt.lon, utH, input.f107, input.date);
  // EIA: foF2 against latitude along the chosen longitude, India-aware vs standard model
  const eia = useMemo(() => {
    const base = { utHours: utH, f107: input.f107, storm: input.condition, grid };
    const ind = MODELS.india(base), std = MODELS.standard(base);
    const rows = [];
    for (let lat = -15; lat <= 40; lat += 1) rows.push({ lat, india: +getIono(lat, pt.lon, ind).foF2.toFixed(2), standard: +getIono(lat, pt.lon, std).foF2.toFixed(2), mlat: magLat(lat, pt.lon) });
    return rows;
  }, [utH, input.f107, input.condition, grid, pt.lon]);
  const magEq = eia.reduce((a, b) => (Math.abs(b.mlat) < Math.abs(a.mlat) ? b : a)).lat;
  const slider = (v: number, min: number, max: number) => ({ "--p": `${((v - min) / (max - min)) * 100}%` } as React.CSSProperties);

  return (
    <div className="h-full min-h-0 grid gap-3 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-h-0 grid gap-3 lg:grid-rows-[minmax(0,1fr)_250px]">
        <GlassPanel className="relative overflow-hidden min-h-[380px]">
          <EarthScene showAnalysis={false} resetKey={resetKey} />
          <GlobeControls compact onReset={() => setResetKey((k) => k + 1)} />
          <div className="glass !rounded-lg absolute left-3 bottom-3 px-3 py-2 text-[11px] text-muted max-w-sm pointer-events-none">
            D / E / F1 shells at fixed nominal heights (75 / 110 / 200 km); the F2 shell follows hmF2 and is coloured by foF2 from {input.source === "iri" ? "IRI" : "the v1 model"}. Heights ×{settings.exaggeration}.
          </div>
        </GlassPanel>
        <GlassPanel className="p-3">
          <SectionHeader title="Equatorial Ionization Anomaly" sub={`foF2 vs latitude along ${pt.lon.toFixed(1)}°E · ${hhmm(utH)} UTC · ${conditionLabel(input.condition)}`} right={<DataBadge kind="model-derived" />} />
          <ResponsiveContainer width="100%" height={196}>
            <LineChart data={eia} margin={{ top: 4, right: 10, bottom: 12, left: 0 }}>
              <CartesianGrid strokeDasharray="2 4" />
              <XAxis dataKey="lat" type="number" domain={[-15, 40]} {...axis} label={{ value: "Geographic latitude (°N)", position: "insideBottom", offset: -6, fill: "#91a4ba", fontSize: 10.5 }} />
              <YAxis width={40} {...axis} label={{ value: "foF2 (MHz)", angle: -90, position: "insideLeft", offset: 14, fill: "#91a4ba", fontSize: 10.5 }} />
              <Tooltip {...tooltipStyle} labelFormatter={(l) => `${l}°N`} />
              <Legend verticalAlign="top" height={18} wrapperStyle={{ fontSize: 10.5 }} />
              <ReferenceLine x={magEq} stroke="#b56bff" strokeDasharray="4 3" label={{ value: "magnetic equator", fill: "#b56bff", fontSize: 10, position: "insideTopLeft" }} />
              <Line dataKey="india" name={input.source === "iri" ? "IRI + storm (India-aware)" : "v1 India-aware"} stroke="#36cfff" strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line dataKey="standard" name="Standard (no EIA)" stroke="#91a4ba" strokeDasharray="5 4" strokeWidth={1.6} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </GlassPanel>
      </div>
      <div className="min-h-0 overflow-auto space-y-3">
        <GlassPanel className="p-3 space-y-2.5">
          <SectionHeader title="Ionosphere conditions" />
          <label className="block"><span className="flex justify-between text-[11px] text-muted"><span>Condition</span><span className="font-mono text-ink">{conditionLabel(input.condition)}</span></span>
            <input type="range" className="slider" min={0} max={1} step={0.05} value={input.condition} style={slider(input.condition, 0, 1)} onChange={(e) => setInput({ condition: +e.target.value })} /></label>
          <label className="block"><span className="flex justify-between text-[11px] text-muted"><span>UTC time</span><span className="font-mono text-ink">{hhmm(utH)} UTC · {hhmm((utH + 5.5) % 24)} IST</span></span>
            <input type="range" className="slider" min={0} max={23.5} step={0.5} value={utH} style={slider(utH, 0, 23.5)} onChange={(e) => setInput({ utcTime: hhmm(+e.target.value) })} /></label>
          <label className="block"><span className="flex justify-between text-[11px] text-muted"><span>Solar flux F10.7</span><span className="font-mono text-ink">{input.f107} sfu</span></span>
            <input type="range" className="slider" min={70} max={220} step={5} value={input.f107} style={slider(input.f107, 70, 220)} onChange={(e) => setInput({ f107: +e.target.value })} /></label>
          <label className="block"><span className="flex justify-between text-[11px] text-muted"><span>Altitude exaggeration</span><span className="font-mono text-ink">×{settings.exaggeration}</span></span>
            <input type="range" className="slider" min={1} max={20} step={1} value={settings.exaggeration} style={slider(settings.exaggeration, 1, 20)} onChange={(e) => updateSettings({ exaggeration: +e.target.value })} /></label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block"><span className="text-[11px] text-muted">Date (season)</span><input type="date" className="field mt-1" value={input.date} onChange={(e) => setInput({ date: e.target.value })} /></label>
            <label className="block"><span className="text-[11px] text-muted">Model</span>
              <select className="field mt-1" value={input.source} onChange={(e) => setInput({ source: e.target.value as "iri" | "v1" })}><option value="iri">IRI (PyIRI)</option><option value="v1">v1</option></select></label>
          </div>
        </GlassPanel>
        <GlassPanel className="p-3">
          <SectionHeader title="Electron Density Profile (IRI, India)" sub="PyIRI, interpolated to the point, time and F10.7" right={<DataBadge kind="model-derived" />} />
          <div className="grid grid-cols-2 gap-2 mb-2">
            <label><span className="text-[11px] text-muted">Latitude °N</span><input type="number" step={0.5} className="field mt-1" value={pt.lat} onChange={(e) => setPt({ ...pt, lat: +e.target.value })} /></label>
            <label><span className="text-[11px] text-muted">Longitude °E</span><input type="number" step={0.5} className="field mt-1" value={pt.lon} onChange={(e) => setPt({ ...pt, lon: +e.target.value })} /></label>
          </div>
          {profile?.clamped && <p className="text-[10.5px] text-purple mb-1">Outside the 0–40°N, 65–100°E profile grid: showing the nearest edge.</p>}
          <ElectronDensityChart profile={profile} height={280} />
          {profile && <p className="text-[11px] text-muted font-mono mt-1">NmF2 {profile.nmF2.toExponential(2)} m⁻³ · hmF2 {profile.hmF2.toFixed(0)} km · hmE {profile.hmE.toFixed(0)} km</p>}
        </GlassPanel>
      </div>
    </div>
  );
}
