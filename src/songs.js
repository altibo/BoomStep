// Ten original dark bouncy-techno song kits. Every song shares 150 BPM and F minor (aeolian),
// so any track of any song can be mixed live. The Bass track's song leads the shared
// four-bar chord progression; all pitched material is written relative to that chord.
// No transcriptions, artist melodies, vocals or copied songs.
export const BPM = 150;
export const KEY = "F-Moll";
export const SCALE = [0, 2, 3, 5, 7, 8, 10]; // F aeolian semitones above F
const NOTE_NAMES = ["F", "G", "As", "B", "C", "Des", "Es"];
export const TRACKS = ["Drums", "Bass", "Stabs", "Riff"];
export const PATTERN_NAMES = [
  ["Grund", "Treiben", "Bounce", "Rollen"],
  ["Tief", "Federnd", "Gegenlauf", "Rollend"],
  ["Schatten", "Puls", "Weite", "Stoß"],
  ["Ruf", "Antwort", "Hoch", "Kreis"],
];
// Shared rhythm vocabulary; each song picks its own four per track.
const HATS = [
  "..x...x...x...x.",
  "..x.x.x...x.x.x.",
  "x.x.x.x.x.x.x.x.",
  ".xx..xx..xx..xx.",
  "xxx.xxx.xxx.xxx.",
  ".x.x.x.x.x.x.x.x",
  "xxxxxxxxxxxxxxxx",
  "..o...x...o...x.",
  "x..xx..xx..xx.x.",
  "..xx..x...xx..xo",
];
const PERC = [
  "................",
  "...x.......x....",
  ".......x.......x",
  "...x..x....x..x.",
  ".x...x.x.x...x..",
  "...x.x.....x.x.x",
  "x..x..x..x..x.x.",
  "......x.......xx",
];
const BASS = [
  "..0...0...0...0.",
  "..0.0.0...0.0.0-",
  "..0..00...0..00.",
  "..0..7..0..0..7.",
  ".00..00..00..00.",
  "..0...4...0..2-.",
  "0-..0-0.0-..0-7.",
  "..0-.0..0-.0.2..",
  "...0..0...0..0-.",
  "..0.....0.0...4.",
];
const STAB = [
  "x-.....x--......",
  "...x......x..x..",
  "x---------------",
  "..x...x...x...x.",
  "x--.x--.x---....",
  "......x-......x-",
  "x-------x-------",
  ".x..x..x..x..x..",
];
const VOICINGS = {
  triad: [0, 2, 4],
  seventh: [0, 2, 4, 6],
  open: [0, 4, 7],
  dark: [0, 2, 6],
  sus: [0, 3, 4],
};
// Colours avoid the reserved amber (pending) and red (recording) hue ranges.
export const SONGS = [
  {
    name: "Schwarzlicht",
    color: "#ff5fd7",
    prog: [0, 0, 5, 6],
    kick: "kick",
    kickRate: 1,
    swing: 0.1,
    back: "clap",
    perc: "rim",
    hats: [0, 3, 4, 6],
    percs: [1, 3, 5, 6],
    bass: { inst: "sub", cut: 700, pat: [0, 2, 3, 6] },
    stab: { inst: "bowed", cut: 2200, pat: [2, 0, 3, 4], voice: "triad" },
    riff: {
      inst: "ep",
      cut: 2800,
      motif: "0-..2...4-..2...",
      arp: "0.2.4.2.0.2.4.7.",
    },
  },
  {
    name: "Neonregen",
    color: "#e2f65c",
    prog: [0, 6, 5, 4],
    kick: "kickround",
    kickRate: 0.96,
    swing: 0.14,
    back: "snare",
    perc: "clave",
    hats: [1, 5, 3, 6],
    percs: [2, 4, 6, 7],
    bass: { inst: "finger", cut: 900, pat: [2, 4, 5, 7] },
    stab: { inst: "strings", cut: 2600, pat: [6, 1, 3, 5], voice: "seventh" },
    riff: {
      inst: "hang",
      cut: 3600,
      motif: "4...2...0...b...",
      arp: "0..4..2..0..4.2.",
    },
  },
  {
    name: "Lindenfrost",
    color: "#a5f05c",
    prog: [0, 3, 5, 4],
    kick: "kick",
    kickRate: 1.04,
    swing: 0.06,
    back: "clap",
    perc: "shaker",
    hats: [2, 0, 8, 4],
    percs: [6, 1, 3, 5],
    bass: { inst: "sub", cut: 600, pat: [1, 0, 8, 6] },
    stab: { inst: "newage", cut: 2000, pat: [0, 7, 2, 3], voice: "open" },
    riff: {
      inst: "ep",
      cut: 2400,
      motif: "0--.1-..2-..4---",
      arp: "4.2.0.2.4.5.4.2.",
    },
  },
  {
    name: "Giftgarten",
    color: "#45e28b",
    prog: [0, 0, 3, 3],
    kick: "kickround",
    kickRate: 1,
    swing: 0.12,
    back: "clap",
    perc: "conga",
    hats: [7, 3, 9, 6],
    percs: [3, 2, 6, 4],
    bass: { inst: "fmbass", cut: 650, pat: [2, 7, 3, 4] },
    stab: { inst: "brass", cut: 1700, pat: [1, 3, 4, 7], voice: "dark" },
    riff: {
      inst: "hang",
      cut: 3000,
      motif: "0..2..4...2.0...",
      arp: "0.4.7.4.0.4.7.9.",
    },
  },
  {
    name: "Nebelbank",
    color: "#3fe6c6",
    prog: [0, 5, 2, 6],
    kick: "kickdeep",
    kickRate: 1.08,
    swing: 0.08,
    back: "snaredark",
    perc: "rim",
    hats: [0, 2, 5, 6],
    percs: [0, 1, 2, 7],
    bass: { inst: "sub", cut: 550, pat: [9, 0, 5, 1] },
    stab: { inst: "choir", cut: 2100, pat: [6, 2, 0, 5], voice: "triad" },
    riff: {
      inst: "ep",
      cut: 2600,
      motif: "2---0---b---0---",
      arp: "0.2.4.6.4.2.0.b.",
    },
  },
  {
    name: "Spreekanal",
    color: "#40d4f2",
    prog: [0, 4, 5, 3],
    kick: "kick",
    kickRate: 0.98,
    swing: 0.16,
    back: "clap",
    perc: "clave",
    hats: [3, 1, 8, 6],
    percs: [5, 3, 1, 6],
    bass: { inst: "finger", cut: 1000, pat: [7, 3, 2, 6] },
    stab: { inst: "fifths", cut: 1500, pat: [3, 1, 7, 4], voice: "open" },
    riff: {
      inst: "brass",
      cut: 1800,
      motif: "0.0..2.0..4..2..",
      arp: "0..2..4..7..4..2",
    },
  },
  {
    name: "Eisschacht",
    color: "#64abff",
    prog: [0, 0, 6, 5],
    kick: "kickround",
    kickRate: 1.06,
    swing: 0.05,
    back: "snare",
    perc: "shaker",
    hats: [2, 4, 0, 6],
    percs: [1, 7, 4, 3],
    bass: { inst: "sub", cut: 750, pat: [0, 8, 4, 6] },
    stab: { inst: "sweep", cut: 2400, pat: [2, 6, 0, 4], voice: "seventh" },
    riff: {
      inst: "hang",
      cut: 3200,
      motif: "4-2-0-..4-2-0-b-",
      arp: "7.4.2.0.7.4.2.0.",
    },
  },
  {
    name: "Tiefgarage",
    color: "#9a92ff",
    prog: [0, 2, 3, 0],
    kick: "kickdeep",
    kickRate: 1,
    swing: 0.11,
    back: "clap",
    perc: "conga",
    hats: [9, 0, 3, 6],
    percs: [4, 6, 3, 5],
    bass: { inst: "fmbass", cut: 700, pat: [3, 2, 9, 7] },
    stab: { inst: "bowed", cut: 1900, pat: [4, 0, 6, 1], voice: "dark" },
    riff: {
      inst: "ep",
      cut: 2200,
      motif: "0...0...2-..1-..",
      arp: "0.2.0.4.0.2.0.5.",
    },
  },
  {
    name: "Samtbunker",
    color: "#bd84ff",
    prog: [0, 3, 0, 6],
    kick: "kick",
    kickRate: 1.02,
    swing: 0.13,
    back: "snaredark",
    perc: "rim",
    hats: [1, 7, 4, 6],
    percs: [3, 5, 2, 6],
    bass: { inst: "finger", cut: 800, pat: [5, 1, 7, 3] },
    stab: { inst: "strings", cut: 2000, pat: [0, 5, 2, 7], voice: "sus" },
    riff: {
      inst: "brass",
      cut: 1600,
      motif: "2-.0-.b-.0-..2..",
      arp: "0.4.2.6.4.2.0.4.",
    },
  },
  {
    name: "Mitternacht",
    color: "#ef6dff",
    prog: [5, 6, 0, 0],
    kick: "kickround",
    kickRate: 0.94,
    swing: 0.09,
    back: "clap",
    perc: "clave",
    hats: [8, 2, 5, 6],
    percs: [2, 3, 7, 4],
    bass: { inst: "sub", cut: 650, pat: [8, 4, 2, 6] },
    stab: { inst: "choir", cut: 2300, pat: [5, 3, 6, 4], voice: "seventh" },
    riff: {
      inst: "hang",
      cut: 2800,
      motif: "0.2.4...2...0.b.",
      arp: "4.2.4.7.4.2.0.2.",
    },
  },
];
export const SONG_COUNT = SONGS.length;
export const wrapSong = (n) => ((n % SONG_COUNT) + SONG_COUNT) % SONG_COUNT;
export function degreeMidi(degree, base) {
  const oct = Math.floor(degree / 7);
  return base + 12 * oct + SCALE[((degree % 7) + 7) % 7];
}
export const chordDegree = (harmonySong, step) =>
  SONGS[harmonySong].prog[Math.floor(step / 16) % 4];
