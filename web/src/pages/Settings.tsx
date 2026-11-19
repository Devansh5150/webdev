import GlassPanel from "../components/common/GlassPanel";
import SectionHeader from "../components/common/SectionHeader";
import { useAnalysis } from "../store/analysisStore";

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-line/50 last:border-0">
      <div><p className="text-[12.5px]">{label}</p>{hint && <p className="text-[11px] text-dim">{hint}</p>}</div>
      <div className="shrink-0 w-48">{children}</div>
    </div>
  );
}
const Toggle = ({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) => (
  <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
    className={`ml-auto block w-11 h-6 rounded-full border transition-colors ${on ? "bg-cyan/25 border-cyan/60" : "bg-bg border-line"}`}>
    <span className={`block w-4 h-4 rounded-full bg-ink transition-transform ${on ? "translate-x-6 bg-cyan" : "translate-x-1"}`} />
  </button>
);

export default function Settings() {
  const { settings, updateSettings, input, setInput, layers, toggleLayer } = useAnalysis();
  return (
    <div className="h-full overflow-auto grid gap-3 lg:grid-cols-2 content-start">
      <GlassPanel className="p-4">
        <SectionHeader title="Display preferences" />
        <Row label="Distance units"><select className="field" value={settings.units} onChange={(e) => updateSettings({ units: e.target.value as "km" | "nmi" })}><option value="km">Kilometres</option><option value="nmi">Nautical miles</option></select></Row>
        <Row label="Time display" hint="Inputs are always UTC"><select className="field" value={settings.timeDisplay} onChange={(e) => updateSettings({ timeDisplay: e.target.value as "UTC" | "IST" })}><option>UTC</option><option>IST</option></select></Row>
        <Row label="Reduce motion" hint="Stops animations and globe damping"><Toggle label="Reduce motion" on={settings.reducedMotion} onChange={(v) => updateSettings({ reducedMotion: v })} /></Row>
      </GlassPanel>
      <GlassPanel className="p-4">
        <SectionHeader title="Visualisation" />
        <Row label="Altitude exaggeration" hint="Ionosphere and path heights"><input type="number" min={1} max={20} className="field" value={settings.exaggeration} onChange={(e) => updateSettings({ exaggeration: Math.min(20, Math.max(1, +e.target.value || 1)) })} /></Row>
        <Row label="Uncertainty region" hint="Rescales the 95% Monte Carlo ellipse"><select className="field" value={settings.confidenceLevel} onChange={(e) => updateSettings({ confidenceLevel: +e.target.value })}>{[0.68, 0.9, 0.95, 0.99].map((l) => <option key={l} value={l}>{Math.round(l * 100)}%</option>)}</select></Row>
        <Row label="Auto-rotate globe"><Toggle label="Auto-rotate" on={settings.autoRotate} onChange={(v) => updateSettings({ autoRotate: v })} /></Row>
        <Row label="Geographic labels" hint="Place names only; no borders are drawn"><Toggle label="Labels" on={layers.labels} onChange={() => toggleLayer("labels")} /></Row>
        <Row label="Lat/lon grid"><Toggle label="Grid" on={layers.grid} onChange={() => toggleLayer("grid")} /></Row>
      </GlassPanel>
      <GlassPanel className="p-4">
        <SectionHeader title="Default station (example)" sub="Used when loading example scenarios" />
        <Row label="Latitude °N"><input type="number" step={0.01} className="field" value={settings.defaultStation.lat} onChange={(e) => updateSettings({ defaultStation: { ...settings.defaultStation, lat: +e.target.value } })} /></Row>
        <Row label="Longitude °E"><input type="number" step={0.01} className="field" value={settings.defaultStation.lon} onChange={(e) => updateSettings({ defaultStation: { ...settings.defaultStation, lon: +e.target.value } })} /></Row>
        <button type="button" className="mt-2 h-8 px-3 rounded-md border border-line text-[12px] text-muted hover:text-ink" onClick={() => setInput({ stationLat: settings.defaultStation.lat, stationLon: settings.defaultStation.lon })}>Apply to current analysis</button>
      </GlassPanel>
      <GlassPanel className="p-4">
        <SectionHeader title="Model settings" />
        <Row label="Ionosphere model"><select className="field" value={input.source} onChange={(e) => setInput({ source: e.target.value as "iri" | "v1" })}><option value="iri">IRI (PyIRI) monthly median</option><option value="v1">v1 illustrative</option></select></Row>
        <Row label="Solar flux F10.7" hint="sfu"><input type="number" min={60} max={300} className="field" value={input.f107} onChange={(e) => setInput({ f107: +e.target.value })} /></Row>
        <Row label="DF angle error σ" hint="degrees, azimuth and elevation"><input type="number" step={0.25} min={0.1} max={5} className="field" value={input.angErr} onChange={(e) => setInput({ angErr: +e.target.value })} /></Row>
        <Row label="Confidence radius" hint="km, for the confidence score"><input type="number" step={10} min={10} max={1000} className="field" value={input.confidenceRadiusKm} onChange={(e) => setInput({ confidenceRadiusKm: +e.target.value })} /></Row>
        <p className="text-[11px] text-dim mt-2">Backend: set <code className="font-mono text-muted">VITE_API_URL</code> to use the FastAPI service instead of the in-browser engine.</p>
      </GlassPanel>
    </div>
  );
}
