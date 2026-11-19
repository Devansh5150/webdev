import { describe, it, expect } from "vitest";
import {
  runScenario, distBearing, destination, getIono, virtualHeight, hopRange,
  forward, locate, errorEllipse, MODELS, magLat,
} from "./physics.js";

// Sanity scenario from CLAUDE.md (all coordinates are examples).
const ST = { lat: 21.15, lon: 79.09 };
const TX = { lat: 15.5, lon: 88.5 };
const BASE = { tx: TX, st: ST, f: 7.2, utHours: 9, f107: 140 };

describe("CLAUDE.md sanity values (India, quiet day)", () => {
  const r = runScenario({ ...BASE, storm: 0 });
  it("finds a 1-hop solution", () => {
    expect(r.ok).toBe(true);
    expect(r.fw.hops).toBe(1);
  });
  it("arrival elevation is about 18 deg", () => expect(r.fw.el).toBeCloseTo(18, 0) );
  it("MUF is about 14 MHz", () => expect(Math.abs(r.muf - 14)).toBeLessThan(1.5));
  it("standard-model error is about 100 km", () => expect(Math.abs(r.models.standard.err - 100)).toBeLessThan(25));
  it("India-model error is under 10 km", () => expect(r.models.india.err).toBeLessThan(10));
});

describe("CLAUDE.md sanity values (India, storm = 1)", () => {
  const r = runScenario({ ...BASE, storm: 1 });
  it("standard-model error is about 270 km", () => expect(Math.abs(r.models.standard.err - 270)).toBeLessThan(40));
  it("India-model error stays under 10 km", () => expect(r.models.india.err).toBeLessThan(10));
  it("storm makes the standard model worse", () => {
    const q = runScenario({ ...BASE, storm: 0 });
    expect(r.models.standard.err).toBeGreaterThan(q.models.standard.err);
  });
});

describe("mid-latitude baseline (same distance and bearing, station in central Europe)", () => {
  const { d, az } = distBearing(ST.lat, ST.lon, TX.lat, TX.lon);
  const stE = { lat: 50, lon: 10 };
  const txE = destination(stE.lat, stE.lon, az, d);
  const r = runScenario({ ...BASE, tx: txE, st: stE, storm: 0 });
  it("both models are accurate and agree", () => {
    expect(r.ok).toBe(true);
    expect(r.models.standard.err).toBeLessThan(15);
    expect(r.models.india.err).toBeLessThan(15);
    expect(Math.abs(r.models.standard.err - r.models.india.err)).toBeLessThan(5);
  });
});

describe("geodesy", () => {
  it("destination() inverts distBearing()", () => {
    const { d, az } = distBearing(ST.lat, ST.lon, TX.lat, TX.lon);
    const p = destination(ST.lat, ST.lon, az, d);
    expect(p.lat).toBeCloseTo(TX.lat, 4);
    expect(p.lon).toBeCloseTo(TX.lon, 4);
  });
  it("one degree of latitude is about 111 km", () => {
    expect(distBearing(20, 80, 21, 80).d).toBeCloseTo(111.2, 0);
  });
});

describe("ionosphere model", () => {
  it("magnetic equator over India is near 10 deg N geographic", () => {
    expect(Math.abs(magLat(10, 78))).toBeLessThan(4);
  });
  it("afternoon EIA crest is stronger than the trough", () => {
    const opts = { utHours: 9, f107: 140, storm: 0, eia: true }; // ~14:30 IST
    let crest = 0, trough = Infinity;
    for (let lat = -5; lat <= 35; lat += 0.5) {
      const io = getIono(lat, 78, opts);
      if (Math.abs(io.m) < 2) trough = Math.min(trough, io.foF2);
      if (io.m > 12 && io.m < 22) crest = Math.max(crest, io.foF2);
    }
    expect(crest).toBeGreaterThan(trough * 1.3);
  });
  it("the standard model has no EIA", () => {
    const io = getIono(21, 79, MODELS.standard({ utHours: 9, f107: 140, storm: 0 }));
    const io2 = getIono(21, 79, MODELS.india({ utHours: 9, f107: 140, storm: 0 }));
    expect(io2.foF2).toBeGreaterThan(io.foF2);
  });
});

describe("propagation", () => {
  const io = { foF2: 8, hmF2: 300, ym: 100 };
  it("virtual height is above the layer base", () => {
    expect(virtualHeight(20, 7, io)).toBeGreaterThan(200);
  });
  it("a vertical ray above foF2 penetrates", () => {
    expect(virtualHeight(90, 9, io)).toBeNull();
  });
  it("higher elevation gives a shorter hop", () => {
    expect(hopRange(30, 300)).toBeLessThan(hopRange(10, 300));
  });
  it("locate() recovers the forward() geometry with the same model", () => {
    const opts = MODELS.india({ utHours: 9, f107: 140, storm: 0 });
    const fw = forward(TX, ST, 7.2, opts);
    const p = locate(ST, fw.az, fw.el, 7.2, opts, fw.hops);
    expect(distBearing(p.lat, p.lon, TX.lat, TX.lon).d).toBeLessThan(5);
  });
});

describe("uncertainty", () => {
  it("error ellipse is reproducible for a fixed seed", () => {
    const opts = MODELS.india({ utHours: 9, f107: 140, storm: 0 });
    const a = errorEllipse(ST, 121, 18, 7.2, opts, 1, { seed: 3 });
    const b = errorEllipse(ST, 121, 18, 7.2, opts, 1, { seed: 3 });
    expect(a.ok).toBe(true);
    expect(a.a).toBe(b.a);
    expect(a.a).toBeGreaterThanOrEqual(a.b);
  });
});
