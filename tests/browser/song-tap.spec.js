import { mkdir } from "node:fs/promises";
import { test, expect } from "@playwright/test";
const out = "test-results/song-artifacts";
test.beforeEach(async () => mkdir(out, { recursive: true }));
const songs = (page) =>
  page.evaluate(() => window.boomstep.songs.map((s) => [s.name, s.color]));
const center = (b) => ({ x: b.x + b.width / 2, y: b.y + b.height / 2 });
const theme = (page) =>
  page.evaluate(() => ({
    inline: document.documentElement.style.getPropertyValue("--theme"),
    computed: getComputedStyle(document.documentElement)
      .getPropertyValue("--theme")
      .trim(),
    song: document.documentElement.dataset.themeSong,
    track: document.documentElement.dataset.themeTrack,
    preview: document.documentElement.dataset.themePreview,
  }));
async function grab(page, track) {
  const cell = page.locator(`[data-swipe="${track}"]`);
  await cell.scrollIntoViewIfNeeded();
  const p = center(await cell.boundingBox());
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  return p;
}
const rgbOf = (s) =>
  s
    .match(/[\d.]+/g)
    .slice(0, 3)
    .map(Number);
test("swipe right previews song colour + name on the card AND the whole surface; release commits at the next bar", async ({
  page,
}) => {
  await page.goto("/");
  const list = await songs(page);
  expect(list).toHaveLength(10);
  await page.locator("#play").click();
  await page.waitForFunction(() => window.boomstep.engine.clock.step > 2);
  const before = await theme(page);
  expect(before.inline).toBe(list[0][1]);
  const p = await grab(page, 2);
  await page.mouse.move(p.x + 40, p.y, { steps: 3 });
  // live preview, nothing committed yet
  await expect(page.locator("#name-2")).toHaveText(`${list[1][0]}`);
  await expect(page.locator('[data-swipe="2"]')).toHaveClass(/previewing/);
  let t = await theme(page);
  expect(t).toMatchObject({
    inline: list[1][1],
    song: "1",
    track: "2",
    preview: "true",
  });
  expect(
    await page.evaluate(() => window.boomstep.engine.clock.pending.size),
  ).toBe(0);
  expect(
    await page
      .locator("#track-2")
      .evaluate((e) => e.style.getPropertyValue("--song")),
  ).toBe(list[1][1]);
  await page.mouse.move(p.x + 40 + 64, p.y, { steps: 3 });
  await expect(page.locator("#name-2")).toHaveText(`${list[2][0]}`);
  expect((await theme(page)).inline).toBe(list[2][1]);
  await page.screenshot({ path: `${out}/swipe-preview-390x844.png` });
  await page.mouse.up();
  // committed: pending amber until bar, surface keeps the new colour
  const pending = await page.evaluate(() =>
    window.boomstep.engine.clock.pending.get(2),
  );
  expect(pending.song).toBe(2);
  expect(pending.at % 16).toBe(0);
  await expect(page.locator('[data-swipe="2"]')).toHaveClass(/queued/);
  await expect(page.locator("#song-cue-2")).toContainText("ab T");
  t = await theme(page);
  expect(t).toMatchObject({ inline: list[2][1], track: "2", preview: "false" });
  await page.screenshot({ path: `${out}/swipe-pending-390x844.png` });
  await page.waitForFunction(
    (at) => window.boomstep.engine.clock.step > at + 1,
    pending.at,
  );
  expect(
    await page.evaluate(() => window.boomstep.session.tracks[2].song),
  ).toBe(2);
  expect(
    await page.evaluate(() =>
      window.boomstep.session.tracks.map((x) => x.song),
    ),
  ).toEqual([0, 0, 2, 0]);
  await expect(page.locator("#name-2")).toHaveText(list[2][0]);
  expect((await theme(page)).inline).toBe(list[2][1]);
  // phase was shared: the switch landed exactly on a bar line
  expect(pending.at % 16).toBe(0);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/theme-lindenfrost-390x844.png` });
});
test("swipe left goes to the previous song (circular); vertical cancel, Escape, pointercancel and lost capture restore the colour", async ({
  page,
}) => {
  await page.goto("/");
  const list = await songs(page);
  let p = await grab(page, 1);
  await page.mouse.move(p.x - 40, p.y, { steps: 3 });
  await expect(page.locator("#name-1")).toHaveText(`${list[9][0]}`);
  expect((await theme(page)).inline).toBe(list[9][1]);
  // vertical cancel zone
  await page.mouse.move(p.x - 40, p.y - 60, { steps: 3 });
  await expect(page.locator('[data-swipe="1"]')).toHaveClass(/canceling/);
  await expect(page.locator("#name-1")).toHaveText("Abbrechen");
  expect((await theme(page)).inline).toBe(list[0][1]);
  await page.mouse.up();
  expect(
    await page.evaluate(() => window.boomstep.session.tracks[1].song),
  ).toBe(0);
  expect((await theme(page)).inline).toBe(list[0][1]);
  // Escape
  p = await grab(page, 3);
  await page.mouse.move(p.x + 120, p.y, { steps: 3 });
  expect((await theme(page)).inline).not.toBe(list[0][1]);
  await page.keyboard.press("Escape");
  expect((await theme(page)).inline).toBe(list[0][1]);
  await page.mouse.up();
  expect(
    await page.evaluate(() => window.boomstep.session.tracks[3].song),
  ).toBe(0);
  // pointercancel
  p = await grab(page, 0);
  await page.mouse.move(p.x + 50, p.y, { steps: 3 });
  await page
    .locator('[data-swipe="0"]')
    .dispatchEvent("pointercancel", { pointerId: 1 });
  expect((await theme(page)).inline).toBe(list[0][1]);
  await page.mouse.up();
  expect(
    await page.evaluate(() => window.boomstep.session.tracks[0].song),
  ).toBe(0);
  // lost capture
  p = await grab(page, 2);
  await page.mouse.move(p.x + 50, p.y, { steps: 3 });
  await page
    .locator('[data-swipe="2"]')
    .evaluate((el) => el.releasePointerCapture(1));
  await expect.poll(async () => (await theme(page)).inline).toBe(list[0][1]);
  await page.mouse.up();
  expect(
    await page.evaluate(() => window.boomstep.session.tracks[2].song),
  ).toBe(0);
  // re-entry after cancel still commits
  p = await grab(page, 1);
  await page.mouse.move(p.x - 40, p.y - 60, { steps: 2 });
  await page.mouse.move(p.x - 40, p.y, { steps: 2 });
  await page.mouse.up();
  expect(
    await page.evaluate(() => window.boomstep.session.tracks[1].song),
  ).toBe(9);
  expect((await theme(page)).inline).toBe(list[9][1]);
});
test("cancel while a song switch is pending keeps that pending switch and its amber state", async ({
  page,
}) => {
  await page.goto("/");
  const list = await songs(page);
  await page.locator("#play").click();
  await page.waitForFunction(
    () =>
      window.boomstep.engine.clock.step % 16 > 1 &&
      window.boomstep.engine.clock.step % 16 < 8,
  );
  let p = await grab(page, 1);
  await page.mouse.move(p.x + 40, p.y, { steps: 2 });
  await page.mouse.up();
  const pending = await page.evaluate(() =>
    JSON.stringify(window.boomstep.engine.clock.pending.get(1)),
  );
  expect(JSON.parse(pending).song).toBe(1);
  // a new preview starts from the pending choice
  p = await grab(page, 1);
  await page.mouse.move(p.x + 40, p.y, { steps: 2 });
  await expect(page.locator("#name-1")).toHaveText(`${list[2][0]}`);
  await page.keyboard.press("Escape");
  await page.mouse.up();
  expect(
    await page.evaluate(() =>
      JSON.stringify(window.boomstep.engine.clock.pending.get(1)),
    ),
  ).toBe(pending);
  await expect(page.locator('[data-swipe="1"]')).toHaveClass(/queued/);
  expect((await theme(page)).inline).toBe(list[1][1]);
});
test("two touch fingers swipe different tracks independently; each card previews its own song", async ({
  page,
  context,
}) => {
  await page.goto("/");
  const list = await songs(page);
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setTouchEmulationEnabled", {
    enabled: true,
    maxTouchPoints: 5,
  });
  const a = center(await page.locator('[data-swipe="0"]').boundingBox()),
    b = center(await page.locator('[data-swipe="3"]').boundingBox());
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { id: 1, ...a },
      { id: 2, ...b },
    ],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [
      { id: 1, x: a.x + 40, y: a.y },
      { id: 2, x: b.x - 110, y: b.y },
    ],
  });
  await expect(page.locator(".song-swipe.previewing")).toHaveCount(2);
  await expect(page.locator("#name-0")).toHaveText(`${list[1][0]}`);
  await expect(page.locator("#name-3")).toHaveText(`${list[8][0]}`);
  expect(
    await page.evaluate(() =>
      window.boomstep.session.tracks.map((t) => t.song),
    ),
  ).toEqual([0, 0, 0, 0]);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  expect(
    await page.evaluate(() =>
      window.boomstep.session.tracks.map((t) => t.song),
    ),
  ).toEqual([1, 0, 0, 8]);
  const cards = await page.evaluate(() =>
    [0, 1, 2, 3].map((i) =>
      document.querySelector(`#track-${i}`).style.getPropertyValue("--song"),
    ),
  );
  expect(cards).toEqual([list[1][1], list[0][1], list[0][1], list[8][1]]);
  expect(await page.evaluate(() => window.boomstep.engine.running)).toBe(false);
});
test("pattern slider: 4 steps, ARIA slider semantics, keyboard, tap, drag-preview and next-bar commit", async ({
  page,
}) => {
  await page.goto("/");
  const band = page.locator('[data-ribbon="2"]');
  await expect(band).toHaveAttribute("role", "slider");
  await expect(band).toHaveAttribute("aria-valuemin", "1");
  await expect(band).toHaveAttribute("aria-valuemax", "4");
  await expect(band.locator(".stop")).toHaveCount(4);
  await expect(page.locator(".variant-slider")).toHaveCount(4);
  await expect(page.locator("button[data-variant]")).toHaveCount(0);
  await band.focus();
  await page.keyboard.press("ArrowRight");
  await expect(band).toHaveAttribute("aria-valuenow", "2");
  await page.keyboard.press("End");
  await expect(band).toHaveAttribute("aria-valuenow", "4");
  await page.keyboard.press("Home");
  await expect(band).toHaveAttribute("aria-valuenow", "1");
  await expect(band).toHaveAttribute("aria-valuetext", /Stufe 1, Schatten/);
  await page.locator("#play").click();
  await page.waitForFunction(
    () =>
      window.boomstep.engine.clock.step % 16 > 1 &&
      window.boomstep.engine.clock.step % 16 < 9,
  );
  const s0 = center(await band.locator('[data-variant="0"]').boundingBox()),
    s3 = center(await band.locator('[data-variant="3"]').boundingBox());
  await page.mouse.move(s0.x, s0.y);
  await page.mouse.down();
  await page.mouse.move(s3.x, s3.y, { steps: 4 });
  await expect(band.locator('[data-variant="3"]')).toHaveClass(/scrub-preview/);
  expect(
    await page.evaluate(() => window.boomstep.engine.clock.pending.size),
  ).toBe(0);
  await page.mouse.up();
  await expect(band.locator('[data-variant="3"]')).toHaveClass(/queued/);
  const at = await page.evaluate(
    () => window.boomstep.engine.clock.pending.get(2).at,
  );
  expect(at % 16).toBe(0);
  await page.waitForFunction(
    (at) => window.boomstep.engine.clock.step > at + 1,
    at,
  );
  await expect(band.locator('[data-variant="3"]')).toHaveClass(/active/);
  await expect(band).toHaveAttribute("aria-valuenow", "4");
  // song swipe keyboard + ARIA
  const cell = page.locator('[data-swipe="0"]');
  await expect(cell).toHaveAttribute("role", "slider");
  await expect(cell).toHaveAttribute("aria-valuemax", "10");
  await cell.focus();
  await page.keyboard.press("End");
  await expect(cell).toHaveAttribute("aria-valuenow", "10");
  await expect(cell).toHaveAttribute("aria-valuetext", /vorgemerkt/);
});
test("every one of the 10 themes keeps measured text contrast; amber/red stay fixed; background stays dark", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const report = [];
  for (let i = 0; i < 10; i++) {
    await page.locator("#all-songs").selectOption(String(i));
    const r = await page.evaluate(() => {
      // Parses rgb()/rgba()/color(srgb …), compositing translucent colours over the page.
      let base = null;
      const parse = (c) => {
        const n = c.match(/[\d.]+/g).map(Number);
        const rgb = c.startsWith("color(")
          ? n.slice(0, 3).map((v) => v * 255)
          : n.slice(0, 3);
        const a = n.length > 3 ? n[3] : 1;
        return base && a < 1
          ? rgb.map((v, k) => v * a + base[k] * (1 - a))
          : rgb;
      };
      const lum = (rgb) =>
        rgb
          .map((n) => n / 255)
          .map((n) => (n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4))
          .reduce((a, v, k) => a + v * [0.2126, 0.7152, 0.0722][k], 0);
      const cr = (a, b) => {
        const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
        return (x + 0.05) / (y + 0.05);
      };
      const cs = (sel, prop) =>
        parse(getComputedStyle(document.querySelector(sel))[prop]);
      const page = cs("html", "backgroundColor");
      base = page;
      const card = cs("#track-1", "backgroundColor"),
        cell = cs('[data-swipe="1"]', "backgroundColor"),
        name = cs("#name-1", "color"),
        label = cs("#track-1 .track-label", "color"),
        stop = cs('[data-ribbon="1"] .stop.active', "backgroundColor"),
        stopText = cs('[data-ribbon="1"] .stop.active', "color"),
        fx = cs('[data-fx="echo"]', "backgroundColor"),
        fxText = cs('[data-fx="echo"]', "color");
      return {
        theme: document.documentElement.style.getPropertyValue("--theme"),
        computed: getComputedStyle(document.documentElement)
          .getPropertyValue("--theme")
          .trim(),
        pageLum: lum(page),
        cardLum: lum(card),
        name: cr(name, cell),
        label: cr(label, cell),
        stop: cr(stopText, stop),
        fx: cr(fxText, fx),
        amber: getComputedStyle(document.documentElement)
          .getPropertyValue("--amber")
          .trim(),
      };
    });
    report.push(r);
    expect(r.pageLum).toBeLessThan(0.02);
    expect(r.cardLum).toBeLessThan(0.03);
    expect(r.name).toBeGreaterThanOrEqual(4.5);
    expect(r.label).toBeGreaterThanOrEqual(7);
    expect(r.stop).toBeGreaterThanOrEqual(4.5);
    expect(r.fx).toBeGreaterThanOrEqual(4.5);
    expect(r.amber).toBe("#ffbc4d");
    if ([0, 5, 8].includes(i))
      await page.screenshot({ path: `${out}/theme-${i}-390x844.png` });
  }
  console.log(
    "Measured theme contrast",
    JSON.stringify(
      report.map((r, i) => ({
        i,
        theme: r.theme,
        name: +r.name.toFixed(2),
        label: +r.label.toFixed(2),
        stop: +r.stop.toFixed(2),
        fx: +r.fx.toFixed(2),
        pageLum: +r.pageLum.toFixed(4),
      })),
    ),
  );
  await page.locator("#record").click();
  await expect(page.locator("#record")).toHaveClass(/recording/);
  expect(
    rgbOf(
      await page
        .locator("#record")
        .evaluate((e) => getComputedStyle(e).borderTopColor),
    ),
  ).toEqual([255, 99, 122]);
  await page.locator("#record").click();
});
test("layout: music block ends ≤ y822 at 390×844, targets ≥ 44px, fonts ≥ 11px, no overflow at 320/390", async ({
  page,
}) => {
  for (const [w, h] of [
    [390, 844],
    [390, 700],
    [320, 568],
  ]) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto("/");
    const m = await page.evaluate(() => {
      const r = (sel) =>
        [...document.querySelectorAll(sel)].map((e) =>
          e.getBoundingClientRect(),
        );
      const fonts = [...document.querySelectorAll("body *")]
        .filter(
          (e) =>
            e.offsetParent &&
            e.textContent.trim() &&
            !e.closest("#help-text") &&
            !e.closest(".sr-only"),
        )
        .map((e) => parseFloat(getComputedStyle(e).fontSize));
      return {
        overflow: document.documentElement.scrollWidth - innerWidth,
        perf: document.querySelector("#performance").getBoundingClientRect()
          .bottom,
        tracksBottom: document.querySelector(".tracks").getBoundingClientRect()
          .bottom,
        swipe: r(".song-swipe").map((b) => [b.width, b.height]),
        slider: r(".variant-slider").map((b) => [b.width, b.height]),
        minFont: Math.min(...fonts),
        nameClip: [...document.querySelectorAll(".song-name")].map(
          (e) => e.scrollWidth - e.clientWidth,
        ),
      };
    });
    console.log("Layout", w, h, JSON.stringify(m));
    expect(m.overflow).toBeLessThanOrEqual(0);
    expect(m.minFont).toBeGreaterThanOrEqual(11);
    for (const [bw, bh] of [...m.swipe, ...m.slider]) {
      expect(bw).toBeGreaterThanOrEqual(44);
      expect(bh).toBeGreaterThanOrEqual(44);
    }
    if (w === 390 && h === 844) expect(m.perf).toBeLessThanOrEqual(822);
    await page.screenshot({
      path: `${out}/layout-${w}x${h}.png`,
      fullPage: true,
    });
  }
});
