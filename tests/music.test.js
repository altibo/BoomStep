import test from "node:test";
import assert from "node:assert/strict";
import {
  initialSession,
  validateSession,
  PatternClock,
  eventsAt,
  SONGS,
  TRACKS,
  PATTERN_NAMES,
  BPM,
  KEY,
  harmonyOf,
  audible,
  nextBar,
} from "../src/music.js";
import { SCALE, chordDegree, wrapSong } from "../src/songs.js";
import { encodeWav } from "../src/wav.js";
const all = (song, variant = 0) => TRACKS.map(() => ({ song, variant }));
const mixed = (songs, variants = [0, 0, 0, 0]) =>
  songs.map((song, i) => ({ song, variant: variants[i] }));
test("exactly 10 original dark-bounce songs, unique names/colours, no old Classic/Hard House styles", () => {
  assert.equal(SONGS.length, 10);
  assert.equal(new Set(SONGS.map((s) => s.name)).size, 10);
  assert.equal(new Set(SONGS.map((s) => s.color)).size, 10);
  const text = JSON.stringify(SONGS).toLowerCase();
  for (const old of [
    "classic",
    "hard house",
    "donk",
    "night drive",
    "berlin bounce",
    "hoover",
    "square",
    "sawtooth",
    "8-bit",
    "chip",
  ])
    assert.ok(!text.includes(old), old);
  assert.equal(BPM, 150);
  assert.equal(KEY, "F-Moll");
  assert.equal(PATTERN_NAMES.length, 4);
  assert.ok(PATTERN_NAMES.every((n) => n.length === 4));
});
test("all 10 songs × 4 tracks × 4 patterns are deterministic, non-empty, finite and in range", () => {
  for (let song = 0; song < 10; song++)
    for (let t = 0; t < 4; t++)
      for (let v = 0; v < 4; v++) {
        let count = 0;
        const c = all(song, v);
        for (let s = 0; s < 128; s++) {
          const ev = eventsAt(c, t, s);
          assert.deepEqual(ev, eventsAt(c, t, s));
          count += ev.length;
          for (const e of ev) {
            assert.ok(e.velocity > 0 && e.velocity <= 1);
            if (e.kind === "tone") {
              assert.ok(e.note >= 24 && e.note <= 84, `${song}/${t}/${v}`);
              assert.ok(e.length > 0 && e.cutoff > 100);
            } else assert.ok(typeof e.sample === "string");
          }
        }
        assert.ok(count > 0, `${song}/${t}/${v}`);
      }
});
test("four-on-the-floor kick in every song/pattern; patterns differ per track; songs differ from each other", () => {
  for (let song = 0; song < 10; song++) {
    for (let v = 0; v < 4; v++)
      for (let bar = 0; bar < 8; bar++) {
        const downbeats = [0, 4, 8, 12].map((s) =>
          eventsAt(all(song, v), 0, bar * 16 + s).some(
            (e) => e.kind === "kick" && e.velocity > 0.9,
          ),
        );
        assert.ok(downbeats.every(Boolean), `${song}/${v}/${bar}`);
      }
    for (let t = 0; t < 4; t++) {
      const sig = [0, 1, 2, 3].map((v) =>
        JSON.stringify(
          Array.from({ length: 64 }, (_, s) => eventsAt(all(song, v), t, s)),
        ),
      );
      assert.equal(new Set(sig).size, 4, `${song}/${t}`);
    }
  }
  for (let t = 0; t < 4; t++) {
    const sig = SONGS.map((_, song) =>
      JSON.stringify(
        Array.from({ length: 64 }, (_, s) => eventsAt(all(song), t, s)),
      ),
    );
    assert.equal(new Set(sig).size, 10, `track ${t}`);
  }
});
test("shared harmony: every pitched note of any song mix stays in F aeolian, chord follows the Bass song", () => {
  const scale = new Set(SCALE.map((n) => (n + 5) % 12)); // F = pitch class 5
  for (let a = 0; a < 10; a++)
    for (let b = 0; b < 10; b++) {
      const c = mixed([a, b, (a + 3) % 10, (b + 7) % 10], [1, 2, 3, 1]);
      assert.equal(harmonyOf(c), b);
      for (let t = 1; t < 4; t++)
        for (let s = 0; s < 64; s++)
          for (const e of eventsAt(c, t, s))
            assert.ok(scale.has(e.note % 12), `${a}/${b}/${t}/${s} ${e.note}`);
    }
  // Same Bass song → same chord, regardless of which song the riff plays.
  for (let s = 0; s < 64; s += 16)
    assert.equal(
      chordDegree(4, s),
      chordDegree(harmonyOf(mixed([1, 4, 2, 9])), s),
    );
});
test("song list is circular for swiping", () => {
  assert.equal(wrapSong(10), 0);
  assert.equal(wrapSong(-1), 9);
  assert.equal(wrapSong(23), 3);
});
test("next-bar clock switches song and pattern at the boundary with shared loop phase", () => {
  const session = initialSession(),
    c = new PatternClock(session);
  for (let i = 0; i < 20; i++) c.tick();
  c.queue(1, { song: 5 }, true);
  c.queue(1, { variant: 2 }, true);
  assert.deepEqual(c.pending.get(1), { song: 5, variant: 2, at: 32 });
  assert.deepEqual(c.selection(1), { song: 5, variant: 2 });
  while (c.step < 32) assert.equal(c.tick().choices[1].song, 0);
  const x = c.tick();
  assert.equal(x.step, 32);
  assert.deepEqual(x.choices[1], { song: 5, variant: 2 });
  assert.deepEqual(x.choices[0], { song: 0, variant: 0 });
  assert.equal(x.step % 16, 0);
});
test("tracks are independent, re-selecting the active choice cancels, stop applies and resets", () => {
  const c = new PatternClock(initialSession());
  c.tick();
  c.queue(0, { song: 3 }, true);
  c.queue(2, { song: 8, variant: 1 }, true);
  assert.equal(c.pending.size, 2);
  c.queue(0, { song: 0 }, true);
  assert.equal(c.pending.has(0), false);
  assert.deepEqual(c.pending.get(2), { song: 8, variant: 1, at: 16 });
  c.reset();
  assert.equal(c.step, 0);
  assert.deepEqual(
    c.session.tracks.map((t) => t.song),
    [0, 0, 8, 0],
  );
  c.queue(3, { song: 9 }, false);
  assert.equal(c.session.tracks[3].song, 9);
  assert.equal(nextBar(16), 16);
});
test("mute wins over solo and multiple solos work", () => {
  const t = initialSession().tracks;
  assert.ok(t.every((_, i) => audible(t, i)));
  t[0].solo = true;
  assert.equal(audible(t, 1), false);
  t[1].solo = true;
  assert.equal(audible(t, 1), true);
  t[1].mute = true;
  assert.equal(audible(t, 1), false);
});
test("V4 session JSON roundtrip and strict invalid-data rejection", () => {
  const s = initialSession(3);
  s.tracks[2].delay = 0.8;
  s.tracks[1].song = 9;
  s.themeTrack = 2;
  assert.deepEqual(validateSession(JSON.parse(JSON.stringify(s))), s);
  for (const bad of [
    null,
    {},
    { ...s, version: 5 },
    { ...s, pack: 2 },
    { ...s, themeTrack: 4 },
    { ...s, master: NaN },
    { ...s, tracks: [] },
    { ...s, tracks: s.tracks.map((t) => ({ ...t, variant: 99 })) },
    { ...s, tracks: s.tracks.map((t) => ({ ...t, song: 10 })) },
    { ...s, tracks: s.tracks.map((t) => ({ ...t, song: -1 })) },
  ])
    assert.throws(() => validateSession(bad));
});
test("WAV has real interleaved stereo PCM and correct RIFF lengths", () => {
  const wav = encodeWav(
      [[new Float32Array([0.5, -0.5, 1]), new Float32Array([-0.25, 0.25, -1])]],
      48000,
    ),
    v = new DataView(wav);
  assert.equal(wav.byteLength, 56);
  assert.equal(new TextDecoder().decode(wav.slice(0, 4)), "RIFF");
  assert.equal(v.getUint32(4, true), 48);
  assert.equal(v.getUint32(24, true), 48000);
  assert.equal(v.getUint16(22, true), 2);
  assert.equal(v.getUint32(40, true), 12);
  assert.ok(v.getInt16(44, true) > 0);
  assert.ok(v.getInt16(46, true) < 0);
});
