import { driveCurve } from "./fx.js";
import { INSTRUMENTS, nearestZone } from "./samples.js";
// Deterministic noise only for the UP SWEEP riser; every tonal/drum voice plays a CC0 sample.
export function noiseBuffer(c) {
  const b = c.createBuffer(1, c.sampleRate, c.sampleRate),
    data = b.getChannelData(0);
  let seed = 27;
  for (let i = 0; i < data.length; i++) {
    seed = (seed * 16807) % 2147483647;
    data[i] = seed / 1073741824 - 1;
  }
  return b;
}
const DRUM_GAIN = {
  kick: 1.05,
  kickround: 1.05,
  kickdeep: 1.1,
  snare: 0.7,
  snaredark: 0.75,
  clap: 0.62,
  hat: 0.5,
  openhat: 0.42,
  rim: 0.5,
  tom: 0.62,
  conga: 0.62,
  clave: 0.42,
  shaker: 0.42,
  ride: 0.32,
};
export function createVoice(
  c,
  event,
  time,
  dt,
  destination,
  library,
  noise,
  register = () => {},
) {
  const e = event,
    energy = Math.max(0, Math.min(1, e.energy || 0)),
    nodes = [],
    sources = [];
  const node = (n) => (nodes.push(n), n);
  const start = (s, at = time, offset = 0, stopAt) => {
    s.start(at, offset);
    if (stopAt !== undefined) s.stop(stopAt);
    sources.push(s);
  };
  const amp = node(c.createGain());
  amp.connect(destination);
  if (e.kind === "rise") {
    const d = e.seconds;
    amp.gain.setValueAtTime(0.0001, time);
    amp.gain.linearRampToValueAtTime(e.velocity, time + d * 0.8);
    amp.gain.linearRampToValueAtTime(0, time + d);
    const f = node(c.createBiquadFilter());
    f.type = "bandpass";
    f.Q.value = 1.1;
    f.frequency.setValueAtTime(220, time);
    f.frequency.exponentialRampToValueAtTime(9000, time + d);
    f.connect(amp);
    const n = node(c.createBufferSource());
    n.buffer = noise;
    n.loop = true;
    n.connect(f);
    start(n, time, 0, time + d + 0.02);
  } else if (e.kind === "tone") {
    const inst = INSTRUMENTS[e.inst],
      zone = nearestZone(library.instruments[e.inst], e.note),
      duration = e.seconds ?? (e.length || 1) * dt,
      end = time + duration,
      src = node(c.createBufferSource()),
      rate = 2 ** ((e.note - zone.root) / 12);
    src.buffer = zone.buffer;
    src.playbackRate.setValueAtTime(rate, time);
    if (e.glide)
      src.playbackRate.exponentialRampToValueAtTime(
        rate * 2 ** (e.glide / 12),
        end,
      );
    const f = node(c.createBiquadFilter());
    f.type = "lowpass";
    f.Q.value = inst.q;
    const cut = Math.min(16000, (e.cutoff || 3000) * (1 + energy * 0.7));
    f.frequency.setValueAtTime(Math.min(16000, cut * inst.pluck), time);
    f.frequency.setTargetAtTime(cut, time + 0.005, 0.06);
    src.connect(f);
    f.connect(amp);
    const peak = e.velocity * inst.gain;
    amp.gain.setValueAtTime(0, time);
    amp.gain.linearRampToValueAtTime(peak, time + inst.attack);
    amp.gain.setValueAtTime(peak, Math.max(time + inst.attack, end));
    amp.gain.setTargetAtTime(
      0,
      Math.max(time + inst.attack, end),
      inst.release / 4,
    );
    start(
      src,
      time,
      0,
      Math.min(
        end + inst.release * 1.2,
        time + zone.buffer.duration / rate + 0.01,
      ),
    );
  } else {
    const key = e.sample || e.kind,
      buffer = library.drums[key];
    if (!buffer) throw new Error(`Unbekanntes Drumsample ${key}`);
    const src = node(c.createBufferSource());
    src.buffer = buffer;
    src.playbackRate.value = e.rate || 1;
    let target = amp;
    if (e.kind === "kick" && energy > 0) {
      const shaper = node(c.createWaveShaper());
      shaper.curve = driveCurve(1 + energy * 2.6, 1025);
      shaper.oversample = "2x";
      shaper.connect(amp);
      target = shaper;
    }
    src.connect(target);
    const peak = e.velocity * (DRUM_GAIN[key] ?? 0.6);
    amp.gain.setValueAtTime(peak, time);
    const length = e.seconds ?? buffer.duration / (e.rate || 1);
    if (e.seconds !== undefined)
      amp.gain.setTargetAtTime(0, time + length, 0.01);
    start(src, time, 0, time + length + 0.06);
  }
  for (const s of sources) register(s);
  const last = sources.at(-1);
  last?.addEventListener("ended", () => {
    for (const n of nodes) n.disconnect();
  });
  return nodes;
}
