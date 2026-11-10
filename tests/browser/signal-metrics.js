// Objective signal metrics only (no listening claims): RMS, peak, clipping, spectral centroid.
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const a = (-2 * Math.PI) / len;
    for (let i = 0; i < n; i += len)
      for (let k = 0; k < len / 2; k++) {
        const c = Math.cos(a * k),
          s = Math.sin(a * k),
          xr = re[i + k + len / 2] * c - im[i + k + len / 2] * s,
          xi = re[i + k + len / 2] * s + im[i + k + len / 2] * c;
        re[i + k + len / 2] = re[i + k] - xr;
        im[i + k + len / 2] = im[i + k] - xi;
        re[i + k] += xr;
        im[i + k] += xi;
      }
  }
}
export function metrics(left, right, rate) {
  let power = 0,
    peak = 0,
    clipped = 0;
  for (const ch of [left, right])
    for (const x of ch) {
      power += x * x;
      const a = Math.abs(x);
      if (a > peak) peak = a;
      if (a >= 0.999) clipped++;
    }
  const N = 4096;
  let num = 0,
    den = 0,
    low = 0;
  for (let o = 0; o + N <= left.length; o += N) {
    const re = new Float64Array(N),
      im = new Float64Array(N);
    for (let i = 0; i < N; i++)
      re[i] =
        ((left[o + i] + right[o + i]) / 2) *
        (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1)));
    fft(re, im);
    for (let k = 1; k < N / 2; k++) {
      const m = Math.hypot(re[k], im[k]),
        f = (k * rate) / N;
      num += f * m;
      den += m;
      if (f < 150) low += m;
    }
  }
  return {
    seconds: +(left.length / rate).toFixed(2),
    rms: +Math.sqrt(power / (2 * left.length)).toFixed(4),
    peak: +peak.toFixed(4),
    clippedSamples: clipped,
    centroidHz: Math.round(num / den),
    lowShare: +(low / den).toFixed(3),
  };
}
