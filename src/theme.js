// Colour helpers mirroring the CSS color-mix(in srgb, …) recipes, used for contrast checks.
export const hexRgb = (hex) =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
export const mix = (a, b, share) =>
  a.map((v, i) => Math.round(v * share + b[i] * (1 - share)));
export function luminance(rgb) {
  return rgb
    .map((n) => n / 255)
    .map((n) => (n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4))
    .reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
}
export const contrast = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
export function hue([r, g, b]) {
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    d = max - min;
  if (!d) return 0;
  const h =
    max === r
      ? ((g - b) / d) % 6
      : max === g
        ? (b - r) / d + 2
        : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}
export const AMBER = "#ffbc4d";
export const RED = "#ff637a";
// Surfaces exactly as style.css builds them from --theme/--song.
export function surfaces(color, lift = 0) {
  const c = hexRgb(color),
    white = [255, 255, 255],
    accent = mix(white, c, lift),
    rgb = (h) => hexRgb(h);
  return {
    accent,
    page: mix(c, rgb("#050b14"), 0.08),
    pageGlow: mix(c, mix(c, rgb("#050b14"), 0.08), 0.16),
    card: mix(c, rgb("#0c1824"), 0.09),
    songCell: mix(c, rgb("#0a1520"), 0.14),
    pressed: mix(accent, rgb("#0c1824"), 0.22),
    button: mix(c, rgb("#0f1c28"), 0.07),
  };
}
