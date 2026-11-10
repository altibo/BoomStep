import test from "node:test";
import assert from "node:assert/strict";
import {
  initialSession,
  validateSession,
  eventsAt,
  SONGS,
  PatternClock,
} from "../src/music.js";
import {
  intensityTargets,
  intensityEvents,
  lightState,
  intensityName,
} from "../src/intensity.js";
import { fxTargets, panicSession } from "../src/fx.js";
import { contrast, hexRgb } from "../src/theme.js";
test("old V3 sessions gain neutral macro/light defaults; new fields roundtrip and reject unsafe data", () => {
  const old = { ...initialSession(), version: 3, pack: 6 };
  delete old.intensity;
  delete old.beatLights;
  delete old.themeTrack;
  old.tracks = old.tracks.map(({ song: _song, ...t }) => t);
  const migrated = validateSession(old);
  assert.equal(migrated.intensity, 0);
  assert.equal(migrated.beatLights, true);
  assert.deepEqual(
    migrated.tracks.map(({ song: _song, ...t }) => t),
    old.tracks,
  );
  for (const value of [0, 0.5, 1]) {
    const s = { ...migrated, intensity: value, beatLights: false };
    assert.deepEqual(validateSession(JSON.parse(JSON.stringify(s))), s);
  }
  for (const intensity of [-0.01, 1.01, NaN, null, "1"])
    assert.throws(() => validateSession({ ...migrated, intensity }));
  for (const beatLights of [null, 0, "false"])
    assert.throws(() => validateSession({ ...migrated, beatLights }));
});
test("macro targets progress without rewriting any manual baseline and zero is neutral", () => {
  const s = initialSession(),
    before = structuredClone(s),
    values = [0, 0.5, 1].map((intensity) =>
      intensityTargets({ ...s, intensity }),
    );
  assert.equal(values[0].drive, s.drive);
  assert.equal(values[0].pump, s.pump);
  assert.equal(values[0].headroom, 0.64);
  assert.ok(
    values[0].drive < values[1].drive && values[1].drive < values[2].drive,
  );
  assert.ok(values[2].pump <= 1);
  assert.ok(values[2].headroom < values[0].headroom);
  assert.deepEqual(s, before);
  assert.equal(
    fxTargets({
      ...s,
      intensity: 1,
      drive: 1,
      fx: { ...s.fx, mode: "drive", depth: 1 },
    }).drive,
    1,
  );
});
test("grid density grows deterministically, keeps base events and never alters patterns or harmony", () => {
  const counts = [0, 0, 0];
  for (let p = 0; p < SONGS.length; p++)
    for (let t = 0; t < 4; t++)
      for (let v = 0; v < 4; v++)
        for (let step = 0; step < 128; step++) {
          const choices = [0, 1, 2, 3].map(() => ({ song: p, variant: v })),
            base = eventsAt(choices, t, step),
            before = structuredClone(base);
          [0, 0.5, 1].forEach((a, i) => {
            const out = intensityEvents(base, t, step, a, choices);
            counts[i] += out.length;
            assert.deepEqual(out, intensityEvents(base, t, step, a, choices));
            assert.ok(out.length >= base.length);
            assert.ok(out.every((e) => e.velocity > 0 && e.velocity <= 1));
            if (!a) assert.deepEqual(out, base);
          });
          assert.deepEqual(base, before);
        }
  assert.ok(counts[0] < counts[1] && counts[1] < counts[2]);
});
test("macro does not reset shared clock or overwrite a pending user pattern", () => {
  const s = initialSession(),
    clock = new PatternClock(s);
  for (let i = 0; i < 20; i++) clock.tick();
  clock.queue(1, { variant: 2 }, true);
  const q = structuredClone(clock.pending.get(1));
  s.intensity = 1;
  for (let i = 20; i < 32; i++) assert.equal(clock.tick().step, i);
  assert.deepEqual(clock.pending.get(1), q);
  assert.equal(clock.tick().choices[1].variant, 2);
});
test("FX AUS also returns macro to neutral, preserving patterns/mutes/solo/volumes and light preference", () => {
  const s = initialSession();
  s.intensity = 1;
  s.beatLights = false;
  s.tracks[0].solo = true;
  s.tracks[1].mute = true;
  s.tracks[2].variant = 3;
  const original = s.tracks.map(
    ({ filter: _filter, delay: _delay, ...t }) => t,
  );
  panicSession(s);
  assert.equal(s.intensity, 0);
  assert.equal(fxTargets(s).drive, 0);
  assert.equal(s.beatLights, false);
  assert.deepEqual(
    s.tracks.map(({ filter: _filter, delay: _delay, ...t }) => t),
    original,
  );
});
test("clock light envelope has bounded frequency, local amplitude and no motion when paused/quiet/reduced", () => {
  for (const bpm of [60, 147, 152, 180, 181, 240, 600])
    for (const a of [0, 0.5, 1]) {
      const x = lightState(a, 0.123, bpm, true, true, false);
      assert.ok(x.hz <= 3);
      assert.ok(x.pulse >= 0 && x.pulse <= 1);
      assert.ok(x.glow <= 0.4800001);
      for (const [run, beat, reduced] of [
        [false, true, false],
        [true, false, false],
        [true, true, true],
      ]) {
        const b = lightState(a, 0.8, bpm, run, beat, reduced),
          c = lightState(a, 0.2, bpm, run, beat, reduced);
        assert.equal(b.pulse, 0);
        assert.equal(b.glow, c.glow);
      }
    }
  assert.equal(intensityName(0), "Locker");
  assert.equal(intensityName(0.5), "Druck");
  assert.equal(intensityName(1), "Abriss");
});
test("Krassheit lifts every song colour toward white and keeps dark thumb text readable (≥ 4.5:1)", () => {
  const dark = hexRgb("#06101d");
  for (const song of SONGS)
    for (let i = 0; i <= 100; i++) {
      const x = lightState(i / 100, 0, 150, false, true, false, song.color),
        c = x.rgb.split(",").map(Number);
      assert.ok(contrast(c, dark) >= 4.5, `${song.name} ${i}`);
      assert.ok(c.every((v, k) => v >= hexRgb(song.color)[k]));
    }
  assert.equal(lightState(0, 0, 150, false, true, false, "#40d4f2").lift, "0%");
  assert.equal(
    lightState(1, 0, 150, false, true, false, "#40d4f2").lift,
    "22%",
  );
});
