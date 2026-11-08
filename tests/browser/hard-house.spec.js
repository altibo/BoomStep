import { mkdir, writeFile } from "node:fs/promises";
import { test, expect } from "@playwright/test";
import { encodeWav } from "../../src/wav.js";
test.beforeEach(async () => {
  await mkdir("test-results/artifacts", { recursive: true });
});
test("all performance controls are inline; portrait layouts are visible and touch-safe", async ({
  page,
}) => {
  await mkdir("test-results/artifacts", { recursive: true });
  for (const [width, height] of [
    [390, 844],
    [390, 700],
    [320, 568],
    [844, 390],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    expect(await page.locator("dialog").count()).toBe(0);
    expect(await page.locator("input[data-strip]").count()).toBe(12);
    expect(await page.locator(".master input").count()).toBe(4);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    for (const sel of [
      ".pattern",
      ".mute",
      ".solo",
      ".fx-pads button",
      ".transport button",
      "#pack",
    ]) {
      const sizes = await page.locator(sel).evaluateAll((es) =>
        es.map((e) => ({
          w: e.getBoundingClientRect().width,
          h: e.getBoundingClientRect().height,
        })),
      );
      expect(sizes.length).toBeGreaterThan(0);
      expect(sizes.every((r) => r.w >= 44 && r.h >= 44)).toBeTruthy();
    }
    const bounds = await page.locator("#performance").boundingBox();
    console.log("Performance layout", width, height, bounds);
    if (width === 390)
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(height);
    await page.screenshot({
      path: `test-results/artifacts/hard-house-${width}x${height}.png`,
      fullPage: true,
    });
  }
});
test("XY pointer release, hold, gate division, keyboard and dry panic control real FX", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#play").click();
  const xy = await page.locator("#xy").boundingBox();
  await page.mouse.move(xy.x + xy.width * 0.7, xy.y + xy.height * 0.2);
  await page.mouse.down();
  await page.waitForTimeout(100);
  expect(
    await page.evaluate(() => window.boomstep.session.fx.depth),
  ).toBeGreaterThan(0.7);
  await expect
    .poll(() => page.evaluate(() => window.boomstep.engine.echoWet.gain.value))
    .toBeGreaterThan(0.3);
  await page.mouse.up();
  expect(await page.evaluate(() => window.boomstep.session.fx.depth)).toBe(0);
  expect(await page.evaluate(() => window.boomstep.session.fx.x)).toBe(0.5);
  await page.locator("#hold").click();
  await page.locator('[data-fx="flanger"]').click();
  await page.mouse.move(xy.x + xy.width * 0.45, xy.y + xy.height * 0.25);
  await page.mouse.down();
  await page.mouse.up();
  expect(
    await page.evaluate(() => window.boomstep.session.fx.depth),
  ).toBeGreaterThan(0.7);
  await page.waitForTimeout(150);
  await expect
    .poll(() =>
      page.evaluate(() => window.boomstep.engine.flangeWet.gain.value),
    )
    .toBeGreaterThan(0.5);
  await page.locator('[data-fx="gate"]').click();
  await page.locator('[data-fx="gate"]').click();
  expect(await page.evaluate(() => window.boomstep.session.fx.division)).toBe(
    16,
  );
  await page.locator("#hold").click();
  expect(await page.evaluate(() => window.boomstep.session.fx.depth)).toBe(0);
  await page.locator("#xy").focus();
  await page.keyboard.press("ArrowUp");
  expect(
    await page.evaluate(() => window.boomstep.session.fx.depth),
  ).toBeGreaterThan(0);
  await page.keyboard.press("Escape");
  expect(
    await page.evaluate(
      () =>
        window.boomstep.session.drive +
        window.boomstep.session.reverb +
        window.boomstep.session.pump +
        window.boomstep.session.fx.depth,
    ),
  ).toBe(0);
});
test("old local sessions migrate and Classic packages remain available", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() =>
    localStorage.setItem(
      "boomstep-session",
      JSON.stringify({
        version: 1,
        pack: 2,
        master: 0.72,
        reverb: 0.2,
        tracks: Array.from({ length: 4 }, (_, i) => ({
          variant: i,
          mute: i === 2,
          solo: false,
          volume: 0.4,
          filter: 0.8,
          delay: 0.12,
        })),
      }),
    ),
  );
  await page.locator("#load").click();
  expect(await page.evaluate(() => window.boomstep.session.version)).toBe(2);
  expect(await page.evaluate(() => window.boomstep.session.pack)).toBe(5);
  expect(
    await page.evaluate(() => window.boomstep.session.tracks[2].mute),
  ).toBeTruthy();
  await page.locator("#play").click();
  await expect(page.locator("#play")).toContainText("PAUSE");
});
test("deterministic audio renders prove distinct Hard House variants, bounded peaks and real FX", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.goto("/");
  const report = await page.evaluate(async () => {
    const render = window.boomstep.renderDiagnostic;
    const metrics = (buffer) => {
      const d = buffer.getChannelData(0);
      let power = 0,
        peak = 0,
        edge = 0;
      for (let i = 0; i < d.length; i++) {
        power += d[i] * d[i];
        peak = Math.max(peak, Math.abs(d[i]));
        if (i) edge += (d[i] - d[i - 1]) ** 2;
      }
      return {
        rms: Math.sqrt(power / d.length),
        peak,
        edge: Math.sqrt(edge / d.length),
      };
    };
    const variants = [];
    for (let p = 0; p < 3; p++)
      for (let t = 0; t < 4; t++) {
        const base = await render({ pack: p, track: t, seconds: 1.72 });
        const a = base.getChannelData(0),
          m = metrics(base);
        for (let v = 0; v < 4; v++) {
          const b =
            v === 0
              ? base
              : await render({ pack: p, track: t, variant: v, seconds: 1.72 });
          const d = b.getChannelData(0);
          let error = 0;
          for (let i = 0; i < d.length; i++) error += (d[i] - a[i]) ** 2;
          variants.push({
            p,
            t,
            v,
            ...metrics(b),
            difference: Math.sqrt(error / d.length) / (m.rms || 1),
          });
        }
      }
    const base = await render({ seconds: 3.3 }),
      a = base.getChannelData(0),
      fx = [];
    for (const mode of ["echo", "flanger", "gate", "drive"]) {
      const buffer = await render({ mode, depth: 1, seconds: 3.3 }),
        d = buffer.getChannelData(0);
      let error = 0;
      for (let i = 0; i < d.length; i++) error += (d[i] - a[i]) ** 2;
      fx.push({
        mode,
        ...metrics(buffer),
        difference: Math.sqrt(error / d.length),
      });
    }
    const repeat = await render({ seconds: 3.3 }),
      r = repeat.getChannelData(0);
    let repeatError = 0;
    for (let i = 0; i < a.length; i++) repeatError += (r[i] - a[i]) ** 2;
    return {
      variants,
      fx,
      repeatRMSE: Math.sqrt(repeatError / a.length),
      base: metrics(base),
    };
  });
  console.log("Audio signal verification", {
    renders: report.variants.length,
    minVariantDifference: Math.min(
      ...report.variants.filter((v) => v.v).map((v) => v.difference),
    ),
    maxPeak: Math.max(...report.variants.map((v) => v.peak)),
    FX: report.fx,
    repeatRMSE: report.repeatRMSE,
  });
  for (const m of report.variants) {
    expect(m.rms).toBeGreaterThan(0.0001);
    expect(m.peak).toBeLessThan(0.95);
    if (m.v !== 0) expect(m.difference).toBeGreaterThan(0.05);
  }
  for (const f of report.fx) {
    expect(f.peak).toBeLessThan(0.95);
    expect(f.difference).toBeGreaterThan(0.002);
  }
  expect(report.repeatRMSE).toBeLessThan(0.0001);
  await writeFile(
    "test-results/artifacts/hard-house-signal-report.json",
    JSON.stringify(report, null, 2),
  );
});

