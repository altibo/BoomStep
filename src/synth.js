import { hz } from "./music.js";
import { driveCurve } from "./fx.js";
// One deterministic noise buffer per graph. No sampled/licensed recordings.
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
export function createVoice(
  c,
  event,
  time,
  dt,
  destination,
  pack,
  noise,
  register = () => {},
) {
  const e = event,
    kind = e.kind,
    duration =
      kind === "kick"
        ? 0.365
        : kind === "clap"
          ? 0.145
          : kind === "snare"
            ? 0.13
            : kind === "openhat"
              ? 0.16
              : kind === "hat"
                ? 0.04
                : kind === "ride"
                  ? 0.21
                  : (e.length || 1) * dt;
  const amp = c.createGain();
  amp.connect(destination);
  amp.gain.setValueAtTime(0, time);
  const peak = e.velocity;
  if (kind === "kick") {
    amp.gain.linearRampToValueAtTime(peak, time + 0.002);
    amp.gain.exponentialRampToValueAtTime(peak * 0.78, time + 0.03);
    amp.gain.exponentialRampToValueAtTime(peak * 0.45, time + 0.14);
    amp.gain.exponentialRampToValueAtTime(peak * 0.05, time + 0.32);
    amp.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  } else if (kind === "clap") {
    amp.gain.linearRampToValueAtTime(peak, time + 0.001);
    for (const offset of [0.012, 0.024, 0.038]) {
      amp.gain.linearRampToValueAtTime(peak * 0.12, time + offset - 0.003);
      amp.gain.linearRampToValueAtTime(peak, time + offset);
    }
    amp.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  } else {
    amp.gain.linearRampToValueAtTime(
      peak,
      time + (kind === "hoover" ? 0.012 : 0.002),
    );
    if (
      ["donk", "hooverbass", "hoover", "rave", "stab", "acid", "perc"].includes(
        kind,
      )
    )
      amp.gain.setValueAtTime(peak, time + duration * 0.22);
    amp.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  }
  const nodes = [amp],
    sources = [];
  function osc(type, freq, target) {
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, time);
    o.connect(target);
    nodes.push(o);
    sources.push(o);
    return o;
  }
  function gain(value, target) {
    const g = c.createGain();
    g.gain.value = value;
    g.connect(target);
    nodes.push(g);
    return g;
  }
  function filter(type, freq, q, target) {
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, time);
    f.Q.value = q;
    f.connect(target);
    nodes.push(f);
    return f;
  }
  function noiseSource(target, offset = 0) {
    const s = c.createBufferSource();
    s.buffer = noise;
    s.connect(target);
    nodes.push(s);
    sources.push(s);
    s._offset = offset;
    return s;
  }
  if (kind === "kick") {
    const shaper = c.createWaveShaper();
    shaper.curve = driveCurve(pack.character === "steel" ? 3.8 : 2.5, 1025);
    shaper.oversample = "2x";
    shaper.connect(amp);
    nodes.push(shaper);
    const body = gain(0.8, shaper),
      o = osc("sine", 195, body);
    o.frequency.exponentialRampToValueAtTime(56, time + 0.045);
    o.frequency.exponentialRampToValueAtTime(
      pack.character === "hoover" ? 46 : 49,
      time + 0.22,
    );
    const punch = gain(0.11, shaper),
      p = osc("triangle", 115, punch);
    p.frequency.exponentialRampToValueAtTime(48, time + 0.085);
    punch.gain.setValueAtTime(0.11, time);
    punch.gain.exponentialRampToValueAtTime(0.0001, time + 0.11);
    const click = gain(0.13, filter("highpass", 2200, 0.6, shaper));
    click.gain.setValueAtTime(0.13, time);
    click.gain.exponentialRampToValueAtTime(0.0001, time + 0.012);
    noiseSource(click);
  } else if (["hat", "openhat", "ride", "clap", "snare"].includes(kind)) {
    const f = filter(
      kind === "clap" || kind === "snare" ? "bandpass" : "highpass",
      kind === "clap"
        ? 1700
        : kind === "snare"
          ? 2300
          : kind === "ride"
            ? 7200
            : 8500,
      kind === "clap" ? 0.7 : 0.6,
      amp,
    );
    noiseSource(f, kind === "clap" ? 0.13 : kind === "ride" ? 0.41 : 0.3);
    if (kind === "snare") osc("triangle", 180, gain(0.18, amp));
  } else if (kind === "donk") {
    const f = filter("lowpass", 2400, 1, amp),
      carrier = osc("sine", hz(e.note), f),
      modGain = c.createGain();
    nodes.push(modGain);
    modGain.connect(carrier.frequency);
    modGain.gain.setValueAtTime(
      hz(e.note) * (pack.character === "steel" ? 7 : 4) * (e.accent || 1),
      time,
    );
    modGain.gain.exponentialRampToValueAtTime(1, time + 0.11);
    osc("sine", hz(e.note) * 2, modGain);
    carrier.frequency.setValueAtTime(hz(e.note) * 1.6, time);
    carrier.frequency.exponentialRampToValueAtTime(hz(e.note), time + 0.025);
    osc("triangle", hz(e.note), gain(0.2, f));
  } else if (["hoover", "hooverbass", "rave", "stab", "acid"].includes(kind)) {
    const isBass = kind === "hooverbass",
      f = filter(
        "lowpass",
        kind === "acid"
          ? 3600
          : isBass
            ? 1700
            : pack.character === "steel"
              ? 2800
              : 4500,
        kind === "acid" ? 5.5 : 1.2,
        amp,
      );
    f.frequency.exponentialRampToValueAtTime(
      kind === "acid" ? 450 : isBass ? 500 : 1000,
      time + duration,
    );
    const detunes =
      kind === "hoover" || isBass
        ? [-16, -7, 7, 16]
        : kind === "rave"
          ? [-7, 7]
          : [0, 8];
    for (const d of detunes) {
      const o = osc(
        kind === "acid" ? "sawtooth" : pack.wave,
        hz(e.note),
        gain(1 / detunes.length, f),
      );
      o.detune.value = d;
      if (kind === "hoover" || isBass) {
        o.frequency.setValueAtTime(hz(e.note) * 1.45, time);
        o.frequency.exponentialRampToValueAtTime(hz(e.note), time + 0.04);
      }
    }
  } else if (kind === "perc" || kind === "tom") {
    const o = osc("sine", hz(e.note) * 1.8, amp);
    o.frequency.exponentialRampToValueAtTime(hz(e.note), time + duration * 0.8);
  } else {
    osc(
      kind === "bass" ? "triangle" : kind === "chord" ? pack.wave : "sine",
      hz(e.note),
      amp,
    );
  }
  for (const source of sources) {
    source.start(time, source._offset || 0);
    source.stop(time + duration + 0.015);
    register(source);
  }
  if (sources.length)
    sources[0].onended = () => {
      for (const n of nodes) n.disconnect();
    };
  return sources;
}
