import {
  PACKS as CLASSICS,
  NAMES as CLASSIC_NAMES,
  eventsAt as legacyEvents,
} from "./legacy-music.js";
export const TRACKS = ["Drums", "Bass", "Stabs", "Riff"];
export const NAMES = [
  ["Stomper", "Roller", "Warehouse", "Rush Fill"],
  ["Offbeat Donk", "Gallop", "Rubber", "Hoover"],
  ["Rave Cuts", "Hoover Hit", "Answer", "Tripwire"],
  ["Alarm", "Racer", "Acid Run", "Anthem"],
];
export const PACKS = [
  {
    name: "Donk District",
    bpm: 150,
    key: "A-Moll",
    roots: [45, 45, 41, 43],
    character: "donk",
    wave: "sawtooth",
  },
  {
    name: "Steel Warehouse",
    bpm: 147,
    key: "Fis-Moll",
    roots: [42, 42, 45, 40],
    character: "steel",
    wave: "square",
  },
  {
    name: "Hoover Riot",
    bpm: 154,
    key: "E-Moll",
    roots: [40, 43, 45, 47],
    character: "hoover",
    wave: "sawtooth",
  },
  ...CLASSICS.map((p) => ({
    ...p,
    name: `Classic · ${p.name}`,
    character: "classic",
  })),
];
export const namesFor = (pack, track) =>
  pack >= 3 ? CLASSIC_NAMES[track] : NAMES[track];
export const FX_MODES = ["echo", "flanger", "gate", "drive"];
export function initialSession() {
  return {
    version: 2,
    pack: 0,
    master: 1,
    reverb: 0.08,
    drive: 0.16,
    pump: 0.7,
    fx: { mode: "echo", x: 0.5, depth: 0, hold: false, division: 8 },
    tracks: TRACKS.map((_, i) => ({
      variant: 0,
      mute: false,
      solo: false,
      volume: [0.72, 0.66, 0.68, 0.66][i],
      filter: 1,
      delay: i === 3 ? 0.08 : 0,
    })),
  };
}
const unit = (n) =>
  typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 1;
export function validateSession(value) {
  if (!value || ![1, 2].includes(value.version))
    throw new Error("Ungültige Session");
  let s = structuredClone(value);
  if (s.version === 1) {
    if (!Number.isInteger(s.pack) || s.pack < 0 || s.pack > 2)
      throw new Error("Ungültiges Classic-Paket");
    s = {
      ...s,
      version: 2,
      pack: s.pack + 3,
      drive: 0,
      pump: 0,
      fx: { mode: "echo", x: 0.5, depth: 0, hold: false, division: 8 },
    };
  }
  if (
    !Number.isInteger(s.pack) ||
    !PACKS[s.pack] ||
    !Array.isArray(s.tracks) ||
    s.tracks.length !== 4
  )
    throw new Error("Ungültige Session");
  if (!["master", "reverb", "drive", "pump"].every((k) => unit(s[k])))
    throw new Error("Ungültiger Mix");
  if (
    !s.fx ||
    !FX_MODES.includes(s.fx.mode) ||
    !unit(s.fx.x) ||
    !unit(s.fx.depth) ||
    typeof s.fx.hold !== "boolean" ||
    ![8, 16].includes(s.fx.division)
  )
    throw new Error("Ungültige Effekte");
  for (const t of s.tracks)
    if (
      !t ||
      !Number.isInteger(t.variant) ||
      t.variant < 0 ||
      t.variant > 3 ||
      typeof t.mute !== "boolean" ||
      typeof t.solo !== "boolean" ||
      !["volume", "filter", "delay"].every((k) => unit(t[k]))
    )
      throw new Error("Ungültige Spur");
  return s;
}
export const audible = (tracks, i) =>
  !tracks[i].mute && (!tracks.some((t) => t.solo) || tracks[i].solo);
