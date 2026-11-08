import { specialPlan, oldestSpecial } from "./specials.js";
import {
  PatternClock,
  PACKS,
  eventsAt,
  cutoff,
  audible,
  initialSession,
} from "./music.js";
import {
  fxTargets,
  driveCurve,
  ceilingCurve,
  gateSegments,
  gateLevel,
} from "./fx.js";
import { createVoice, noiseBuffer } from "./synth.js";
import { encodeWav } from "./wav.js";
export class Engine {
  constructor(session, onUpdate = () => {}) {
    this.session = session;
    this.clock = new PatternClock(session);
    this.onUpdate = onUpdate;
    this.running = false;
    this.paused = false;
    this.recording = false;
    this.timeline = [];
    this.sources = new Set();
    this.loopSources = new Set();
    this.specialGroups = [];
    this.specialTriggerCount = 0;
  }
  createGraph(c) {
    this.ctx = c;
    this.master = c.createBiquadFilter();
    this.master.type = "lowpass";
    this.highpass = c.createBiquadFilter();
    this.highpass.type = "highpass";
    this.master.connect(this.highpass);
    this.driveDry = c.createGain();
    this.driveWet = c.createGain();
    this.distortion = c.createWaveShaper();
    this.distortion.curve = driveCurve(5);
    this.distortion.oversample = "2x";
    this.driveOut = c.createGain();
    this.driveOut.gain.value = 0.64;
    this.highpass.connect(this.driveDry);
    this.highpass.connect(this.distortion);
    this.distortion.connect(this.driveWet);
    this.driveDry.connect(this.driveOut);
    this.driveWet.connect(this.driveOut);
    // Short modulated delay is a genuine feedback flanger, not a label on a filter.
    this.flange = c.createDelay(0.03);
    this.flange.delayTime.value = 0.0035;
    this.flangeFeedback = c.createGain();
    this.flangeFeedback.gain.value = 0.38;
    this.flangeWet = c.createGain();
    this.flangeWet.gain.value = 0;
    this.flangeOut = c.createGain();
    this.driveOut.connect(this.flangeOut);
    this.driveOut.connect(this.flange);
    this.flange.connect(this.flangeFeedback);
    this.flangeFeedback.connect(this.flange);
    this.flange.connect(this.flangeWet);
    this.flangeWet.connect(this.flangeOut);
    this.lfo = c.createOscillator();
    this.lfo.frequency.value = 0.28;
    this.lfoGain = c.createGain();
    this.lfoGain.gain.value = 0.0025;
    this.lfo.connect(this.lfoGain);
    this.lfoGain.connect(this.flange.delayTime);
    this.lfo.start();
    this.echo = c.createDelay(1);
    this.echo.delayTime.value = (60 / PACKS[this.session.pack].bpm) * 0.75;
    this.echoFeedback = c.createGain();
    this.echoFeedback.gain.value = 0.42;
    this.echoWet = c.createGain();
    this.echoWet.gain.value = 0;
    this.flangeOut.connect(this.echo);
    this.echo.connect(this.echoFeedback);
    this.echoFeedback.connect(this.echo);
    this.echo.connect(this.echoWet);
    this.reverb = c.createConvolver();
    const impulse = c.createBuffer(2, c.sampleRate * 1.2, c.sampleRate);
    let seed = 7;
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < data.length; i++) {
        seed = (seed * 16807) % 2147483647;
        data[i] = (seed / 1073741824 - 1) * (1 - i / data.length) ** 3;
      }
    }
    this.reverb.buffer = impulse;
    this.wet = c.createGain();
    this.wet.gain.value = 0;
    this.flangeOut.connect(this.reverb);
    this.reverb.connect(this.wet);
    this.gate = c.createGain();
    this.flangeOut.connect(this.gate);
    this.echoWet.connect(this.gate);
    this.wet.connect(this.gate);
    this.limiter = c.createDynamicsCompressor();
    this.limiter.threshold.value = -6;
    this.limiter.knee.value = 3;
    this.limiter.ratio.value = 16;
    this.limiter.attack.value = 0.002;
    this.limiter.release.value = 0.085;
    this.gate.connect(this.limiter);
    this.ceiling = c.createWaveShaper();
    this.ceiling.curve = ceilingCurve();
    this.limiter.connect(this.ceiling);
    this.loopBus = c.createGain();
    this.loopBus.connect(this.master);
    this.specialGain = c.createGain();
    this.specialGain.gain.value = 0;
    this.specialGain.connect(this.master);
    this.strips = this.session.tracks.map((_, i) => {
      const filter = c.createBiquadFilter();
      filter.type = "lowpass";
      const gain = c.createGain(),
        duck = c.createGain(),
        pan = c.createStereoPanner(),
        send = c.createGain(),
        delay = c.createDelay(1),
        feedback = c.createGain(),
        returnGain = c.createGain();
      gain.gain.value = 0;
      send.gain.value = 1;
      returnGain.gain.value = 0;
      pan.pan.value = [0, 0, -0.16, 0.16][i];
      delay.delayTime.value = (60 / PACKS[this.session.pack].bpm) * 0.75;
      feedback.gain.value = 0.3;
      filter.connect(gain);
      gain.connect(duck);
      duck.connect(pan);
      pan.connect(this.loopBus);
      duck.connect(send);
      send.connect(delay);
      delay.connect(feedback);
      feedback.connect(delay);
      delay.connect(returnGain);
      returnGain.connect(this.loopBus);
      return { filter, gain, duck, send: returnGain, delay };
    });
    this.noise = noiseBuffer(c);
    this.applyMix();
  }
  init() {
    if (!this.initPromise) this.initPromise = this.initialize();
    return this.initPromise;
  }
  async initialize() {
    if (this.ctx) return;
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) throw new Error("Dieser Browser unterstützt Web Audio nicht.");
    const c = new C({ latencyHint: "interactive" });
    void c.resume();
    this.createGraph(c);
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
      this.ceiling.connect(this.capture);
      this.capture.connect(c.destination);
    } catch {
      this.capture = null;
      this.ceiling.connect(c.destination);
    }
    c.onstatechange = () => {
      if (
        (c.state === "suspended" || c.state === "interrupted") &&
        this.running
      ) {
        this.frozenPosition = this.position();
        this.pauseAnchor = {
          time: c.currentTime,
          nextTime: this.nextTime,
          timeline: this.timeline.map((p) => ({ ...p })),
        };
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
    if (this.pausedWithSpecials) {
      const shift = this.ctx.currentTime - this.pauseAnchor.time;
      this.timeline = this.pauseAnchor.timeline.map((p) => ({
        ...p,
        time: p.time + shift,
      }));
      this.nextTime = this.pauseAnchor.nextTime + shift;
      const dt = 60 / PACKS[this.session.pack].bpm / 4;
      for (const p of this.timeline)
        if (p.time > this.ctx.currentTime)
          this.scheduleStep(p.step, p.time, dt, p.variants);
      this.pausedWithSpecials = false;
    }
    this.loopBus.gain.setTargetAtTime(1, this.ctx.currentTime, 0.008);
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
    this.frozenPosition = this.position();
    this.paused = true;
    this.pauseAnchor = {
      time: this.ctx.currentTime,
      nextTime: this.nextTime,
      timeline: this.timeline.map((p) => ({ ...p })),
    };
    await this.ctx.suspend();
    this.onUpdate();
  }
  async stop() {
    clearInterval(this.timer);
    this.running = false;
    this.paused = false;
    this.pausedWithSpecials = false;
    this.pauseAnchor = null;
    if (this.ctx) {
      await this.ctx.resume();
      for (const source of this.sources) {
        try {
          source.stop();
        } catch {
          /* Ended. */
        }
      }
      this.sources.clear();
      this.gate.gain.cancelScheduledValues(this.ctx.currentTime);
      this.gate.gain.setTargetAtTime(1, this.ctx.currentTime, 0.015);
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
    if (this.nextTime < c.currentTime - 0.15) {
      const skipped = Math.ceil((c.currentTime - this.nextTime) / dt);
      for (let i = 0; i < skipped; i++) this.clock.tick();
      this.nextTime += skipped * dt;
    }
    while (this.nextTime < c.currentTime + 0.1) {
      const { step, variants } = this.clock.tick();
      const time = this.nextTime;
      this.timeline.push({ step, time, variants });
      this.scheduleStep(step, time, dt, variants);
      this.nextTime += dt;
    }
    this.timeline = this.timeline.filter((x) => x.time > c.currentTime - 1);
    this.onUpdate();
  }
  scheduleStep(
    step,
    time,
    dt,
    variants = this.session.tracks.map((t) => t.variant),
  ) {
    const all = Array.from({ length: 4 }, (_, i) =>
      eventsAt(this.session.pack, i, variants[i], step),
    );
    if (
      all[0].some((e) => e.kind === "kick" || e.kind === "bouncekick") &&
      audible(this.session.tracks, 0) &&
      this.session.tracks[0].volume > 0.001
    )
      this.duckAt(time);
    this.scheduleGate(step, time, dt);
    for (let i = 0; i < 4; i++)
      for (const e of all[i])
        this.note(e, time + (e.offset || 0) * dt, dt, this.strips[i].filter);
  }
  duckAt(time) {
    for (let i = 1; i < 4; i++) {
      const gain = this.strips[i].duck.gain,
        depth = this.session.pump * [0, 1, 0.72, 0.55][i];
      gain.cancelScheduledValues(time);
      gain.setValueAtTime(1, time);
      gain.linearRampToValueAtTime(1 - depth * 0.92, time + 0.003);
      gain.setTargetAtTime(1, time + 0.022, 0.046);
    }
  }
  scheduleGate(step, time, dt) {
    if (!this.gate) return;
    const depth = fxTargets(this.session).gate;
    for (const part of gateSegments(step, this.session.fx.division, dt))
      this.gate.gain.setTargetAtTime(
        gateLevel(part.open, depth),
        time + part.offset,
        0.003,
      );
  }
  position() {
    if (this.paused && this.frozenPosition) return this.frozenPosition;
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
    const now = this.ctx.currentTime,
      target = fxTargets(this.session),
      ramp = (param, value, tau = 0.025) =>
        param.setTargetAtTime(value, now, tau);
    ramp(this.master.frequency, target.low);
    ramp(this.highpass.frequency, target.high);
    ramp(this.driveDry.gain, 1 - target.drive * 0.38);
    ramp(this.driveWet.gain, target.drive * 0.65);
    ramp(this.echoWet.gain, target.echo);
    ramp(this.flangeWet.gain, target.flanger);
    ramp(this.wet.gain, this.session.reverb * 0.65);
    ramp(this.specialGain.gain, this.session.specialLevel * 0.55);
    this.strips.forEach((strip, i) => {
      const t = this.session.tracks[i];
      ramp(
        strip.gain.gain,
        audible(this.session.tracks, i) ? t.volume : 0,
        0.01,
      );
      ramp(strip.filter.frequency, cutoff(t.filter));
      ramp(strip.send.gain, t.delay * 0.55);
    });
    this.gate.gain.cancelScheduledValues(now);
    ramp(this.gate.gain, 1, 0.015);
    // Re-plan only already queued audio-time gate edges after a live gesture.
    const dt = 60 / PACKS[this.session.pack].bpm / 4;
    for (const p of this.timeline)
      if (p.time >= now) this.scheduleGate(p.step, p.time, dt);
  }
  note(e, time, dt, dest, group) {
    return createVoice(
      this.ctx,
      e,
      time,
      dt,
      dest,
      PACKS[this.session.pack],
      this.noise,
      (source) => {
        this.sources.add(source);
        if (group) group.sources.add(source);
        else this.loopSources.add(source);
        source.addEventListener("ended", () => {
          this.sources.delete(source);
          this.loopSources.delete(source);
          if (group) {
            group.sources.delete(source);
            if (!group.sources.size) this.finishSpecial(group);
          }
        });
      },
    );
  }
  finishSpecial(group) {
    group.gain.disconnect();
    this.specialGroups = this.specialGroups.filter((g) => g !== group);
    this.onUpdate();
    this.idleAfterSpecial();
  }
  idleAfterSpecial() {
    if (this.disposed) return;
    if (typeof this.ctx?.startRendering === "function") return;
    clearTimeout(this.specialIdleTimer);
    if (!this.running && !this.recording && !this.specialGroups.length)
      this.specialIdleTimer = setTimeout(() => {
        if (!this.running && !this.recording && !this.specialGroups.length)
          void this.ctx?.suspend();
      }, 1500);
  }
  releaseSpecial(group) {
    const now = this.ctx.currentTime;
    group.gain.gain.cancelScheduledValues(now);
    group.gain.gain.setTargetAtTime(0, now, 0.004);
    for (const source of group.sources) {
      try {
        source.stop(now + 0.015);
      } catch {
        /* Ended. */
      }
    }
    this.specialGroups = this.specialGroups.filter((g) => g !== group);
  }
  scheduleSpecial(id, when, step = this.position().step, limit = true) {
    const plan = specialPlan(id, this.session.pack, step),
      old = limit ? oldestSpecial(this.specialGroups) : undefined;
    if (old) this.releaseSpecial(old);
    const gain = this.ctx.createGain();
    gain.gain.value = 1;
    gain.connect(this.specialGain);
    const group = { id, gain, sources: new Set() };
    this.specialGroups.push(group);
    this.specialTriggerCount++;
    const dt = 60 / PACKS[this.session.pack].bpm / 4;
    for (const item of plan)
      this.note(item.event, when + item.offset, dt, gain, group);
    this.onUpdate();
    return group;
  }
  async triggerSpecial(id) {
    clearTimeout(this.specialIdleTimer);
    clearTimeout(this.tailTimer);
    await this.init();
    if (this.paused && !this.pausedWithSpecials) {
      this.frozenPosition = this.position();
      this.pauseAnchor = {
        time: this.ctx.currentTime,
        nextTime: this.nextTime,
        timeline: this.timeline.map((p) => ({ ...p })),
      };
      this.loopBus.gain.cancelScheduledValues(this.ctx.currentTime);
      this.loopBus.gain.setValueAtTime(0, this.ctx.currentTime);
      for (const source of this.loopSources) {
        try {
          source.stop();
        } catch {
          /* Ended. */
        }
      }
      this.pausedWithSpecials = true;
    }
    await this.ctx.resume();
    return this.scheduleSpecial(id, this.ctx.currentTime + 0.004);
  }
  async startRecording() {
    await this.init();
    if (!this.capture)
      throw new Error(
        "WAV-Aufnahme benötigt AudioWorklet: bitte HTTPS und aktuellen Safari/Chrome verwenden.",
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
    this.disposed = true;
    clearTimeout(this.tailTimer);
    clearTimeout(this.specialIdleTimer);
    clearInterval(this.timer);
    if (this.ctx) await this.ctx.close();
  }
}
// The same synth/FX graph, rendered without a speaker or worklet for deterministic signal tests.
export async function renderDiagnostic({
  pack = 0,
  track,
  variant = 0,
  mode = "echo",
  depth = 0,
  x = 0.5,
  seconds = 3.3,
  pump = 0.7,
  reverb = 0,
  bars,
  specials = [],
  onlySpecials = false,
} = {}) {
  const c = new OfflineAudioContext(2, Math.ceil(seconds * 48000), 48000),
    s = initialSession();
  s.pack = pack;
  s.reverb = reverb;
  s.drive = 0.08;
  s.pump = pump;
  s.fx = { ...s.fx, mode, depth, x };
  if (track !== undefined)
    s.tracks.forEach((t, i) => {
      t.mute = i !== track;
      t.variant = variant;
    });
  else
    s.tracks.forEach((t) => {
      t.variant = variant;
    });
  const e = new Engine(s);
  e.createGraph(c);
  e.ceiling.connect(c.destination);
  const dt = 60 / PACKS[pack].bpm / 4;
  if (!onlySpecials)
    for (
      let step = 0;
      0.05 + step * dt < seconds - 0.1 &&
      (bars === undefined || step < bars * 16);
      step++
    )
      e.scheduleStep(step, 0.05 + step * dt, dt);
  for (const shot of specials)
    e.scheduleSpecial(
      shot.id,
      shot.time + 0.05,
      shot.step ?? Math.floor(shot.time / dt),
      false,
    );
  return c.startRendering();
}
