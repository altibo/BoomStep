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
// global controls left, the four tracks as a block in the middle, FX + XY right
const LEFT = [".phase", "header", ".master", ".transport"];
const RIGHT = [".fx-pads", ".fx-hold", ".xy-axis", "#xy", "#xy-hint"];
async function measure(page) {
  return page.evaluate(
    ([LEFT, RIGHT]) => {
      const box = (e) => e.getBoundingClientRect().toJSON();
      const q = (s) => box(document.querySelector(s));
      const perf = document.querySelector("#performance");
      const visible = (e) =>
        e.getClientRects().length && !e.closest(".sr-only");
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
          ),
      );
      const clipped = [
        ...perf.querySelectorAll(
          "button, .song-name, .song-line, .mini span, #orbit-bar, #orbit-chord, .xy-axis, #xy-hint, .intensity-control > span, .package-meta",
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
              ".song-prev, .song-display, .song-next, .variant-slider, .mute, .solo, .mini",
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
        left: Object.fromEntries(LEFT.map((s) => [s, q(s)])),
        right: Object.fromEntries(RIGHT.map((s) => [s, q(s)])),
        orbit: q("#orbit"),
        barFont: parseFloat(
          getComputedStyle(document.querySelector("#orbit-bar")).fontSize,
        ),
        chordFont: parseFloat(
          getComputedStyle(document.querySelector("#orbit-chord")).fontSize,
        ),
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
    },
    [LEFT, RIGHT],
  );
}
const overlap = (a, b) =>
  Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.5 &&
  Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.5;

for (const [w, h] of VIEWPORTS)
  test(`landscape ${w}×${h}: global controls left, track block centred, FX + XY bottom-right, no scroll for music`, async ({
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
    // middle: the four tracks as one centred block, stacked, each fully visible
    expect(
      Math.abs(m.tracks.left + m.tracks.width / 2 - w / 2),
    ).toBeLessThanOrEqual(w * 0.03);
    expect(m.tracks.width).toBeGreaterThanOrEqual(300);
    expect(m.tracks.height).toBeGreaterThanOrEqual(h - 12);
    for (const [i, t] of m.trackCards.entries()) {
      expect(t.card.left).toBeGreaterThanOrEqual(m.tracks.left - 0.5);
      expect(t.card.right).toBeLessThanOrEqual(m.tracks.right + 0.5);
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
    // left column: global controls; right column: FX tiles, HOLD/FX AUS, XY
    const groups = [
      [Object.entries(m.left), (b) => b.right <= m.tracks.left + 0.5],
      [Object.entries(m.right), (b) => b.left >= m.tracks.right - 0.5],
    ];
    for (const [entries, side] of groups)
      for (const [i, [name, b]] of entries.entries()) {
        expect(side(b), name).toBe(true);
        expect(b.left, name).toBeGreaterThanOrEqual(-0.5);
        expect(b.right, name).toBeLessThanOrEqual(w + 0.5);
        for (const [other, c] of entries.slice(i + 1))
          expect(overlap(b, c), `${name} × ${other}`).toBe(false);
      }
    // bar display top-left and larger than before (ring 88px, bar text ≥ 16px)
    expect(m.left[".phase"].top).toBeLessThanOrEqual(8);
    expect(m.left[".phase"].left).toBeLessThanOrEqual(12);
    expect(m.orbit.width).toBeGreaterThanOrEqual(84);
    expect(m.barFont).toBeGreaterThanOrEqual(16);
    expect(m.chordFont).toBeGreaterThanOrEqual(12);
    // PLAY/REC/Stop sit at the bottom of the left column (left thumb)
    expect(h - m.left[".transport"].bottom).toBeLessThanOrEqual(12);
    // XY: big, in the bottom-right quadrant, close to the right thumb corner
    const xy = m.right["#xy"];
    expect(xy.width).toBeGreaterThanOrEqual(120);
    expect(xy.height).toBeGreaterThanOrEqual(120);
    expect(xy.left + xy.width / 2).toBeGreaterThanOrEqual(w * 0.75);
    expect(xy.top + xy.height / 2).toBeGreaterThanOrEqual(h / 2);
    // thumb corner, but ≥ 28px clear of the right/bottom edge (system gestures)
    expect(w - xy.right).toBeGreaterThanOrEqual(28);
    expect(w - xy.right).toBeLessThanOrEqual(40);
    expect(h - xy.bottom).toBeGreaterThanOrEqual(28);
    expect(h - xy.bottom).toBeLessThanOrEqual(44);
    // visible air between HOLD/FX AUS and the XY field
    expect(xy.top - m.right[".fx-hold"].bottom).toBeGreaterThanOrEqual(8);
    expect(m.minFont).toBeGreaterThanOrEqual(11);
    expect(m.clipped).toEqual([]);
    await page.screenshot({ path: `${out}/landscape-${w}x${h}.png` });
  });

test("landscape 844×390 is fully playable: song tap, pattern, STUTTER tile + XY drag, REC button reachable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto("/");
  await page.locator("#play").click();
  await page.waitForFunction(() => window.boomstep.engine.clock.step > 2);
  await page.locator('[data-songcell="1"] .song-next').click();
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
  await page.locator('[data-fx="stutter"]').click();
  await expect(page.locator("#xy-axis")).toContainText("Slice");
  const xy = await page.locator("#xy").boundingBox();
  await page.mouse.move(xy.x + xy.width * 0.8, xy.y + xy.height * 0.2);
  await page.mouse.down();
  await page.mouse.move(xy.x + xy.width * 0.85, xy.y + xy.height * 0.15, {
    steps: 3,
  });
  const fx = await page.evaluate(() => ({ ...window.boomstep.session.fx }));
  expect(fx.depth).toBeGreaterThan(0.6);
  expect(fx.x).toBeGreaterThan(0.6);
  expect(fx.mode).toBe("stutter");
  await expect(page.locator("#xy-axis")).toContainText("1/32");
  await page.screenshot({ path: `${out}/landscape-844x390-xy-held.png` });
  await page.mouse.up();
  expect(await page.evaluate(() => window.boomstep.session.fx.depth)).toBe(0);
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
  expect(m.tracks.right).toBeLessThanOrEqual(m.right[".fx-pads"].left);
  expect(m.left.header.right).toBeLessThanOrEqual(m.tracks.left);
  const all = Object.entries({ ...m.left, ...m.right });
  for (const [i, [name, b]] of all.entries())
    for (const [other, c] of all.slice(i + 1))
      expect(overlap(b, c), `${name} × ${other}`).toBe(false);
  await page.screenshot({ path: `${out}/landscape-1280x720.png` });
  await page.setViewportSize({ width: 390, height: 844 });
  const p = await measure(page);
  // portrait: tracks span the full width, XY sits below the tracks next to the bar display
  expect(p.tracks.width).toBeGreaterThan(360);
  expect(p.right["#xy"].top).toBeGreaterThan(p.tracks.bottom);
  expect(p.perf.bottom).toBeLessThanOrEqual(822);
  await page.screenshot({ path: `${out}/portrait-390x844.png` });
});
