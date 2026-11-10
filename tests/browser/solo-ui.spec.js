import { mkdir, writeFile } from "node:fs/promises";
import { test, expect } from "@playwright/test";
const out = "test-results/solo-review-artifacts";
test.beforeEach(async () => mkdir(out, { recursive: true }));

test("effective Solo UI matches mixer: one/multiple solos, mute priority and toggling off", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#play").click();
  const evidence = [];
  async function check(stage, labels, mutes) {
    for (let i = 0; i < 4; i++) {
      const silent = labels[i] !== "Spielt",
        card = page.locator(`#track-${i}`);
      await expect(card).toHaveAttribute("data-mix-audible", String(!silent));
      await expect(card).toHaveAttribute(
        "data-silence-reason",
        labels[i] === "Stumm" ? "mute" : silent ? "solo" : "",
      );
      await expect(card.locator(".song-cue")).toHaveText(labels[i]);
      await expect(page.locator(`[data-mute="${i}"]`)).toHaveAttribute(
        "aria-pressed",
        String(mutes[i]),
      );
      expect(
        await card.evaluate((e) => e.classList.contains("inaudible")),
      ).toBe(silent);
      expect(await card.evaluate((e) => e.classList.contains("muted"))).toBe(
        mutes[i],
      );
      if (silent)
        expect(await card.locator(".song-cue").allTextContents()).not.toContain(
          "Spielt",
        );
      if (silent)
        await expect
          .poll(() =>
            page.evaluate(
              (i) => window.boomstep.engine.strips[i].gain.gain.value,
              i,
            ),
          )
          .toBeLessThan(0.001);
      else
        await expect
          .poll(() =>
            page.evaluate(
              (i) => window.boomstep.engine.strips[i].gain.gain.value,
              i,
            ),
          )
          .toBeGreaterThan(0.01);
    }
    const s = await page.evaluate(() => ({
      tracks: window.boomstep.session.tracks.map((t) => ({
        mute: t.mute,
        solo: t.solo,
        variant: t.variant,
      })),
      ui: [...document.querySelectorAll(".track")].map((e) => ({
        mixAudible: e.dataset.mixAudible,
        silenceReason: e.dataset.silenceReason,
        active: e.querySelector(".stop.active").dataset.variant,
        label: e.querySelector(".song-cue").textContent,
        background: getComputedStyle(e).backgroundColor,
      })),
      gain: window.boomstep.engine.strips.map((s) => s.gain.gain.value),
    }));
    expect(s.tracks.map((t) => t.mute)).toEqual(mutes);
    expect(s.tracks.map((t) => t.variant)).toEqual([0, 0, 0, 0]);
    evidence.push({ stage, ...s });
  }
  const noMute = [false, false, false, false];
  await check("initial", ["Spielt", "Spielt", "Spielt", "Spielt"], noMute);
  await page.locator('[data-solo="1"]').click();
  await check(
    "bass-only-solo",
    ["Solo-aus", "Spielt", "Solo-aus", "Solo-aus"],
    noMute,
  );
  await page.locator('[data-solo="0"]').click();
  await check(
    "drums-and-bass-solo",
    ["Spielt", "Spielt", "Solo-aus", "Solo-aus"],
    noMute,
  );
  await page.locator('[data-mute="0"]').click();
  await check(
    "mute-wins-over-solo",
    ["Stumm", "Spielt", "Solo-aus", "Solo-aus"],
    [true, false, false, false],
  );
  await page.screenshot({
    path: `${out}/viewport-mute-plus-multiple-solo.png`,
  });
  await page.locator('[data-mute="0"]').click();
  await check(
    "unmute-rejoins-solos",
    ["Spielt", "Spielt", "Solo-aus", "Solo-aus"],
    noMute,
  );
  await page.locator('[data-solo="1"]').click();
  await check(
    "one-solo-remains",
    ["Spielt", "Solo-aus", "Solo-aus", "Solo-aus"],
    noMute,
  );
  await page.locator('[data-solo="0"]').click();
  await check(
    "last-solo-off",
    ["Spielt", "Spielt", "Spielt", "Spielt"],
    noMute,
  );
  await page.locator('[data-mute="1"]').click();
  await check(
    "explicit-mute-only",
    ["Spielt", "Stumm", "Spielt", "Spielt"],
    [false, true, false, false],
  );
  await page.locator('[data-solo="1"]').click();
  await check(
    "muted-only-solo",
    ["Solo-aus", "Stumm", "Solo-aus", "Solo-aus"],
    [false, true, false, false],
  );
  await page.locator('[data-solo="1"]').click();
  await check(
    "solo-off-keeps-explicit-mute",
    ["Spielt", "Stumm", "Spielt", "Spielt"],
    [false, true, false, false],
  );
  await page.locator('[data-mute="1"]').click();
  await check("all-restored", ["Spielt", "Spielt", "Spielt", "Spielt"], noMute);
  await writeFile(
    `${out}/solo-state-evidence.json`,
    JSON.stringify(evidence, null, 2),
  );
});

