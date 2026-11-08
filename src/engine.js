import { PatternClock, PACKS, eventsAt, hz, cutoff, audible } from "./music.js";
import { encodeWav } from "./wav.js";
export class Engine {
  constructor(session, onUpdate = () => {}) {
    this.session = session;
    this.clock = new PatternClock(session);
    this.onUpdate = onUpdate;
    this.running = false;
    this.recording = false;
    this.timeline = [];
    this.sources = new Set();
  }
  async init() {
    if (this.ctx) return;
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) throw new Error("Dieser Browser unterstützt Web Audio nicht.");
    this.ctx = new C({ latencyHint: "interactive" });
    const c = this.ctx;
    void c.resume();
    this.master = c.createBiquadFilter();
    this.master.type = "lowpass";
    this.dry = c.createGain();
    this.dry.gain.value = 0.72;
    this.limiter = c.createDynamicsCompressor();
    this.limiter.threshold.value = -10;
    this.limiter.knee.value = 15;
    this.limiter.ratio.value = 8;
    this.master.connect(this.dry);
    this.dry.connect(this.limiter);
    this.reverb = c.createConvolver();
    const impulse = c.createBuffer(2, c.sampleRate * 1.7, c.sampleRate);
    let seed = 7;
    for (let ch = 0; ch < 2; ch++) {
      const d = impulse.getChannelData(ch);
      for (let i = 0; i < d.length; i++) {
        seed = (seed * 16807) % 2147483647;
        d[i] = (seed / 1073741824 - 1) * (1 - i / d.length) ** 3;
      }
    }
    this.reverb.buffer = impulse;
    this.wet = c.createGain();
    this.master.connect(this.reverb);
    this.reverb.connect(this.wet);
    this.wet.connect(this.limiter);
    this.strips = this.session.tracks.map((_, i) => {
      const filter = c.createBiquadFilter();
      filter.type = "lowpass";
      const gain = c.createGain(),
        send = c.createGain(),
        delay = c.createDelay(1),
        feedback = c.createGain();
      delay.delayTime.value = (60 / PACKS[this.session.pack].bpm) * 0.75;
      feedback.gain.value = 0.26;
      filter.connect(gain);
      const pan = c.createStereoPanner();
      pan.pan.value = [0, 0, -0.22, 0.2][i];
      gain.connect(pan);
      pan.connect(this.master);
      gain.connect(send);
      send.connect(delay);
      delay.connect(feedback);
      feedback.connect(delay);
      delay.connect(this.master);
      return { filter, gain, send, delay };
    });
    this.noise = c.createBuffer(1, c.sampleRate, c.sampleRate);
    let seed2 = 27;
    const noise = this.noise.getChannelData(0);
    for (let i = 0; i < noise.length; i++) {
      seed2 = (seed2 * 16807) % 2147483647;
      noise[i] = seed2 / 1073741824 - 1;
    }
    // Recorder is optional: audio still works if AudioWorklet is unavailable.
    try {
      await c.audioWorklet.addModule(`${import.meta.env.BASE_URL}recorder.js`);
      this.capture = new AudioWorkletNode(c, "capture", {
        outputChannelCount: [2],
      });
      this.capture.port.onmessage = ({ data }) => {
        if (data.channels) {
          this.chunks.push(data.channels);
          this.recordedFrames += data.channels[0].length;
        }
        if (data.done) {
          this.recording = false;
          const buffer = encodeWav(this.chunks, c.sampleRate);
          this.onRecording?.(buffer, data.limit);
          this.finishRecording?.(buffer);
          this.finishRecording = null;
          this.onUpdate();
        }
      };
      this.limiter.connect(this.capture);
      this.capture.connect(c.destination);
    } catch {
      this.limiter.connect(c.destination);
    }
    this.applyMix();
    c.onstatechange = () => {
      if (
        (c.state === "suspended" || c.state === "interrupted") &&
        this.running
      ) {
        this.running = false;
        this.paused = true;
        clearInterval(this.timer);
        this.onUpdate();
      }
    };
  }
  async play() {
    clearTimeout(this.tailTimer);
    await this.init();
    await this.ctx.resume();
    if (this.running) return;
    this.running = true;
    this.nextTime = this.paused
      ? Math.max(this.nextTime, this.ctx.currentTime)
      : this.ctx.currentTime + 0.06;
    this.paused = false;
    this.pump();
    this.timer = setInterval(() => this.pump(), 20);
    this.onUpdate();
  }
  async pause() {
    if (!this.ctx) return;
    clearInterval(this.timer);
    this.running = false;
    this.paused = true;
    await this.ctx.suspend();
    this.onUpdate();
  }
  async stop() {
    clearInterval(this.timer);
    this.running = false;
    this.paused = false;
    if (this.ctx) {
      await this.ctx.resume();
      for (const source of this.sources) {
        try {
          source.stop();
        } catch {
          /* Already ended. */
        }
      }
      this.sources.clear();
    }
    this.tailTimer = setTimeout(() => {
      if (!this.running && !this.recording) void this.ctx?.suspend();
    }, 2200);
    this.clock.reset();
    this.timeline = [];
    this.onUpdate();
  }
  pump() {
    const c = this.ctx,
      dt = 60 / PACKS[this.session.pack].bpm / 4;
    // If a foreground stall exceeded lookahead, preserve phase and avoid a burst of stale notes.
    if (this.nextTime < c.currentTime - 0.15) {
      const skipped = Math.ceil((c.currentTime - this.nextTime) / dt);
      for (let i = 0; i < skipped; i++) this.clock.tick();
      this.nextTime += skipped * dt;
    }
    while (this.nextTime < c.currentTime + 0.1) {
      const { step, variants } = this.clock.tick();
      const time = this.nextTime;
      this.timeline.push({ step, time, variants });
      for (let i = 0; i < 4; i++)
        for (const e of eventsAt(this.session.pack, i, variants[i], step))
          this.note(e, time, dt, this.strips[i].filter);
      this.nextTime += dt;
    }
    this.timeline = this.timeline.filter((x) => x.time > c.currentTime - 1);
    this.onUpdate();
  }
  position() {
    if (!this.ctx)
      return { step: 0, variants: this.session.tracks.map((t) => t.variant) };
    return (
      this.timeline.filter((x) => x.time <= this.ctx.currentTime).at(-1) || {
        step: Math.max(0, this.clock.step - 1),
        variants: this.session.tracks.map((t) => t.variant),
      }
    );
  }
  queue(i, v) {
    this.clock.queue(i, v, this.running || this.paused);
    this.onUpdate();
  }
  applyMix() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.master.frequency.setTargetAtTime(
      cutoff(this.session.master),
      now,
      0.015,
    );
    this.wet.gain.setTargetAtTime(this.session.reverb * 0.6, now, 0.02);
    this.strips.forEach((strip, i) => {
      const t = this.session.tracks[i];
      strip.gain.gain.setTargetAtTime(
        audible(this.session.tracks, i) ? t.volume : 0,
        now,
        0.01,
      );
      strip.filter.frequency.setTargetAtTime(cutoff(t.filter), now, 0.015);
      strip.send.gain.setTargetAtTime(t.delay * 0.55, now, 0.02);
    });
  }
  note(e, time, dt, dest) {
    const c = this.ctx;
    let source, filter;
    const gain = c.createGain();
    const duration =
      e.kind === "kick"
        ? 0.32
        : e.kind === "snare"
          ? 0.18
          : e.kind === "hat"
            ? 0.055
            : (e.length || 1) * dt;
    if (e.kind === "hat" || e.kind === "snare") {
      source = c.createBufferSource();
      source.buffer = this.noise;
      filter = c.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.value = e.kind === "hat" ? 7000 : 1400;
      source.connect(filter);
      filter.connect(gain);
    } else {
      source = c.createOscillator();
      source.type =
        e.kind === "kick"
          ? "sine"
          : e.kind === "bass"
            ? "triangle"
            : e.kind === "chord"
              ? PACKS[this.session.pack].wave
              : "sine";
      source.frequency.setValueAtTime(
        e.kind === "kick" ? 145 : hz(e.note),
        time,
      );
      if (e.kind === "kick")
        source.frequency.exponentialRampToValueAtTime(42, time + 0.12);
      source.connect(gain);
    }
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(
      e.velocity,
      time + (e.kind === "chord" ? 0.035 : 0.004),
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    gain.connect(dest);
    source.start(time);
    source.stop(time + duration + 0.01);
    this.sources.add(source);
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
      filter?.disconnect();
      this.sources.delete(source);
    };
  }
  async startRecording() {
    await this.init();
    if (!this.capture)
      throw new Error(
        "WAV-Aufnahme benötigt AudioWorklet: bitte HTTPS und einen aktuellen Safari/Chrome verwenden.",
      );
    await this.ctx.resume();
    this.chunks = [];
    this.recordedFrames = 0;
    this.recording = true;
    this.capture.port.postMessage("start");
    if (!this.running) await this.play();
    this.onUpdate();
  }
  async stopRecording() {
    if (!this.recording) return;
    await this.ctx.resume();
    return new Promise((resolve) => {
      this.finishRecording = resolve;
      this.capture.port.postMessage("stop");
    });
  }
  async dispose() {
    clearTimeout(this.tailTimer);
    clearInterval(this.timer);
    if (this.ctx) await this.ctx.close();
  }
}
