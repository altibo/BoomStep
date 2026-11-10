import { mkdir, readFile, stat } from "node:fs/promises";
import { test, expect } from "@playwright/test";
test.beforeEach(async () => {
  await mkdir("test-results/artifacts", { recursive: true });
});
const ids = ["bark", "bass", "fill", "rise", "impact", "laser"];
test("standalone pads unlock audio without starting the jam, retrigger every tap and clean every voice", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  expect(
    await page.evaluate(() =>
      window.boomstep.session.tracks.map((t) => t.song),
    ),
  ).toEqual([0, 0, 0, 0]);
  expect(await page.locator(".special-pad").count()).toBe(6);
  await page.locator('[data-special="bark"]').click();
  await expect(page.locator('[data-special="bark"]')).toHaveClass(/firing/);
  await page.waitForFunction(
    () => window.boomstep.engine.specialTriggerCount === 1,
  );
  expect(await page.evaluate(() => window.boomstep.engine.running)).toBe(false);
  expect(await page.evaluate(() => window.boomstep.engine.clock.step)).toBe(0);
  for (const id of ids) await page.locator(`[data-special="${id}"]`).click();
  await page.locator('[data-special="bark"]').focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("Space");
  await page.waitForFunction(
    () => window.boomstep.engine.specialTriggerCount === 9,
  );
  expect(
    await page.evaluate(() => window.boomstep.engine.specialGroups.length),
  ).toBeLessThanOrEqual(8);
  await page.waitForFunction(
    () => window.boomstep.engine.specialGroups.length === 0,
    { timeout: 10000 },
  );
  expect(await page.evaluate(() => window.boomstep.engine.sources.size)).toBe(
    0,
  );
  expect(await page.evaluate(() => window.boomstep.engine.clock.step)).toBe(0);
  expect(errors).toEqual([]);
});
test("specials do not replace patterns, move clock, or alter a pending loop switch", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#play").click();
  await page.locator('[data-track="1"][data-variant="2"]').click();
  const state = await page.evaluate(() => {
    const e = window.boomstep.engine,
      before = {
        step: e.clock.step,
        pending: JSON.stringify([...e.clock.pending]),
        tracks: JSON.stringify(e.session.tracks),
      };
    for (const id of ["bark", "bass", "fill", "rise", "impact", "laser"])
      e.scheduleSpecial(id, e.ctx.currentTime + 0.004);
    return {
      before,
      after: {
        step: e.clock.step,
        pending: JSON.stringify([...e.clock.pending]),
        tracks: JSON.stringify(e.session.tracks),
      },
      count: e.specialTriggerCount,
    };
  });
  expect(state.after).toEqual(state.before);
  expect(state.count).toBe(6);
});
test("paused transport stays frozen while specials play; resume retains the shared phase", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#play").click();
  await page.waitForFunction(() => window.boomstep.engine.clock.step > 4);
  await page.locator("#play").click();
  const frozen = await page.evaluate(() => ({
    step: window.boomstep.engine.clock.step,
    pos: window.boomstep.engine.position().step,
  }));
  await page.locator('[data-special="rise"]').click();
  await page.waitForFunction(
    () => window.boomstep.engine.specialTriggerCount === 1,
  );
  await page.waitForTimeout(250);
  expect(
    await page.evaluate(() => ({
      step: window.boomstep.engine.clock.step,
      pos: window.boomstep.engine.position().step,
    })),
  ).toEqual(frozen);
  expect(await page.evaluate(() => window.boomstep.engine.running)).toBe(false);
  expect(
    await page.evaluate(() => window.boomstep.engine.loopBus.gain.value),
  ).toBe(0);
  await page.locator("#play").click();
  await expect
    .poll(() => page.evaluate(() => window.boomstep.engine.clock.step))
    .toBeGreaterThan(frozen.step);
});
test("six distinct finite waveforms and overlapped specials have bounded nonempty PCM", async ({
  page,
}) => {
  await page.goto("/");
  const report = await page.evaluate(async () => {
    const render = window.boomstep.renderDiagnostic,
      metrics = (b) => {
        const d = b.getChannelData(0);
        let power = 0,
          peak = 0,
          edge = 0,
          tail = 0;
        for (let i = 0; i < d.length; i++) {
          power += d[i] * d[i];
          peak = Math.max(peak, Math.abs(d[i]));
          if (i) edge += (d[i] - d[i - 1]) ** 2;
          if (i > d.length - 10000) tail += d[i] * d[i];
        }
        return {
          rms: Math.sqrt(power / d.length),
          peak,
          edge: Math.sqrt(edge / d.length),
          tail: Math.sqrt(tail / 10000),
        };
      };
    const singles = [];
    for (const id of ["bark", "bass", "fill", "rise", "impact", "laser"])
      singles.push({
        id,
        ...metrics(
          await render({
            song: 6,
            onlySpecials: true,
            specials: [{ id, time: 0.1 }],
            seconds: 2.5,
          }),
        ),
      });
    const all = await render({
      song: 6,
      onlySpecials: true,
      specials: ["bark", "bass", "fill", "rise", "impact", "laser"].flatMap(
        (id) => [
          { id, time: 0.1 },
          { id, time: 0.15 },
        ],
      ),
      seconds: 2.5,
    });
    const dry = await render({
        song: 6,
        onlySpecials: true,
        specials: [{ id: "bass", time: 0.1 }],
        seconds: 2.5,
      }),
      wet = await render({
        song: 6,
        onlySpecials: true,
        specials: [{ id: "bass", time: 0.1 }],
        mode: "drive",
        depth: 1,
        seconds: 2.5,
      });
    let diff = 0;
    const a = dry.getChannelData(0),
      b = wet.getChannelData(0);
    for (let i = 0; i < a.length; i++) diff += (a[i] - b[i]) ** 2;
    return {
      singles,
      overlap: metrics(all),
      driveDifference: Math.sqrt(diff / a.length),
    };
  });
  console.log("Special signal verification", report);
  expect(
    new Set(
      report.singles.map((s) => `${s.rms.toFixed(6)}:${s.edge.toFixed(6)}`),
    ).size,
  ).toBe(6);
  for (const s of [...report.singles, report.overlap]) {
    expect(s.rms).toBeGreaterThan(0.00005);
    expect(s.peak).toBeLessThan(0.95);
    expect(s.tail).toBeLessThan(0.000001);
  }
  expect(report.driveDifference).toBeGreaterThan(0.002);
});
test("actual post-master WAV includes specials and drive even when all loop tracks are silent", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() =>
    window.boomstep.session.tracks.forEach((t) => (t.mute = true)),
  );
  await page.locator("#record").click();
  await page.waitForFunction(
    () => window.boomstep.engine.recordedFrames > 24000,
  );
  const silence = await page.evaluate(() => {
    const d = window.boomstep.engine.chunks.flatMap((c) => Array.from(c[0]));
    return Math.sqrt(d.reduce((s, x) => s + x * x, 0) / d.length);
  });
  expect(silence).toBeLessThan(0.000001);
  await page.locator("#hold").click();
  await page.locator('[data-fx="drive"]').click();
  await page.locator("#xy").scrollIntoViewIfNeeded();
  const xy = await page.locator("#xy").boundingBox();
  await page.mouse.move(xy.x + xy.width * 0.5, xy.y + xy.height * 0.2);
  await page.mouse.down();
  await page.mouse.up();
  for (const id of ids) await page.locator(`[data-special="${id}"]`).click();
  const frame = await page.evaluate(
    () => window.boomstep.engine.recordedFrames,
  );
  await page.waitForFunction(
    (f) => window.boomstep.engine.recordedFrames > f + 48000,
    frame,
  );
  await page.locator("#record").click();
  await expect(page.locator("#download")).toBeVisible();
  const m = await page.locator("#download").evaluate(async (a) => {
    const v = new DataView(await (await fetch(a.href)).arrayBuffer());
    let energy = 0,
      peak = 0;
    for (let i = 44; i < v.byteLength; i += 2) {
      const x = v.getInt16(i, true) / 32768;
      energy += x * x;
      peak = Math.max(peak, Math.abs(x));
    }
    return { rms: Math.sqrt(energy / ((v.byteLength - 44) / 2)), peak };
  });
  console.log("Recorded specials PCM", m);
  expect(m.rms).toBeGreaterThan(0.001);
  expect(m.peak).toBeLessThan(0.95);
  await page.screenshot({
    path: "test-results/artifacts/bounce-specials-recording.png",
    fullPage: true,
  });
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.locator("#download").click(),
  ]);
  await download.saveAs(
    "test-results/artifacts/bounce-specials-recorded-fx.wav",
  );
});
test("pads work from the offline PWA without starting its loop", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await page.locator('[data-special="laser"]').click();
  await page.waitForFunction(
    () => window.boomstep.engine.specialTriggerCount === 1,
  );
  expect(await page.evaluate(() => window.boomstep.engine.running)).toBe(false);
  expect(await page.evaluate(() => window.boomstep.engine.ctx.state)).toBe(
    "running",
  );
});
test("readable specials and controls fit 390x844; smaller viewports scroll honestly", async ({
  page,
}) => {
  for (const [width, height] of [
    [390, 844],
    [390, 700],
    [320, 568],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(await page.locator("dialog").count()).toBe(0);
    expect(await page.locator("input[data-key]").count()).toBe(17);
    const b = await page.locator("#performance").boundingBox();
    console.log("Specials layout", width, height, b);
    if (width === 390 && height === 844)
      expect(b.y + b.height).toBeLessThanOrEqual(840);
    else expect(b.y + b.height).toBeGreaterThan(height);
    for (const selector of [
      ".special-pad",
      ".variant-slider",
      ".song-step",
      ".mute",
      ".solo",
      ".transport button",
      ".fx-pads button",
    ])
      expect(
        await page
          .locator(selector)
          .evaluateAll(
            (es) =>
              es.length > 0 &&
              es.every(
                (e) =>
                  e.getBoundingClientRect().width >= 44 &&
                  e.getBoundingClientRect().height >= 44,
              ),
          ),
      ).toBe(true);
    await page.screenshot({
      path: `test-results/artifacts/bounce-specials-${width}x${height}.png`,
      fullPage: true,
    });
  }
});
test("35-second representative original jam with specials exports valid bounded stereo WAV", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.goto("/");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.evaluate(async () => {
      const ids = ["bark", "bass", "fill", "rise", "impact", "laser"],
        specials = Array.from({ length: 18 }, (_, i) => ({
          id: ids[i % ids.length],
          time: 1.4 + i * 1.8,
        }));
      const data = await window.boomstep.renderDiagnosticWav({
        song: 6,
        seconds: 35,
        specials,
        reverb: 0.14,
      });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([data], { type: "audio/wav" }));
      a.download = "Berlin-Bounce-Specials-35s.wav";
      a.click();
    }),
  ]);
  const path = "test-results/artifacts/bounce-specials-35s.wav";
  await download.saveAs(path);
  expect((await stat(path)).size).toBe(44 + 35 * 48000 * 4);
  const data = await readFile(path),
    v = new DataView(data.buffer, data.byteOffset, data.byteLength);
  expect(data.toString("ascii", 0, 4)).toBe("RIFF");
  expect(v.getUint16(22, true)).toBe(2);
  let peak = 0,
    power = 0;
  for (let i = 44; i < v.byteLength; i += 2) {
    const n = v.getInt16(i, true) / 32768;
    peak = Math.max(peak, Math.abs(n));
    power += n * n;
  }
  console.log("35s original demo", {
    peak,
    rms: Math.sqrt(power / (35 * 48000 * 2)),
  });
  expect(peak).toBeLessThan(0.95);
  expect(power).toBeGreaterThan(100);
});

test("rapid live retriggers always sound a new group while gracefully limiting polyphony to eight", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator('[data-special="rise"]').click();
  await page.waitForFunction(
    () => window.boomstep.engine.specialTriggerCount === 1,
  );
  const m = await page.evaluate(() => {
    const e = window.boomstep.engine;
    for (let i = 0; i < 24; i++)
      e.scheduleSpecial("rise", e.ctx.currentTime + 0.004);
    return { count: e.specialTriggerCount, groups: e.specialGroups.length };
  });
  expect(m).toEqual({ count: 25, groups: 8 });
  await page.waitForFunction(
    () => window.boomstep.engine.specialGroups.length === 0,
  );
  expect(await page.evaluate(() => window.boomstep.engine.sources.size)).toBe(
    0,
  );
});
