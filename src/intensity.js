import { SONGS, degreeMidi, chordDegree, fold, riffRange } from "./songs.js";
// Additive performance macro. Zero is exactly the existing user mix/pattern baseline.
export const intensityUnit = (n) =>
  Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));
export function intensityTargets(session) {
  const a = intensityUnit(session.intensity ?? 0);
  return {
    amount: a,
    drive: Math.min(1, session.drive + 0.65 * a),
    pump: Math.min(1, session.pump + 0.25 * a),
    headroom: 0.64 * (1 - 0.12 * a),
  };
}
export const intensityName = (a) =>
  a < 0.25 ? "Locker" : a < 0.75 ? "Druck" : "Abriss";
export function intensityEvents(base, track, step, amount, choices) {
  const a = intensityUnit(amount),
    s = step % 16,
    phrase = Math.floor(step / 16) % 8;
  if (!a) return base;
  const out = base.map((e) => ({ ...e, energy: a }));
  if (track === 0) {
    if (a >= 0.25 && s % 4 === 1 && !out.some((e) => e.kind === "hat"))
      out.push({
        kind: "hat",
        sample: "hat",
        velocity: 0.08 + 0.1 * a,
        energy: a,
      });
    if (a >= 0.5 && s % 4 === 3)
      out.push({
        kind: "perc",
        sample: "rim",
        velocity: 0.1 + 0.14 * a,
        energy: a,
      });
    if (a >= 0.75 && phrase === 7 && s >= 12)
      out.push({
        kind: "snare",
        sample: "snare",
        velocity: 0.18,
        offset: 0.5,
        energy: a,
      });
  }
  if (track === 3 && a >= 0.55 && s % 8 === 6)
    out.push({
      kind: "tone",
      inst: SONGS[choices[3].song].riff.inst,
      note: fold(
        degreeMidi(chordDegree(choices[1].song, step) + 7, 53),
        ...riffRange(SONGS[choices[3].song].riff.inst),
      ),
      cutoff: SONGS[choices[3].song].riff.cut,
      length: 0.45,
      velocity: 0.08 + 0.08 * a,
      offset: 0.5,
      energy: a,
    });
  return out;
}
export const hexRgb = (hex) =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
// Song colour sets the hue; Krassheit lifts it slightly toward white and adds glow.
export function lightState(
  amount,
  progress,
  bpm,
  running,
  beatLights,
  reduced,
  base = "#ff5fd7",
) {
  const a = intensityUnit(amount),
    lift = Math.round(a * 22),
    rgb = hexRgb(base).map((v) => Math.round(v + (255 - v) * (lift / 100)));
  const beatsPerPulse = Math.max(1, Math.ceil(bpm / 60 / 3));
  const pulse =
    running && beatLights && !reduced
      ? (0.5 +
          0.5 * Math.cos(2 * Math.PI * ((progress * 32) / beatsPerPulse))) **
        2
      : 0;
  return {
    rgb: rgb.join(","),
    accent: `rgb(${rgb.join(",")})`,
    lift: `${lift}%`,
    pulse,
    glow: 0.1 + a * 0.24 + pulse * a * 0.14,
    hz: bpm / 60 / beatsPerPulse,
  };
}
