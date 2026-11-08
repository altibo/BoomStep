import test from "node:test";
import assert from "node:assert/strict";
import {
  initialSession,
  validateSession,
  PatternClock,
  eventsAt,
  PACKS,
  audible,
  nextBar,
} from "../src/music.js";
import { encodeWav } from "../src/wav.js";
test("48 composed patterns are deterministic and valid in all four bars", () => {
  for (let p = 0; p < 3; p++)
    for (let t = 0; t < 4; t++)
      for (let v = 0; v < 4; v++) {
        let count = 0;
        for (let s = 0; s < 64; s++) {
          const events = eventsAt(p, t, v, s);
          assert.deepEqual(events, eventsAt(p, t, v, s));
          count += events.length;
          for (const e of events) {
            assert.ok(e.velocity > 0 && e.velocity <= 1);
            if (e.note) assert.ok(e.note > 0 && e.note < 128);
          }
        }
        assert.ok(count > 0);
      }
});
test("next bar clock switches exactly at boundary without resetting harmonic phase", () => {
  const session = initialSession(),
    c = new PatternClock(session);
  for (let i = 0; i < 20; i++) c.tick();
  c.queue(1, 2, true);
  assert.deepEqual(c.pending.get(1), { variant: 2, at: 32 });
  while (c.step < 32) assert.equal(c.tick().variants[1], 0);
  const event = c.tick();
  assert.equal(event.step, 32);
  assert.equal(event.variants[1], 2);
  assert.equal(eventsAt(0, 1, 2, event.step)[0].note, PACKS[0].roots[2] - 12);
});
test("queue replaces, selecting active cancels, stop applies and resets", () => {
  const c = new PatternClock(initialSession());
  c.tick();
  c.queue(0, 1, true);
  c.queue(0, 3, true);
  assert.equal(c.pending.get(0).variant, 3);
  c.queue(0, 0, true);
  assert.equal(c.pending.size, 0);
  c.queue(0, 2, true);
  c.reset();
  assert.equal(c.step, 0);
  assert.equal(c.session.tracks[0].variant, 2);
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
test("session JSON roundtrip and strict hostile/invalid data rejection", () => {
  const s = initialSession();
  s.tracks[2].delay = 0.8;
  s.pack = 2;
  assert.deepEqual(validateSession(JSON.parse(JSON.stringify(s))), s);
  for (const bad of [
    null,
    {},
    { ...s, pack: 3 },
    { ...s, master: NaN },
    { ...s, tracks: [] },
    { ...s, tracks: s.tracks.map((t) => ({ ...t, variant: 99 })) },
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

test("all variants in a package/track have distinct event sequences", () => {
  for (let p = 0; p < 3; p++)
    for (let t = 0; t < 4; t++) {
      const signatures = Array.from({ length: 4 }, (_, v) =>
        JSON.stringify(
          Array.from({ length: 64 }, (_, s) => eventsAt(p, t, v, s)),
        ),
      );
      assert.equal(new Set(signatures).size, 4, `${p}/${t}`);
    }
});
