import { test, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const out = "test-results/intensity-artifacts";
test.beforeEach(async () => mkdir(out, { recursive: true }));
test("large macro stays direct and readable at 0/50/100 without adding viewport height", async ({
  page,
}) => {
  for (const [width, height] of [
    [390, 844],
    [390, 700],
    [320, 568],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    for (const value of [0, 50, 100]) {
      await page.locator("#intensity").fill(String(value));
      const m = await page.evaluate(() => ({
        bottom:
          document.querySelector("#performance").getBoundingClientRect()
            .bottom + scrollY,
        overflow: document.documentElement.scrollWidth > innerWidth,
        clipped: [
          ...document.querySelectorAll(
            ".intensity-control>span,.intensity-control output",
          ),
        ].some(
          (e) =>
            e.scrollWidth > e.clientWidth || e.scrollHeight > e.clientHeight,
        ),
        targets: [
          ...document.querySelectorAll(
            ".pattern,.mute,.solo,.special-pad,.fx-pads button,.transport button,input[data-key],#xy,#pack,#intensity,#light-mode",
          ),
        ].map((e) => {
          const b = e.getBoundingClientRect();
          return {
            id: e.id || e.textContent.trim(),
            x: b.x,
            y: b.y,
            w: b.width,
            h: b.height,
            bottom: b.bottom,
          };
        }),
      }));
      expect(m.overflow).toBe(false);
      expect(m.clipped).toBe(false);
      expect(m.targets).toHaveLength(61);
      expect(m.bottom).toBe(width === 390 ? 822 : 936);
      for (const b of m.targets) {
        expect(b.w).toBeGreaterThanOrEqual(44);
        expect(b.h).toBeGreaterThanOrEqual(44);
        if (height === 844) expect(b.bottom).toBeLessThanOrEqual(844);
      }
      await page.screenshot({
        path: `${out}/viewport-${width}x${height}-${value}.png`,
      });
      if (height === 844 && value === 100)
        await page.screenshot({
          path: `${out}/fullpage-390x844-100.png`,
          fullPage: true,
        });
      await writeFile(
        `${out}/bounds-${width}-${value}.json`,
        JSON.stringify(m, null, 2),
      );
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const macro = page.locator("#intensity");
  await macro.press("End");
  await expect(macro).toHaveValue("100");
  await macro.press("Home");
  await expect(macro).toHaveValue("0");
  const target = await macro.boundingBox();
  await page.mouse.click(
    target.x + target.width * 0.75,
    target.y + target.height / 2,
  );
  expect(Number(await macro.inputValue())).toBeGreaterThan(70);
  expect(Number(await macro.inputValue())).toBeLessThan(85);
  expect(await page.evaluate(() => window.boomstep.engine.running)).toBe(false);
  await macro.fill("50");
  await page.locator("#play").click();
  await page.screenshot({ path: `${out}/playing-50.png` });
  await page.locator('[data-track="0"][data-variant="2"]').click();
  await expect(page.locator('[data-track="0"][data-variant="2"]')).toHaveClass(
    /queued/,
  );
  await page.screenshot({ path: `${out}/playing-pending-50.png` });
});
test("macro preserves manual mix/solo/pending and session baseline; FX AUS also resets macro", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#play").click();
  await page.waitForFunction(() => window.boomstep.engine.clock.step > 1);
  await page.locator("#play").click();
  await page.locator('[data-solo="1"]').click();
  await page.locator('[data-mute="2"]').click();
  await page.locator('[data-key="drive"]').fill("0.12");
  await page.locator('[data-key="pump"]').fill("0.31");
  await page.locator('[data-track="1"][data-variant="3"]').click();
  const before = await page.evaluate(() => ({
    tracks: structuredClone(window.boomstep.session.tracks),
    drive: window.boomstep.session.drive,
    pump: window.boomstep.session.pump,
    step: window.boomstep.engine.clock.step,
    pending: [...window.boomstep.engine.clock.pending],
  }));
  await page.locator("#intensity").fill("100");
  expect(
    await page.evaluate(() => ({
      tracks: structuredClone(window.boomstep.session.tracks),
      drive: window.boomstep.session.drive,
      pump: window.boomstep.session.pump,
      step: window.boomstep.engine.clock.step,
      pending: [...window.boomstep.engine.clock.pending],
    })),
  ).toEqual(before);
  await page.screenshot({ path: `${out}/solo-pending-100.png` });
  await page.locator("#light-mode").click();
  await page.locator("#save").click();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("boomstep-session")),
  );
  expect(saved.intensity).toBe(1);
  expect(saved.beatLights).toBe(false);
  await page.locator("#panic").click();
  expect(await page.evaluate(() => window.boomstep.session.intensity)).toBe(0);
  await expect(page.locator("#intensity")).toHaveValue("0");
  expect(
    await page.evaluate(() =>
      window.boomstep.session.tracks.map((t) => ({
        volume: t.volume,
        mute: t.mute,
        solo: t.solo,
        variant: t.variant,
      })),
    ),
  ).toEqual(
    before.tracks.map((t) => ({
      volume: t.volume,
      mute: t.mute,
      solo: t.solo,
      variant: t.variant,
    })),
  );
  await page.reload();
  await expect(page.locator("#light-mode span")).toHaveText("RUHIG");
  await page.locator("#load").click();
  await expect(page.locator("#intensity")).toHaveValue("100");
});
test("audio-time lights stop on pause, quiet and reduced-motion; no idle timer or transient pad blink", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#intensity").fill("100");
  await page.locator("#play").click();
  const pulses = [];
  for (let i = 0; i < 5; i++) {
    await page.waitForTimeout(80);
    pulses.push(
      await page.locator("#performance").getAttribute("data-light-pulse"),
    );
  }
  expect(new Set(pulses).size).toBeGreaterThan(1);
  expect(
    Number(await page.locator("#performance").getAttribute("data-light-hz")),
  ).toBeLessThanOrEqual(3);
  await page.locator("#play").click();
  await expect(page.locator("#performance")).toHaveAttribute(
    "data-light-pulse",
    "0",
  );
  const glow = await page.evaluate(() =>
    document.documentElement.style.getPropertyValue("--light-glow"),
  );
  await page.waitForTimeout(250);
  expect(
    await page.evaluate(() =>
      document.documentElement.style.getPropertyValue("--light-glow"),
    ),
  ).toBe(glow);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.locator("#play").click();
  await expect(page.locator("#light-mode span")).toHaveText("RUHIG");
  await expect(page.locator("#performance")).toHaveAttribute(
    "data-light-pulse",
    "0",
  );
  const pad = page.locator('[data-special="laser"]'),
    bg = await pad.evaluate((e) => getComputedStyle(e).backgroundColor);
  await pad.click();
  expect(await pad.evaluate((e) => getComputedStyle(e).backgroundColor)).toBe(
    bg,
  );
  await page.screenshot({ path: `${out}/reduced-motion-100.png` });
  await page.locator("#stop").click();
  await page.waitForTimeout(700);
  const n = await page.evaluate(
    () =>
      new Promise((resolve) => {
        let n = 0;
        const o = new MutationObserver((m) => (n += m.length));
        o.observe(document.querySelector("#performance"), {
          subtree: true,
          attributes: true,
          childList: true,
        });
        setTimeout(() => {
          o.disconnect();
          resolve(n);
        }, 250);
      }),
  );
  expect(n).toBe(0);
});
test("0/50/100 alter spectral/wave shape beyond gain; max plus six specials is bounded; 24s sweep WAV", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const waves = [];
    const metrics = [];
    for (const intensity of [0, 0.5, 1]) {
      const b = await window.boomstep.renderDiagnostic({
        pack: 6,
        intensity,
        seconds: 2.6,
      });
      const x = b.getChannelData(0);
      waves.push(x);
      metrics.push({
        intensity,
        rms: Math.sqrt(x.reduce((s, v) => s + v * v, 0) / x.length),
        peak: x.reduce((m, v) => Math.max(m, Math.abs(v)), 0),
      });
    }
    const residual = (x, y) => {
      let xy = 0,
        xx = 0,
        yy = 0;
      for (let i = 0; i < x.length; i++) {
        xy += x[i] * y[i];
        xx += x[i] * x[i];
        yy += y[i] * y[i];
      }
      const gain = xy / xx;
      let e = 0;
      for (let i = 0; i < x.length; i++) e += (y[i] - gain * x[i]) ** 2;
      return Math.sqrt(e / yy);
    };
    const stress = await window.boomstep.renderDiagnostic({
      pack: 6,
      intensity: 1,
      mode: "drive",
      depth: 1,
      seconds: 3,
      specials: ["bark", "bass", "fill", "rise", "impact", "laser"].map(
        (id) => ({ id, time: 0.5 }),
      ),
    });
    return {
      metrics,
      residuals: [residual(waves[0], waves[1]), residual(waves[1], waves[2])],
      stressPeak: stress
        .getChannelData(0)
        .reduce((m, v) => Math.max(m, Math.abs(v)), 0),
    };
  });
  for (const m of result.metrics) {
    expect(m.rms).toBeGreaterThan(0.01);
    expect(m.peak).toBeLessThan(0.95);
  }
  for (const d of result.residuals) expect(d).toBeGreaterThan(0.05);
  expect(result.stressPeak).toBeLessThan(0.95);
  await writeFile(
    `${out}/signal-metrics.json`,
    JSON.stringify(result, null, 2),
  );
  const bytes = await page.evaluate(async () =>
    Array.from(
      new Uint8Array(
        await window.boomstep.renderDiagnosticWav({
          pack: 6,
          seconds: 24,
          intensitySweep: [
            { time: 0, value: 0 },
            { time: 7, value: 0.5 },
            { time: 14, value: 1 },
            { time: 21, value: 0 },
          ],
          specials: ["bark", "bass", "fill", "rise", "impact", "laser"].map(
            (id, i) => ({ id, time: 2 + 3 * i }),
          ),
        }),
      ),
    ),
  );
  await writeFile(`${out}/krassheit-24s-sweep.wav`, Buffer.from(bytes));
  expect(bytes.length).toBeGreaterThan(4000000);
});
test("live macro movement is captured in actual post-master stereo WAV", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#record").click();
  await page.waitForFunction(
    () =>
      window.boomstep.engine.recordedFrames >
      window.boomstep.engine.ctx.sampleRate * 0.7,
  );
  const dry = await page.evaluate(
    () => window.boomstep.engine.driveWet.gain.value,
  );
  await page.locator("#intensity").fill("100");
  await expect
    .poll(() => page.evaluate(() => window.boomstep.engine.driveWet.gain.value))
    .toBeGreaterThan(dry + 0.2);
  await page.waitForFunction(
    () =>
      window.boomstep.engine.recordedFrames >
      window.boomstep.engine.ctx.sampleRate * 1.8,
  );
  await page.locator('[data-special="impact"]').click();
  await page.locator("#intensity").fill("0");
  await page.waitForFunction(
    () =>
      window.boomstep.engine.recordedFrames >
      window.boomstep.engine.ctx.sampleRate * 2.4,
  );
  await page.locator("#record").click();
  await expect(page.locator("#download")).toBeVisible();
  const bytes = await page.evaluate(async () =>
    Array.from(
      new Uint8Array(
        await (
          await fetch(document.querySelector("#download").href)
        ).arrayBuffer(),
      ),
    ),
  );
  const b = Buffer.from(bytes);
  expect(b.readUInt16LE(22)).toBe(2);
  let peak = 0;
  for (let i = 44; i < b.length; i += 2)
    peak = Math.max(peak, Math.abs(b.readInt16LE(i)) / 32768);
  expect(peak).toBeGreaterThan(0.05);
  expect(peak).toBeLessThan(0.95);
  await writeFile(`${out}/krassheit-live-recording.wav`, b);
});
