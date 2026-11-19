export const EXAMPLE: { st: { lat: number; lon: number }; tx: { lat: number; lon: number }; f: number; ist: string; date: string; f107: number; storm: number; hopPref: number; angErr: number; exag: number; inverse: { az: number; el: number; hops: number } };
export const EUROPE_ST: { lat: number; lon: number };
export const IST_OFFSET: number;
export function istToUt(hhmm: string): number;
export function fixQuality(km: number | null | undefined): { label: string; cls: string };
