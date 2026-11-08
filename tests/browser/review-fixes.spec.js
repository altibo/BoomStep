import { mkdir } from "node:fs/promises";
import { test, expect } from "@playwright/test";
const out = "test-results/readable-artifacts";
test.beforeEach(async () => mkdir(out, { recursive: true }));
async function dragStart(page, variant = 1) {
  const band = page.locator('[data-ribbon="1"]');
  await band.scrollIntoViewIfNeeded();
  const r = await band.boundingBox();
  await page.mouse.move(
    r.x + (r.width * (variant + 0.5)) / 4,
    r.y + r.height / 2,
  );
  await page.mouse.down();
  return r;
}
test("intentional upper/lower drag cancel preserves pending, margin tolerates jitter, re-entry commits", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#play").click();
  await page.waitForFunction(() => window.boomstep.engine.clock.step > 1);
  await page.locator("#play").click();
  await page.locator('[data-track="1"][data-variant="3"]').click();
  const original = await page.evaluate(() =>
    JSON.stringify(window.boomstep.engine.clock.pending.get(1)),
  );
  for (const direction of [-1, 1]) {
    const r = await dragStart(page);
    const edge = direction < 0 ? r.y : r.y + r.height;
    await page.mouse.move(r.x + r.width * 0.4, edge + direction * 18);
    await expect(page.locator('[data-ribbon="1"]')).toHaveAttribute(
      "data-gesture",
      "choose",
    );
    await page.mouse.move(r.x + r.width * 0.4, edge + direction * 30);
    await expect(page.locator('[data-ribbon="1"]')).toHaveAttribute(
      "data-gesture",
      "cancel",
    );
    await expect(page.locator("#interaction-status")).toContainText(
      "Abbrechen",
    );
    if (direction === -1)
      await page.screenshot({
        path: `${out}/readable-cancel.png`,
        fullPage: true,
      });
    await page.mouse.up();
    expect(
      await page.evaluate(() =>
        JSON.stringify(window.boomstep.engine.clock.pending.get(1)),
      ),
    ).toBe(original);
  }
  const r = await dragStart(page);
  await page.mouse.move(r.x + r.width * 0.6, r.y - 30);
  await expect(page.locator('[data-ribbon="1"]')).toHaveAttribute(
    "data-gesture",
    "cancel",
  );
  await page.mouse.move(r.x + r.width * 0.65, r.y + r.height / 2);
  await expect(page.locator('[data-ribbon="1"]')).toHaveAttribute(
    "data-gesture",
    "choose",
  );
  await page.mouse.up();
  expect(
    await page.evaluate(
      () => window.boomstep.engine.clock.pending.get(1)?.variant,
    ),
  ).toBe(2);
  await expect(page.locator("#pending-1")).toHaveText(/3 ab Takt \d/);
});
test("Escape cancels only ribbon selection even when XY owns keyboard focus, without resetting mix", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#xy").focus();
  const before = await page.evaluate(() =>
    JSON.stringify(window.boomstep.session),
  );
  await dragStart(page, 2);
  await page.keyboard.press("Escape");
  await page.mouse.up();
  expect(
    await page.evaluate(() => JSON.stringify(window.boomstep.session)),
  ).toBe(before);
  await expect(page.locator('[data-ribbon="1"]')).toHaveAttribute(
    "data-gesture",
    "idle",
  );
  await expect(page.locator(".scrub-preview")).toHaveCount(0);
});
test("readable labels, nonoverlapping outside XY axes, reserved pending amber, and honest mobile screenshots", async ({
  page,
}) => {
  for (const [width, height] of [
    [390, 844],
    [390, 700],
    [320, 568],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    const small = await page
      .locator(
        "#performance span,#performance small,#performance button,#performance strong,#performance h2,#performance text,.gesture-guide,.package-meta,.phrase-info,.xy-axis,.xy-depth,#xy-hint,#orbit-status,.reset-help",
      )
      .evaluateAll((es) =>
        es
          .filter(
            (e) =>
              e.getBoundingClientRect().width > 0 &&
              e.textContent.trim() &&
              parseFloat(getComputedStyle(e).fontSize) < 11,
          )
          .map((e) => ({
            text: e.textContent,
            font: getComputedStyle(e).fontSize,
          })),
      );
    expect(small).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const xy = await page.locator("#xy").boundingBox();
    for (const sel of [".xy-axis", ".xy-depth", "#xy-hint", "#xy-label"]) {
      const b = await page.locator(sel).boundingBox();
      expect(b.y + b.height <= xy.y || b.y >= xy.y + xy.height).toBe(true);
    }
    const clipped = await page
      .locator(
        ".mini span,.pattern-cue,.special-pad,.fx-pads button,#interaction-status,#orbit-status",
      )
      .evaluateAll((es) =>
        es
          .filter(
            (e) =>
              e.scrollWidth > e.clientWidth + 1 ||
              e.scrollHeight > e.clientHeight + 1,
          )
          .map((e) => ({
            text: e.textContent,
            w: e.clientWidth,
            sw: e.scrollWidth,
            h: e.clientHeight,
            sh: e.scrollHeight,
          })),
      );
    expect(clipped).toEqual([]);
    const box = await page.locator("#performance").boundingBox();
    console.log("Readable layout", width, height, box);
    if (width === 390 && height === 844)
      expect(box.y + box.height).toBeLessThanOrEqual(840);
    const physicalFont = await page
      .locator(".orbit-numbers text")
      .evaluateAll((es) =>
        es.map(
          (e) =>
            parseFloat(getComputedStyle(e).fontSize) *
            Math.abs(e.getScreenCTM().a),
        ),
      );
    expect(Math.min(...physicalFont)).toBeGreaterThanOrEqual(11);
    const labelsOutsideFields = await page
      .locator(".mini span")
      .evaluateAll((es) =>
        es
          .filter((e) => {
            const a = e.getBoundingClientRect(),
              b = e.closest(".mini").getBoundingClientRect();
            return a.left < b.left - 1 || a.right > b.right + 1;
          })
          .map((e) => e.textContent),
      );
    expect(labelsOutsideFields).toEqual([]);
    await page.screenshot({
      path: `${out}/readable-${width}x${height}.png`,
      fullPage: true,
    });
    await page.screenshot({ path: `${out}/viewport-${width}x${height}.png` });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.locator("#play").click();
  await page.locator('[data-mute="2"]').click();
  await page.locator('[data-solo="1"]').click();
  await page.locator("#hold").click();
  await page.locator('[data-fx="echo"]').click();
  await page.locator("#xy").scrollIntoViewIfNeeded();
  const r = await page.locator("#xy").boundingBox();
  await page.mouse.click(r.x + r.width * 0.65, r.y + r.height * 0.25);
  const colors = await page.evaluate(() => ({
    hold: getComputedStyle(document.querySelector("#hold")).borderTopColor,
    selected: getComputedStyle(document.querySelector('[data-fx="echo"]'))
      .borderTopColor,
    cyan: getComputedStyle(document.documentElement)
      .getPropertyValue("--cyan")
      .trim(),
  }));
  expect(colors.hold).toBe(colors.selected);
  expect(colors.hold).not.toBe("rgb(255, 188, 77)");
  await page.screenshot({
    path: `${out}/readable-hold-muted-solo.png`,
    fullPage: true,
  });
  await page.screenshot({ path: `${out}/viewport-hold-muted-solo.png` });
  await page.waitForFunction(
    () => window.boomstep.engine.clock.step % 16 === 2,
  );
  await page.locator('[data-track="1"][data-variant="3"]').click();
  await expect(page.locator("#pending-1")).toContainText("4 ab Takt");
  expect(
    await page
      .locator(".pattern.queued")
      .evaluate((e) => getComputedStyle(e).borderTopColor),
  ).toBe("rgb(255, 188, 77)");
  await page.screenshot({
    path: `${out}/readable-playing-pending.png`,
    fullPage: true,
  });
  await page.screenshot({ path: `${out}/viewport-playing-pending.png` });
  await expect(
    page.locator('[data-strip="0"][data-key="delay"]').locator(".."),
  ).toContainText("SPUR-ECHO");
  await expect(page.locator('[data-fx="echo"]')).toContainText("MASTER-ECHO");
  await expect(page.locator("#panic")).toHaveText("FX AUS");
  await page.locator("#panic").click();
  expect(
    await page.evaluate(() => ({
      drive: window.boomstep.session.drive,
      pump: window.boomstep.session.pump,
      reverb: window.boomstep.session.reverb,
      depth: window.boomstep.session.fx.depth,
      hold: window.boomstep.session.fx.hold,
      delays: window.boomstep.session.tracks.map((t) => t.delay),
    })),
  ).toEqual({
    drive: 0,
    pump: 0,
    reverb: 0,
    depth: 0,
    hold: false,
    delays: [0, 0, 0, 0],
  });
});

test("R3 all musical targets have real 44px bounds and fit above 840px on 390x844", async ({
  page,
}) => {
  await page.goto("/");
  const geometry = await page
    .locator(
      ".pattern,.mute,.solo,.special-pad,.fx-pads button,.transport button,input[data-key],#xy,#pack",
    )
    .evaluateAll((es) =>
      es.map((e) => {
        const b = e.getBoundingClientRect();
        return {
          target: e.id || e.getAttribute("aria-label") || e.textContent.trim(),
          x: b.x,
          y: b.y,
          width: b.width,
          height: b.height,
          right: b.right,
          bottom: b.bottom,
        };
      }),
    );
  console.log("R3 real musical bounds", JSON.stringify(geometry));
  for (const b of geometry) {
    expect(b.width).toBeGreaterThanOrEqual(44);
    expect(b.height).toBeGreaterThanOrEqual(44);
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.y).toBeGreaterThanOrEqual(0);
    expect(b.right).toBeLessThanOrEqual(390);
    expect(b.bottom).toBeLessThanOrEqual(840);
  }
  expect(await page.locator(".track-status").count()).toBe(0);
  expect(await page.locator(".master input").count()).toBe(4);
  expect(await page.locator("[data-key=specialLevel]").count()).toBe(1);
});

test("320px long cancel and recording status wrap without overflow or covering the specials", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/");
  await page.locator("#play").click();
  await page.locator("#play").click();
  const r = await dragStart(page);
  await page.mouse.move(r.x + r.width * 0.4, r.y - 30);
  await expect(page.locator("#interaction-status")).toContainText("Abbrechen");
  const measure = async () => {
    const m = await page.evaluate(() => {
      const e = document.querySelector("#interaction-status"),
        p = document.querySelector("#orbit-status"),
        a = e.getBoundingClientRect(),
        b = document.querySelector(".specials-caption").getBoundingClientRect();
      return {
        overflow: document.documentElement.scrollWidth > innerWidth,
        clipped:
          e.scrollHeight > e.clientHeight || p.scrollHeight > p.clientHeight,
        bottom: a.bottom,
        caption: b.top,
      };
    });
    expect(m.overflow).toBe(false);
    expect(m.clipped).toBe(false);
    expect(m.bottom).toBeLessThanOrEqual(m.caption);
  };
  await measure();
  await page.mouse.up();
  await page.locator("#record").click();
  await expect(page.locator("#orbit-status")).toContainText("REC");
  await measure();
  await page.locator("#record").click();
});
