import { mkdir } from "node:fs/promises";
import { test, expect } from "@playwright/test";
const out = "test-results/landscape";
test.beforeEach(async () => mkdir(out, { recursive: true }));
const VIEWPORTS = [
  [844, 390],
  [932, 430],
  [740, 360],
  [667, 375],
];
const RIGHT = [
  "header",
  ".mix-strip",
  ".fx-pads",
  ".transport",
  ".specials",
  "#orbit",
  ".performance-status",
  ".xy-axis",
  "#xy",
  "#xy-hint",
];
async function measure(page) {
  return page.evaluate((RIGHT) => {
    const box = (e) => e.getBoundingClientRect().toJSON();
    const q = (s) => box(document.querySelector(s));
    const perf = document.querySelector("#performance");
    const visible = (e) => e.getClientRects().length && !e.closest(".sr-only");
    const controls = [
      ...perf.querySelectorAll(
        "button, input, select, [role=slider], [data-songcell]",
      ),
    ].filter(visible);
    const texts = [...perf.querySelectorAll("*")].filter(
      (e) =>
        visible(e) &&
        [...e.childNodes].some(
          (n) => n.nodeType === 3 && n.textContent.trim(),
        ) &&
        !e.closest(".specials-caption"),
    );
    const clipped = [
      ...perf.querySelectorAll(
        "button, .song-name, .song-line, .mini span, #orbit-status, .xy-axis, #xy-hint, .intensity-control > span, .package-meta",
      ),
    ]
      .filter(visible)
      .filter((e) => e.scrollWidth > e.clientWidth + 1)
      .map((e) => `${e.className || e.id}:${e.textContent.slice(0, 18)}`);
    const tracks = [0, 1, 2, 3].map((i) => {
      const t = document.querySelector(`#track-${i}`);
      return {
        card: box(t),
        parts: [
          ...t.querySelectorAll(
            ".song-cell, .variant-slider, .mute, .solo, .mini",
          ),
        ].map(box),
      };
    });
    return {
      w: innerWidth,
      h: innerHeight,
      overflowX: document.documentElement.scrollWidth - innerWidth,
      perf: box(perf),
      tracks: q(".tracks"),
      trackCards: tracks,
      right: Object.fromEntries(RIGHT.map((s) => [s, q(s)])),
      controls: controls.map((e) => ({
        id: e.id || e.getAttribute("aria-label") || e.className,
        ...box(e),
        small:
          e.matches("[data-songcell]") || e.closest(".mini") ? false : true,
      })),
      minFont: Math.min(
        ...texts.map((e) => parseFloat(getComputedStyle(e).fontSize)),
      ),
      clipped,
    };
  }, RIGHT);
}
const overlap = (a, b) =>
  Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.5 &&
  Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.5;

