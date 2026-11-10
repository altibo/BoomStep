import test from "node:test";
import assert from "node:assert/strict";
import {
  fxTargets,
  stutterSlice,
  sliceName,
  stutterPlan,
  tapeSeconds,
  brakeCurve,
  crushBits,
  crushCurve,
  releaseFX,
} from "../src/fx.js";
import {
  initialSession,
  validateSession,
  FX_MODES,
  STEP_SECONDS,
} from "../src/music.js";
test("XY modes: STUTTER first, plus TAPE-STOP and CRUSH; X is the colour filter only for the classic four", () => {
  assert.deepEqual(FX_MODES, [
    "stutter",
    "echo",
    "flanger",
    "gate",
    "drive",
    "tape",
    "crush",
  ]);
  const s = initialSession();
  s.fx = { ...s.fx, mode: "stutter", x: 0, depth: 0.8 };
  let t = fxTargets(s);
  assert.equal(t.stutter, 0.8);
  assert.equal(t.low, 18000);
  assert.equal(t.high, 25);
  assert.equal(t.echo + t.flanger + t.gate + t.tape + t.crush, 0);
  s.fx.mode = "echo";
  t = fxTargets(s);
  assert.ok(t.low < 300); // X = 0 is dark lowpass in colour modes
  assert.equal(t.stutter, 0);
  for (const mode of ["tape", "crush"]) {
    s.fx.mode = mode;
    assert.equal(fxTargets(s)[mode], 0.8);
  }
  // release without HOLD returns to neutral: no stutter/tape/crush left on
  s.fx = releaseFX({ ...s.fx, hold: false });
  const n = fxTargets(s);
  assert.equal(n.stutter + n.tape + n.crush, 0);
});
test("stutter: X picks 1/8, 1/16, 1/32 slices; plan captures one slice then loops it on the beat grid", () => {
  assert.deepEqual(
    [0, 0.3, 0.34, 0.66, 0.67, 1].map(stutterSlice),
    [2, 2, 1, 1, 0.5, 0.5],
  );
  assert.deepEqual([2, 1, 0.5].map(sliceName), ["1/8", "1/16", "1/32"]);
  const dt = STEP_SECONDS;
  for (const [steps, repeats] of [
    [2, 1],
    [1, 3],
    [0.5, 7],
  ]) {
    const p = stutterPlan(10, steps, dt);
    assert.ok(Math.abs(p.slice - steps * dt) < 1e-12);
    assert.ok(Math.abs(p.captureEnd - (10 + steps * dt)) < 1e-12);
    assert.ok(Math.abs(p.end - (10 + 4 * dt)) < 1e-12);
    assert.equal(p.edges.length, repeats);
    // every repeat edge sits exactly on the slice grid (deterministic, audio-clock based)
    p.edges.forEach((e, i) =>
      assert.ok(Math.abs(e - (10 + (i + 1) * p.slice)) < 1e-9),
    );
    assert.ok(p.slice * 48000 >= 128); // loop longer than one render quantum
  }
});
test("tape-stop: brake curve is a smooth speed ramp 1 → 0; length from X; crush quantises to 2^(bits-1) steps", () => {
  const beat = STEP_SECONDS * 4;
  assert.ok(Math.abs(tapeSeconds(0, beat) - beat / 2) < 1e-12);
  assert.ok(Math.abs(tapeSeconds(1, beat) - beat * 4) < 1e-12);
  const c = brakeCurve(1, 101);
  assert.equal(c[0], 0);
  assert.ok(Math.abs(c[100] - 0.5) < 1e-6);
  // speed = 1 − d'(t) falls monotonically from ~1 to ~0, never reverses
  let last = Infinity;
  for (let i = 1; i < c.length; i++) {
    const speed = 1 - (c[i] - c[i - 1]) * 100;
    assert.ok(speed <= last + 1e-6 && speed >= -1e-6);
    last = speed;
  }
  assert.deepEqual([0, 0.5, 1].map(crushBits), [8, 5, 2]);
  const q = crushCurve(3, 1025);
  assert.deepEqual(
    [...new Set(q)].sort((a, b) => a - b),
    [-1, -0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 1],
  );
});
test("session v5: SPECIALS/HITPEGEL removed; v4 sessions migrate (specialLevel dropped), v5 rejects it", () => {
  const s = initialSession();
  assert.equal(s.version, 5);
  assert.equal(Object.hasOwn(s, "specialLevel"), false);
  const v4 = { ...structuredClone(s), version: 4, specialLevel: 0.4 };
  const m = validateSession(v4);
  assert.equal(m.version, 5);
  assert.equal(Object.hasOwn(m, "specialLevel"), false);
  assert.deepEqual(m.tracks, s.tracks);
  assert.throws(() => validateSession({ ...s, specialLevel: 0.5 }));
  assert.throws(() => validateSession({ ...v4, specialLevel: 3 }));
  for (const mode of FX_MODES)
    assert.equal(
      validateSession({ ...s, fx: { ...s.fx, mode } }).fx.mode,
      mode,
    );
  assert.throws(() =>
    validateSession({ ...s, fx: { ...s.fx, mode: "laser" } }),
  );
});
