import { Suspense, useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import EarthGlobe from "./EarthGlobe";
import IonosphereShell from "./IonosphereShell";
import { AntennaStation, Transmitter } from "./Markers";
import SignalPaths from "./SignalPaths";
import ErrorEllipse from "./ErrorEllipse";
import GeoLabels from "./GeoLabels";
import { ll2v } from "./geo";
import { useAnalysis } from "../../store/analysisStore";
import { useIriGrid } from "../../hooks/useIriGrid";
import { utcToHours } from "../../utils/scientificCalculations";

const HOME = () => ll2v(8, 72, 3.0); // oblique view over India from the south-west

export default function EarthScene({ showAnalysis = true, resetKey = 0 }: { showAnalysis?: boolean; resetKey?: number }) {
  const { input, result, layers, settings, activeHop, mode } = useAnalysis();
  const grid = useIriGrid(input.date, input.source);
  const controls = useRef<OrbitControlsImpl>(null);
  const utH = utcToHours(input.utcTime);
  const reduced = settings.reducedMotion;
  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    c.object.position.copy(HOME()); c.target.set(0, 0, 0); c.update();
  }, [resetKey]);
  const est = result ? result.estimates[activeHop] : null;
  const station = { lat: input.stationLat, lon: input.stationLon };
  return (
    <Canvas camera={{ fov: 34, near: 0.01, far: 100, position: HOME().toArray() }} dpr={[1, 2]} gl={{ antialias: true }} className="!absolute inset-0">
      <color attach="background" args={["#050c17"]} />
      <ambientLight intensity={0.9} />
      <directionalLight position={[3, 4, 5]} intensity={1.6} />
      <Stars radius={40} depth={20} count={2500} factor={2.2} saturation={0} fade speed={reduced ? 0 : 0.4} />
      <Suspense fallback={null}>
        <EarthGlobe date={input.date} utHours={utH} grid={layers.grid} />
        <IonosphereShell layers={layers} utHours={utH} f107={input.f107} storm={input.condition} exag={settings.exaggeration} grid={grid} />
        {layers.labels && <GeoLabels />}
        <AntennaStation lat={input.stationLat} lon={input.stationLon} reduced={reduced} showLabel={layers.labels} />
        {showAnalysis && result && (
          <>
            <SignalPaths station={station} estimates={result.estimates} show1={layers.hop1} show2={layers.hop2} exag={settings.exaggeration} mode={mode} reduced={reduced} />
            {est?.ok && <Transmitter lat={est.lat} lon={est.lon} hops={est.hops} reduced={reduced} showLabel={layers.labels} />}
            {est?.ok && layers.ellipse && <ErrorEllipse est={est} level={settings.confidenceLevel} showCloud={layers.cloud} />}
          </>
        )}
      </Suspense>
      <OrbitControls ref={controls as never} enablePan enableDamping={!reduced} dampingFactor={0.08} minDistance={1.25} maxDistance={7} rotateSpeed={0.5} zoomSpeed={0.7} panSpeed={0.5}
        autoRotate={settings.autoRotate && !reduced} autoRotateSpeed={0.3} />
    </Canvas>
  );
}
