export function encodeWav(chunks, rate) {
  const frames = chunks.reduce((sum, c) => sum + c[0].length, 0);
  const buffer = new ArrayBuffer(44 + frames * 4),
    v = new DataView(buffer);
  const text = (at, s) =>
    [...s].forEach((c, i) => v.setUint8(at + i, c.charCodeAt(0)));
  text(0, "RIFF");
  v.setUint32(4, 36 + frames * 4, true);
  text(8, "WAVE");
  text(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 2, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 4, true);
  v.setUint16(32, 4, true);
  v.setUint16(34, 16, true);
  text(36, "data");
  v.setUint32(40, frames * 4, true);
  let at = 44;
  for (const channels of chunks)
    for (let i = 0; i < channels[0].length; i++)
      for (let c = 0; c < 2; c++) {
        const n = Math.max(-1, Math.min(1, channels[c][i]));
        v.setInt16(at, n < 0 ? n * 32768 : n * 32767, true);
        at += 2;
      }
  return buffer;
}
