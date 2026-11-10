import { mkdir, writeFile } from "node:fs/promises";
import { test, expect } from "@playwright/test";
import { encodeWav } from "../../src/wav.js";
import { metrics } from "./signal-metrics.js";
const out = "test-results/song-artifacts";
test.beforeEach(async () => mkdir(out, { recursive: true }));
const MIXES = {
  "mix-2songs-tiefgarage-giftgarten": {
    songs: [7, 3, 7, 3],
    variants: [1, 0, 1, 3],
    seconds: 13,
    bars: 8,
  },
  "mix-4songs-switches-specials": {
    songs: [0, 5, 8, 4],
    variants: [0, 1, 2, 0],
    seconds: 13,
    bars: 8,
    switches: [
      { step: 64, track: 1, change: { song: 6 } },
      { step: 64, track: 3, change: { variant: 3 } },
      { step: 96, track: 0, change: { song: 9, variant: 2 } },
    ],
    specials: [
      { id: "rise", time: 4.8 },
      { id: "impact", time: 6.4 },
      { id: "bark", time: 9.6 },
    ],
    reverb: 0.2,
  },
  "mix-allsongs-default-0": { song: 0, seconds: 13, bars: 8 },
  "mix-allsongs-default-5": { song: 5, variant: 2, seconds: 13, bars: 8 },
  "mix-max-krassheit-specials": {
    songs: [2, 2, 9, 6],
    variants: [3, 3, 1, 1],
    intensity: 1,
    seconds: 13,
    bars: 8,
    mode: "drive",
    depth: 1,
    specials: ["bark", "bass", "fill", "rise", "impact", "laser"].map(
      (id, i) => ({ id, time: 1 + i * 0.05 }),
    ),
  },
};
test("offline sample mixes (2 songs, switches, specials, max Krassheit) export valid WAVs with peak < 1 and no clipping", async ({
  page,
}) => {
  test.setTimeout(180000);
  await page.goto("/");
  const report = {};
  for (const [name, config] of Object.entries(MIXES)) {
    const r = await page.evaluate(async (c) => {
      const b = await window.boomstep.renderDiagnostic(c);
      return {
        left: Array.from(b.getChannelData(0)),
        right: Array.from(b.getChannelData(1)),
        rate: b.sampleRate,
      };
    }, config);
    const left = Float32Array.from(r.left),
      right = Float32Array.from(r.right);
    report[name] = metrics(left, right, r.rate);
    // second half vs first half: the switches really change the signal
    if (config.switches) {
      const half = Math.floor(left.length / 2);
      report[name].firstHalf = metrics(
        left.subarray(0, half),
        right.subarray(0, half),
        r.rate,
      );
      report[name].secondHalf = metrics(
        left.subarray(half),
        right.subarray(half),
        r.rate,
      );
    }
    await writeFile(
      `${out}/${name}.wav`,
      Buffer.from(encodeWav([[left, right]], r.rate)),
    );
  }
  console.log("Mix metrics", JSON.stringify(report, null, 1));
  await writeFile(`${out}/mix-metrics.json`, JSON.stringify(report, null, 2));
  for (const m of Object.values(report)) {
    expect(m.peak).toBeLessThan(1);
    expect(m.clippedSamples).toBe(0);
    expect(m.rms).toBeGreaterThan(0.03);
  }
  const sw = report["mix-4songs-switches-specials"];
  expect(
    Math.abs(sw.firstHalf.centroidHz - sw.secondHalf.centroidHz),
  ).toBeGreaterThan(20);
});
test("live REC captures sample playback, tapped song switches and stays below full scale (landscape 844×390)", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto("/");
  await page.locator("#record").click();
  await page.waitForFunction(() => window.boomstep.engine.clock.step > 2);
  // tap the song halves (landscape main layout): Bass 5× right, Stabs 3× left
  const tapHalf = async (track, side, n) => {
    const b = await page.locator(`[data-songcell="${track}"]`).boundingBox();
    for (let i = 0; i < n; i++)
      await page.mouse.click(
        b.x + b.width * (side > 0 ? 0.8 : 0.2),
        b.y + b.height / 2,
      );
  };
  await tapHalf(1, 1, 5);
  const at = await page.evaluate(
    () => window.boomstep.engine.clock.pending.get(1).at,
  );
  await tapHalf(2, -1, 3);
  await page.waitForFunction(
    (at) => window.boomstep.engine.clock.step > at + 40,
    at,
  );
  expect(
    await page.evaluate(() =>
      window.boomstep.session.tracks.map((t) => t.song),
    ),
  ).toEqual([0, 5, 7, 0]);
  await page.locator("#record").click();
  await expect(page.locator("#download")).toBeVisible();
  const bytes = Buffer.from(
    await page
      .locator("#download")
      .evaluate(async (a) =>
        Array.from(new Uint8Array(await (await fetch(a.href)).arrayBuffer())),
      ),
  );
  await writeFile(`${out}/live-rec-tap-switch.wav`, bytes);
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength),
    rate = v.getUint32(24, true),
    frames = (bytes.length - 44) / 4,
    left = new Float32Array(frames),
    right = new Float32Array(frames);
  for (let i = 0; i < frames; i++) {
    left[i] = v.getInt16(44 + i * 4, true) / 32768;
    right[i] = v.getInt16(46 + i * 4, true) / 32768;
  }
  const m = metrics(left, right, rate);
  console.log("Live REC metrics", JSON.stringify(m));
  expect(v.getUint16(22, true)).toBe(2);
  expect(m.seconds).toBeGreaterThan(3);
  expect(m.peak).toBeLessThan(1);
  expect(m.clippedSamples).toBe(0);
  expect(m.rms).toBeGreaterThan(0.03);
});
