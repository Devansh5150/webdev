import type { IriSampler } from "./physics";
export function f107ToIG12(f107: number): number;
export function createIriSampler(meta: unknown, buffer: ArrayBuffer | Uint16Array, month: number): IriSampler;
export function loadIri(month: number, baseUrl: string): Promise<IriSampler>;
