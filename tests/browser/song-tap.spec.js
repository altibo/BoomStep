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
  }));
// Point inside the left (-1) or right (+1) half of a track's song cell.
async function half(page, track, side) {
  const cell = page.locator(`[data-songcell="${track}"]`);
  await cell.scrollIntoViewIfNeeded();
  const b = await cell.boundingBox();
  return { x: b.x + b.width * (side > 0 ? 0.8 : 0.2), y: b.y + b.height / 2 };
}
async function tap(page, track, side) {
  const p = await half(page, track, side);
  await page.mouse.click(p.x, p.y);
  return p;
}
const pendingSongs = (page) =>
  page.evaluate(() =>
    [0, 1, 2, 3].map(
      (i) => window.boomstep.engine.clock.pending.get(i)?.song ?? null,
    ),
  );
const rgbOf = (s) =>
  s
    .match(/[\d.]+/g)
    .slice(0, 3)
    .map(Number);
test("tap right half = next song: queued for the next bar, field shows target name+colour, surface follows at once", async ({
  page,
}) => {
  await page.goto("/");
  const list = await songs(page);
  expect(list).toHaveLength(10);
  await page.locator("#play").click();
  await page.waitForFunction(() => window.boomstep.engine.clock.step > 2);
  expect((await theme(page)).inline).toBe(list[0][1]);
  await tap(page, 2, 1);
  const pending = await page.evaluate(() =>
    window.boomstep.engine.clock.pending.get(2),
  );
  expect(pending.song).toBe(1);
  expect(pending.at % 16).toBe(0);
  const cell = page.locator('[data-songcell="2"]');
  await expect(cell).toHaveClass(/queued/);
  await expect(page.locator("#name-2")).toHaveText(list[1][0]);
  await expect(page.locator("#song-cue-2")).toContainText("ab T");
  // target colour immediately: surface accent, theme track, pending name colour
  expect(await theme(page)).toMatchObject({
    inline: list[1][1],
    song: "1",
    track: "2",
  });
  const look = await page.evaluate(() => {
    const cs = (s) => getComputedStyle(document.querySelector(s));
    return {
      name: cs("#name-2").color,
      border: cs('[data-songcell="2"]').borderTopColor,
      cue: cs("#song-cue-2").color,
      card: document.querySelector("#track-2").style.getPropertyValue("--song"),
    };
  });
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  expect(rgbOf(look.name)).toEqual(hex(list[1][1]));
  expect(rgbOf(look.border)).toEqual([255, 188, 77]); // amber only on the pending field
  expect(look.card).toBe(list[0][1]); // still playing song 1 until the bar line
  await page.screenshot({ path: `${out}/tap-pending-390x844.png` });
  // a second tap counts on from the pending target
  await tap(page, 2, 1);
  expect((await pendingSongs(page))[2]).toBe(2);
  await expect(page.locator("#name-2")).toHaveText(list[2][0]);
  expect((await theme(page)).inline).toBe(list[2][1]);
  // a press that drifts off the field is still exactly one tap (no swipe/cancel gesture)
  const p = await half(page, 2, 1);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(p.x - 90, p.y + 60, { steps: 4 });
  await page.mouse.up();
  expect((await pendingSongs(page))[2]).toBe(3);
  await expect(cell).not.toHaveClass(/canceling|previewing/);
  const at = (
    await page.evaluate(() => window.boomstep.engine.clock.pending.get(2))
  ).at;
  await page.waitForFunction(
    (at) => window.boomstep.engine.clock.step > at + 1,
    at,
  );
  expect(
    await page.evaluate(() =>
      window.boomstep.session.tracks.map((x) => x.song),
    ),
  ).toEqual([0, 0, 3, 0]);
  await expect(cell).not.toHaveClass(/queued/);
  await expect(page.locator("#name-2")).toHaveText(list[3][0]);
  expect((await theme(page)).inline).toBe(list[3][1]);
});
test("tap left half = previous song and wraps 1 → 10; tapping back to the playing song clears the pending switch", async ({
  page,
}) => {
  await page.goto("/");
  const list = await songs(page);
  await page.locator("#play").click();
  await page.waitForFunction(() => window.boomstep.engine.clock.step > 2);
  await tap(page, 0, -1);
  expect((await pendingSongs(page))[0]).toBe(9);
  await expect(page.locator("#name-0")).toHaveText(list[9][0]);
  expect((await theme(page)).inline).toBe(list[9][1]);
  await tap(page, 0, -1);
  expect((await pendingSongs(page))[0]).toBe(8);
  await tap(page, 0, 1);
  await tap(page, 0, 1);
  // back on the playing song: nothing pending, no amber
  expect((await pendingSongs(page))[0]).toBe(null);
  await expect(page.locator('[data-songcell="0"]')).not.toHaveClass(/queued/);
  await expect(page.locator("#name-0")).toHaveText(list[0][0]);
  expect((await theme(page)).inline).toBe(list[0][1]);
  // stopped transport applies at once and wraps 10 → 1 as well
  await page.locator("#stop").click();
  for (let i = 0; i < 9; i++) await tap(page, 1, -1);
  expect(
    await page.evaluate(() => window.boomstep.session.tracks[1].song),
  ).toBe(1);
  await tap(page, 1, 1);
  await tap(page, 1, 1);
  expect(
    await page.evaluate(() => window.boomstep.session.tracks[1].song),
  ).toBe(3);
});
test("song field: two ≥44px halves with visible ‹ › hints, button roles, keyboard Enter/arrows, ARIA labels name the neighbour", async ({
  page,
}) => {
  await page.goto("/");
  const list = await songs(page);
  for (const track of [0, 1, 2, 3]) {
    const m = await page.evaluate((t) => {
      const box = (e) => e.getBoundingClientRect().toJSON();
      const cell = document.querySelector(`[data-songcell="${t}"]`);
      const [prev, next] = [".song-prev", ".song-next"].map((s) =>
        cell.querySelector(s),
      );
      return {
        cell: box(cell),
        prev: box(prev),
        next: box(next),
        chev: [prev, next].map((b) => {
          const i = b.querySelector("i");
          return [
            i.textContent,
            parseFloat(getComputedStyle(i).fontSize),
            box(i).width,
          ];
        }),
        roles: [cell.getAttribute("role"), prev.tagName, next.tagName],
      };
    }, track);
    expect(m.roles).toEqual(["group", "BUTTON", "BUTTON"]);
    for (const h of [m.prev, m.next]) {
      expect(h.width).toBeGreaterThanOrEqual(44);
      expect(h.height).toBeGreaterThanOrEqual(44);
    }
    expect(m.prev.right).toBeLessThanOrEqual(m.next.left + 0.5); // no overlap
    expect(
      Math.abs(m.prev.right - (m.cell.left + m.cell.width / 2)),
    ).toBeLessThan(2);
    expect(m.chev.map((c) => c[0])).toEqual(["‹", "›"]);
    for (const c of m.chev) expect(c[1]).toBeGreaterThanOrEqual(11);
  }
  await expect(page.locator('[data-songcell="0"] .song-next')).toHaveAttribute(
    "aria-label",
    new RegExp(`nächster Song ${list[1][0]}`),
  );
  await expect(page.locator('[data-songcell="0"] .song-prev')).toHaveAttribute(
    "aria-label",
    new RegExp(`voriger Song ${list[9][0]}`),
  );
  await page.locator('[data-songcell="1"] .song-next').focus();
  await page.keyboard.press("Enter");
  expect(
    await page.evaluate(() => window.boomstep.session.tracks[1].song),
  ).toBe(1);
  await page.keyboard.press("Space");
  expect(
    await page.evaluate(() => window.boomstep.session.tracks[1].song),
  ).toBe(2);
  await page.keyboard.press("ArrowLeft");
  expect(
    await page.evaluate(() => window.boomstep.session.tracks[1].song),
  ).toBe(1);
  await page.keyboard.press("End");
  expect(
    await page.evaluate(() => window.boomstep.session.tracks[1].song),
  ).toBe(9);
  await expect(page.locator('[data-songcell="1"]')).toHaveAttribute(
    "aria-description",
    new RegExp(list[9][0]),
  );
  expect((await theme(page)).track).toBe("1");
});
test("two touch fingers tap different tracks at once; each track steps independently", async ({
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
  const a = await half(page, 0, 1),
    b = await half(page, 3, -1);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { id: 1, ...a },
      { id: 2, ...b },
    ],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  expect(
    await page.evaluate(() =>
      window.boomstep.session.tracks.map((t) => t.song),
    ),
  ).toEqual([1, 0, 0, 9]);
  const cards = await page.evaluate(() =>
    [0, 1, 2, 3].map((i) =>
      document.querySelector(`#track-${i}`).style.getPropertyValue("--song"),
    ),
  );
  expect(cards).toEqual([list[1][1], list[0][1], list[0][1], list[9][1]]);
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
  // song field keyboard: End queues the last song for the next bar
  const cell = page.locator('[data-songcell="0"]');
  await cell.locator(".song-next").focus();
  await page.keyboard.press("End");
  await expect(cell).toHaveAttribute("aria-description", /vorgemerkt/);
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
        cell = cs('[data-songcell="1"]', "backgroundColor"),
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
        halves: r(".song-step").map((b) => [b.width, b.height]),
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
    for (const [bw, bh] of [...m.halves, ...m.slider]) {
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
