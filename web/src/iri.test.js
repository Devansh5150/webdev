import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createIriSampler, f107ToIG12 } from "./iri.js";
import { runScenario, getIono, MODELS } from "./physics.js";
import fixture from "./iri.fixture.json";

const DIR = new URL("../public/data/iri/", import.meta.url);
const meta = JSON.parse(readFileSync(new URL("meta.json", DIR), "utf8"));
const samplers = {};
function sampler(month) {
  if (!samplers[month]) {
    const b = readFileSync(new URL(meta.files[String(month)], DIR));
    samplers[month] = createIriSampler(meta, new Uint16Array(b.buffer, b.byteOffset, b.byteLength / 2), month);
  }
  return samplers[month];
}

describe("IRI grid decoding and interpolation", () => {
  it("F10.7 -> IG12 matches PyIRI (140 sfu -> 105.117)", () => {
    expect(f107ToIG12(140)).toBeCloseTo(105.1169, 3);
  });
  it("matches PyIRI at random off-grid points (bilinear + time + solar interpolation)", () => {
    const err = { fo: [], hm: [], bb: [] };
    for (const p of fixture.points) {
      const s = sampler(p.month)(p.lat, p.lon, p.ut, p.f107);
      err.fo.push(Math.abs(s.foF2 - p.foF2)); err.hm.push(Math.abs(s.hmF2 - p.hmF2)); err.bb.push(Math.abs(s.bb - p.bb));
    }
    const max = (a) => Math.max(...a);
    // interpolation error on a 1 deg / 1 h grid, not decoding error
    expect(max(err.fo)).toBeLessThan(0.5);
    expect(max(err.hm)).toBeLessThan(12);
    expect(max(err.bb)).toBeLessThan(5);
    const med = (a) => a.slice().sort((x, y) => x - y)[a.length >> 1];
    expect(med(err.fo)).toBeLessThan(0.15);
  });
  it("uses the global grid outside the India box", () => {
    expect(sampler(3)(50, 10, 9, 140).grid).toBe("global");
    expect(sampler(3)(21, 79, 9, 140).grid).toBe("india");
  });
  it("shows an afternoon EIA over India in March (crest stronger than the magnetic equator)", () => {
    const s = sampler(3);
    let crest = 0;
    for (let lat = 15; lat <= 30; lat += 1) crest = Math.max(crest, s(lat, 78, 9, 140).foF2);
    const trough = s(9, 78, 9, 140).foF2;
    expect(crest).toBeGreaterThan(trough);
  });
});

describe("physics with the IRI baseline", () => {
  const grid = sampler(3);
  const base = { tx: { lat: 15.5, lon: 88.5 }, st: { lat: 21.15, lon: 79.09 }, f: 7.2, utHours: 9, f107: 140, grid };
  it("getIono without a grid is unchanged (v1)", () => {
    const a = getIono(21, 79, { utHours: 9, f107: 140, storm: 0 });
    const b = getIono(21, 79, { utHours: 9, f107: 140, storm: 0, grid: null });
    expect(a).toEqual(b);
  });
  it("standard model ignores the grid", () => {
    const o = MODELS.standard({ utHours: 9, f107: 140, storm: 0, grid });
    expect(o.grid).toBeNull();
  });
  it("runs the example scenario on IRI (quiet and storm)", () => {
    for (const storm of [0, 1]) {
      const r = runScenario({ ...base, storm });
      expect(r.ok).toBe(true);
      expect(r.models.india).toBeTruthy();
      expect(r.models.standard).toBeTruthy();
    }
  });
});
