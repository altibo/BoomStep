// Capture the actual post-master audio, not a reconstruction of the arrangement.
class Capture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.recording = false;
    this.frames = 0;
    this.offset = 0;
    this.allocate();
    this.port.onmessage = ({ data }) => {
      if (data === "start") {
        this.recording = true;
        this.frames = 0;
        this.offset = 0;
      }
      if (data === "stop") this.finish(false);
    };
  }
  allocate() {
    this.left = new Float32Array(2048);
    this.right = new Float32Array(2048);
  }
  flush() {
    if (!this.offset) return;
    const left = this.left.slice(0, this.offset);
    const right = this.right.slice(0, this.offset);
    this.port.postMessage({ channels: [left, right] }, [
      left.buffer,
      right.buffer,
    ]);
    this.offset = 0;
  }
  finish(limit) {
    this.recording = false;
    this.flush();
    this.port.postMessage({ done: true, limit });
  }
  process(inputs, outputs) {
    const input = inputs[0],
      output = outputs[0];
    for (let c = 0; c < output.length; c++) {
      if (input[c] || input[0]) output[c].set(input[c] || input[0]);
      else output[c].fill(0);
    }
    if (this.recording && input[0]) {
      const count = Math.min(input[0].length, sampleRate * 120 - this.frames);
      for (let i = 0; i < count; i++) {
        this.left[this.offset] = input[0][i];
        this.right[this.offset] = (input[1] || input[0])[i];
        if (++this.offset === this.left.length) this.flush();
      }
      this.frames += count;
      if (this.frames >= sampleRate * 120) this.finish(true);
    }
    return true;
  }
}
registerProcessor("capture", Capture);
