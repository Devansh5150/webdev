import { useEffect, useState } from "react";
import GlassPanel from "../components/common/GlassPanel";
import SectionHeader from "../components/common/SectionHeader";
import DataBadge from "../components/common/DataBadge";
import EarthScene from "../components/globe/EarthScene";
import GlobeControls from "../components/globe/GlobeControls";
import GlobeLegend from "../components/globe/GlobeLegend";
import AnalysisParameters from "../components/analysis/AnalysisParameters";
import EstimateSummary from "../components/analysis/EstimateSummary";
import AnalysisStatus from "../components/analysis/AnalysisStatus";
import ElectronDensityChart from "../components/charts/ElectronDensityChart";
import SignalPropagationChart from "../components/charts/SignalPropagationChart";
import IonosphereComparisonChart from "../components/charts/IonosphereComparisonChart";
import { useAnalysis } from "../store/analysisStore";
import { useProfile } from "../hooks/useProfile";
import { utcToHours } from "../utils/scientificCalculations";

export default function LocationAnalysis() {
  const { result, run, status, activeHop } = useAnalysis();
  const [resetKey, setResetKey] = useState(0);
  useEffect(() => { if (!result && status === "idle") run(); }, [result, status, run]);
  // profile at the active estimate's (first) reflection point, else above the station
  const shown = result ?? null;
  const est = shown?.estimates[activeHop];
  const cp = est?.ok ? est.controlPoints[0] : { lat: useAnalysis.getState().input.stationLat, lon: useAnalysis.getState().input.stationLon };
  const inp = shown?.input ?? useAnalysis.getState().input;
  const { profile } = useProfile(cp.lat, cp.lon, utcToHours(inp.utcTime), inp.f107, inp.date);

  return (
    <div className="h-full min-h-0 grid gap-3 lg:grid-rows-[minmax(0,1fr)_auto]">
      <div className="min-h-0 grid gap-3 lg:grid-cols-[minmax(0,1fr)_350px]">
        <GlassPanel className="relative overflow-hidden min-h-[460px]" aria-label="Interactive 3D globe">
          <EarthScene resetKey={resetKey} />
          <GlobeControls onReset={() => setResetKey((k) => k + 1)} />
          <GlobeLegend />
          <AnalysisStatus />
        </GlassPanel>
        <div className="min-h-0 overflow-auto space-y-3 pr-0.5">
          <AnalysisParameters />
          <EstimateSummary />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <GlassPanel className="p-3">
          <SectionHeader title="Electron Density Profile (IRI, India)" sub={`at the ${est?.ok ? `${activeHop}-hop reflection point` : "station"} · ${cp.lat.toFixed(1)}°N ${cp.lon.toFixed(1)}°E`} right={<DataBadge kind="model-derived" title="PyIRI IRI_density_1day" />} />
          <ElectronDensityChart profile={profile} height={200} />
        </GlassPanel>
        <GlassPanel className="p-3">
          <SectionHeader title="Signal Elevation vs Range" sub="mirror model through the India-aware ionosphere" right={<DataBadge kind="model-derived" />} />
          <SignalPropagationChart result={result} height={200} />
        </GlassPanel>
        <GlassPanel className="p-3">
          <SectionHeader title="Quiet vs Disturbed Ionosphere (Location Error)" sub="95% uncertainty, same measured angles" right={<DataBadge kind="model-derived" />} />
          <IonosphereComparisonChart data={result?.uncertaintyByCondition ?? null} height={200} />
        </GlassPanel>
      </div>
    </div>
  );
}
