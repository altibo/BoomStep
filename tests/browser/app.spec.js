import { mkdir, writeFile } from "node:fs/promises";
import { test, expect } from "@playwright/test";
test("mobile jam produces nonzero stereo WAV and preserves phase across pause", async ({
  page,
}) => {
  await mkdir("test-results/artifacts", { recursive: true });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.locator("h1")).toContainText("BoomStep");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  for (const locator of [".pattern", ".mute", ".solo", ".transport button"]) {
    const sizes = await page.locator(locator).evaluateAll((els) =>
      els.map((e) => ({
        w: e.getBoundingClientRect().width,
        h: e.getBoundingClientRect().height,
      })),
    );
    expect(sizes.every((s) => s.w >= 44 && s.h >= 44)).toBeTruthy();
  }
  await page.screenshot({
    path: "test-results/artifacts/hard-house-ready.png",
    fullPage: true,
  });
  await page.locator("#record").click();
  await expect(page.locator("#record")).toHaveClass(/recording/);
  await page.waitForTimeout(1100);
  await page.locator('[data-track="1"][data-variant="2"]').click();
  await expect(page.locator("#pending-1")).toContainText(" T");
  await page.screenshot({
    path: "test-results/artifacts/hard-house-playing.png",
    fullPage: true,
  });
  await page.locator('[data-mute="2"]').click();
  await expect(page.locator("#track-2")).toHaveClass(/muted/);
  await page.locator('[data-key="master"]').fill("0.62");
  await page.waitForTimeout(1600);
  await page.locator("#record").click();
  await expect(page.locator("#download")).toBeVisible();
  const wav = await page.locator("#download").evaluate(async (a) => {
    const b = await (await fetch(a.href)).arrayBuffer(),
      v = new DataView(b);
    let energy = 0;
    let stereoDifference = 0;
    for (let i = 44; i < b.byteLength; i += 2)
      energy += Math.abs(v.getInt16(i, true));
    for (let i = 44; i < b.byteLength; i += 4)
      stereoDifference += Math.abs(
        v.getInt16(i, true) - v.getInt16(i + 2, true),
      );
    return {
      stereoDifference,
      size: b.byteLength,
      rate: v.getUint32(24, true),
      channels: v.getUint16(22, true),
      energy,
    };
  });
  expect(wav.size).toBeGreaterThan(100000);
  expect(wav.channels).toBe(2);
  expect(wav.energy).toBeGreaterThan(10000);
  expect(wav.stereoDifference).toBeGreaterThan(0);
  const bytes = await page
    .locator("#download")
    .evaluate(async (a) =>
      Array.from(new Uint8Array(await (await fetch(a.href)).arrayBuffer())),
    );
  await writeFile(
    "test-results/artifacts/hard-house-performance.wav",
    Buffer.from(bytes),
  );
  console.log("Captured actual performance", wav);
  await page.locator("#play").click();
  const before = await page.evaluate(() => ({
    time: window.boomstep.engine.ctx.currentTime,
    step: window.boomstep.engine.clock.step,
  }));
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => ({
    time: window.boomstep.engine.ctx.currentTime,
    step: window.boomstep.engine.clock.step,
  }));
  expect(after).toEqual(before);
  await page.locator("#play").click();
  await page.waitForTimeout(450);
  expect(
    await page.evaluate(() => window.boomstep.engine.clock.step),
  ).toBeGreaterThan(before.step);
  await page.locator("#save").click();
  await page.locator("#stop").click();
  await page.locator("#load").click();
  expect(
    await page.evaluate(() => window.boomstep.session.tracks[2].mute),
  ).toBeTruthy();
  expect(await page.evaluate(() => window.boomstep.session.master)).toBe(0.62);
  await page.screenshot({
    path: "test-results/artifacts/hard-house.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
test("built app loads offline and every package starts", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  for (const p of ["1", "2", "3", "4", "5", "0"]) {
    await page.locator("#pack").selectOption(p);
    await page.locator("#play").click();
    await page.waitForTimeout(250);
    expect(await page.evaluate(() => window.boomstep.engine.ctx.state)).toBe(
      "running",
    );
    await page.locator("#stop").click();
  }
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator("h1")).toContainText("BoomStep");
  await page.locator("#play").click();
  await expect(page.locator("#play")).toContainText("PAUSE");
});

test("actual mixer mute/solo, filters, delay and master hall parameters update", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#play").click();

  await page.locator('[data-strip="1"][data-key="volume"]').fill("0.35");
  await page.locator('[data-strip="1"][data-key="filter"]').fill("0.4");
  await page.locator('[data-strip="1"][data-key="delay"]').fill("0.5");
  await page.locator('[data-solo="1"]').click();
  await page.waitForTimeout(250);
  const mix = await page.evaluate(() => ({
    gain: window.boomstep.engine.strips.map((s) => s.gain.gain.value),
    filter: window.boomstep.engine.strips[1].filter.frequency.value,
    delay: window.boomstep.engine.strips[1].send.gain.value,
  }));
  expect(mix.gain[0]).toBeLessThan(0.001);
  expect(mix.gain[1]).toBeCloseTo(0.35, 2);
  expect(mix.filter).toBeLessThan(2000);
  expect(mix.delay).toBeCloseTo(0.275, 2);
  await page.locator('[data-key="reverb"]').fill("0.5");
  await page.waitForTimeout(250);
  expect(
    await page.evaluate(() => window.boomstep.engine.wet.gain.value),
  ).toBeCloseTo(0.325, 2);
});

test("narrow phone controls remain touch-safe without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  for (const selector of [".pattern", ".mute", ".solo", ".transport button"])
    expect(
      await page
        .locator(selector)
        .evaluateAll((es) =>
          es.every(
            (e) =>
              e.getBoundingClientRect().width >= 44 &&
              e.getBoundingClientRect().height >= 44,
          ),
        ),
    ).toBeTruthy();
});

test("captured PCM responds to muting the whole performance, not just UI state", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    window.boomstep.session.reverb = 0;
    window.boomstep.session.tracks.forEach((t) => (t.delay = 0));
  });
  await page.locator("#record").click();
  await page.waitForFunction(
    () =>
      window.boomstep.engine.recordedFrames >
      window.boomstep.engine.ctx.sampleRate,
  );
  const before = await page.evaluate(() => {
    const samples = window.boomstep.engine.chunks.flatMap((c) =>
      Array.from(c[0]),
    );
    return samples.reduce((s, v) => s + v * v, 0) / samples.length;
  });
  for (let i = 0; i < 4; i++) await page.locator(`[data-mute="${i}"]`).click();
  const frame = await page.evaluate(
    () => window.boomstep.engine.recordedFrames,
  );
  await page.waitForFunction(
    (frame) =>
      window.boomstep.engine.recordedFrames >
      frame + window.boomstep.engine.ctx.sampleRate * 1.7,
    frame,
  );
  const after = await page.evaluate(() => {
    const samples = Array.from(window.boomstep.engine.chunks.at(-1)[0]);
    return samples.reduce((s, v) => s + v * v, 0) / samples.length;
  });
  expect(before).toBeGreaterThan(0.000001);
  expect(after).toBeLessThan(before * 0.01);
  await page.locator("#record").click();
  await expect(page.locator("#download")).toBeVisible();
});
