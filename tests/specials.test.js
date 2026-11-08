import test from "node:test";
import assert from "node:assert/strict";
import {
  initialSession,
  validateSession,
  PACKS,
  eventsAt,
  namesFor,
} from "../src/music.js";
import {
  SPECIALS,
  specialPlan,
  oldestSpecial,
  MAX_SPECIAL_GROUPS,
} from "../src/specials.js";
test("Berlin Bounce is an original new default, preserves old pack indices and all pitched events share F minor", () => {
  const s = initialSession();
  assert.equal(s.version, 3);
  assert.equal(s.pack, 6);
  assert.equal(PACKS[6].bpm, 152);
  assert.equal(PACKS[0].name, "Donk District");
  assert.equal(PACKS[3].name, "Classic · Night Drive");
  assert.equal(namesFor(6, 0)[0], "Bounce");
  const scale = new Set([0, 1, 3, 5, 7, 8, 10]);
  for (let t = 1; t < 4; t++)
    for (let v = 0; v < 4; v++)
      for (let step = 0; step < 128; step++)
        for (const e of eventsAt(6, t, v, step))
          assert.ok(scale.has(e.note % 12));
  assert.notDeepEqual(eventsAt(0, 1, 0, 2), eventsAt(6, 1, 0, 2));
});
test("all six one-shots have distinct, finite event plans and current-chord tuning", () => {
  assert.equal(SPECIALS.length, 6);
  const plans = SPECIALS.map((p) => specialPlan(p.id, 6, 34));
  assert.equal(new Set(plans.map((p) => JSON.stringify(p))).size, 6);
  for (const plan of plans)
    for (const p of plan) {
      assert.ok(Number.isFinite(p.offset) && p.offset >= 0 && p.offset < 1);
      assert.ok(p.event.seconds > 0 && p.event.seconds <= 1.2);
      assert.ok(p.event.velocity > 0 && p.event.velocity <= 1);
    }
  assert.equal(plans[0][0].event.note, PACKS[6].roots[2] + 12);
  assert.equal(plans[1][0].event.note, PACKS[6].roots[2] - 12);
  assert.notEqual(
    specialPlan("bass", 6, 0)[0].event.note,
    specialPlan("bass", 6, 34)[0].event.note,
  );
  assert.throws(() => specialPlan("unknown", 6, 0));
});
test("voice limit steals the oldest rather than dropping retriggers", () => {
  const groups = Array.from({ length: MAX_SPECIAL_GROUPS }, (_, id) => ({
    id,
  }));
  assert.equal(oldestSpecial(groups), groups[0]);
  assert.equal(oldestSpecial(groups.slice(1)), undefined);
});
test("v2 migration preserves every previous pack and FX/mix state, initializes only special level", () => {
  for (let pack = 0; pack < 6; pack++) {
    const old = initialSession(pack);
    old.version = 2;
    delete old.specialLevel;
    old.fx.hold = true;
    old.fx.depth = 0.6;
    old.tracks[1].variant = 3;
    const s = validateSession(old);
    assert.equal(s.version, 3);
    assert.equal(s.pack, pack);
    assert.equal(s.specialLevel, 0.7);
    assert.deepEqual(s.fx, old.fx);
    assert.deepEqual(s.tracks, old.tracks);
  }
  for (const level of [-1, 2, NaN, "0.5"])
    assert.throws(() =>
      validateSession({ ...initialSession(), specialLevel: level }),
    );
});
