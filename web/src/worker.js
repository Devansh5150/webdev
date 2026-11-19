// Physics in a Web Worker so Monte Carlo runs and sweeps never freeze the UI.
import { runScenario } from "./physics.js";
import { loadIri } from "./iri.js";
import { addV1India, inverse, sweep, compare, analysis, comparison } from "./engine/core.js";

// Resolve the ionosphere source: payload.source === "iri" -> attach the month's IRI sampler as `grid`.
async function withGrid(p) {
  if (p.source !== "iri") return { ...p, grid: null };
  try { return { ...p, grid: await loadIri(p.month, p.baseUrl) }; }
  catch (e) { return { ...p, grid: null, gridError: String(e) }; }
}
self.onmessage = async (e) => {
  const { id, type } = e.data;
  const payload = await withGrid(e.data.payload);
  const t0 = performance.now();
  let result;
  try {
    if (type === "analysis") result = analysis(payload);
    else if (type === "comparison") result = comparison(payload);
    else if (type === "scenario") result = addV1India(runScenario(payload), payload);
    else if (type === "inverse") result = inverse(payload);
    else if (type === "sweep") result = sweep(payload);
    else if (type === "compare") result = compare(payload);
    if (result && typeof result === "object" && !Array.isArray(result)) result.source = payload.grid ? "iri" : "v1";
    if (payload.gridError) result.gridError = payload.gridError;
    self.postMessage({ id, type, result, ms: performance.now() - t0 });
  } catch (err) {
    self.postMessage({ id, type, error: String(err && err.stack || err) });
  }
};
