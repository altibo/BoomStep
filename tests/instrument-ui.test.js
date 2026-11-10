import test from "node:test";
import assert from "node:assert/strict";
import {
  ribbonVariant,
  orbitPosition,
  orbitPoint,
} from "../src/instrument-ui.js";
test("pattern ribbon snaps to four discrete variants including captured out-of-bounds drags", () => {
  const r = { left: 10, width: 200 };
  for (const [x, v] of [
    [-50, 0],
    [10, 0],
    [59, 0],
    [60, 1],
    [159, 2],
    [160, 3],
    [210, 3],
    [500, 3],
  ])
    assert.equal(ribbonVariant(x, r), v);
});
test("orbit is read from shared audio time, wraps eight bars and never invents a second clock", () => {
  const p = orbitPosition({ step: 31, time: 10 }, 10.05, 150, true);
  assert.equal(p.bar, 1);
  assert.equal(p.chord, 1);
  assert.equal(p.beat, 4);
  assert.ok(Math.abs(p.progress - 31.5 / 128) < 1e-12);
  assert.equal(
    orbitPosition({ step: 128, time: 10 }, 10, 150, true).progress,
    0,
  );
  assert.equal(
    orbitPosition({ step: 31, time: 10 }, 50, 150, false).progress,
    31 / 128,
  );
  assert.deepEqual(orbitPoint(0), { x: 80, y: 11 });
  assert.ok(Math.abs(orbitPoint(0.25).x - 149) < 1e-9);
});
test("intentional vertical cancel has a 24px safety corridor and re-entry re-arms selection", async () => {
  const { ribbonCancelled } = await import("../src/instrument-ui.js");
  const r = { top: 100, bottom: 144 };
  for (const y of [76, 100, 120, 144, 168])
    assert.equal(ribbonCancelled(y, r), false);
  for (const y of [75, 169, -20, 900])
    assert.equal(ribbonCancelled(y, r), true);
  assert.equal(ribbonCancelled(120, r), false);
});
