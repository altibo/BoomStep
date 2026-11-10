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
// X is the shared colour filter for ECHO/FLANGER/GATE/DRIVE; STUTTER, TAPE-STOP and CRUSH
// use X for their own parameter (slice length, brake length, bit depth), filter stays open.
export const COLOUR_MODES = ["echo", "flanger", "gate", "drive"];
export function fxTargets(session) {
  const f = session.fx,
    colour = COLOUR_MODES.includes(f.mode);
  return {
    low: Math.min(
      cutoff(session.master),
      colour && f.x < 0.5 ? 180 * (18000 / 180) ** (f.x * 2) : 18000,
    ),
    high: colour && f.x > 0.5 ? 25 * (3500 / 25) ** ((f.x - 0.5) * 2) : 25,
    stutter: f.mode === "stutter" ? f.depth : 0,
    tape: f.mode === "tape" ? f.depth : 0,
    crush: f.mode === "crush" ? f.depth : 0,
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
// STUTTER: slice length in 16th steps from X (left 1/8, middle 1/16, right 1/32).
export const stutterSlice = (x) => (x < 1 / 3 ? 2 : x < 2 / 3 ? 1 : 0.5);
export const sliceName = (steps) =>
  ({ 2: "1/8", 1: "1/16", 0.5: "1/32" })[steps];
// Beat repeat plan for one beat (4 steps) starting at `start`: capture the first slice, then
// loop it; the wet envelope opens after the capture and dips 2ms around every repeat edge so
// loop joins never click. Times are absolute audio-clock seconds.
export function stutterPlan(start, sliceSteps, dt, fade = 0.002) {
  const slice = sliceSteps * dt,
    end = start + 4 * dt,
    edges = [];
  for (let t = start + slice; t < end - 1e-9; t += slice) edges.push(t);
  return { slice, captureEnd: start + slice, end, edges, fade };
}
// TAPE-STOP: brake length from X (half a beat … two bars of beats), Y is the wet amount.
export const tapeSeconds = (x, beat) => beat * (0.5 + x * 3.5);
// Delay-time curve for a linear speed ramp 1 → 0 over `seconds`. A delay line plays at
// speed 1 − d'(t), so d'(t) = t/T and d(t) = t²/(2T) (reaches T/2 at the stop).
export function brakeCurve(seconds, points = 96) {
  const c = new Float32Array(points);
  for (let i = 0; i < points; i++) {
    const t = (i / (points - 1)) * seconds;
    c[i] = (t * t) / (2 * seconds);
  }
  return c;
}
// CRUSH: bit depth from X (left 8 bit … right 2 bit) and a staircase quantiser curve.
export const crushBits = (x) => Math.round(8 - x * 6);
export function crushCurve(bits, size = 8193) {
  const c = new Float32Array(size),
    levels = 2 ** (bits - 1);
  for (let i = 0; i < size; i++) {
    const x = (i / (size - 1)) * 2 - 1;
    c[i] = Math.round(x * levels) / levels;
  }
  return c;
}
