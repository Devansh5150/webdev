import { useEffect, useState } from "react";
import { loadIri } from "../iri.js";
import type { IriSampler } from "../physics";
import { BASE_URL } from "../services/analysisService";
import { monthOf } from "../utils/scientificCalculations";

/** Loads the IRI F2 grid for the month of `date` (null when the v1 model is selected or while loading). */
export function useIriGrid(date: string, source: "iri" | "v1"): IriSampler | null {
  const [grid, setGrid] = useState<IriSampler | null>(null);
  useEffect(() => {
    if (source !== "iri") { setGrid(null); return; }
    let live = true;
    loadIri(monthOf(date), BASE_URL).then((g) => { if (live) setGrid(g); }).catch(() => { if (live) setGrid(null); });
    return () => { live = false; };
  }, [date, source]);
  return grid;
}
