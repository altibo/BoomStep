import { mkdir } from "node:fs/promises";
import { test, expect } from "@playwright/test";
const out = "test-results/review-artifacts";
test.beforeEach(async () => mkdir(out, { recursive: true }));
const center = (b) => ({ x: b.x + b.width / 2, y: b.y + b.height / 2 });
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
async function grab(page, track) {
  const p = center(await page.locator(`[data-swipe="${track}"]`).boundingBox());
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  return p;
}
const settle = (page) => page.waitForTimeout(650);
for (const motion of ["no-preference", "reduce"]) {
  test(`whole surface follows the swiped song: preview, pending, cancel (${motion})`, async ({
    page,
  }) => {
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
    // preview Lindenfrost on Stabs: accents switch at once, background settles after the fade
    let p = await grab(page, 2);
    await page.mouse.move(p.x + 100, p.y, { steps: 3 });
    const immediate = await surface(page);
    for (const k of accentKeys)
      expect(near(immediate[k], hex(songs[2])), `immediate ${k}`).toBe(true);
    if (motion === "reduce")
      expect(near(immediate.themeBg, hex(songs[2]))).toBe(true);
    await page.waitForTimeout(450);
    const preview = await surface(page);
    expectSong(preview, songs[2], "preview");
    if (motion === "no-preference")
      await page.screenshot({ path: `${out}/preview-lindenfrost-390x844.png` });
    await page.mouse.up();
    expect(
      await page.evaluate(
        () => window.boomstep.engine.clock.pending.get(2)?.song,
      ),
    ).toBe(2);
    await page.waitForTimeout(450);
    const pending = await surface(page);
    expectSong(pending, songs[2], "pending");
    expect(
      await page.evaluate(
        () => window.boomstep.engine.clock.pending.get(2)?.song,
      ),
    ).toBe(2);
    // amber only on the queued song cell (and orbit marker), not on the surface
    expect(
      near(
        (
          await page
            .locator('[data-swipe="2"]')
            .evaluate((e) => getComputedStyle(e).borderTopColor)
        )
          .match(/\d+/g)
          .map(Number),
        AMBER,
      ),
    ).toBe(true);
    if (motion === "no-preference")
      await page.screenshot({ path: `${out}/pending-lindenfrost-390x844.png` });
    // second colour preview: Samtbunker on Riff
    p = await grab(page, 3);
    await page.mouse.move(
      p.x + 28 + 64 * 7 > 380 ? p.x - 28 - 64 : p.x + 100,
      p.y,
      { steps: 3 },
    );
    const riffTarget = await page.evaluate(() =>
      Number(document.documentElement.dataset.themeSong),
    );
    await settle(page);
    expectSong(await surface(page), songs[riffTarget], "preview 2");
    if (motion === "no-preference")
      await page.screenshot({
        path: `${out}/preview-song${riffTarget + 1}-390x844.png`,
      });
    // cancel zone: surface returns to the committed (pending) Lindenfrost
    await page.mouse.move(p.x - 92, p.y - 60, { steps: 3 });
    await expect(page.locator('[data-swipe="3"]')).toHaveClass(/canceling/);
    await settle(page);
    expectSong(await surface(page), songs[2], "cancel zone");
    if (motion === "no-preference")
      await page.screenshot({ path: `${out}/cancel-zone-390x844.png` });
    await page.mouse.up();
    await settle(page);
    const cancelled = await surface(page);
    expectSong(cancelled, songs[2], "after cancel");
    expect(
      await page.evaluate(() => window.boomstep.session.tracks[3].song),
    ).toBe(0);
    // Escape during a preview also restores
    p = await grab(page, 0);
    await page.mouse.move(p.x + 100, p.y, { steps: 3 });
    await page.keyboard.press("Escape");
    await page.mouse.up();
    await settle(page);
    expectSong(await surface(page), songs[2], "after escape");
    if (motion === "reduce")
      await page.screenshot({
        path: `${out}/reduced-motion-pending-390x844.png`,
      });
    await page.evaluate(
      (v) => (window.__surface = v),
      JSON.stringify({ preview, pending, cancelled }),
    );
    test.info().annotations.push({
      type: "surface",
      description: JSON.stringify({ preview, pending, cancelled }),
    });
  });
}
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
  const p = await grab(page, 1);
  await page.mouse.move(p.x + 100, p.y, { steps: 2 });
  for (let i = 0; i < 10; i++) {
    const s = await surface(page);
    for (const k of accentKeys) expect(near(s[k], AMBER, 40)).toBe(false);
    expect(Math.max(...s.page)).toBeLessThan(40);
    await page.waitForTimeout(40);
  }
  await page.mouse.up();
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
test("song cell: resting swipe chevrons, short preview cue, nothing clipped, layout unchanged", async ({
  page,
}) => {
  await page.goto("/");
  const hint = await page
    .locator('[data-swipe="0"]')
    .evaluate((e) => [
      getComputedStyle(e, "::before").content,
      getComputedStyle(e, "::after").content,
    ]);
  expect(hint).toEqual(['"‹"', '"›"']);
  const p = await grab(page, 2);
  await page.mouse.move(p.x + 100, p.y, { steps: 3 });
  const m = await page.evaluate(() =>
    [...document.querySelectorAll(".song-line, .song-name")].map((e) => ({
      t: e.textContent,
      clip: e.scrollWidth - e.clientWidth,
    })),
  );
  await page.mouse.up();
  // pending state with the longest names (arrow prefix) must not clip either
  await page.locator("#play").click();
  for (const track of [0, 1, 2, 3]) {
    await page.locator(`[data-swipe="${track}"]`).focus();
    await page.keyboard.press("ArrowRight");
  }
  const pend = await page.evaluate(() =>
    [...document.querySelectorAll(".song-line, .song-name")].map((e) => ({
      t: e.textContent,
      clip: e.scrollWidth - e.clientWidth,
    })),
  );
  m.push(...pend);
  for (const name of [
    "Lindenfrost",
    "Mitternacht",
    "Tiefgarage",
    "Schwarzlicht",
  ]) {
    const i = await page.evaluate(
      (n) => window.boomstep.songs.findIndex((s) => s.name === n),
      name,
    );
    await page.locator('[data-swipe="1"]').focus();
    await page.keyboard.press("Home");
    for (let k = 0; k < i; k++) await page.keyboard.press("ArrowRight");
    m.push(
      ...(await page.evaluate(() =>
        [...document.querySelectorAll(".song-name")].map((e) => ({
          t: e.textContent,
          clip: e.scrollWidth - e.clientWidth,
        })),
      )),
    );
  }
  for (const x of m) expect(x.clip, x.t).toBeLessThanOrEqual(0);
  expect(m.some((x) => x.t.includes("→ los ✓"))).toBe(true);
  expect(
    await page.evaluate(
      () =>
        document.querySelector("#performance").getBoundingClientRect().bottom,
    ),
  ).toBeLessThanOrEqual(822);
});
