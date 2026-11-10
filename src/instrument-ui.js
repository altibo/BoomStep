// UI coordinates only. Audio scheduling stays exclusively in Engine/PatternClock.
export const clamp = (n, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, n));
export function ribbonVariant(x, rect) {
  return Math.min(3, Math.floor(clamp((x - rect.left) / rect.width) * 4));
}
export function orbitPosition(position, now, bpm, running) {
  const dt = 60 / bpm / 4;
  const fraction =
    running && Number.isFinite(position.time)
      ? clamp((now - position.time) / dt)
      : 0;
  const step = ((position.step % 128) + 128) % 128;
  return {
    bar: Math.floor(step / 16),
    chord: Math.floor(step / 16) % 4,
    progress: (step + fraction) / 128,
    beat: Math.floor((step % 16) / 4) + 1,
    stepProgress: ((step % 16) + fraction) / 16,
  };
}
export function orbitPoint(progress, radius = 69) {
  const a = progress * Math.PI * 2 - Math.PI / 2;
  return { x: 80 + Math.cos(a) * radius, y: 80 + Math.sin(a) * radius };
}
export function glideEntry(previous, current) {
  return { current, trigger: current !== null && previous !== current };
}
// Deliberate escape corridor; horizontal drags still clamp to first/last choice.
export function ribbonCancelled(y, rect, margin = 24) {
  return y < rect.top - margin || y > rect.bottom + margin;
}
