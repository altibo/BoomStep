export const TRACKS = ["Drums", "Bass", "Akkorde", "Melodie"];
export const NAMES = [
  ["Treibend", "Gebrochen", "Reduziert", "Wirbel"],
  ["Warm", "Rollend", "Synkopiert", "Tief"],
  ["Weich", "Offbeat", "Schwebend", "Pulsierend"],
  ["Luftig", "Perlend", "Antwort", "Sparsam"],
];
export const PACKS = [
  {
    name: "Night Drive",
    bpm: 120,
    key: "A-Moll",
    roots: [45, 41, 48, 43],
    wave: "sawtooth",
    color: "#23cfe8",
  },
  {
    name: "Lo-Fi Garden",
    bpm: 84,
    key: "D-Moll",
    roots: [50, 46, 53, 48],
    wave: "triangle",
    color: "#8cdeae",
  },
  {
    name: "House Lights",
    bpm: 126,
    key: "E-Moll",
    roots: [40, 48, 43, 45],
    wave: "square",
    color: "#c7a2ff",
  },
];
export function initialSession() {
  return {
    version: 1,
    pack: 0,
    master: 1,
    reverb: 0.16,
    tracks: TRACKS.map(() => ({
      variant: 0,
      mute: false,
      solo: false,
      volume: 0.7,
      filter: 1,
      delay: 0.08,
    })),
  };
}
export function validateSession(value) {
  if (
    !value ||
    value.version !== 1 ||
    !Number.isInteger(value.pack) ||
    !PACKS[value.pack] ||
    value.tracks?.length !== 4
  )
    throw new Error("Ungültige Session");
  const unit = (n) =>
    typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 1;
  if (!unit(value.master) || !unit(value.reverb))
    throw new Error("Ungültiger Mix");
  for (const t of value.tracks)
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
  return structuredClone(value);
}
export const audible = (tracks, i) =>
  !tracks[i].mute && (!tracks.some((t) => t.solo) || tracks[i].solo);
export const nextBar = (step) => Math.ceil(step / 16) * 16;
export const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);
export const cutoff = (value) => 180 * (18000 / 180) ** value;
// Four bars share one harmonic phase. Each event is a sixteenth-note step.
export function eventsAt(packId, track, variant, step) {
  const p = PACKS[packId],
    bar = Math.floor((step % 64) / 16),
    s = step % 16,
    root = p.roots[bar];
  if (track === 0) {
    const out = [];
    const kicks =
      packId === 2
        ? [
            [0, 4, 8, 12],
            [0, 4, 8, 11, 12],
            [0, 8, 12],
            [0, 4, 8, 12, 15],
          ][variant]
        : [
            [0, 8, 10],
            [0, 6, 10],
            [0, 8],
            [0, 7, 8, 14],
          ][variant];
    if (kicks.includes(s)) out.push({ kind: "kick", velocity: 0.8 });
    if ((variant === 2 ? [4, 12] : [4, 12]).includes(s))
      out.push({ kind: "snare", velocity: 0.55 });
    if (
      s % (variant === 3 ? 1 : variant === 2 ? 4 : 2) ===
      (packId === 2 ? 2 % (variant === 3 ? 1 : variant === 2 ? 4 : 2) : 0)
    )
      out.push({ kind: "hat", velocity: s % 4 === 0 ? 0.22 : 0.13 });
    if (variant === 3 && bar === 3 && s >= 14)
      out.push({ kind: "snare", velocity: 0.22 });
    return out;
  }
  if (track === 1) {
    const rhythm = [
      [0, 6, 8, 14],
      [0, 3, 6, 8, 11, 14],
      [0, 7, 10, 14],
      [0, 10],
    ][variant];
    return rhythm.includes(s)
      ? [
          {
            kind: "bass",
            note: root - 12 + (variant === 1 && s === 14 ? 7 : 0),
            length: variant === 3 ? 5 : 2,
            velocity: 0.55,
          },
        ]
      : [];
  }
  if (track === 2) {
    const rhythm = [[0], [2, 6, 10, 14], [0, 10], [0, 4, 8, 12]][variant];
    const third = bar === 1 || bar === 2 || (bar === 3 && packId !== 2) ? 4 : 3;
    const seventh = bar === 1 || bar === 2 ? 11 : 10;
    return rhythm.includes(s)
      ? [0, third, 7, seventh].map((n, i) => ({
          kind: "chord",
          note: root + 12 + n,
          length: variant === 0 ? 14 : variant === 2 ? 5 : 2,
          velocity: i === 0 ? 0.12 : 0.09,
        }))
      : [];
  }
  const rhythms = [
    [2, 6, 10, 14],
    [0, 3, 6, 8, 11, 14],
    [6, 10, 15],
    [2, 14],
  ][variant];
  const third = bar === 1 || bar === 2 || (bar === 3 && packId !== 2) ? 4 : 3;
  const tones = [0, 7, 12, bar === 1 || bar === 2 ? 11 : 10, 7, third, 14, 7];
  const idx = (bar * 2 + rhythms.indexOf(s) + variant) % tones.length;
  return rhythms.includes(s)
    ? [
        {
          kind: "lead",
          note: root + 24 + tones[idx],
          length: variant === 3 ? 3 : 1.5,
          velocity: 0.16,
        },
      ]
    : [];
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
