import { SONGS, TRACKS, PATTERN_NAMES, BPM, KEY, songEvents } from "./songs.js";
export { SONGS, TRACKS, PATTERN_NAMES, BPM, KEY };
export const FX_MODES = [
  "stutter",
  "echo",
  "flanger",
  "gate",
  "drive",
  "tape",
  "crush",
];
export const SESSION_VERSION = 5;
// Old V1–3 sessions referenced removed packages. They keep their mix/patterns/FX and get one
// deterministic new song per old package index (documented fallback, not a sound match).
export const LEGACY_PACK_SONG = [3, 6, 9, 1, 4, 7, 0];
export function initialSession(song = 0) {
  return {
    version: SESSION_VERSION,
    intensity: 0,
    beatLights: true,
    themeTrack: 0,
    master: 1,
    reverb: 0.12,
    drive: 0.12,
    pump: 0.6,
    fx: { mode: "echo", x: 0.5, depth: 0, hold: false, division: 8 },
    tracks: TRACKS.map((_, i) => ({
      song,
      variant: 0,
      mute: false,
      solo: false,
      volume: [0.74, 0.7, 0.6, 0.62][i],
      filter: 1,
      delay: i === 3 ? 0.1 : 0,
    })),
  };
}
const unit = (n) =>
  typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 1;
const index = (n, max) => Number.isInteger(n) && n >= 0 && n < max;
export function validateSession(value) {
  if (!value || ![1, 2, 3, 4, 5].includes(value.version))
    throw new Error("Ungültige Session");
  let s = structuredClone(value);
  if (s.version === 1) {
    if (!index(s.pack, 3)) throw new Error("Ungültiges Classic-Paket");
    s = {
      ...s,
      version: 2,
      pack: s.pack + 3,
      drive: 0,
      pump: 0,
      fx: { mode: "echo", x: 0.5, depth: 0, hold: false, division: 8 },
    };
  }
  if (s.version === 2) {
    if (!index(s.pack, 6)) throw new Error("Ungültiges V2-Paket");
    s = { ...s, version: 3 };
  }
  if (s.version === 3) {
    if (!index(s.pack, 7) || !Array.isArray(s.tracks))
      throw new Error("Ungültiges V3-Paket");
    const song = LEGACY_PACK_SONG[s.pack];
    const rest = { ...s };
    delete rest.pack;
    s = {
      ...rest,
      version: 4,
      themeTrack: 0,
      tracks: s.tracks.map((t) => ({ ...t, song })),
    };
    if (!Object.hasOwn(s, "intensity")) s.intensity = 0;
    if (!Object.hasOwn(s, "beatLights")) s.beatLights = true;
  }
  // v4 → v5: the one-shot SPECIALS pads (and their HITPEGEL level) were removed.
  if (s.version === 4) {
    if (Object.hasOwn(s, "specialLevel") && !unit(s.specialLevel))
      throw new Error("Ungültiger Mix");
    s = { ...s, version: 5 };
    delete s.specialLevel;
  }
  if (Object.hasOwn(s, "pack") || Object.hasOwn(s, "specialLevel"))
    throw new Error("Ungültige Session");
  if (!unit(s.intensity) || typeof s.beatLights !== "boolean")
    throw new Error("Ungültige Krassheit/Lichtwahl");
  if (
    !index(s.themeTrack, 4) ||
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
      !index(t.song, SONGS.length) ||
      !index(t.variant, 4) ||
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
export const STEP_SECONDS = 60 / BPM / 4;
// The Bass track's selected song leads the shared chord progression.
export const harmonyOf = (choices) => choices[1].song;
export function eventsAt(choices, track, step) {
  return songEvents(choices[track], track, step, harmonyOf(choices));
}
const choiceOf = (t) => ({ song: t.song, variant: t.variant });
export class PatternClock {
  constructor(session) {
    this.session = session;
    this.pending = new Map();
    this.step = 0;
  }
  // Selection = pending choice if any, else the active track choice.
  selection(track) {
    const p = this.pending.get(track);
    return p
      ? { song: p.song, variant: p.variant }
      : choiceOf(this.session.tracks[track]);
  }
  queue(track, change, running) {
    const t = this.session.tracks[track],
      next = { ...this.selection(track), ...change };
    if (!running) {
      Object.assign(t, next);
      this.pending.delete(track);
      return;
    }
    if (t.song === next.song && t.variant === next.variant) {
      this.pending.delete(track);
      return;
    }
    this.pending.set(track, { ...next, at: nextBar(this.step) });
  }
  tick() {
    const step = this.step++;
    for (const [i, p] of this.pending)
      if (step >= p.at) {
        this.session.tracks[i].song = p.song;
        this.session.tracks[i].variant = p.variant;
        this.pending.delete(i);
      }
    return { step, choices: this.session.tracks.map(choiceOf) };
  }
  reset() {
    this.step = 0;
    for (const [i, p] of this.pending) {
      this.session.tracks[i].song = p.song;
      this.session.tracks[i].variant = p.variant;
    }
    this.pending.clear();
  }
}
