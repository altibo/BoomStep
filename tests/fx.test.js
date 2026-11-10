import test from "node:test";
import assert from "node:assert/strict";
import {
  initialSession,
  validateSession,
  LEGACY_PACK_SONG,
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
// Fixtures in the exact shape the old builds stored (V1 Classic, V2 six packs, V3 seven packs).
const oldTracks = () =>
  [0.74, 0.7, 0.6, 0.62].map((volume, i) => ({
    variant: i,
    mute: i === 2,
    solo: false,
    volume,
    filter: 0.9,
    delay: i === 3 ? 0.2 : 0,
  }));
const v1 = (pack) => ({
  version: 1,
  pack,
  master: 0.9,
  reverb: 0.3,
  tracks: oldTracks(),
});
test("V1/V2/V3 sessions migrate to V5: mix, patterns, mutes and FX kept; old pack maps to a documented new song", () => {
  for (let pack = 0; pack < 3; pack++) {
    const old = v1(pack);
    old.tracks[1].volume = 0.23;
    old.tracks[3].solo = true;
    const s = validateSession(old);
    assert.equal(s.version, 5);
    assert.equal(Object.hasOwn(s, "pack"), false);
    assert.equal(s.themeTrack, 0);
    assert.deepEqual(
      s.tracks.map(({ song: _song, ...t }) => t),
      old.tracks,
    );
    assert.ok(s.tracks.every((t) => t.song === LEGACY_PACK_SONG[pack + 3]));
    assert.equal(s.drive, 0);
    assert.equal(s.fx.depth, 0);
    assert.deepEqual(validateSession(JSON.parse(JSON.stringify(s))), s);
  }
  for (let pack = 0; pack < 7; pack++) {
    const old = {
      ...initialSession(),
      version: 3,
      pack,
      fx: { mode: "gate", x: 0.3, depth: 0.6, hold: true, division: 16 },
      tracks: oldTracks(),
    };
    delete old.themeTrack;
    const s = validateSession(old);
    assert.equal(s.version, 5);
    assert.deepEqual(s.fx, old.fx);
    assert.ok(s.tracks.every((t) => t.song === LEGACY_PACK_SONG[pack]));
  }
  assert.equal(new Set(LEGACY_PACK_SONG).size, 7);
  assert.throws(() => validateSession({ ...v1(0), pack: 5 }));
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
test("drive and final safety ceiling are finite, nonlinear and bounded", () => {
  const drive = driveCurve(),
    ceiling = ceilingCurve();
  assert.ok(drive.every(Number.isFinite));
  assert.ok(ceiling.every((n) => Math.abs(n) < 0.94));
  assert.equal(drive[2048], 0);
  assert.ok(drive[3072] > 0.5);
});
