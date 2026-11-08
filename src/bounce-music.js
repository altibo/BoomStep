// Original composition inspired only by publicly described hard/bouncy techno + rap energy.
// No transcription, artist samples, copied melody, vocal or tempo-analysis claim.
export const BOUNCE_PACK = {
  name: "Berlin Bounce",
  bpm: 152,
  key: "F-Moll",
  roots: [41, 41, 37, 39],
  character: "bounce",
  wave: "sawtooth",
};
export const BOUNCE_NAMES = [
  ["Bounce", "Snap", "Stop & Go", "Crew Roll"],
  ["Gummi", "Springer", "Gegenruf", "Sub Steps"],
  ["Bark Cuts", "Klatsch", "Antwort", "Rave Blips"],
  ["Call", "Response", "Sprung", "Hook"],
];
export function bounceEvents(track, variant, step) {
  const s = step % 16,
    bar = Math.floor(step / 16) % 4,
    phrase = Math.floor(step / 16) % 8,
    root = BOUNCE_PACK.roots[bar],
    third = bar >= 2 ? 4 : 3,
    seventh = bar === 2 ? 11 : 10;
  if (track === 0) {
    const out = [];
    if (s % 4 === 0)
      out.push({ kind: "bouncekick", velocity: 0.66, length: 3 });
    if (s === 4 || s === 12) out.push({ kind: "clap", velocity: 0.43 });
    const hats = [
      [1, 3, 6, 7, 9, 11, 14, 15],
      [0, 1, 3, 5, 7, 8, 9, 11, 13, 15],
      [3, 7, 11, 15],
      [0, 1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 13, 14, 15],
    ][variant];
    if (hats.includes(s))
      out.push({
        kind: "hat",
        velocity: s % 4 === 3 ? 0.14 : 0.07,
        offset: s % 2 ? 0.08 : 0,
      });
    if ((variant === 2 ? [6, 14] : [2, 10]).includes(s))
      out.push({ kind: "openhat", velocity: 0.3 });
    if (
      [
        [3, 7, 11, 15],
        [2, 7, 10, 15],
        [1, 6, 11, 14],
        [3, 5, 7, 11, 13, 15],
      ][variant].includes(s)
    )
      out.push({
        kind: "rim",
        note: 76,
        velocity: 0.27,
        length: 0.75,
        offset: 0.06,
      });
    if (variant === 1 && (s === 7 || s === 15))
      out.push({ kind: "clap", velocity: 0.2 });
    if ((phrase === 7 || (variant === 3 && phrase % 4 === 3)) && s >= 12)
      out.push({
        kind: "snare",
        velocity: 0.18 + (s - 12) * 0.055,
        offset: s % 2 ? 0.09 : 0,
      });
    return out;
  }
  if (track === 1) {
    const rhythms = [
      [2, 5, 6, 10, 13, 14],
      [2, 3, 6, 9, 10, 14],
      [0, 3, 6, 8, 11, 14],
      [2, 6, 10, 14, 15],
    ][variant];
    if (!rhythms.includes(s)) return [];
    return [
      {
        kind: "bouncebass",
        note:
          root -
          12 +
          (variant === 0 && s === 13
            ? 12
            : variant === 2 && (s === 3 || s === 11)
              ? 7
              : 0),
        length: variant === 3 && s !== 15 ? 1.8 : variant === 1 ? 0.8 : 1.15,
        velocity: variant === 3 ? 0.5 : 0.58,
        accent: s % 4 === 2 ? 1.1 : 0.8,
      },
    ];
  }
  if (track === 2) {
    const rhythms = [
      [0, 7, 10],
      [3, 6, 11, 14],
      [2, 10],
      [0, 3, 6, 10, 12, 15],
    ][variant];
    if (!rhythms.includes(s)) return [];
    return (variant === 2 ? [7, 12] : [0, third, 7]).map((n, i) => ({
      kind: variant === 1 ? "bark" : "bouncestab",
      note: root + 12 + n,
      length: variant === 2 ? 1.5 : variant === 3 ? 0.6 : 0.9,
      velocity: i === 0 ? 0.3 : 0.18,
    }));
  }
  const rhythms = [
    [0, 3, 7, 10, 14],
    [2, 6, 9, 12, 15],
    [0, 2, 5, 7, 8, 11, 14],
    [0, 6, 10, 14],
  ][variant];
  if (!rhythms.includes(s)) return [];
  const pitches = [
    [12, 7, third, 12, seventh],
    [0, 7, 12, third + 12, seventh],
    [0, 12, 7, third, 12, 7, seventh],
    [12, third + 12, 7, 14],
  ][variant];
  return [
    {
      kind: variant === 2 ? "bouncestab" : "bark",
      note: root + 12 + pitches[(rhythms.indexOf(s) + bar) % pitches.length],
      length: variant === 3 ? 1.6 : 0.85,
      velocity: variant === 3 ? 0.34 : 0.4,
    },
  ];
}
