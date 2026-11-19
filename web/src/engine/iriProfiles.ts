// Electron-density profiles over India from PyIRI (research/make_iri_profiles.py).
// Interpolation: bilinear in lat/lon (clamped to the 0-40N, 65-100E grid), linear in UT (2 h, cyclic),
// linear in log10(Ne) between the stored F10.7 levels.

export interface ProfileMeta {
  lat: number[]; lon: number[]; ut: number[]; f107: number[]; alt: number[];
  files: Record<string, string>; values_per_file: number; source: string;
}
export interface ProfilePoint { alt: number; ne: number }
export interface Profile { points: ProfilePoint[]; hmE: number; hmF1: number; hmF2: number; pF1: number; nmF2: number; clamped: boolean }
export type ProfileSampler = (lat: number, lon: number, utHours: number, f107: number) => Profile;

export function createProfileSampler(meta: ProfileMeta, buf: Uint16Array): ProfileSampler {
  if (buf.length !== meta.values_per_file) throw new Error(`profile size mismatch ${buf.length} vs ${meta.values_per_file}`);
  const nla = meta.lat.length, nlo = meta.lon.length, ng = nla * nlo, nt = meta.ut.length, na = meta.alt.length, nf = meta.f107.length;
  const neSize = nf * nt * na * ng;
  const ne = (f: number, t: number, a: number, g: number) => buf[((f * nt + t) * na + a) * ng + g] / 9000 + 6; // log10
  const pk = (f: number, t: number, k: number, g: number) => buf[neSize + ((f * nt + t) * 4 + k) * ng + g];

  return (lat, lon, utHours, f107) => {
    const dla = meta.lat[1] - meta.lat[0], dlo = meta.lon[1] - meta.lon[0];
    const yRaw = (lat - meta.lat[0]) / dla, xRaw = (lon - meta.lon[0]) / dlo;
    const clamped = yRaw < 0 || yRaw > nla - 1 || xRaw < 0 || xRaw > nlo - 1;
    const y = Math.min(nla - 1.000001, Math.max(0, yRaw)), x = Math.min(nlo - 1.000001, Math.max(0, xRaw));
    const i0 = Math.floor(y), j0 = Math.floor(x), fy = y - i0, fx = x - j0;
    const corners: [number, number][] = [
      [i0 * nlo + j0, (1 - fy) * (1 - fx)], [i0 * nlo + j0 + 1, (1 - fy) * fx],
      [(i0 + 1) * nlo + j0, fy * (1 - fx)], [(i0 + 1) * nlo + j0 + 1, fy * fx],
    ];
    const dt = meta.ut[1] - meta.ut[0];
    const tt = (((utHours % 24) + 24) % 24) / dt;
    const t0 = Math.floor(tt) % nt, t1 = (t0 + 1) % nt, ft = tt - Math.floor(tt);
    const fClamp = Math.min(meta.f107[nf - 1], Math.max(meta.f107[0], f107));
    let f0 = 0;
    while (f0 < nf - 2 && meta.f107[f0 + 1] < fClamp) f0++;
    const ff = (fClamp - meta.f107[f0]) / (meta.f107[f0 + 1] - meta.f107[f0]);
    const w: [number, number, number][] = [[f0, t0, (1 - ff) * (1 - ft)], [f0, t1, (1 - ff) * ft], [f0 + 1, t0, ff * (1 - ft)], [f0 + 1, t1, ff * ft]];
    const blend = (get: (f: number, t: number, g: number) => number) => {
      let s = 0;
      for (const [f, t, wt] of w) for (const [g, wg] of corners) s += wt * wg * get(f, t, g);
      return s;
    };
    const points = meta.alt.map((alt, a) => ({ alt, ne: Math.pow(10, blend((f, t, g) => ne(f, t, a, g))) }));
    const nmF2 = Math.max(...points.map((p) => p.ne));
    return {
      points, nmF2, clamped,
      hmE: blend((f, t, g) => pk(f, t, 0, g)) / 10,
      hmF1: blend((f, t, g) => pk(f, t, 1, g)) / 10,
      hmF2: blend((f, t, g) => pk(f, t, 2, g)) / 10,
      pF1: blend((f, t, g) => pk(f, t, 3, g)) / 1000,
    };
  };
}

const cache = new Map<string, Promise<ProfileSampler>>();
export function loadProfiles(month: number, baseUrl: string): Promise<ProfileSampler> {
  const key = `${baseUrl}|${month}`;
  if (!cache.has(key)) {
    cache.set(key, (async () => {
      const meta: ProfileMeta = await (await fetch(`${baseUrl}data/iri/profiles_meta.json`)).json();
      const ab = await (await fetch(`${baseUrl}data/iri/${meta.files[String(month)]}`)).arrayBuffer();
      return createProfileSampler(meta, new Uint16Array(ab));
    })().catch((e) => { cache.delete(key); throw e; }));
  }
  return cache.get(key)!;
}
