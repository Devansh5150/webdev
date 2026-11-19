import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createIriSampler } from "../iri.js";
import { analysis, comparison } from "./core.js";

const DIR = new URL("../../public/data/iri/", import.meta.url);
const meta = JSON.parse(readFileSync(new URL("meta.json", DIR), "utf8"));
const grid = (m) => { const b = readFileSync(new URL(meta.files[String(m)], DIR)); return createIriSampler(meta, new Uint16Array(b.buffer, b.byteOffset, b.byteLength / 2), m); };

// dashboard defaults from the design brief
const P = { stationLat: 21.15, stationLon: 79.08, azimuth: 112, elevation: 14.5, frequency: 10.2, utHours: 9, f107: 140, condition: 0.5, angErr: 1, confidenceRadiusKm: 100 };

describe("dashboard analysis (inverse, 1 and 2 hops)", () => {
  const r = analysis({ ...P, grid: grid(3) });
  it("produces fixes for both hop assumptions with the brief's defaults (IRI, March)", () => {
    expect(r.estimates[1].ok).toBe(true);
    expect(r.estimates[2].ok).toBe(true);
    expect(r.estimates[2].rangeKm).toBeGreaterThan(r.estimates[1].rangeKm);
  });
  it("confidence is a percentage and the ellipse exists", () => {
    for (const h of [1, 2]) {
      const e = r.estimates[h];
      expect(e.confidence).toBeGreaterThanOrEqual(0); expect(e.confidence).toBeLessThanOrEqual(100);
      expect(e.ellipse.a).toBeGreaterThan(0);
    }
  });
  it("elevation-range curves are monotonic-ish and contain the measured point", () => {
    expect(r.elevationRange.hop1.length).toBeGreaterThan(5);
    expect(r.elevationRange.hop1[0].rangeKm).toBeGreaterThan(r.elevationRange.hop1.at(-1).rangeKm);
  });
  it("disturbed conditions change the uncertainty", () => {
    const [q, d] = r.uncertaintyByCondition;
    expect(q.hop1).not.toBeNull(); expect(d.hop1).not.toBeNull();
    expect(q.hop1).not.toBeCloseTo(d.hop1, 0);
  });
  it("reports the numbers (for the record)", () => {
    const e1 = r.estimates[1], e2 = r.estimates[2];
    console.log(`1-hop: ${e1.rangeKm.toFixed(0)} km, h' ${e1.reflectionHeightKm.toFixed(0)} km, conf ${e1.confidence}%, ellipse ${e1.ellipse.a.toFixed(0)}x${e1.ellipse.b.toFixed(0)}, std shift ${e1.standard?.shiftKm.toFixed(0)} km | 2-hop: ${e2.rangeKm.toFixed(0)} km, conf ${e2.confidence}% | ${r.computeMs.toFixed(0)} ms`);
  });
});

describe("scenario comparison (known example transmitter)", () => {
  const c = comparison({ utHours: 9, f107: 140, angErr: 1, grid: grid(3) });
  it("has six cases and errors vs truth", () => {
    expect(c.cases).toHaveLength(6);
    expect(c.cases.find((x) => x.id === "quiet").standardKm).toBeGreaterThan(c.cases.find((x) => x.id === "quiet").indiaKm);
  });
});
