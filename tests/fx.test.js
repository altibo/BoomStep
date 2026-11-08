import test from "node:test";
import assert from "node:assert/strict";
import { initialSession as legacySession } from "../src/legacy-music.js";
import {
  initialSession,
  validateSession,
  eventsAt,
  PACKS,
} from "../src/music.js";
import {
  releaseFX,
  xyPoint,
  fxTargets,
  gateSegments,
  gateLevel,
  panicSession,
  driveCurve,
  ceilingCurve,
} from "../src/fx.js";
test("v1 sessions migrate every Classic pack without losing original settings", () => {
  for (let pack = 0; pack < 3; pack++) {
    const old = legacySession();
    old.pack = pack;
    old.tracks[1].volume = 0.23;
    old.tracks[2].variant = 3;
    old.tracks[3].solo = true;
    const s = validateSession(old);
    assert.equal(s.version, 3);
    assert.equal(s.pack, pack + 3);
    assert.deepEqual(s.tracks, old.tracks);
    assert.equal(s.drive, 0);
    assert.equal(s.fx.depth, 0);
    assert.deepEqual(validateSession(JSON.parse(JSON.stringify(s))), s);
  }
});
test("FX validation rejects unknown/unsafe states", () => {
  const s = initialSession();
  for (const f of [
    { ...s.fx, depth: NaN },
    { ...s.fx, x: -1 },
    { ...s.fx, mode: "fake" },
    { ...s.fx, division: 3 },
    { ...s.fx, hold: "yes" },
  ])
    assert.throws(() => validateSession({ ...s, fx: f }));
});
test("XY clamps coordinates; release neutralizes, hold latches, panic is dry without losing patterns", () => {
  assert.deepEqual(
    xyPoint(999, -10, { left: 0, top: 0, width: 100, height: 100 }),
    { x: 1, depth: 1 },
  );
  const s = initialSession();
  s.fx.depth = 0.8;
  s.fx.x = 0.2;
  assert.equal(releaseFX(s.fx).depth, 0);
  s.fx.hold = true;
  assert.equal(releaseFX(s.fx).depth, 0.8);
  s.tracks[2].variant = 3;
  panicSession(s);
  assert.equal(s.tracks[2].variant, 3);
  assert.equal(s.fx.hold, false);
  assert.equal(s.pump, 0);
  assert.equal(fxTargets(s).drive, 0);
});
test("filter, drive, echo, flanger and phase-locked 1/8 vs 1/16 gate have real distinct targets", () => {
  const s = initialSession();
  s.fx.depth = 0.8;
  s.fx.x = 0;
  assert.equal(fxTargets(s).low, 180);
  s.fx.x = 1;
  assert.equal(Math.round(fxTargets(s).high), 3500);
  s.fx.mode = "echo";
  assert.ok(fxTargets(s).echo > 0);
  s.fx.mode = "flanger";
  assert.ok(fxTargets(s).flanger > 0);
  s.fx.mode = "gate";
  assert.equal(fxTargets(s).gate, 0.8);
  assert.deepEqual(gateSegments(15, 8, 0.1), [{ offset: 0, open: false }]);
  assert.deepEqual(gateSegments(16, 8, 0.1), [{ offset: 0, open: true }]);
  assert.equal(gateSegments(16, 16, 0.1)[1].offset, 0.05);
  assert.equal(gateLevel(false, 0), 1);
  assert.ok(gateLevel(false, 1) < 0.04);
});
test("Hard House has four kicks per bar, offbeat bass and actual eighth-bar fills", () => {
  for (let p = 0; p < 3; p++) {
    assert.ok(PACKS[p].bpm >= 145 && PACKS[p].bpm <= 155);
    for (let v = 0; v < 4; v++) {
      for (let bar = 0; bar < 8; bar++)
        assert.equal(
          Array.from({ length: 16 }, (_, s) => eventsAt(p, 0, v, bar * 16 + s))
            .flat()
            .filter((e) => e.kind === "kick").length,
          4,
        );
      assert.ok(eventsAt(p, 1, v, 2).length > 0);
    }
    assert.notDeepEqual(
      Array.from({ length: 16 }, (_, s) => eventsAt(p, 0, 0, s)),
      Array.from({ length: 16 }, (_, s) => eventsAt(p, 0, 0, 112 + s)),
    );
  }
});
test("drive and final safety ceiling are finite, nonlinear and bounded", () => {
  const drive = driveCurve(),
    ceiling = ceilingCurve();
  assert.ok(drive.every(Number.isFinite));
  assert.ok(ceiling.every((n) => Math.abs(n) < 0.94));
  assert.equal(drive[2048], 0);
  assert.ok(drive[3072] > 0.5);
});

test("all Hard House bass/stab/riff pitches share the intended minor harmony (Hoover permits harmonic dominant)", () => {
  const scales = [
    new Set([0, 2, 4, 5, 7, 9, 11]),
    new Set([1, 2, 4, 6, 8, 9, 11]),
    new Set([0, 2, 3, 4, 6, 7, 9, 11]),
  ];
  for (let p = 0; p < 3; p++)
    for (let t = 1; t < 4; t++)
      for (let v = 0; v < 4; v++)
        for (let s = 0; s < 128; s++)
          for (const e of eventsAt(p, t, v, s))
            assert.ok(
              scales[p].has(e.note % 12),
              `${p}/${t}/${v}/${s}: ${e.note}`,
            );
});
