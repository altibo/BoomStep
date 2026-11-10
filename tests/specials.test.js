import test from "node:test";
import assert from "node:assert/strict";
import { initialSession, validateSession } from "../src/music.js";
import { chordDegree, degreeMidi } from "../src/songs.js";
import {
  SPECIALS,
  specialPlan,
  oldestSpecial,
  MAX_SPECIAL_GROUPS,
} from "../src/specials.js";
test("all six one-shots have distinct, finite event plans and current-chord tuning", () => {
  assert.equal(SPECIALS.length, 6);
  const plans = SPECIALS.map((p) => specialPlan(p.id, 6, 34));
  const chord = chordDegree(6, 34);
  assert.equal(new Set(plans.map((p) => JSON.stringify(p))).size, 6);
  for (const plan of plans)
    for (const p of plan) {
      assert.ok(Number.isFinite(p.offset) && p.offset >= 0 && p.offset < 1);
      assert.ok(p.event.seconds > 0 && p.event.seconds <= 1.2);
      assert.ok(p.event.velocity > 0 && p.event.velocity <= 1);
    }
  assert.equal(plans[0][0].event.note, degreeMidi(chord, 53));
  assert.equal(plans[1][0].event.note, degreeMidi(chord, 29));
  assert.ok(plans.flat().every((p) => p.event.kind !== "tone" || p.event.inst));
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
test("special level validates strictly and V2-era sessions gain the default level", () => {
  const old = {
    version: 2,
    pack: 4,
    master: 1,
    reverb: 0.1,
    drive: 0.2,
    pump: 0.3,
    fx: { mode: "echo", x: 0.5, depth: 0.6, hold: true, division: 8 },
    tracks: [0, 1, 2, 3].map((v) => ({
      variant: v,
      mute: false,
      solo: false,
      volume: 0.5,
      filter: 1,
      delay: 0,
    })),
  };
  const s = validateSession(old);
  assert.equal(s.specialLevel, 0.7);
  assert.deepEqual(s.fx, old.fx);
  for (const level of [-1, 2, NaN, "0.5"])
    assert.throws(() =>
      validateSession({ ...initialSession(), specialLevel: level }),
    );
});