export const nextBar = (step) => Math.ceil(step / 16) * 16;
export const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);
export const cutoff = (value) => 180 * (18000 / 180) ** value;
export function eventsAt(packId, track, variant, step) {
  if (packId >= 3) return legacyEvents(packId - 3, track, variant, step);
  const pack = PACKS[packId],
    s = step % 16,
    bar = Math.floor(step / 16) % 4,
    phrase = Math.floor(step / 16) % 8,
    root = pack.roots[bar],
    last = phrase === 7;
  const third =
    packId === 0
      ? bar >= 2
        ? 4
        : 3
      : packId === 1
        ? bar === 2 || bar === 3
          ? 4
          : 3
        : bar === 1 || bar === 3
          ? 4
          : 3;
  if (track === 0) {
    const out = [];
    if (s % 4 === 0) out.push({ kind: "kick", velocity: 0.58, length: 3.8 });
    if (s === 4 || s === 12) out.push({ kind: "clap", velocity: 0.39 });
    if (s % 4 === 2)
      out.push({ kind: "openhat", velocity: variant === 2 ? 0.24 : 0.32 });
    const hats =
      variant === 3
        ? Array.from({ length: 16 }, (_, i) => i)
        : variant === 2
          ? [1, 3, 7, 9, 11, 15]
          : variant === 0
            ? [1, 3, 5, 7, 9, 11, 13, 15]
            : [0, 1, 3, 5, 6, 7, 9, 11, 13, 14, 15];
    if (hats.includes(s))
      out.push({
        kind: "hat",
        velocity: s % 4 === 3 ? 0.13 : 0.075,
        offset: s % 2 ? 0.035 : 0,
      });
    if (
      (variant === 1
        ? [3, 7, 10, 15]
        : variant === 2
          ? [3, 6, 11, 14]
          : variant === 3
            ? [3, 6, 11, 14, 15]
            : [7, 15]
      ).includes(s)
    )
      out.push({
        kind: "perc",
        note: packId === 1 ? 72 : 77,
        velocity: 0.22,
        length: 0.9,
      });
    if (variant === 1 && s === 7) out.push({ kind: "clap", velocity: 0.21 });
    if (variant === 3 && s % 4 === 3)
      out.push({ kind: "snare", velocity: 0.37 });
    if (variant === 2 && (s === 0 || s === 8))
      out.push({ kind: "ride", velocity: 0.08 });
    if ((last || (variant === 3 && phrase % 4 === 3)) && s >= 12) {
      if ((s + variant) % 2 === 0 || (last && s >= 14))
        out.push({ kind: "snare", velocity: 0.15 + (s - 12) * 0.045 });
      if (last && s === 15)
        out.push({ kind: "tom", note: 43, velocity: 0.25, length: 1 });
    }
    return out;
  }
  if (track === 1) {
    const rhythms = [
      [2, 6, 10, 14],
      [2, 3, 6, 10, 11, 14],
      [2, 5, 6, 10, 13, 14],
      [2, 6, 11, 14],
    ][variant];
    if (!rhythms.includes(s)) return [];
    return [
      {
        kind: variant === 3 ? "hooverbass" : "donk",
        note:
          root -
          12 +
          (variant === 2 && s === 13 ? 12 : variant === 1 && s === 11 ? 7 : 0),
        length:
          variant === 1 && s % 4 === 3 ? 0.65 : variant === 3 ? 1.65 : 1.35,
        velocity: variant === 3 ? 0.55 : 0.58,
        accent: variant === 2 ? 1.2 : 1,
      },
    ];
  }
  if (track === 2) {
    const rhythms = [
      [0, 6, 10],
      [2, 10],
      [4, 14],
      [0, 3, 6, 11, 14],
    ][variant];
    if (!rhythms.includes(s)) return [];
    const voicing = variant === 2 ? [7, 12] : [0, third, 7];
    return voicing.map((n, i) => ({
      kind: variant === 1 ? "hoover" : "stab",
      note: root + 12 + n,
      length: variant === 1 ? 1.7 : variant === 3 ? 0.65 : 1,
      velocity: (i === 0 ? 0.28 : 0.2) * (packId === 2 ? 1.15 : 1),
    }));
  }
  const rhythms = [
    [0, 3, 6, 8, 11, 14],
    [2, 4, 7, 10, 12, 15],
    [0, 2, 3, 6, 8, 10, 11, 14],
    [0, 6, 10, 14],
  ][variant];
  if (!rhythms.includes(s)) return [];
  const seventh =
    (packId === 0 && bar === 2) ||
    (packId === 1 && bar === 2) ||
    (packId === 2 && bar === 1)
      ? 11
      : 10;
  const ninth = packId === 2 && bar === 3 ? 13 : 14;
  const pitches = [
    [12, 12, 7, seventh, 7, 0],
    [0, 7, 12, 7, third + 12, seventh],
    [0, 12, third, 7, 12, 7, third, seventh],
    [12, 7, third + 12, ninth],
  ][variant];
  const n =
    pitches[
      (rhythms.indexOf(s) + bar * (variant === 1 ? 1 : 2)) % pitches.length
    ];
  return [
    {
      kind: variant === 2 ? "acid" : variant === 3 ? "hoover" : "rave",
      note: root + 12 + n,
      length: variant === 3 ? 2.4 : variant === 1 ? 0.9 : 0.65,
      velocity: variant === 3 ? 0.35 : 0.4,
      accent: s % 4 === 0 ? 1.3 : 1,
    },
  ];
}
export class PatternClock {
  constructor(session) {
    this.session = session;
    this.pending = new Map();
    this.step = 0;
  }
  queue(track, variant, running) {
    if (!running) {
      this.session.tracks[track].variant = variant;
      this.pending.delete(track);
      return;
    }
    if (this.session.tracks[track].variant === variant) {
      this.pending.delete(track);
      return;
    }
    this.pending.set(track, { variant, at: nextBar(this.step) });
  }
  tick() {
    const step = this.step++;
    for (const [i, p] of this.pending)
      if (step >= p.at) {
        this.session.tracks[i].variant = p.variant;
        this.pending.delete(i);
      }
    return { step, variants: this.session.tracks.map((t) => t.variant) };
  }
  reset() {
    this.step = 0;
    for (const [i, p] of this.pending)
      this.session.tracks[i].variant = p.variant;
    this.pending.clear();
  }
}