test("live XY drive changes recorded PCM and stays below the safety ceiling", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#record").click();
  await page.waitForFunction(
    () => window.boomstep.engine.recordedFrames > 48000,
  );
  const before = await page.evaluate(() => {
    const d = window.boomstep.engine.chunks.flatMap((c) => Array.from(c[0]));
    return Math.sqrt(d.reduce((s, x) => s + x * x, 0) / d.length);
  });
  await page.locator("#hold").click();
  await page.locator('[data-fx="drive"]').click();
  const r = await page.locator("#xy").boundingBox();
  await page.mouse.move(r.x + r.width * 0.5, r.y + 2);
  await page.mouse.down();
  await page.mouse.up();
  const frame = await page.evaluate(
    () => window.boomstep.engine.recordedFrames,
  );
  await page.waitForFunction(
    (f) => window.boomstep.engine.recordedFrames > f + 48000,
    frame,
  );
  const after = await page.evaluate(() => {
    const d = window.boomstep.engine.chunks
      .slice(-12)
      .flatMap((c) => Array.from(c[0]));
    return {
      rms: Math.sqrt(d.reduce((s, x) => s + x * x, 0) / d.length),
      peak: d.reduce((m, x) => Math.max(m, Math.abs(x)), 0),
    };
  });
  console.log("Recorded live drive", before, after);
  expect(after.rms).toBeGreaterThan(before * 1.1);
  expect(after.peak).toBeLessThan(0.95);
  await page.screenshot({
    path: "test-results/artifacts/hard-house-live-fx.png",
    fullPage: true,
  });
  await page.locator("#record").click();
  const bytes = await page
    .locator("#download")
    .evaluate(async (a) =>
      Array.from(new Uint8Array(await (await fetch(a.href)).arrayBuffer())),
    );
  await writeFile(
    "test-results/artifacts/hard-house-live-fx.wav",
    Buffer.from(bytes),
  );
});
test("eight-bar synthesized demo exports and filter, hall, pump are audible in signal metrics", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.goto("/");
  const report = await page.evaluate(async () => {
    const render = window.boomstep.renderDiagnostic;
    const base = await render(),
      a = base.getChannelData(0),
      out = [];
    for (const config of [{ x: 0 }, { x: 1 }, { reverb: 0.8 }, { pump: 0 }]) {
      const b = await render(config),
        d = b.getChannelData(0);
      let error = 0;
      for (let i = 0; i < d.length; i++) error += (d[i] - a[i]) ** 2;
      out.push({ config, difference: Math.sqrt(error / d.length) });
    }
    return out;
  });
  console.log("Additional FX signal verification", report);
  for (const r of report) expect(r.difference).toBeGreaterThan(0.002);
  for (let pack = 0; pack < 3; pack++) {
    const demo = await page.evaluate(async (p) => {
      const buffer = await window.boomstep.renderDiagnostic({
        pack: p,
        variant: p === 2 ? 3 : 0,
        seconds: 14,
        bars: 8,
      });
      return {
        left: Array.from(buffer.getChannelData(0)),
        right: Array.from(buffer.getChannelData(1)),
        rate: buffer.sampleRate,
      };
    }, pack);
    await writeFile(
      `test-results/artifacts/hard-house-demo-${pack + 1}.wav`,
      Buffer.from(
        encodeWav(
          [[Float32Array.from(demo.left), Float32Array.from(demo.right)]],
          demo.rate,
        ),
      ),
    );
  }
});
