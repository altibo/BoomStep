import { chordDegree, degreeMidi } from "./songs.js";
import { STEP_SECONDS } from "./music.js";
export const SPECIALS = [
  { id: "bark", name: "BARK HIT", hint: "Brass-Akkord", duration: 0.42 },
  { id: "bass", name: "BASS SHOT", hint: "Fingerbass", duration: 0.32 },
  { id: "fill", name: "ROLL FILL", hint: "Einmal · frei", duration: 0.62 },
  { id: "rise", name: "UP SWEEP", hint: "1,2 s Anstieg", duration: 1.25 },
  { id: "impact", name: "IMPACT", hint: "Tiefe Kick + Becken", duration: 1.05 },
  { id: "laser", name: "LASER", hint: "Pitch-Drop", duration: 0.5 },
];
export const MAX_SPECIAL_GROUPS = 8;
export function specialPlan(id, harmonySong, step) {
  const chord = chordDegree(harmonySong, step),
    dt = STEP_SECONDS,
    tone = (inst, degree, base, seconds, velocity, extra = {}) => ({
      kind: "tone",
      inst,
      note: degreeMidi(chord + degree, base),
      seconds,
      velocity,
      cutoff: 2600,
      ...extra,
    });
  switch (id) {
    case "bark":
      return [0, 2, 4].map((d, i) => ({
        offset: 0,
        event: tone("brass", d, 53, 0.36, i === 0 ? 0.7 : 0.5),
      }));
    case "bass":
      return [
        { offset: 0, event: tone("finger", 0, 29, 0.3, 0.9, { cutoff: 1200 }) },
      ];
    case "fill":
      return Array.from({ length: 8 }, (_, i) => ({
        offset: i * dt * 0.5,
        event: {
          kind: i === 7 ? "perc" : "snare",
          sample: i === 7 ? "tom" : i % 3 === 0 ? "clap" : "snare",
          seconds: i === 7 ? 0.3 : 0.12,
          velocity: 0.34 + i * 0.04,
        },
      }));
    case "rise":
      return [
        { offset: 0, event: { kind: "rise", seconds: 1.2, velocity: 0.32 } },
      ];
    case "impact":
      return [
        {
          offset: 0,
          event: {
            kind: "kick",
            sample: "kickdeep",
            rate: 0.85,
            velocity: 0.95,
            seconds: 0.85,
          },
        },
        {
          offset: 0,
          event: {
            kind: "ride",
            sample: "ride",
            velocity: 0.55,
            seconds: 0.95,
          },
        },
        {
          offset: 0,
          event: tone("sub", 0, 29, 0.9, 0.7, { glide: -5, cutoff: 500 }),
        },
      ];
    case "laser":
      return [
        {
          offset: 0,
          event: tone("fifths", 0, 65, 0.45, 0.62, {
            glide: -24,
            cutoff: 4200,
          }),
        },
      ];
    default:
      throw new Error("Unbekanntes Special");
  }
}
// Voice stealing never ignores a new tap; the oldest group gets a short release.
export function oldestSpecial(groups, max = MAX_SPECIAL_GROUPS) {
  return groups.length >= max ? groups[0] : undefined;
}
