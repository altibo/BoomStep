import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { SONGS, TRACKS, eventsAt } from "../src/music.js";
import { specialPlan, SPECIALS } from "../src/specials.js";
import {
  bank,
  nearestZone,
  INSTRUMENTS,
  SAMPLE_FILES,
} from "../src/samples.js";
import { wrapSong } from "../src/songs.js";
import {
  contrast,
  luminance,
  hexRgb,
  hue,
  surfaces,
  AMBER,
  RED,
} from "../src/theme.js";
const TEXT = hexRgb("#eff5fa"),
  MUTED = hexRgb("#b4c7d6"),
  THUMB = hexRgb("#06101d");
const hueGap = (a, b) => {
  const d = Math.abs(a - b) % 360;
  return Math.min(d, 360 - d);
};
test("all 10 song themes keep WCAG text contrast on every tinted surface and stay dark", () => {
  for (const song of SONGS)
    for (const lift of [0, 0.22]) {
      const s = surfaces(song.color, lift),
        name = `${song.name}/${lift}`;
      for (const bg of [
        s.page,
        s.pageGlow,
        s.card,
        s.songCell,
        s.pressed,
        s.button,
      ]) {
        assert.ok(
          contrast(TEXT, bg) >= 7,
          `${name} text ${contrast(TEXT, bg)}`,
        );
        assert.ok(contrast(MUTED, bg) >= 4.5, `${name} muted`);
        assert.ok(luminance(bg) < 0.07, `${name} surface stays dark`);
      }
      assert.ok(
        contrast(hexRgb(song.color), s.songCell) >= 4.5,
        `${name} song name`,
      );
      assert.ok(contrast(THUMB, s.accent) >= 4.5, `${name} thumb text`);
    }
});
test("song colours are bright, never pure amber (pending) or red (recording)", () => {
  const amber = hue(hexRgb(AMBER)),
    red = hue(hexRgb(RED));
  for (const song of SONGS) {
    const c = hexRgb(song.color),
      h = hue(c);
    assert.ok(Math.max(...c) >= 0xe0, song.name);
    assert.ok(hueGap(h, amber) >= 25, `${song.name} vs amber ${h}`);
    assert.ok(hueGap(h, red) >= 25, `${song.name} vs red ${h}`);
  }
});
test("song field steps: › = +1, ‹ = −1 from the pending target, wrapping both ways", () => {
  let target = 0;
  for (const d of [1, 1]) target = wrapSong(target + d);
  assert.equal(target, 2);
  for (const d of [-1, -1, -1]) target = wrapSong(target + d);
  assert.equal(target, 9);
  assert.equal(wrapSong(9 + 1), 0);
});
test("sample bank: every file exists with matching hash, all used instruments are present, budget < 15 MB", () => {
  let bytes = 0;
  for (const f of SAMPLE_FILES) {
    const data = readFileSync(`public/${f}`);
    bytes += data.length;
    assert.equal(new TextDecoder().decode(data.subarray(0, 4)), "RIFF", f);
  }
  for (const d of Object.values(bank.drums))
    assert.equal(
      createHash("sha256")
        .update(readFileSync(`public/${d.file}`))
        .digest("hex"),
      d.sha256,
    );
  assert.ok(bytes < 15 * 1024 * 1024, `${bytes}`);
  assert.equal(
    readdirSync("public/samples").filter((f) => f.endsWith(".wav")).length,
    SAMPLE_FILES.length,
  );
  const credits = readFileSync("CREDITS.md", "utf8");
  for (const f of SAMPLE_FILES) assert.ok(credits.includes(f), f);
  assert.ok(statSync("public/samples/CREDITS.txt").size > 1000);
  for (const song of SONGS)
    for (const part of ["bass", "stab", "riff"]) {
      assert.ok(bank.instruments[song[part].inst], song[part].inst);
      assert.ok(INSTRUMENTS[song[part].inst], song[part].inst);
    }
});
test("pitch shift per played note stays small; drum samples referenced by songs and specials exist", () => {
  const maxShift = {};
  const check = (e) => {
    if (e.kind === "tone") {
      const z = nearestZone(bank.instruments[e.inst].zones, e.note),
        d = Math.abs(z.root - e.note);
      maxShift[e.inst] = Math.max(maxShift[e.inst] ?? 0, d);
    } else if (e.sample) assert.ok(bank.drums[e.sample], e.sample);
  };
  for (let a = 0; a < 10; a++)
    for (let b = 0; b < 10; b++)
      for (let v = 0; v < 4; v++)
        for (let t = 0; t < TRACKS.length; t++)
          for (let s = 0; s < 64; s++)
            eventsAt(
              [0, 1, 2, 3].map((i) => ({ song: i === t ? a : b, variant: v })),
              t,
              s,
            ).forEach(check);
  for (let h = 0; h < 10; h++)
    for (let s = 0; s < 64; s += 16)
      for (const sp of SPECIALS)
        specialPlan(sp.id, h, s).forEach((p) => check(p.event));
  console.log("max semitone shift per instrument", JSON.stringify(maxShift));
  for (const [inst, d] of Object.entries(maxShift))
    assert.ok(d <= 3, `${inst} ${d}`);
});
