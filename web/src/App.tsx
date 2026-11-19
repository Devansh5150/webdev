import { lazy, Suspense } from "react";
import { AnimatePresence, motion } from "framer-motion";
import DashboardLayout from "./components/layout/DashboardLayout";
import { useAnalysis } from "./store/analysisStore";
import { useHashRoute } from "./hooks/useHashRoute";

const Overview = lazy(() => import("./pages/Overview"));
const LocationAnalysis = lazy(() => { console.log("DBG import LA"); return import("./pages/LocationAnalysis").then((m) => { console.log("DBG loaded LA"); return m; }, (e) => { console.log("DBG fail LA " + String(e)); throw e; }); });
const IonosphereModel = lazy(() => import("./pages/IonosphereModel"));
const ScenarioComparison = lazy(() => import("./pages/ScenarioComparison"));
const ResearchReports = lazy(() => import("./pages/ResearchReports"));
const Settings = lazy(() => { console.log("DBG import settings"); return import("./pages/Settings").then((m) => { console.log("DBG loaded settings", typeof m.default); return m; }, (e) => { console.log("DBG fail", String(e)); throw e; }); });

const VIEWS = { overview: Overview, analysis: LocationAnalysis, ionosphere: IonosphereModel, comparison: ScenarioComparison, reports: ResearchReports, settings: Settings };

export default function App() {
  useHashRoute();
  const page = useAnalysis((s) => s.page);
  const reduced = useAnalysis((s) => s.settings.reducedMotion);
  const View = VIEWS[page];
  console.log("DBG render App page=" + page);
  return (
    <DashboardLayout>
      <AnimatePresence mode="wait">
        <motion.div key={page} className="h-full min-h-0"
          initial={reduced ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={reduced ? undefined : { opacity: 0, y: -4 }}
          transition={{ duration: 0.18 }}>
          <Suspense fallback={<div className="p-6 text-muted text-sm">Loading…</div>}><View /></Suspense>
        </motion.div>
      </AnimatePresence>
    </DashboardLayout>
  );
}