export function chordName(harmonySong, step) {
  const d = chordDegree(harmonySong, step);
  const minor = [0, 1, 3, 4].includes(d);
  return `${NOTE_NAMES[d]}${d === 1 ? "°" : minor ? "m" : ""}`;
}
const TOKEN = { a: -1, b: -2, c: -3 };
const digit = (ch) => (ch in TOKEN ? TOKEN[ch] : Number(ch));
const token = (n) => (n < 0 ? "abc"[-n - 1] : String(Math.min(9, n)));
function noteAt(pattern, s) {
  const ch = pattern[s];
  if (ch === "." || ch === "-" || ch === undefined) return null;
  let length = 1;
  while (pattern[s + length] === "-") length++;
  return { offset: digit(ch), length };
}
// Riff variants derive from each song's own motif/arpeggio: call, call+answer, high long tones, arpeggio.
function riffPattern(song, variant, bar) {
  const { motif, arp } = SONGS[song].riff;
  if (variant === 0) return motif;
  if (variant === 1)
    return bar % 2 === 0
      ? motif
      : motif.replace(/[0-9abc]/g, (c) => token(digit(c) + 2));
  if (variant === 2)
    return motif
      .split("")
      .map((c, i) => (i % 4 === 0 ? (/[0-9abc]/.test(c) ? c : "4") : "-"))
      .join("");
  return arp;
}
// Keep notes inside the recorded range of an instrument (octave folding, no new pitch classes).
export function fold(note, lo, hi) {
  while (note > hi) note -= 12;
  while (note < lo) note += 12;
  return note;
}
const RANGE = { hang: [55, 74] };
export const riffRange = (inst) => RANGE[inst] ?? [41, 77];
const swingOffset = (song, s) => (s % 2 ? SONGS[song].swing : 0);
export function songEvents(choice, track, step, harmonySong) {
  const { song, variant } = choice;
  const S = SONGS[song],
    s = step % 16,
    bar = Math.floor(step / 16) % 4,
    phrase = Math.floor(step / 16) % 8,
    chord = chordDegree(harmonySong, step);
  if (track === 0) {
    const out = [];
    if (s % 4 === 0)
      out.push({
        kind: "kick",
        sample: S.kick,
        rate: S.kickRate,
        velocity: 0.92,
      });
    if (variant === 2 && (s === 14 || (bar % 2 === 1 && s === 7)))
      out.push({
        kind: "kick",
        sample: S.kick,
        rate: S.kickRate * 1.04,
        velocity: 0.48,
      });
    if (s === 4 || s === 12)
      out.push({ kind: "snare", sample: S.back, velocity: 0.62 });
    if (variant === 1 && (s === 7 || s === 15))
      out.push({
        kind: "snare",
        sample: "clap",
        velocity: 0.36,
        offset: swingOffset(song, s),
      });
    // Treiben: driving offbeat open hats; Rollen: low tom/conga roll into each next bar.
    if (variant === 1 && s % 4 === 2)
      out.push({ kind: "hat", sample: "openhat", velocity: 0.24 });
    if (variant === 3 && s >= 13)
      out.push({
        kind: "perc",
        sample: s === 15 ? "tom" : "conga",
        velocity: 0.26 + (s - 13) * 0.06,
      });
    const h = HATS[S.hats[variant]][s];
    if (h === "x")
      out.push({
        kind: "hat",
        sample: "hat",
        velocity: s % 4 === 2 ? 0.34 : 0.2,
        offset: swingOffset(song, s),
      });
    if (h === "o") out.push({ kind: "hat", sample: "openhat", velocity: 0.28 });
    if (PERC[S.percs[variant]][s] === "x")
      out.push({
        kind: "perc",
        sample: S.perc,
        velocity: 0.34,
        offset: swingOffset(song, s),
      });
    if (variant === 3 && s === 0 && phrase % 4 === 0)
      out.push({ kind: "ride", sample: "ride", velocity: 0.22 });
    if ((phrase === 7 || (variant === 3 && phrase % 4 === 3)) && s >= 12) {
      out.push({
        kind: "snare",
        sample: "snare",
        velocity: 0.2 + (s - 12) * 0.06,
        offset: s % 2 ? 0.08 : 0,
      });
      if (phrase === 7 && s === 15)
        out.push({ kind: "perc", sample: "tom", velocity: 0.42 });
    }
    return out;
  }
  if (track === 1) {
    const n = noteAt(BASS[S.bass.pat[variant]], s);
    if (!n) return [];
    return [
      {
        kind: "tone",
        inst: S.bass.inst,
        note: fold(degreeMidi(chord + n.offset, 29), 29, 41),
        length: n.length * 0.9,
        velocity: s % 4 === 2 ? 0.74 : 0.6,
        cutoff: S.bass.cut,
      },
    ];
  }
  if (track === 2) {
    const n = noteAt(STAB[S.stab.pat[variant]], s);
    if (!n) return [];
    const voices = VOICINGS[S.stab.voice];
    return voices.map((v, i) => {
      let note = degreeMidi(chord + v, 53);
      if (note > 67) note -= 12;
      return {
        kind: "tone",
        inst: S.stab.inst,
        note,
        length: n.length,
        velocity: (i === 0 ? 0.3 : 0.22) / Math.sqrt(voices.length / 3),
        cutoff: S.stab.cut,
      };
    });
  }
  const n = noteAt(riffPattern(song, variant, bar), s);
  if (!n) return [];
  return [
    {
      kind: "tone",
      inst: S.riff.inst,
      note: fold(degreeMidi(chord + n.offset, 53), ...riffRange(S.riff.inst)),
      length: n.length,
      velocity: variant === 2 ? 0.36 : 0.44,
      cutoff: S.riff.cut,
      offset: swingOffset(song, s) * 0.5,
    },
  ];
}
