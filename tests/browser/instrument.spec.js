import { mkdir } from "node:fs/promises";
import { test, expect } from "@playwright/test";
const out = "test-results/gui-artifacts";
test.beforeEach(async () => mkdir(out, { recursive: true }));
const center = (b) => ({ x: b.x + b.width / 2, y: b.y + b.height / 2 });
async function move(page, selector) {
  await page
    .locator(selector)
    .evaluate((el) =>
      (el.closest(".specials") || el.closest(".track") || el).scrollIntoView({
        block: "center",
      }),
    );
  const p = center(await page.locator(selector).boundingBox());
  await page.mouse.move(p.x, p.y);
  return p;
}
test("ribbon drag previews only, release commits a phase-preserving next-bar switch, cancel preserves old pending", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#play").click();
  await page.waitForFunction(() => window.boomstep.engine.clock.step > 1);
  await move(page, '[data-track="1"][data-variant="0"]');
  await page.mouse.down();
  await move(page, '[data-track="1"][data-variant="3"]');
  await expect(page.locator('[data-track="1"][data-variant="3"]')).toHaveClass(
    /scrub-preview/,
  );
  expect(
    await page.evaluate(() => window.boomstep.engine.clock.pending.size),
  ).toBe(0);
  await page.mouse.up();
  expect(
    await page.evaluate(
      () => window.boomstep.engine.clock.pending.get(1)?.variant,
    ),
  ).toBe(3);
  const pending = await page.evaluate(() =>
    JSON.stringify(window.boomstep.engine.clock.pending.get(1)),
  );
  await move(page, '[data-track="1"][data-variant="2"]');
  await page.mouse.down();
  await page
    .locator('[data-ribbon="1"]')
    .dispatchEvent("pointercancel", { pointerId: 1 });
  await page.mouse.up();
  expect(
    await page.evaluate(() =>
      JSON.stringify(window.boomstep.engine.clock.pending.get(1)),
    ),
  ).toBe(pending);
  await page.waitForFunction(() => window.boomstep.engine.clock.step > 17);
  await expect(page.locator('[data-track="1"][data-variant="3"]')).toHaveClass(
    /active/,
  );
  expect(
    await page.evaluate(() => window.boomstep.engine.clock.step),
  ).toBeGreaterThan(16);
});
test("ribbon keyboard is discrete and accessible; lost capture discards a preview", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator('[data-track="0"][data-variant="0"]').focus();
  await page.keyboard.press("ArrowRight");
  expect(
    await page.evaluate(() => window.boomstep.session.tracks[0].variant),
  ).toBe(1);
  await page.keyboard.press("End");
  expect(
    await page.evaluate(() => window.boomstep.session.tracks[0].variant),
  ).toBe(3);
  await move(page, '[data-track="0"][data-variant="1"]');
  await page.mouse.down();
  await page
    .locator('[data-ribbon="0"]')
    .dispatchEvent("lostpointercapture", { pointerId: 1 });
  await page.mouse.up();
  expect(
    await page.evaluate(() => window.boomstep.session.tracks[0].variant),
  ).toBe(3);
  await expect(page.locator(".scrub-preview")).toHaveCount(0);
});
test("strum triggers once per boundary, re-entry retriggers, hold/cancel never auto-repeat or start loop", async ({
  page,
}) => {
  await page.goto("/");
  await move(page, '[data-special="bark"]');
  await page.mouse.down();
  await move(page, '[data-special="bass"]');
  await move(page, '[data-special="fill"]');
  await move(page, '[data-special="bass"]');
  await expect
    .poll(() => page.evaluate(() => window.boomstep.engine.specialTriggerCount))
    .toBe(4);
  await page.waitForTimeout(250);
  expect(
    await page.evaluate(() => window.boomstep.engine.specialTriggerCount),
  ).toBe(4);
  await page
    .locator("#special-board")
    .dispatchEvent("pointercancel", { pointerId: 1 });
  await move(page, '[data-special="bark"]');
  await page.mouse.up();
  expect(
    await page.evaluate(() => ({
      count: window.boomstep.engine.specialTriggerCount,
      running: window.boomstep.engine.running,
      step: window.boomstep.engine.clock.step,
    })),
  ).toEqual({ count: 4, running: false, step: 0 });
  await page.waitForFunction(
    () => window.boomstep.engine.specialGroups.length === 0,
  );
});
test("two simultaneous touch fingers have independent strum histories", async ({
  page,
  context,
}) => {
  await page.goto("/");
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setTouchEmulationEnabled", {
    enabled: true,
    maxTouchPoints: 5,
  });
  await page.locator("#special-board").scrollIntoViewIfNeeded();
  const coords = [];
  for (const id of ["bark", "bass", "fill"])
    coords.push(
      center(await page.locator(`[data-special="${id}"]`).boundingBox()),
    );
  const touches = (a, b) => [
    { id: 1, ...a },
    { id: 2, ...b },
  ];
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: touches(coords[0], coords[2]),
  });
  await expect
    .poll(() => page.evaluate(() => window.boomstep.engine.specialTriggerCount))
    .toBe(2);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: touches(coords[1], coords[2]),
  });
  await expect
    .poll(() => page.evaluate(() => window.boomstep.engine.specialTriggerCount))
    .toBe(3);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await page.waitForTimeout(150);
  expect(
    await page.evaluate(() => window.boomstep.engine.specialTriggerCount),
  ).toBe(3);
});
test("orbit and pending marker follow actual shared clock and freeze on pause", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#play").click();
  await page.waitForFunction(() => window.boomstep.engine.clock.step > 1);
  await page.locator('[data-track="2"][data-variant="2"]').click();
  expect(await page.locator("#orbit-pending circle").count()).toBe(1);
  await expect(page.locator("#orbit")).toHaveAttribute(
    "aria-label",
    /vorgemerkte Wechsel an Takt 2/,
  );
  const x = await page.locator("#orbit-head").getAttribute("cx");
  await page.waitForTimeout(200);
  expect(await page.locator("#orbit-head").getAttribute("cx")).not.toBe(x);
  await page.locator("#play").click();
  await page.waitForTimeout(100);
  const frozen = await page.locator("#orbit-head").getAttribute("cx");
  await page.waitForTimeout(200);
  expect(await page.locator("#orbit-head").getAttribute("cx")).toBe(frozen);
});
test("new strum gestures and held FX really reach post-master stereo WAV", async ({
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
  await page.locator("#hold").click();
  await page.locator('[data-fx="drive"]').click();
  await page.locator("#xy").scrollIntoViewIfNeeded();
  const xy = await page.locator("#xy").boundingBox();
  await page.mouse.click(xy.x + xy.width * 0.5, xy.y + xy.height * 0.2);
  for (const [i, id] of [
    "bark",
    "bass",
    "fill",
    "laser",
    "impact",
    "rise",
  ].entries()) {
    await move(page, `[data-special="${id}"]`);
    if (i === 0) await page.mouse.down();
  }
  await page.mouse.up();
  await expect
    .poll(() => page.evaluate(() => window.boomstep.engine.specialTriggerCount))
    .toBe(6);
  await page.waitForTimeout(1500);
  await page.locator("#record").click();
  await expect(page.locator("#download")).toBeVisible();
  const m = await page.locator("#download").evaluate(async (a) => {
    const v = new DataView(await (await fetch(a.href)).arrayBuffer());
    let power = 0,
      peak = 0;
    for (let i = 44; i < v.byteLength; i += 2) {
      const x = v.getInt16(i, true) / 32768;
      power += x * x;
      peak = Math.max(peak, Math.abs(x));
    }
    return {
      rms: Math.sqrt(power / ((v.byteLength - 44) / 2)),
      peak,
      channels: v.getUint16(22, true),
    };
  });
  console.log("Real strum recording", m);
  expect(m.channels).toBe(2);
  expect(m.rms).toBeGreaterThan(0.001);
  expect(m.peak).toBeLessThan(0.95);
  await page.screenshot({
    path: `${out}/orbit-recording-fx.png`,
    fullPage: true,
  });
  const [d] = await Promise.all([
    page.waitForEvent("download"),
    page.locator("#download").click(),
  ]);
  await d.saveAs(`${out}/orbit-strum-live.wav`);
});
test("orbit deck layout preserves all direct controls, primary targets and no overflow", async ({
  page,
}) => {
  for (const [width, height] of [
    [390, 844],
    [390, 700],
    [320, 568],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    expect(await page.locator("dialog").count()).toBe(0);
    expect(await page.locator("input[data-key]").count()).toBe(17);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const box = await page.locator("#performance").boundingBox();
    console.log("Orbit layout", width, height, box);
    expect(box.y + box.height).toBeGreaterThan(height);
    const bad = await page
      .locator(
        ".pattern,.mute,.solo,.special-pad,.fx-pads button,.transport button,input[data-key],#xy",
      )
      .evaluateAll((es) =>
        es
          .filter((e) => {
            const b = e.getBoundingClientRect();
            return (
              b.width < 44 ||
              b.height < 44 ||
              b.left < 0 ||
              b.right > innerWidth
            );
          })
          .map((e) => e.outerHTML),
      );
    expect(bad).toEqual([]);
    await page.screenshot({
      path: `${out}/orbit-${width}x${height}.png`,
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.locator("#play").click();
  await page.locator('[data-track="1"][data-variant="3"]').click();
  await page.locator("#hold").click();
  await page.locator('[data-fx="flanger"]').click();
  await page.locator("#xy").scrollIntoViewIfNeeded();
  const xy = await page.locator("#xy").boundingBox();
  await page.mouse.click(xy.x + xy.width * 0.6, xy.y + xy.height * 0.3);
  await page.screenshot({
    path: `${out}/orbit-playing-pending-fx.png`,
    fullPage: true,
  });
});
test("reduced motion shows true bar changes without a continuously moving head", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".pattern.active .pattern-cue")).toHaveText([
    "Auswahl",
    "Auswahl",
    "Auswahl",
    "Auswahl",
  ]);
  const idleMutations = await page.evaluate(
    () =>
      new Promise((resolve) => {
        let n = 0;
        const o = new MutationObserver((m) => (n += m.length));
        o.observe(document.querySelector("#performance"), {
          attributes: true,
          childList: true,
          subtree: true,
        });
        setTimeout(() => {
          o.disconnect();
          resolve(n);
        }, 250);
      }),
  );
  expect(idleMutations).toBe(0);
  await page.locator("#play").click();
  await page.waitForFunction(() => window.boomstep.engine.clock.step > 1);
  await expect(page.locator("#orbit")).toHaveAttribute("data-motion", "bar");
  const p = await page.locator("#orbit-head").getAttribute("cx");
  await page.waitForTimeout(200);
  expect(await page.locator("#orbit-head").getAttribute("cx")).toBe(p);
});
test("two touch fingers can independently preview and commit different pattern lanes", async ({
  page,
  context,
}) => {
  await page.goto("/");
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setTouchEmulationEnabled", {
    enabled: true,
    maxTouchPoints: 5,
  });
  const p = async (t, v) =>
    center(
      await page
        .locator(`[data-track="${t}"][data-variant="${v}"]`)
        .boundingBox(),
    );
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { id: 1, ...(await p(0, 0)) },
      { id: 2, ...(await p(1, 0)) },
    ],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [
      { id: 1, ...(await p(0, 2)) },
      { id: 2, ...(await p(1, 3)) },
    ],
  });
  expect(await page.locator(".scrub-preview").count()).toBe(2);
  expect(
    await page.evaluate(() =>
      window.boomstep.session.tracks.slice(0, 2).map((t) => t.variant),
    ),
  ).toEqual([0, 0]);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  expect(
    await page.evaluate(() =>
      window.boomstep.session.tracks.slice(0, 2).map((t) => t.variant),
    ),
  ).toEqual([2, 3]);
  expect(await page.evaluate(() => window.boomstep.engine.running)).toBe(false);
});
