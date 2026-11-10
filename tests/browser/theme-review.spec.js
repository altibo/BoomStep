import { mkdir } from "node:fs/promises";
import { test, expect } from "@playwright/test";
const out = "test-results/review-artifacts";
test.beforeEach(async () => mkdir(out, { recursive: true }));
const AMBER = [255, 188, 77];
// Computed colours of the root variables and of representative surface elements.
async function surface(page) {
  return page.evaluate(() => {
    const rgb = (c) => {
      const n = c.match(/[\d.]+/g).map(Number);
      return (
        c.startsWith("color(")
          ? n.slice(0, 3).map((v) => v * 255)
          : n.slice(0, 3)
      ).map(Math.round);
    };
    const cs = (sel) => getComputedStyle(document.querySelector(sel));
    const root = getComputedStyle(document.documentElement);
    return {
      theme: rgb(root.getPropertyValue("--theme").trim()),
      themeBg: rgb(root.getPropertyValue("--theme-bg").trim()),
      page: rgb(root.backgroundColor),
      krassheit: rgb(cs("#intensity").accentColor),
      master: rgb(cs('[data-key="master"]').accentColor),
      orbitHead: rgb(cs("#orbit-head").fill),
      fxEcho: rgb(cs('[data-fx="echo"]').borderTopColor),
      play: rgb(cs("#play").backgroundColor),
      bassSlider: rgb(cs('[data-ribbon="1"] .slider-fill').backgroundColor),
    };
  });
}
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const near = (a, b, tol = 2) => a.every((v, i) => Math.abs(v - b[i]) <= tol);
const accentKeys = ["theme", "krassheit", "master", "orbitHead", "fxEcho"];
function expectSong(s, color, label) {
  for (const k of accentKeys)
    expect(near(s[k], hex(color)), `${label} ${k} ${s[k]} vs ${color}`).toBe(
      true,
    );
  expect(near(s.themeBg, hex(color)), `${label} themeBg`).toBe(true);
  for (const k of Object.keys(s))
    expect(near(s[k], AMBER, 40), `${label} ${k} is amber-like`).toBe(false);
}
async function tap(page, track, side, n = 1) {
  const b = await page
    .locator(
      `[data-songcell="${track}"] ${side > 0 ? ".song-next" : ".song-prev"}`,
    )
    .boundingBox();
  for (let i = 0; i < n; i++)
    await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
}
const settle = (page) => page.waitForTimeout(650);
for (const motion of ["no-preference", "reduce"])
  for (const [w, h] of [
    [390, 844],
    [844, 390],
  ])
    test(`whole surface follows the tapped target song at once, amber only on the pending field (${motion}, ${w}×${h})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: w, height: h });
      await page.emulateMedia({ reducedMotion: motion });
      await page.goto("/");
      const songs = await page.evaluate(() =>
        window.boomstep.songs.map((s) => s.color),
      );
      await page.locator("#play").click();
      await settle(page);
      expectSong(await surface(page), songs[0], "start");
      await page.waitForFunction(
        () => window.boomstep.engine.clock.step % 16 === 1,
      );
      // two taps right on Stabs: Lindenfrost queued; accents switch at once
      await tap(page, 2, 1, 2);
      const immediate = await surface(page);
      for (const k of accentKeys)
        expect(near(immediate[k], hex(songs[2])), `immediate ${k}`).toBe(true);
      if (motion === "reduce")
        expect(near(immediate.themeBg, hex(songs[2]))).toBe(true);
      expect(
        await page.evaluate(
          () => window.boomstep.engine.clock.pending.get(2)?.song,
        ),
      ).toBe(2);
      await page.waitForTimeout(450);
      const pending = await surface(page);
      expectSong(pending, songs[2], "pending");
      const cell = await page.locator('[data-songcell="2"]').evaluate((e) => ({
        border: getComputedStyle(e.querySelector(".song-display"))
          .borderTopColor,
        name: getComputedStyle(e.querySelector(".song-name")).color,
      }));
      expect(near(cell.border.match(/\d+/g).map(Number), AMBER)).toBe(true);
      expect(near(cell.name.match(/\d+/g).map(Number), hex(songs[2]))).toBe(
        true,
      );
      if (motion === "no-preference")
        await page.screenshot({
          path: `${out}/pending-lindenfrost-${w}x${h}.png`,
        });
      // Riff two taps left: Samtbunker (song 9) leads the surface now
      await tap(page, 3, -1, 2);
      await settle(page);
      expect(
        await page.evaluate(() => document.documentElement.dataset.themeTrack),
      ).toBe("3");
      expectSong(await surface(page), songs[8], "riff target");
      if (motion === "no-preference")
        await page.screenshot({
          path: `${out}/pending-two-tracks-${w}x${h}.png`,
        });
      // tapping back to the playing song clears that pending switch; Stabs keeps its target
      await tap(page, 3, 1, 2);
      await settle(page);
      expect(
        await page.evaluate(() => [
          window.boomstep.engine.clock.pending.has(3),
          window.boomstep.engine.clock.selection(2).song,
        ]),
      ).toEqual([false, 2]);
      expectSong(await surface(page), songs[0], "riff back to playing song");
      await expect(page.locator('[data-songcell="3"]')).not.toHaveClass(
        /queued/,
      );
      if (motion === "reduce")
        await page.screenshot({
          path: `${out}/reduced-motion-pending-${w}x${h}.png`,
        });
      test.info().annotations.push({
        type: "surface",
        description: JSON.stringify({ immediate, pending }),
      });
    });
test("reduced motion: no colour transition on root; normal mode only fades the background tint", async ({
  page,
}) => {
  await page.goto("/");
  const normal = await page.evaluate(
    () =>
      getComputedStyle(document.documentElement).transitionProperty +
      "|" +
      getComputedStyle(document.documentElement).transitionDuration,
  );
  expect(normal).toBe("--theme-bg|0.4s");
  await page.emulateMedia({ reducedMotion: "reduce" });
  const reduced = await page.evaluate(
    () =>
      getComputedStyle(document.documentElement).transitionProperty +
      "|" +
      getComputedStyle(document.documentElement).transitionDuration,
  );
  expect(reduced.endsWith("|0s")).toBe(true);
  // background fade never passes through amber-like page tints
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await tap(page, 1, 1, 3);
  for (let i = 0; i < 10; i++) {
    const s = await surface(page);
    for (const k of accentKeys) expect(near(s[k], AMBER, 40)).toBe(false);
    expect(Math.max(...s.page)).toBeLessThan(40);
    await page.waitForTimeout(40);
  }
});
test("REC red and Stumm/Solo states with song themes (screenshots)", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#all-songs").selectOption("5");
  await page.locator('[data-solo="1"]').click();
  await page.locator('[data-mute="3"]').click();
  await page.locator("#play").click();
  await settle(page);
  await expect(page.locator("#track-0 .song-cue")).toHaveText("Solo-aus");
  await expect(page.locator("#track-3 .song-cue")).toHaveText("Stumm");
  const clip = await page.evaluate(() =>
    [...document.querySelectorAll(".song-line, .song-name")].map(
      (e) => e.scrollWidth - e.clientWidth,
    ),
  );
  expect(Math.max(...clip)).toBeLessThanOrEqual(0);
  await page.screenshot({ path: `${out}/mute-solo-spreekanal-390x844.png` });
  await page.locator('[data-solo="1"]').click();
  await page.locator('[data-mute="3"]').click();
  await page.locator("#all-songs").selectOption("8");
  await page.waitForFunction(
    () => window.boomstep.session.tracks[0].song === 8,
  );
  await page.locator("#record").click();
  await expect(page.locator("#record")).toHaveClass(/recording/);
  await settle(page);
  const rec = await page
    .locator("#record")
    .evaluate((e) => getComputedStyle(e).borderTopColor);
  expect(rec).toBe("rgb(255, 99, 122)");
  await page.screenshot({ path: `${out}/rec-samtbunker-390x844.png` });
  await page.locator("#record").click();
});
for (const [w, h] of [
  [390, 844],
  [844, 390],
  [667, 375],
])
  test(`song cell ${w}×${h}: visible ‹ › halves, pending names in all four tracks never clip, layout unchanged`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: w, height: h });
    await page.goto("/");
    const hint = await page
      .locator('[data-songcell="0"]')
      .evaluate((e) =>
        [...e.querySelectorAll(".song-step i")].map((i) => [
          i.textContent,
          getComputedStyle(i).visibility,
          Number(getComputedStyle(i).opacity),
        ]),
      );
    expect(hint).toEqual([
      ["‹", "visible", 1],
      ["›", "visible", 1],
    ]);
    const clips = () =>
      page.evaluate(() =>
        [...document.querySelectorAll(".song-line, .song-name")].map((e) => ({
          t: e.textContent,
          clip: e.scrollWidth - e.clientWidth,
        })),
      );
    await page.locator("#play").click();
    const m = [];
    for (let k = 0; k < 10; k++) {
      for (const track of [0, 1, 2, 3]) await tap(page, track, 1);
      m.push(...(await clips()));
    }
    for (const x of m) expect(x.clip, x.t).toBeLessThanOrEqual(0);
    expect(m.some((x) => x.t.includes("→ ab T"))).toBe(true);
    const bottom = await page.evaluate(
      () =>
        document.querySelector("#performance").getBoundingClientRect().bottom,
    );
    expect(bottom).toBeLessThanOrEqual(w > h ? h : 822);
  });
