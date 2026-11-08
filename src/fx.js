import { intensityTargets } from "./intensity.js";
import { cutoff } from "./music.js";
export const clamp = (n) => Math.max(0, Math.min(1, n));
export function xyPoint(x, y, rect) {
  return {
    x: clamp((x - rect.left) / rect.width),
    depth: clamp(1 - (y - rect.top) / rect.height),
  };
}
export function releaseFX(fx) {
  return fx.hold ? { ...fx } : { ...fx, x: 0.5, depth: 0 };
}
export function fxTargets(session) {
  const f = session.fx;
  return {
    low: Math.min(
      cutoff(session.master),
      f.x < 0.5 ? 180 * (18000 / 180) ** (f.x * 2) : 18000,
    ),
    high: f.x > 0.5 ? 25 * (3500 / 25) ** ((f.x - 0.5) * 2) : 25,
    echo: f.mode === "echo" ? f.depth * 0.62 : 0,
    flanger: f.mode === "flanger" ? f.depth * 0.78 : 0,
    drive: clamp(
      intensityTargets(session).drive +
        (f.mode === "drive" ? f.depth * 0.85 : 0),
    ),
    gate: f.mode === "gate" ? f.depth : 0,
  };
}
export function gateSegments(step, division, dt) {
  return division === 16
    ? [
        { offset: 0, open: true },
        { offset: dt * 0.5, open: false },
      ]
    : [{ offset: 0, open: step % 2 === 0 }];
}
export const gateLevel = (open, depth) => (open ? 1 : 1 - depth * 0.97);
export function driveCurve(amount = 4, size = 4097) {
  const curve = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    const x = (i / (size - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * amount) / Math.tanh(amount);
  }
  return curve;
}
export function ceilingCurve() {
  const c = new Float32Array(4097);
  for (let i = 0; i < c.length; i++)
    c[i] = 0.94 * Math.tanh(((i / (c.length - 1)) * 2 - 1) * 1.8);
  return c;
}
export function panicSession(session) {
  session.intensity = 0;
  session.master = 1;
  session.reverb = 0;
  session.drive = 0;
  session.pump = 0;
  session.fx = { ...session.fx, x: 0.5, depth: 0, hold: false };
  for (const t of session.tracks) {
    t.delay = 0;
    t.filter = 1;
  }
}
