import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createProfileSampler, type ProfileMeta } from "./iriProfiles";

const DIR = new URL("../../public/data/iri/", import.meta.url);
const meta = JSON.parse(readFileSync(new URL("profiles_meta.json", DIR), "utf8")) as ProfileMeta;
const load = (m: number) => { const b = readFileSync(new URL(meta.files[String(m)], DIR)); return createProfileSampler(meta, new Uint16Array(b.buffer, b.byteOffset, b.byteLength / 2)); };

describe("IRI electron-density profiles", () => {
  const p = load(3)(20, 80, 8, 140); // 13:30 IST, central India, March
  it("has a daytime F2 peak at a plausible height and density", () => {
    expect(p.hmF2).toBeGreaterThan(250); expect(p.hmF2).toBeLessThan(450);
    expect(p.nmF2).toBeGreaterThan(1e11); expect(p.nmF2).toBeLessThan(1e13);
    const peakAlt = p.points.reduce((a, b) => (b.ne > a.ne ? b : a)).alt;
    expect(Math.abs(peakAlt - p.hmF2)).toBeLessThan(25);
  });
  it("E peak sits near 100-130 km", () => { expect(p.hmE).toBeGreaterThan(95); expect(p.hmE).toBeLessThan(135); });
  it("pre-dawn density is much lower than day", () => {
    // 04:30 IST is the daily minimum; around midnight the post-sunset EIA can still keep NmF2 high
    const night = load(3)(20, 80, 23, 140);
    expect(night.nmF2).toBeLessThan(p.nmF2 / 3);
  });
  it("more solar activity gives more ionisation", () => {
    expect(load(3)(20, 80, 8, 220).nmF2).toBeGreaterThan(load(3)(20, 80, 8, 70).nmF2);
  });
});