test("solo exclusion preserves active position and pending amber through cancel; fresh HOLD/Solo screenshot", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#play").click();
  await page.locator('[data-solo="1"]').click();
  await page.locator("#hold").click();
  const xy = await page.locator("#xy").boundingBox();
  await page.mouse.click(xy.x + xy.width * 0.65, xy.y + xy.height * 0.25);
  await page.waitForFunction(
    () => window.boomstep.engine.clock.step % 16 === 2,
  );
  await page.locator('[data-track="0"][data-variant="3"]').click();
  await expect(page.locator("#track-0 .song-cue")).toHaveText("Solo-aus");
  await expect(page.locator("#track-1 .song-cue")).toHaveText("Spielt");
  await expect(page.locator('[data-mute="0"]')).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await expect(page.locator("#track-0 .stop.queued")).toHaveAttribute(
    "data-variant",
    "3",
  );
  expect(
    await page
      .locator("#track-0 .stop.queued")
      .evaluate((e) => getComputedStyle(e).borderTopColor),
  ).toBe("rgb(255, 188, 77)");
  await page.screenshot({ path: `${out}/viewport-hold-bass-solo-pending.png` });
  await page.screenshot({
    path: `${out}/fullpage-hold-bass-solo-pending.png`,
    fullPage: true,
  });
  await page.locator("#play").click();
  const before = await page.evaluate(() =>
    JSON.stringify({
      pending: [...window.boomstep.engine.clock.pending],
      variants: window.boomstep.engine.position().variants,
    }),
  );
  const band = await page.locator('[data-ribbon="0"]').boundingBox();
  await page.mouse.move(band.x + band.width * 0.4, band.y + 22);
  await page.mouse.down();
  await page.mouse.move(band.x + band.width * 0.4, band.y - 30);
  await expect(page.locator('[data-ribbon="0"]')).toHaveAttribute(
    "data-gesture",
    "cancel",
  );
  await expect(page.locator("#track-0 .stop.queued")).toHaveAttribute(
    "data-variant",
    "3",
  );
  await page.screenshot({
    path: `${out}/viewport-solo-cancel-existing-pending.png`,
  });
  await page.mouse.up();
  expect(
    await page.evaluate(() =>
      JSON.stringify({
        pending: [...window.boomstep.engine.clock.pending],
        variants: window.boomstep.engine.position().variants,
      }),
    ),
  ).toBe(before);
  await expect(page.locator("#track-0 .song-cue")).toHaveText("Solo-aus");
});

test("Solo-aus labels remain unclipped and layout unchanged at 390px and 320px", async ({
  page,
}) => {
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    await page.locator('[data-solo="1"]').click();
    const result = await page.evaluate(() => ({
      width: innerWidth,
      overflow: document.documentElement.scrollWidth > innerWidth,
      bottom:
        document.querySelector("#performance").getBoundingClientRect().bottom +
        scrollY,
      labels: [...document.querySelectorAll(".song-cue")].map((e) => ({
        text: e.textContent,
        clipped:
          e.scrollWidth > e.clientWidth || e.scrollHeight > e.clientHeight,
        font: parseFloat(getComputedStyle(e).fontSize),
      })),
    }));
    expect(result.overflow).toBe(false);
    expect(result.bottom).toBe(804);
    expect(result.labels.map((x) => x.text)).toEqual([
      "Solo-aus",
      "Auswahl",
      "Solo-aus",
      "Solo-aus",
    ]);
    for (const label of result.labels) {
      expect(label.clipped).toBe(false);
      expect(label.font).toBeGreaterThanOrEqual(11);
    }
    await writeFile(
      `${out}/layout-${width}.json`,
      JSON.stringify(result, null, 2),
    );
  }
});
