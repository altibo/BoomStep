#!/usr/bin/env python3
"""Reproducibly cut the CC0 source recordings into BoomStep's small offline sample bank.

Input: unmodified source files fetched into ../samples-src/raw (see CREDITS.md).
Output: public/samples/*.wav (16-bit PCM mono) + src/sample-bank.json.
Processing only: mono fold-down, resample, onset trim, DC removal, fixed fade-out, peak normalisation.
"""
import json, subprocess, sys, hashlib, wave
from pathlib import Path
import numpy as np

SRC = Path(sys.argv[1] if len(sys.argv) > 1 else "/workspace/samples-src/raw")
OUT = Path("public/samples"); OUT.mkdir(parents=True, exist_ok=True)
NOTE = {"C":0,"C#":1,"D":2,"D#":3,"Eb":3,"E":4,"F":5,"F#":6,"G":7,"G#":8,"Ab":8,"A":9,"A#":10,"Bb":10,"B":11}
def midi(name):
    import re
    m = re.fullmatch(r"([A-G][#b]?)(-?\d)", name)
    return NOTE[m.group(1)] + 12 * (int(m.group(2)) + 1)

def load(paths, rate):
    sig = None
    for p in paths:
        raw = subprocess.run(["ffmpeg","-v","error","-i",str(p),"-f","f32le","-ac","1","-ar",str(rate),"-"],capture_output=True,check=True).stdout
        x = np.frombuffer(raw, np.float32).astype(np.float64)
        sig = x if sig is None else sig[:len(x)] + x[:len(sig)]
    return sig

def cut(x, rate, seconds, fade, onset=True):
    x = x - x.mean()
    if onset:
        a = np.abs(x); i = int(np.argmax(a > a.max() * 0.015)); i = max(0, i - int(rate * 0.0015)); x = x[i:]
    n = min(len(x), int(rate * seconds)); x = x[:n].copy()
    f = min(n, int(rate * fade)); x[n - f:] *= np.cos(np.linspace(0, np.pi / 2, f)) ** 2
    x[: int(rate * 0.0007)] *= np.linspace(0, 1, int(rate * 0.0007))
    return x / np.abs(x).max() * 0.89

def write(name, x, rate):
    p = OUT / f"{name}.wav"
    pcm = np.clip(np.round(x * 32767), -32768, 32767).astype("<i2")
    with wave.open(str(p), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate); w.writeframes(pcm.tobytes())
    return {"file": f"samples/{name}.wav", "bytes": p.stat().st_size, "sha256": hashlib.sha256(p.read_bytes()).hexdigest(), "seconds": round(len(x) / rate, 3)}

bank = {"drums": {}, "instruments": {}}
D = SRC / "sounds-tr808-fischer"
drums = {  # kind: (file, seconds, fade)
  "kick": ("bd8/BD2525.WAV", .42, .12), "kickround": ("bd8/BD5025.WAV", .42, .12), "kickdeep": ("bd8/BD0050.WAV", .75, .25),
  "snare": ("sd8/SD2550.WAV", .26, .08), "snaredark": ("sd8/SD0025.WAV", .22, .08), "clap": ("cp8/CP.WAV", .5, .25),
  "hat": ("ch8/CH.WAV", .12, .05), "openhat": ("oh8/OH25.WAV", .3, .12), "rim": ("rs8/RS.WAV", .08, .03),
  "tom": ("lt8/LT25.WAV", .55, .2), "conga": ("lc8/LC25.WAV", .45, .15), "clave": ("cl8/CL.WAV", .06, .03),
  "shaker": ("ma8/MA.WAV", .08, .03), "ride": ("cy8/CY2525.WAV", 1.4, .6),
}
for kind, (f, sec, fade) in drums.items():
    bank["drums"][kind] = {**write(f"drum-{kind}", cut(load([D / f], 44100), 44100, sec, fade), 44100), "source": "tr808", "original": f}

F = lambda repo, f: SRC / repo / "samples" / f
inst = {  # id: (repo, rate, seconds, fade, {midi: [files]})
  "sub": ("synth-bass-1", 24000, 1.0, .35, {midi(n): [F("synth-bass-1", f"{n}.flac")] for n in ["E1","G#1","C2","E2"]}),
  "finger": ("electric-bass-YR", 24000, 1.1, .4, {29: [F("electric-bass-YR","finger/F.flac")], 32: [F("electric-bass-YR","finger/G#.flac")], 35: [F("electric-bass-YR","finger/B.flac")], 38: [F("electric-bass-YR","finger/D.flac")]}),
  "fmbass": ("lately-bass", 24000, .9, .35, {midi(n): [F("lately-bass", f"{n}.wav")] for n in ["F#1","C2","F#2"]}),
  "sweep": ("sweep-pad", 24000, 3.4, 1.2, {midi(n): [F("sweep-pad", f"{n}.flac")] for n in ["G#2","C3","E3","G#3","C4","E4"]}),
  "newage": ("new-age", 24000, 3.2, 1.2, {midi(n): [F("new-age", f"{n}.flac")] for n in ["G#2","C3","E3","G#3","C4","E4"]}),
  "bowed": ("synth-pad-bowed", 24000, 3.4, 1.2, {midi(n): [F("synth-pad-bowed", f"{n}L.flac"), F("synth-pad-bowed", f"{n}R.flac")] for n in ["Ab2","C3","E3","Ab3","C4","E4"]}),
  "strings": ("synth-strings-1", 24000, 3.2, 1.1, {midi(n): [F("synth-strings-1", f"{n}.flac")] for n in ["F#2","C3","F#3","C4","F#4"]}),
  "choir": ("synth-pad-choir", 24000, 3.2, 1.1, {midi(n): [F("synth-pad-choir", f"{n}.flac")] for n in ["F#2","C3","F#3","C4","F#4"]}),
  "ep": ("fm-piano1", 32000, 2.2, .8, {midi(n): [F("fm-piano1", f"{n}v80.flac")] for n in ["F#2","C3","F#3","C4","F#4","C5"]}),
  "hang": ("hang-D-minor", 32000, 2.0, .8, {midi(n): [F("hang-D-minor", f"{n}_01.flac")] for n in ["A3","D4","F4","G4","A4","C5","D5"]}),
  "brass": ("synth-brass-1", 32000, 1.4, .5, {midi(n): [F("synth-brass-1", f"{n}.flac")] for n in ["F#2","C3","F#3","C4","F#4","C5"]}),
  "fifths": ("synth-fifths", 32000, 1.6, .6, {midi(n): [F("synth-fifths", f"{n}.flac")] for n in ["E2","G#2","C3","E3","G#3","C4","E4","G#4","C5"]}),
}
for key, (repo, rate, sec, fade, roots) in inst.items():
    zones = []
    for m, files in sorted(roots.items()):
        info = write(f"{key}-{m}", cut(load(files, rate), rate, sec, fade), rate)
        zones.append({"root": m, **info, "original": [str(p.relative_to(SRC / repo)) for p in files]})
    bank["instruments"][key] = {"source": repo, "rate": rate, "zones": zones}
Path("src/sample-bank.json").write_text(json.dumps(bank, indent=1) + "\n")
total = sum(p.stat().st_size for p in OUT.glob("*.wav"))
print(f"{len(list(OUT.glob('*.wav')))} files, {total/1048576:.2f} MiB")