for (const [w, h] of VIEWPORTS)
  test(`landscape ${w}×${h}: tracks fill the left half, controls the right half, XY bottom-right, no scroll for music`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: w, height: h });
    await page.goto("/");
    await page.waitForFunction(() => window.boomstep?.engine);
    const m = await measure(page);
    console.log(
      `Landscape ${w}x${h}`,
      JSON.stringify({
        tracks: m.tracks,
        xy: m.right["#xy"],
        perfBottom: m.perf.bottom,
        minFont: m.minFont,
      }),
    );
    expect(m.overflowX).toBeLessThanOrEqual(0);
    // all music fits the first screen, no vertical scrolling needed
    expect(m.perf.bottom).toBeLessThanOrEqual(h + 0.5);
    for (const c of m.controls) {
      expect(c.bottom, c.id).toBeLessThanOrEqual(h + 0.5);
      expect(c.right, c.id).toBeLessThanOrEqual(w + 0.5);
      expect(c.height, c.id).toBeGreaterThanOrEqual(44);
      expect(c.width, c.id).toBeGreaterThanOrEqual(44);
    }
    // left half: four tracks, stacked, each fully visible and filling the half
    expect(m.tracks.right).toBeLessThanOrEqual(w / 2 + 0.5);
    expect(m.tracks.width).toBeGreaterThanOrEqual(w / 2 - 24);
    expect(m.tracks.height).toBeGreaterThanOrEqual(h - 12);
    for (const [i, t] of m.trackCards.entries()) {
      expect(t.card.right).toBeLessThanOrEqual(w / 2 + 0.5);
      expect(t.card.bottom).toBeLessThanOrEqual(h + 0.5);
      if (i)
        expect(t.card.top).toBeGreaterThanOrEqual(
          m.trackCards[i - 1].card.bottom,
        );
      for (const [a, pa] of t.parts.entries()) {
        expect(pa.left).toBeGreaterThanOrEqual(t.card.left - 0.5);
        expect(pa.right).toBeLessThanOrEqual(t.card.right + 0.5);
        for (const pb of t.parts.slice(a + 1))
          expect(overlap(pa, pb)).toBe(false);
      }
    }
    // right half: everything else, pairwise free of overlap
    const right = Object.entries(m.right);
    for (const [i, [name, b]] of right.entries()) {
      expect(b.left, name).toBeGreaterThanOrEqual(w / 2 - 0.5);
      expect(b.right, name).toBeLessThanOrEqual(w + 0.5);
      for (const [other, c] of right.slice(i + 1))
        expect(overlap(b, c), `${name} × ${other}`).toBe(false);
    }
    // XY: big, in the bottom-right quadrant, close to the right thumb corner
    const xy = m.right["#xy"];
    expect(xy.width).toBeGreaterThanOrEqual(120);
    expect(xy.height).toBeGreaterThanOrEqual(120);
    expect(xy.left + xy.width / 2).toBeGreaterThanOrEqual(w * 0.75);
    expect(xy.top + xy.height / 2).toBeGreaterThanOrEqual(h / 2);
    expect(w - xy.right).toBeLessThanOrEqual(24);
    expect(h - xy.bottom).toBeLessThanOrEqual(36);
    expect(m.minFont).toBeGreaterThanOrEqual(11);
    expect(m.clipped).toEqual([]);
    await page.screenshot({ path: `${out}/landscape-${w}x${h}.png` });
  });

test("landscape 844×390 is fully playable: song tap, pattern, XY drag, specials pad, REC button reachable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto("/");
  await page.locator("#play").click();
  await page.waitForFunction(() => window.boomstep.engine.clock.step > 2);
  const cell = await page.locator('[data-songcell="1"]').boundingBox();
  await page.mouse.click(cell.x + cell.width * 0.8, cell.y + cell.height / 2);
  await expect(page.locator('[data-songcell="1"]')).toHaveClass(/queued/);
  expect(
    await page.evaluate(() => window.boomstep.engine.clock.pending.get(1).song),
  ).toBe(1);
  await page.locator('[data-ribbon="0"] [data-variant="2"]').click();
  expect(
    await page.evaluate(
      () => window.boomstep.engine.clock.pending.get(0).variant,
    ),
  ).toBe(2);
  const xy = await page.locator("#xy").boundingBox();
  await page.mouse.move(xy.x + xy.width * 0.8, xy.y + xy.height * 0.2);
  await page.mouse.down();
  await page.mouse.move(xy.x + xy.width * 0.85, xy.y + xy.height * 0.15, {
    steps: 3,
  });
  const fx = await page.evaluate(() => ({ ...window.boomstep.session.fx }));
  expect(fx.depth).toBeGreaterThan(0.6);
  expect(fx.x).toBeGreaterThan(0.6);
  await page.screenshot({ path: `${out}/landscape-844x390-xy-held.png` });
  await page.mouse.up();
  await page.locator('[data-special="laser"], .special-pad').first().click();
  await expect(page.locator("#record")).toBeInViewport();
  await expect(page.locator("#xy")).toBeInViewport({ ratio: 1 });
});

test("desktop landscape 1280×720 stays tidy and portrait 390×844 keeps the stacked layout", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  const m = await measure(page);
  expect(m.overflowX).toBeLessThanOrEqual(0);
  expect(m.tracks.right).toBeLessThanOrEqual(m.right.header.left);
  const right = Object.entries(m.right);
  for (const [i, [name, b]] of right.entries())
    for (const [other, c] of right.slice(i + 1))
      expect(overlap(b, c), `${name} × ${other}`).toBe(false);
  await page.screenshot({ path: `${out}/landscape-1280x720.png` });
  await page.setViewportSize({ width: 390, height: 844 });
  const p = await measure(page);
  // portrait: tracks span the full width, XY sits below the tracks inside the orbit ring
  expect(p.tracks.width).toBeGreaterThan(360);
  expect(p.right["#xy"].top).toBeGreaterThan(p.tracks.bottom);
  expect(p.perf.bottom).toBeLessThanOrEqual(844);
  await page.screenshot({ path: `${out}/portrait-390x844.png` });
});
