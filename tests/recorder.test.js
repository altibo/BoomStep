import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
function setup(rate = 48000) {
  let Capture;
  const messages = [];
  runInNewContext(
    readFileSync(new URL("../public/recorder.js", import.meta.url), "utf8"),
    {
      AudioWorkletProcessor: class {
        constructor() {
          this.port = { postMessage: (m) => messages.push(m) };
        }
      },
      registerProcessor: (_, C) => {
        Capture = C;
      },
      sampleRate: rate,
      Float32Array,
    },
  );
  const capture = new Capture();
  capture.port.onmessage({ data: "start" });
  return { capture, messages };
}
test("capture passes through actual stereo and flushes partial chunk before WAV finish", () => {
  const { capture, messages } = setup();
  const left = new Float32Array(128).fill(0.25),
    right = new Float32Array(128).fill(-0.15),
    out = [new Float32Array(128), new Float32Array(128)];
  capture.process([[left, right]], [out]);
  assert.deepEqual(out, [left, right]);
  capture.port.onmessage({ data: "stop" });
  assert.equal(messages[0].channels[0].length, 128);
  assert.deepEqual(messages[0].channels[1], right);
  assert.equal(messages[1].done, true);
  assert.equal(capture.recording, false);
});
test("capture limits recording to exactly 120 seconds of audio frames", () => {
  const { capture, messages } = setup(8);
  const input = [new Float32Array(128).fill(0.1)];
  for (let i = 0; i < 10; i++)
    capture.process([input], [[new Float32Array(128), new Float32Array(128)]]);
  assert.equal(capture.frames, 960);
  assert.equal(messages.filter((m) => m.done).length, 1);
  assert.equal(messages.at(-1).limit, true);
  assert.equal(
    messages
      .filter((m) => m.channels)
      .reduce((n, m) => n + m.channels[0].length, 0),
    960,
  );
});
