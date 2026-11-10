import { intensityTargets, intensityEvents } from "./intensity.js";
import {
  PatternClock,
  BPM,
  STEP_SECONDS,
  eventsAt,
  cutoff,
  audible,
  initialSession,
} from "./music.js";
import { loadBank } from "./samples.js";
import {
  fxTargets,
  driveCurve,
  ceilingCurve,
  gateSegments,
  gateLevel,
  stutterSlice,
  stutterPlan,
  tapeSeconds,
  brakeCurve,
  crushBits,
  crushCurve,
} from "./fx.js";
import { createVoice } from "./synth.js";
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
    this.stutterCount = 0;
    this.tapeBrakes = 0;
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
    this.echo.delayTime.value = (60 / BPM) * 0.75;
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
    // Post-gate performance stage: CRUSH → TAPE-STOP → STUTTER → limiter.
    this.crushDry = c.createGain();
    this.crushWet = c.createGain();
    this.crushWet.gain.value = 0;
    this.crusher = c.createWaveShaper();
    this.crushBits = 8;
    this.crusher.curve = crushCurve(8);
    this.crushOut = c.createGain();
    this.gate.connect(this.crushDry);
    this.gate.connect(this.crusher);
    this.crusher.connect(this.crushWet);
    this.crushDry.connect(this.crushOut);
    this.crushWet.connect(this.crushOut);
    // Tape brake: a delay line whose delay grows like d(t) = t²/2T, i.e. playback speed
    // (1 − d′) falls linearly to zero (pitch and tempo drop together), with a fade to silence.
    this.tapeDelay = c.createDelay(2);
    this.tapeDelay.delayTime.value = 0;
    this.tapeEnv = c.createGain();
    this.tapeEnv.gain.value = 0;
    this.tapeMix = c.createGain();
    this.tapeMix.gain.value = 0;
    this.tapeDry = c.createGain();
    this.tapeOut = c.createGain();
    this.crushOut.connect(this.tapeDry);
    this.crushOut.connect(this.tapeDelay);
    this.tapeDelay.connect(this.tapeEnv);
    this.tapeEnv.connect(this.tapeMix);
    this.tapeDry.connect(this.tapeOut);
    this.tapeMix.connect(this.tapeOut);
    // Beat repeat: capture a slice into a delay line, then close the input and loop it with
    // feedback 1. One envelope (0 = dry, 1 = repeat) drives both paths via depth-scaled gains.
    // Beat repeat without a feedback loop: Web Audio delays inside a cycle add one render
    // quantum (128 frames) per pass, so the repeats would drift. Instead seven taps read the
    // captured slice at k·slice (k = 1…7, 1/32 needs seven), each gated on only in its window.
    this.stIn = c.createGain();
    this.stIn.gain.value = 0;
    this.stTaps = Array.from({ length: 7 }, () => {
      const delay = c.createDelay(1),
        gain = c.createGain();
      gain.gain.value = 0;
      this.stIn.connect(delay);
      delay.connect(gain);
      return { delay, gain };
    });
    this.stWet = c.createGain();
    this.stWet.gain.value = 0;
    this.stDry = c.createGain();
    this.stDry.gain.value = 1;
    this.stEnv = c.createConstantSource();
    this.stEnv.offset.value = 0;
    this.envToWet = c.createGain();
    this.envToWet.gain.value = 0;
    this.envToDry = c.createGain();
    this.envToDry.gain.value = 0;
    this.stEnv.connect(this.envToWet);
    this.stEnv.connect(this.envToDry);
    this.envToWet.connect(this.stWet.gain);
    this.envToDry.connect(this.stDry.gain);
    this.stEnv.start();
    this.tapeOut.connect(this.stDry);
    this.tapeOut.connect(this.stIn);
    for (const tap of this.stTaps) tap.gain.connect(this.stWet);
    this.stDry.connect(this.limiter);
    this.stWet.connect(this.limiter);
    this.ceiling = c.createWaveShaper();
    this.ceiling.curve = ceilingCurve();
    this.limiter.connect(this.ceiling);
    this.loopBus = c.createGain();
    this.loopBus.connect(this.master);
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
      delay.delayTime.value = (60 / BPM) * 0.75;
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
    this.library = await loadBank(c);
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
      this.resetStutter(this.ctx.currentTime);
      this.releaseTape(this.ctx.currentTime);
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
      dt = STEP_SECONDS;
    if (this.nextTime < c.currentTime - 0.15) {
      const skipped = Math.ceil((c.currentTime - this.nextTime) / dt);
      for (let i = 0; i < skipped; i++) this.clock.tick();
      this.nextTime += skipped * dt;
    }
    while (this.nextTime < c.currentTime + 0.1) {
      const { step, choices } = this.clock.tick();
      const time = this.nextTime;
      this.timeline.push({ step, time, choices });
      this.scheduleStep(step, time, dt, choices);
      this.nextTime += dt;
    }
    this.timeline = this.timeline.filter((x) => x.time > c.currentTime - 1);
    this.onUpdate();
  }
  scheduleStep(
    step,
    time,
    dt,
    choices = this.session.tracks.map((t) => ({
      song: t.song,
      variant: t.variant,
    })),
  ) {
    const all = Array.from({ length: 4 }, (_, i) =>
      intensityEvents(
        eventsAt(choices, i, step),
        i,
        step,
        this.session.intensity,
        choices,
      ),
    );
    if (
      all[0].some((e) => e.kind === "kick") &&
      audible(this.session.tracks, 0) &&
      this.session.tracks[0].volume > 0.001
    )
      this.duckAt(time);
    this.scheduleGate(step, time, dt);
    if (step % 4 === 0) this.scheduleStutter(time, dt);
    for (let i = 0; i < 4; i++)
      for (const e of all[i])
        this.note(e, time + (e.offset || 0) * dt, dt, this.strips[i].filter);
  }
  duckAt(time) {
    for (let i = 1; i < 4; i++) {
      const gain = this.strips[i].duck.gain,
        depth = intensityTargets(this.session).pump * [0, 1, 0.72, 0.55][i];
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
  // Beat repeat, quantised to the audio clock: planned at every beat while STUTTER is the
  // selected mode (also at depth 0), so raising Y engages at once inside the planned beat.
  scheduleStutter(start, dt) {
    if (this.session.fx.mode !== "stutter") return;
    const plan = stutterPlan(start, stutterSlice(this.session.fx.x), dt),
      env = this.stEnv.offset,
      f = plan.fade;
    env.cancelScheduledValues(start);
    this.stIn.gain.cancelScheduledValues(start);
    // capture exactly one slice; the taps replay it, each in its own window
    this.stIn.gain.setValueAtTime(1, start);
    this.stIn.gain.setValueAtTime(0, plan.captureEnd);
    this.stTaps.forEach((tap, i) => {
      const k = i + 1,
        on = start + k * plan.slice,
        live = on < plan.end - 1e-6;
      tap.gain.gain.cancelScheduledValues(start);
      tap.gain.gain.setValueAtTime(0, start);
      tap.delay.delayTime.setValueAtTime(Math.min(k * plan.slice, 1), start);
      if (!live) return;
      // switches happen at the edges, where the envelope dips to zero (click-free)
      tap.gain.gain.setValueAtTime(1, on);
      tap.gain.gain.setValueAtTime(0, Math.min(on + plan.slice, plan.end));
    });
    env.setValueAtTime(0, start);
    env.setValueAtTime(0, plan.captureEnd);
    env.linearRampToValueAtTime(1, plan.captureEnd + f);
    for (const edge of plan.edges.slice(2)) {
      env.setValueAtTime(1, edge - f);
      env.linearRampToValueAtTime(0, edge);
      env.linearRampToValueAtTime(1, edge + f);
    }
    env.setValueAtTime(1, plan.end - f * 1.5);
    env.linearRampToValueAtTime(0, plan.end);
    this.stutterCount++;
  }
  resetStutter(now) {
    const env = this.stEnv.offset;
    env.cancelScheduledValues(now);
    env.setTargetAtTime(0, now, 0.003);
    this.stIn.gain.cancelScheduledValues(now);
    this.stIn.gain.setValueAtTime(0, now);
    for (const tap of this.stTaps) {
      tap.gain.gain.cancelScheduledValues(now);
      tap.gain.gain.setTargetAtTime(0, now + 0.012, 0.003);
    }
  }
  // Tape brake starts on the next 16th grid line after Y leaves zero; stays stopped until release.
  engageTape(now) {
    const dt = STEP_SECONDS,
      next =
        this.timeline.find((p) => p.time > now + 0.003)?.time ?? now + 0.005,
      seconds = tapeSeconds(this.session.fx.x, dt * 4),
      d = this.tapeDelay.delayTime,
      g = this.tapeEnv.gain;
    this.tapeActive = true;
    this.tapeBrakes++;
    d.cancelScheduledValues(now);
    d.setValueAtTime(0, now);
    d.setValueCurveAtTime(brakeCurve(seconds), next, seconds);
    g.cancelScheduledValues(now);
    g.setValueAtTime(0, now);
    g.setValueAtTime(0, next);
    g.linearRampToValueAtTime(1, next + 0.003);
    g.setValueAtTime(1, next + seconds * 0.55);
    g.linearRampToValueAtTime(0, next + seconds);
  }
  releaseTape(now) {
    if (!this.tapeActive) return;
    this.tapeActive = false;
    const g = this.tapeEnv.gain,
      d = this.tapeDelay.delayTime;
    g.cancelScheduledValues(now);
    g.setTargetAtTime(0, now, 0.004);
    d.cancelScheduledValues(now);
    d.setValueAtTime(d.value, now);
    d.setValueAtTime(0, now + 0.04);
  }
  position() {
    if (this.paused && this.frozenPosition) return this.frozenPosition;
    if (!this.ctx) return { step: 0, choices: this.choices() };
    return (
      this.timeline.filter((x) => x.time <= this.ctx.currentTime).at(-1) || {
        step: Math.max(0, this.clock.step - 1),
        choices: this.choices(),
      }
    );
  }
  choices() {
    return this.session.tracks.map((t) => ({
      song: t.song,
      variant: t.variant,
    }));
  }
  queue(i, change) {
    this.clock.queue(i, change, this.running || this.paused);
    this.onUpdate();
  }
  applyMix(at) {
    if (!this.ctx) return;
    const now = at ?? this.ctx.currentTime,
      macro = intensityTargets(this.session),
      target = fxTargets(this.session),
      ramp = (param, value, tau = 0.025) =>
        param.setTargetAtTime(value, now, tau);
    ramp(this.driveOut.gain, macro.headroom);
    ramp(this.master.frequency, target.low);
    ramp(this.highpass.frequency, target.high);
    ramp(this.driveDry.gain, 1 - target.drive * 0.38);
    ramp(this.driveWet.gain, target.drive * 0.65);
    ramp(this.echoWet.gain, target.echo);
    ramp(this.flangeWet.gain, target.flanger);
    ramp(this.wet.gain, this.session.reverb * 0.65);
    ramp(this.crushWet.gain, target.crush, 0.01);
    ramp(this.crushDry.gain, 1 - target.crush, 0.01);
    const bits = crushBits(this.session.fx.x);
    if (bits !== this.crushBits) {
      this.crushBits = bits;
      this.crusher.curve = crushCurve(bits);
    }
    ramp(this.envToWet.gain, target.stutter, 0.006);
    ramp(this.envToDry.gain, -target.stutter, 0.006);
    ramp(this.tapeMix.gain, target.tape, 0.008);
    ramp(this.tapeDry.gain, 1 - target.tape, 0.008);
    if (target.tape > 0.02 && !this.tapeActive) this.engageTape(now);
    else if (target.tape <= 0.02) this.releaseTape(now);
    if (this.session.fx.mode !== "stutter") this.resetStutter(now);
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
    const dt = STEP_SECONDS;
    for (const p of this.timeline)
      if (p.time >= now) this.scheduleGate(p.step, p.time, dt);
  }
  note(e, time, dt, dest) {
    return createVoice(
      this.ctx,
      { ...e, energy: e.energy ?? this.session.intensity ?? 0 },
      time,
      dt,
      dest,
      this.library,
      (source) => {
        this.sources.add(source);
        source.addEventListener("ended", () => this.sources.delete(source));
      },
    );
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
    clearInterval(this.timer);
    if (this.ctx) await this.ctx.close();
  }
}
// The same sampler/FX graph, rendered without a speaker or worklet for deterministic signal tests.
// `songs` sets each track's song; `switches` queues timed per-track song/variant changes.
export async function renderDiagnostic({
  song = 0,
  songs,
  track,
  variant = 0,
  variants,
  mode = "echo",
  depth = 0,
  x = 0.5,
  seconds = 3.3,
  pump = 0.6,
  reverb = 0,
  bars,
  intensity = 0,
  intensitySweep = [],
  fxSweep = [],
  switches = [],
} = {}) {
  const c = new OfflineAudioContext(2, Math.ceil(seconds * 48000), 48000),
    s = initialSession(song);
  s.intensity = intensity;
  s.reverb = reverb;
  s.drive = 0.08;
  s.pump = pump;
  s.fx = { ...s.fx, mode, depth, x };
  s.tracks.forEach((t, i) => {
    t.song = songs?.[i] ?? song;
    t.variant = variants?.[i] ?? variant;
    if (track !== undefined) t.mute = i !== track;
  });
  const e = new Engine(s);
  e.createGraph(c);
  e.library = await loadBank(c);
  e.ceiling.connect(c.destination);
  const dt = STEP_SECONDS;
  const pendingSwitches = [...switches].sort((a, b) => a.step - b.step);
  const pendingFx = [...fxSweep].sort((a, b) => a.time - b.time);
  for (
    let step = 0;
    0.05 + step * dt < seconds - 0.1 &&
    (bars === undefined || step < bars * 16);
    step++
  ) {
    while (pendingSwitches.length && pendingSwitches[0].step <= step) {
      const sw = pendingSwitches.shift();
      Object.assign(s.tracks[sw.track], sw.change);
    }
    const when = 0.05 + step * dt;
    const next =
      intensitySweep.filter((p) => p.time <= when - 0.05 + 1e-8).at(-1)
        ?.value ?? intensity;
    if (next !== s.intensity) {
      s.intensity = next;
      e.applyMix(when);
    }
    // fxSweep: timed XY/mode changes ({ time, mode?, x?, depth? }) like a live gesture.
    let fxChanged = false;
    while (pendingFx.length && pendingFx[0].time <= when - 0.05 + 1e-8) {
      const change = { ...pendingFx.shift() };
      delete change.time;
      Object.assign(s.fx, change);
      fxChanged = true;
    }
    if (fxChanged) e.applyMix(when);
    e.timeline = [{ step, time: when }];
    e.scheduleStep(step, when, dt);
  }
  return c.startRendering();
}
