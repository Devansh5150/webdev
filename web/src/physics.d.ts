// Types for physics.js (pure JS, unit-tested). Signatures unchanged from milestone 1.
export interface LatLon { lat: number; lon: number }
export interface Iono { foF2: number; hmF2: number; ym: number; m: number; lt: number }
export type IriSampler = ((lat: number, lon: number, utHours: number, f107: number) => { foF2: number; hmF2: number; ym: number; bb: number; grid: string }) & { month: number; source: string };
export interface IonoOpts { utHours: number; f107?: number; storm?: number; eia?: boolean; tid?: boolean; stormAware?: boolean; grid?: IriSampler | null }
export interface LocateResult extends LatLon { range: number; h: number; hops: number }
export interface Ellipse { center: LocateResult; pts: LatLon[]; ok: boolean; a: number; b: number; ang: number; kx: number; ky: number }
export interface ForwardResult { ok: boolean; az: number; el: number; h: number; hops: number; dist: number; io: Iono }
export interface ModelResult { E: Ellipse; err: number }
export interface ScenarioResult { ok: boolean; fw: ForwardResult; models: Record<string, ModelResult | null>; muf: number | null }
export const RE: number;
export const MODELS: Record<"truth" | "india" | "standard", (o: IonoOpts) => IonoOpts>;
export function distBearing(lat1: number, lon1: number, lat2: number, lon2: number): { d: number; az: number };
export function destination(lat: number, lon: number, azDeg: number, dKm: number): LatLon;
export function magLat(lat: number, lon: number): number;
export function getIono(lat: number, lon: number, opts: IonoOpts): Iono;
export function virtualHeight(betaDeg: number, f: number, io: { foF2: number; hmF2: number; ym: number }): number | null;
export function hopRange(betaDeg: number, h: number): number;
export function locate(st: LatLon, azDeg: number, betaDeg: number, f: number, opts: IonoOpts, hops?: number): LocateResult | null;
export function forward(tx: LatLon, st: LatLon, f: number, opts: IonoOpts, hopPref?: number): ForwardResult;
export function muf(tx: LatLon, st: LatLon, opts: IonoOpts, hops?: number): number | null;
export function rng(seed: number): () => number;
export function errorEllipse(st: LatLon, az: number, el: number, f: number, opts: IonoOpts, hops: number, cfg?: { n?: number; sAz?: number; sEl?: number; sFo?: number; sHm?: number; seed?: number }): Ellipse | null;
export function ellipsePoints(E: Ellipse, n?: number): LatLon[];
export function runScenario(p: { tx: LatLon; st: LatLon; f: number; utHours: number; f107: number; storm: number; hopPref?: number; angErr?: number; grid?: IriSampler | null }): ScenarioResult;
