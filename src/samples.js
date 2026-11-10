import bank from "./sample-bank.json" with { type: "json" };
export { bank };
// Every file is part of the build and the offline cache. No CDN or runtime download elsewhere.
export const SAMPLE_FILES = [
  ...Object.values(bank.drums).map((d) => d.file),
  ...Object.values(bank.instruments).flatMap((i) => i.zones.map((z) => z.file)),
];
const decoded = new WeakMap();
export function loadBank(ctx, base = import.meta.env?.BASE_URL ?? "./") {
  if (decoded.has(ctx)) return decoded.get(ctx);
  const promise = (async () => {
    const get = async (file) => {
      const response = await fetch(`${base}${file}`);
      if (!response.ok) throw new Error(`Sample fehlt: ${file}`);
      return ctx.decodeAudioData(await response.arrayBuffer());
    };
    const drums = {},
      instruments = {};
    await Promise.all([
      ...Object.entries(bank.drums).map(async ([k, d]) => {
        drums[k] = await get(d.file);
      }),
      ...Object.entries(bank.instruments).map(async ([k, inst]) => {
        instruments[k] = await Promise.all(
          inst.zones.map(async (z) => ({
            root: z.root,
            buffer: await get(z.file),
          })),
        );
      }),
    ]);
    return { drums, instruments };
  })();
  decoded.set(ctx, promise);
  promise.catch(() => decoded.delete(ctx));
  return promise;
}
// Nearest recorded root keeps pitch shifting small (at most a few semitones).
export function nearestZone(zones, note) {
  return zones.reduce((best, z) =>
    Math.abs(z.root - note) < Math.abs(best.root - note) ? z : best,
  );
}
export const INSTRUMENTS = {
  sub: {
    label: "Sub-Bass",
    attack: 0.004,
    release: 0.09,
    gain: 0.95,
    pluck: 1.6,
    q: 0.5,
  },
  finger: {
    label: "Fingerbass",
    attack: 0.003,
    release: 0.08,
    gain: 0.85,
    pluck: 1.8,
    q: 0.6,
  },
  fmbass: {
    label: "FM-Bass",
    attack: 0.003,
    release: 0.07,
    gain: 0.62,
    pluck: 2.2,
    q: 0.7,
  },
  sweep: {
    label: "Sweep-Pad",
    attack: 0.05,
    release: 0.5,
    gain: 0.5,
    pluck: 1,
    q: 0.5,
  },
  newage: {
    label: "Glas-Pad",
    attack: 0.03,
    release: 0.5,
    gain: 0.48,
    pluck: 1,
    q: 0.5,
  },
  bowed: {
    label: "Bogen-Pad",
    attack: 0.06,
    release: 0.55,
    gain: 0.5,
    pluck: 1,
    q: 0.5,
  },
  strings: {
    label: "Synth-Strings",
    attack: 0.04,
    release: 0.45,
    gain: 0.48,
    pluck: 1,
    q: 0.5,
  },
  choir: {
    label: "Synth-Chor",
    attack: 0.05,
    release: 0.5,
    gain: 0.46,
    pluck: 1,
    q: 0.5,
  },
  ep: {
    label: "E-Piano",
    attack: 0.003,
    release: 0.35,
    gain: 0.7,
    pluck: 1.5,
    q: 0.6,
  },
  hang: {
    label: "Hang",
    attack: 0.002,
    release: 0.6,
    gain: 0.72,
    pluck: 1.2,
    q: 0.5,
  },
  brass: {
    label: "Synth-Brass",
    attack: 0.012,
    release: 0.18,
    gain: 0.52,
    pluck: 1.7,
    q: 0.7,
  },
  fifths: {
    label: "Quinten-Lead",
    attack: 0.01,
    release: 0.25,
    gain: 0.45,
    pluck: 1.4,
    q: 0.6,
  },
};
