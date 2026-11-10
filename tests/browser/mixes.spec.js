import { mkdir, writeFile } from "node:fs/promises";
import { test, expect } from "@playwright/test";
import { encodeWav } from "../../src/wav.js";
import { metrics } from "./signal-metrics.js";
import { STEP_SECONDS } from "../../src/music.js";
const out = "test-results/song-artifacts";
test.beforeEach(async () => mkdir(out, { recursive: true }));
const MIXES = {
  "mix-2songs-tiefgarage-giftgarten": {
    songs: [7, 3, 7, 3],
    variants: [1, 0, 1, 3],
    seconds: 13,
    bars: 8,
  },
  "mix-4songs-switches-fx": {
    songs: [0, 5, 8, 4],
    variants: [0, 1, 2, 0],
    seconds: 13,
    bars: 8,
    switches: [
      { step: 64, track: 1, change: { song: 6 } },
      { step: 64, track: 3, change: { variant: 3 } },
      { step: 96, track: 0, change: { song: 9, variant: 2 } },
    ],
    fxSweep: [
      { time: 4.8, mode: "stutter", x: 0.5, depth: 1 },
      { time: 6.4, depth: 0 },
      { time: 9.6, mode: "crush", x: 0.6, depth: 0.8 },
      { time: 11, mode: "tape", x: 0.1, depth: 1 },
    ],
    reverb: 0.2,
  },
  "mix-allsongs-default-0": { song: 0, seconds: 13, bars: 8 },
  "mix-allsongs-default-5": { song: 5, variant: 2, seconds: 13, bars: 8 },
  "mix-max-krassheit-fx": {
    songs: [2, 2, 9, 6],
    variants: [3, 3, 1, 1],
    intensity: 1,
    seconds: 13,
    bars: 8,
    mode: "drive",
    depth: 1,
    fxSweep: [
      { time: 3, mode: "stutter", x: 1, depth: 1 },
      { time: 6, mode: "crush", x: 1, depth: 1 },
      { time: 9, mode: "tape", x: 0, depth: 1 },
    ],
  },
};
test("offline sample mixes (2 songs, switches, stutter/crush/tape, max Krassheit) export valid WAVs with peak < 1 and no clipping", async ({
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
  const sw = report["mix-4songs-switches-fx"];
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
  // tap the ‹/› song buttons (landscape main layout): Bass 5× right, Stabs 3× left
  const tapHalf = async (track, side, n) => {
    const b = await page
      .locator(
        `[data-songcell="${track}"] ${side > 0 ? ".song-next" : ".song-prev"}`,
      )
      .boundingBox();
    for (let i = 0; i < n; i++)
      await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
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

// Pearson correlation of two equally long windows of one channel
const corr = (x, a, b, n) => {
  let sa = 0,
    sb = 0,
    saa = 0,
    sbb = 0,
    sab = 0;
  for (let i = 0; i < n; i++) {
    const u = x[a + i],
      v = x[b + i];
    sa += u;
    sb += v;
    saa += u * u;
    sbb += v * v;
    sab += u * v;
  }
  const cov = sab - (sa * sb) / n;
  return cov / Math.sqrt((saa - (sa * sa) / n) * (sbb - (sb * sb) / n) + 1e-12);
};
test("STUTTER repeats the captured slice in the beat grid (1/16, 1/32), deterministic, bounded; TAPE stops, CRUSH changes the spectrum", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.goto("/");
  const base = { songs: [7, 3, 7, 3], variants: [1, 1, 1, 1], seconds: 4.2 };
  const render = (c) =>
    page.evaluate(async (c) => {
      const b = await window.boomstep.renderDiagnostic(c);
      return {
        left: Array.from(b.getChannelData(0)),
        right: Array.from(b.getChannelData(1)),
        rate: b.sampleRate,
      };
    }, c);
  const dry = await render(base);
  const s16 = await render({ ...base, mode: "stutter", x: 0.5, depth: 1 });
  const s16b = await render({ ...base, mode: "stutter", x: 0.5, depth: 1 });
  const s32 = await render({ ...base, mode: "stutter", x: 1, depth: 1 });
  const rate = dry.rate,
    dt = STEP_SECONDS,
    beatStart = (k) => Math.round((0.05 + 4 * k * dt) * rate);
  // compare consecutive repeats inside beats 2..8 (after the reverb/limiter settled)
  const periodic = (x, slice) => {
    const n = Math.round(slice * rate) - Math.round(0.006 * rate),
      off = Math.round(0.003 * rate),
      out = [];
    for (let k = 2; k < 9; k++) {
      const s = beatStart(k) + Math.round(slice * rate);
      out.push(corr(x, s + off, s + Math.round(slice * rate) + off, n));
    }
    return out.reduce((a, b) => a + b, 0) / out.length;
  };
  const r = {
    dry16: periodic(Float32Array.from(dry.left), dt),
    stutter16: periodic(Float32Array.from(s16.left), dt),
    dry32: periodic(Float32Array.from(dry.left), dt / 2),
    stutter32: periodic(Float32Array.from(s32.left), dt / 2),
    deterministicMaxDiff: s16.left.reduce(
      (m, v, i) => Math.max(m, Math.abs(v - s16b.left[i])),
      0,
    ),
  };
  const tape = await render({
    ...base,
    fxSweep: [{ time: 1, mode: "tape", x: 0, depth: 1 }],
  });
  const crush = await render({ ...base, mode: "crush", x: 1, depth: 1 });
  const rms = (x, a, b) => {
    let p = 0;
    for (let i = Math.round(a * rate); i < Math.round(b * rate); i++)
      p += x[i] * x[i];
    return Math.sqrt(p / (Math.round(b * rate) - Math.round(a * rate)));
  };
  const L = (o) => Float32Array.from(o.left),
    R = (o) => Float32Array.from(o.right);
  r.tapeTail = rms(L(tape), 2.2, 4) / rms(L(dry), 2.2, 4);
  r.tapeBefore = rms(L(tape), 0.2, 0.9) / rms(L(dry), 0.2, 0.9);
  const md = metrics(L(dry), R(dry), rate),
    mc = metrics(L(crush), R(crush), rate),
    ms = metrics(L(s16), R(s16), rate),
    mt = metrics(L(tape), R(tape), rate);
  r.centroid = { dry: md.centroidHz, crush: mc.centroidHz };
  r.peaks = { stutter: ms.peak, crush: mc.peak, tape: mt.peak };
  console.log("FX PCM", JSON.stringify(r));
  await writeFile(`${out}/fx-pcm-metrics.json`, JSON.stringify(r, null, 2));
  // repeats are near-identical copies, clearly more periodic than the dry music
  expect(r.stutter16).toBeGreaterThan(0.97);
  expect(r.stutter32).toBeGreaterThan(0.97);
  expect(r.stutter16 - r.dry16).toBeGreaterThan(0.1);
  expect(r.stutter32 - r.dry32).toBeGreaterThan(0.05);
  // same render twice: identical up to float noise of the offline graph (convolver/limiter)
  expect(r.deterministicMaxDiff).toBeLessThan(1e-3);
  for (const m of [ms, mc, mt]) {
    expect(m.peak).toBeLessThan(1);
    expect(m.clippedSamples).toBe(0);
  }
  expect(r.tapeBefore).toBeGreaterThan(0.9);
  expect(r.tapeTail).toBeLessThan(0.15);
  expect(Math.abs(mc.centroidHz - md.centroidHz)).toBeGreaterThan(150);
  for (const [name, o] of [
    ["fx-stutter-1-16", s16],
    ["fx-stutter-1-32", s32],
    ["fx-tape-stop", tape],
    ["fx-crush-2bit", crush],
    ["fx-dry-reference", dry],
  ])
    await writeFile(
      `${out}/${name}.wav`,
      Buffer.from(encodeWav([[L(o), R(o)]], rate)),
    );
});
