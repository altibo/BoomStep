import { PACKS } from "./music.js";
export const SPECIALS = [
  { id: "bark", name: "BARK HIT", hint: "Tonaler Stab", duration: 0.42 },
  { id: "bass", name: "BASS SHOT", hint: "Federnder Bass", duration: 0.32 },
  { id: "fill", name: "ROLL FILL", hint: "Einmal · frei", duration: 0.62 },
  { id: "rise", name: "UP SWEEP", hint: "1,2 s Anstieg", duration: 1.25 },
  { id: "impact", name: "IMPACT", hint: "Sub + Downlift", duration: 1.05 },
  { id: "laser", name: "LASER", hint: "Pitch-Drop", duration: 0.5 },
];
export const MAX_SPECIAL_GROUPS = 8;
export function specialPlan(id, pack, step) {
  const root = PACKS[pack].roots[Math.floor(step / 16) % 4],
    dt = 60 / PACKS[pack].bpm / 4;
  switch (id) {
    case "bark":
      return [0, 7, 12].map((n, i) => ({
        offset: 0,
        event: {
          kind: i === 1 ? "bouncestab" : "bark",
          note: root + 12 + n,
          seconds: 0.38,
          velocity: i === 0 ? 0.7 : i === 1 ? 0.5 : 0.4,
        },
      }));
    case "bass":
      return [
        {
          offset: 0,
          event: {
            kind: "bouncebass",
            note: root - 12,
            seconds: 0.29,
            velocity: 0.84,
            accent: 1.2,
          },
        },
      ];
    case "fill":
      return Array.from({ length: 8 }, (_, i) => ({
        offset: i * dt * 0.5,
        event: {
          kind: i % 3 === 0 ? "clap" : i === 7 ? "tom" : "snare",
          note: root - 5,
          seconds: i === 7 ? 0.18 : 0.095,
          velocity: 0.22 + i * 0.025,
        },
      }));
    case "rise":
      return [
        {
          offset: 0,
          event: {
            kind: "rise",
            note: root + 24,
            seconds: 1.2,
            velocity: 0.36,
          },
        },
      ];
    case "impact":
      return [
        {
          offset: 0,
          event: {
            kind: "impact",
            note: root - 12,
            seconds: 0.95,
            velocity: 0.7,
          },
        },
      ];
    case "laser":
      return [
        {
          offset: 0,
          event: {
            kind: "laser",
            note: root + 12,
            seconds: 0.43,
            velocity: 0.46,
          },
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
