// Additive performance macro. Zero is exactly the existing user mix/pattern baseline.
export const intensityUnit = (n) =>
  Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));
export function intensityTargets(session) {
  const a = intensityUnit(session.intensity ?? 0);
  return {
    amount: a,
    drive: Math.min(1, session.drive + 0.65 * a),
    pump: Math.min(1, session.pump + 0.25 * a),
    headroom: 0.64 * (1 - 0.12 * a),
  };
}
export const intensityName = (a) =>
  a < 0.25 ? "Locker" : a < 0.75 ? "Druck" : "Abriss";
export function intensityEvents(base, track, step, amount, pack) {
  const a = intensityUnit(amount),
    s = step % 16,
    phrase = Math.floor(step / 16) % 8;
  if (!a) return base;
  const out = base.map((e) => ({ ...e, energy: a }));
  if (track === 0) {
    if (a >= 0.25 && s % 4 === 1 && !out.some((e) => e.kind === "hat"))
      out.push({ kind: "hat", velocity: 0.05 + 0.08 * a, energy: a });
    if (a >= 0.5 && s % 4 === 3)
      out.push({
        kind: "rim",
        note: 76,
        velocity: 0.08 + 0.12 * a,
        length: 0.5,
        energy: a,
      });
    if (a >= 0.75 && phrase === 7 && s >= 12)
      out.push({ kind: "snare", velocity: 0.14, offset: 0.5, energy: a });
  }
  if (track === 3 && a >= 0.55 && s % 8 === 6)
    out.push({
      kind: pack.character === "bounce" ? "bouncestab" : "rave",
      note: pack.roots[Math.floor(step / 16) % 4] + 24,
      length: 0.45,
      velocity: 0.08 + 0.08 * a,
      offset: 0.5,
      energy: a,
    });
  return out;
}
export function lightState(
  amount,
  progress,
  bpm,
  running,
  beatLights,
  reduced,
) {
  const a = intensityUnit(amount),
    left = a <= 0.5 ? [57, 215, 237] : [174, 166, 255],
    right = a <= 0.5 ? [174, 166, 255] : [255, 133, 218],
    t = a <= 0.5 ? a * 2 : (a - 0.5) * 2;
  const rgb = left.map((v, i) => Math.round(v + (right[i] - v) * t));
  const beatsPerPulse = Math.max(1, Math.ceil(bpm / 60 / 3));
  const pulse =
    running && beatLights && !reduced
      ? (0.5 +
          0.5 * Math.cos(2 * Math.PI * ((progress * 32) / beatsPerPulse))) **
        2
      : 0;
  return {
    rgb: rgb.join(","),
    accent: `rgb(${rgb.join(",")})`,
    pulse,
    glow: 0.1 + a * 0.24 + pulse * a * 0.14,
    hz: bpm / 60 / beatsPerPulse,
  };
}
