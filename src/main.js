import "./style.css";
import {
  TRACKS,
  NAMES,
  namesFor,
  PACKS,
  initialSession,
  validateSession,
} from "./music.js";
import { Engine, renderDiagnostic } from "./engine.js";
import { xyPoint, releaseFX, panicSession } from "./fx.js";
const app = document.querySelector("#app"),
  $ = (s) => document.querySelector(s);
let session = initialSession(),
  engine = new Engine(session, refresh),
  busy = false,
  downloadUrl,
  activePointer = null;
const slider = (label, key, value, track) =>
  `<label class="mini"><span>${label}</span><input aria-label="${track === undefined ? "Master" : TRACKS[track]} ${label}" data-key="${key}" ${track === undefined ? "" : `data-strip="${track}"`} type="range" min="0" max="1" step="0.01" value="${value}"></label>`;
app.innerHTML = `<main>
<section id="performance" aria-label="Hard House Performance">
<header><h1>BoomStep<span>HARD HOUSE / LIVE</span></h1><div class="pack-select"><label class="sr-only" for="pack">Soundpaket</label><select id="pack">${PACKS.map((p, i) => `<option value="${i}">${p.name}</option>`).join("")}</select><span id="pack-meta"></span></div></header>
<div class="phasebar"><span id="transport-state">BEREIT</span><div class="phase" aria-label="8-Takt-Phrase, gemeinsame vier Akkorde">${Array.from({ length: 8 }, (_, i) => `<i data-bar="${i}"></i>`).join("")}</div><span id="beat">150 BPM</span></div>
<section class="tracks" aria-label="Vier Spuren">${TRACKS.map((name, i) => `<article class="track" id="track-${i}"><div class="track-top"><div class="track-name"><h2>${name}</h2><span id="name-${i}"></span><span class="pending" id="pending-${i}" aria-live="polite"></span></div>${NAMES[i].map((n, v) => `<button class="pattern" data-track="${i}" data-variant="${v}" title="${n}" aria-label="${name}: ${n}, Pattern ${v + 1}">${v + 1}</button>`).join("")}<button class="mute" data-mute="${i}" aria-label="${name} stumm" aria-pressed="false">STUMM</button><button class="solo" data-solo="${i}" aria-label="${name} solo" aria-pressed="false">SOLO</button></div><div class="track-bottom">${slider("VOL", "volume", session.tracks[i].volume, i)}${slider("FILTER", "filter", 1, i)}${slider("ECHO", "delay", session.tracks[i].delay, i)}</div></article>`).join("")}</section>
<section class="master" aria-label="Direkte Mastereffekte">${slider("MASTER FILTER", "master", 1)}${slider("HALL", "reverb", 0.08)}${slider("DRIVE", "drive", 0.16)}${slider("PUMP", "pump", 0.7)}</section>
<section class="fx-section" aria-label="XY Performanceeffekte"><div id="xy" role="slider" tabindex="0" aria-label="XY Effektfeld: links rechts Klangfarbe, hoch Effektstärke" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="xy-axis">DUNKEL ← FARBE → HELL</div><strong id="xy-label">ECHO</strong><span id="xy-hint">Ziehen · loslassen = trocken</span><i id="xy-dot"></i><span class="xy-depth">↑ TIEFE</span></div><div class="fx-pads" role="group" aria-label="Effektmodus"><button data-fx="echo">ECHO<span>3/16 · Feedback</span></button><button data-fx="flanger">FLANGE<span>Moduliert</span></button><button data-fx="gate">GATE<span id="gate-label">1/8 · tippe für 1/16</span></button><button data-fx="drive">DRIVE<span>Sättigung</span></button></div></section>
<div class="transport"><button id="play" class="primary" aria-label="Musik spielen">▶ PLAY</button><button id="record" aria-pressed="false"><i></i><span>REC</span></button><button id="save">SAVE</button><button id="stop" aria-label="Stop und Takt eins">■</button><button id="hold" aria-pressed="false">HOLD</button><button id="panic" title="Alle Effekte neutral, Musik bleibt">DRY!</button></div>
</section>
<div id="notice" role="status">150 BPM. Offbeat-Bass. Zieh den Sound auf.</div><a id="download" hidden>WAV herunterladen</a>
<div class="secondary"><button id="load">Öffnen</button><button id="export-session">Export</button><button id="import-button">Import</button><button id="help" aria-expanded="false">Hilfe</button></div><input id="import-session" type="file" accept="application/json,.json" hidden>
<div id="help-text" hidden><h2>Dein Rave, eine Oberfläche.</h2><p>1–4 wählen Patterns, M schaltet stumm, S solo. Amber wartet auf den nächsten Takt. Unten pro Spur: Lautstärke, Tiefpass und Echo-Send. Alle Spuren teilen die vier Akkorde; besondere Fills kommen nach acht Takten.</p><p><b>XY:</b> links dunkler Tiefpass, rechts schneidender Hochpass; hoch = mehr vom ausgewählten Effekt. ECHO, FLANGE, GATE oder DRIVE wählen. GATE erneut tippen wechselt 1/8 ↔ 1/16 — echtes taktsynchrones Lautstärke-Gating, kein Sample-Stutter. Im Feld ziehen, loslassen = neutral (25-ms-Rampen, vorhandene Echotails klingen aus). HOLD hält die letzte Position; HOLD ausschalten löst sie. DRY! setzt alle Effekte und Sends zurück, nicht deine Patterns oder Lautstärken. Pfeiltasten im XY-Feld steuern Farbe/Tiefe; Escape = DRY!.</p><p>Master-Filter, Hall, Drive und Pump sind immer direkt erreichbar. Pump duckt Bass/Stabs/Riff zur hörbaren Kick. Die vier großen Effektpads verändern den tatsächlichen Audioweg und sind in der Aufnahme enthalten.</p><p>REC zeichnet den echten Stereo-Mix auf (max. 120 Audiosekunden). Nochmals tippen, dann WAV herunterladen. SAVE/Öffnen sichert einen lokalen Slot; Export/Import eine JSON-Datei. Alte Sessions werden als Classic-Pakete übernommen. Paketwechsel setzt den Mix zurück.</p><p>Aktueller Safari/Chrome, HTTPS und Vordergrund erforderlich. Nach Appwechsel erneut PLAY tippen. Zum Home-Bildschirm hinzufügen; nach erstmaligem vollständigem Laden offline spielbar. Keine Samples, keine Live-KI, keine Mikrofonaufnahme. Bei sehr kleinen Displays scrollen die gleich sichtbaren Bedienfelder, statt auf winzige Ziele zu schrumpfen.</p></div><footer id="offline-state">Lokale Synthese · keine Samples · Vordergrund-Audio</footer></main>`;
function notice(text) {
  $("#notice").textContent = text;
}
function syncSliders() {
  document.querySelectorAll("input[data-key]").forEach((el) => {
    el.value =
      el.dataset.strip === undefined
        ? session[el.dataset.key]
        : session.tracks[Number(el.dataset.strip)][el.dataset.key];
  });
}
function refresh() {
  const pos = engine.position(),
    p = PACKS[session.pack];
  $("#pack").value = session.pack;
  $("#pack-meta").textContent = `${p.bpm} BPM · ${p.key}`;
  $("#play").textContent = engine.running ? "Ⅱ PAUSE" : "▶ PLAY";
  $("#transport-state").textContent = engine.running
    ? "● LIVE"
    : engine.paused
      ? "PAUSE"
      : "BEREIT";
  $("#beat").textContent = engine.recording
    ? `REC ${Math.floor((engine.recordedFrames || 0) / (engine.ctx?.sampleRate || 48000))}s`
    : `${p.bpm} BPM`;
  $("#record").classList.toggle("recording", engine.recording);
  $("#record").setAttribute("aria-pressed", String(engine.recording));
  $("#record span").textContent = engine.recording ? "■ WAV" : "REC";
  document
    .querySelectorAll("[data-bar]")
    .forEach((el, i) =>
      el.classList.toggle("current", i === Math.floor((pos.step % 128) / 16)),
    );
  session.tracks.forEach((t, i) => {
    const pending = engine.clock.pending.get(i),
      active = engine.running || engine.paused ? pos.variants[i] : t.variant;
    $("#name-" + i).textContent = namesFor(session.pack, i)[active];
    $("#track-" + i).classList.toggle("muted", t.mute);
    $("#track-" + i).classList.toggle("soloed", t.solo);
    $(`[data-mute="${i}"]`).setAttribute("aria-pressed", String(t.mute));
    $(`[data-solo="${i}"]`).setAttribute("aria-pressed", String(t.solo));
    $("#pending-" + i).textContent = pending
      ? `→${pending.variant + 1} T${Math.floor((pending.at % 128) / 16) + 1}`
      : "";
    document.querySelectorAll(`[data-track="${i}"]`).forEach((el) => {
      const v = Number(el.dataset.variant);
      const name = namesFor(session.pack, i)[v];
      el.title = name;
      el.setAttribute("aria-label", `${TRACKS[i]}: ${name}, Pattern ${v + 1}`);
      el.classList.toggle("active", v === active);
      el.classList.toggle("queued", pending?.variant === v);
      el.setAttribute("aria-pressed", String(v === active));
    });
  });
  document
    .querySelectorAll("[data-fx]")
    .forEach((el) =>
      el.setAttribute(
        "aria-pressed",
        String(el.dataset.fx === session.fx.mode),
      ),
    );
  $("#hold").setAttribute("aria-pressed", String(session.fx.hold));
  $("#xy").classList.toggle("held", session.fx.hold);
  $("#xy-label").textContent =
    session.fx.mode === "gate"
      ? `GATE 1/${session.fx.division}`
      : session.fx.mode.toUpperCase();
  $("#xy-hint").textContent = session.fx.hold
    ? "HOLD · Position bleibt"
    : "Ziehen · loslassen = neutral";
  $("#gate-label").textContent =
    `1/${session.fx.division} · tippe für 1/${session.fx.division === 8 ? 16 : 8}`;
  $("#xy-dot").style.left = `${session.fx.x * 100}%`;
  $("#xy-dot").style.top = `${(1 - session.fx.depth) * 100}%`;
  $("#xy").setAttribute(
    "aria-valuenow",
    String(Math.round(session.fx.depth * 100)),
  );
  $("#xy").setAttribute(
    "aria-valuetext",
    `${session.fx.mode}, Tiefe ${Math.round(session.fx.depth * 100)} Prozent, Farbe ${Math.round(session.fx.x * 100)} Prozent`,
  );
}
async function guarded(fn) {
  if (busy) return;
  busy = true;
  try {
    await fn();
  } catch (e) {
    notice(e.message);
    console.error(e);
  } finally {
    busy = false;
    refresh();
  }
}
function updateFX() {
  engine.applyMix();
  refresh();
}
function release() {
  session.fx = releaseFX(session.fx);
  updateFX();
}
function panic() {
  panicSession(session);
  syncSliders();
  updateFX();
  notice("DRY: Effekte neutral. Dein Groove läuft weiter.");
}
$("#play").onclick = () =>
  guarded(async () => {
    if (engine.running) await engine.pause();
    else await engine.play();
  });
$("#stop").onclick = () =>
  guarded(async () => {
    if (engine.recording) await engine.stopRecording();
    await engine.stop();
    notice("Takt eins · Mix bleibt erhalten.");
  });
app.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.dataset.track !== undefined)
    engine.queue(Number(b.dataset.track), Number(b.dataset.variant));
  for (const key of ["mute", "solo"])
    if (b.dataset[key] !== undefined) {
      const i = Number(b.dataset[key]);
      session.tracks[i][key] = !session.tracks[i][key];
      updateFX();
    }
  if (b.dataset.fx) {
    if (b.dataset.fx === "gate" && session.fx.mode === "gate")
      session.fx.division = session.fx.division === 8 ? 16 : 8;
    session.fx.mode = b.dataset.fx;
    updateFX();
  }
});
app.addEventListener("input", (e) => {
  const { key, strip } = e.target.dataset;
  if (!key) return;
  if (strip === undefined) session[key] = Number(e.target.value);
  else session.tracks[Number(strip)][key] = Number(e.target.value);
  engine.applyMix();
});
const xy = $("#xy");
function moveXY(e) {
  if (e.pointerId !== activePointer) return;
  Object.assign(
    session.fx,
    xyPoint(e.clientX, e.clientY, xy.getBoundingClientRect()),
  );
  updateFX();
}
xy.onpointerdown = (e) => {
  if (activePointer !== null) return;
  activePointer = e.pointerId;
  xy.setPointerCapture(e.pointerId);
  moveXY(e);
};
xy.onpointermove = moveXY;
function endPointer(e) {
  if (e.pointerId !== activePointer) return;
  activePointer = null;
  release();
}
xy.onpointerup = endPointer;
xy.onpointercancel = (e) => {
  if (e.pointerId === activePointer) {
    activePointer = null;
    session.fx.hold = false;
    release();
  }
};
xy.onlostpointercapture = (e) => {
  if (e.pointerId === activePointer) {
    activePointer = null;
    release();
  }
};
xy.onkeydown = (e) => {
  if (e.key === "Escape") {
    panic();
    e.preventDefault();
    return;
  }
  const delta = {
    ArrowLeft: [-0.06, 0],
    ArrowRight: [0.06, 0],
    ArrowUp: [0, 0.08],
    ArrowDown: [0, -0.08],
  }[e.key];
  if (!delta) return;
  e.preventDefault();
  session.fx.x = Math.max(0, Math.min(1, session.fx.x + delta[0]));
  session.fx.depth = Math.max(0, Math.min(1, session.fx.depth + delta[1]));
  updateFX();
};
xy.onblur = () => {
  if (activePointer === null) release();
};
$("#hold").onclick = () => {
  session.fx.hold = !session.fx.hold;
  if (!session.fx.hold) release();
  refresh();
};
$("#panic").onclick = panic;
function connectRecording() {
  engine.onRecording = (buffer, limit) => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    downloadUrl = URL.createObjectURL(
      new Blob([buffer], { type: "audio/wav" }),
    );
    const a = $("#download");
    a.href = downloadUrl;
    a.download = `BoomStep-${PACKS[session.pack].name.replaceAll(" ", "-")}.wav`;
    a.hidden = false;
    a.textContent = `↓ Stereo-WAV (${(buffer.byteLength / 1048576).toFixed(1)} MB)`;
    notice(
      limit
        ? "120 Audiosekunden erreicht. WAV bereit."
        : "Dein echter Live-Mix ist als WAV bereit.",
    );
  };
}
connectRecording();
$("#record").onclick = () =>
  guarded(async () => {
    if (engine.recording) await engine.stopRecording();
    else {
      await engine.startRecording();
      notice("REC · Alle Patternwechsel, Mutes und FX werden aufgenommen.");
    }
  });
function snapshot() {
  const s = structuredClone(session);
  for (const [i, p] of engine.clock.pending) s.tracks[i].variant = p.variant;
  if (!s.fx.hold) s.fx = { ...s.fx, x: 0.5, depth: 0 };
  return s;
}
$("#save").onclick = () => {
  try {
    localStorage.setItem("boomstep-session", JSON.stringify(snapshot()));
    notice("Session auf diesem Gerät gespeichert.");
  } catch {
    notice("Speichern gesperrt. Bitte Export verwenden.");
  }
};
async function restore(value) {
  if (engine.recording) throw new Error("Bitte zuerst Aufnahme beenden.");
  const next = validateSession(value);
  await engine.dispose();
  session = next;
  engine = new Engine(session, refresh);
  connectRecording();
  syncSliders();
  refresh();
  notice(
    value.version === 1
      ? "Alte Session als Classic-Paket geladen."
      : "Session geladen. PLAY startet.",
  );
}
$("#load").onclick = () =>
  guarded(async () => {
    const saved = localStorage.getItem("boomstep-session");
    if (saved) await restore(JSON.parse(saved));
    else notice("Noch nichts gespeichert. Import öffnet eine Session-Datei.");
  });
$("#export-session").onclick = () => {
  const url = URL.createObjectURL(
      new Blob([JSON.stringify(snapshot(), null, 2)], {
        type: "application/json",
      }),
    ),
    a = document.createElement("a");
  a.href = url;
  a.download = "BoomStep-session.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  notice("Session exportiert. Import öffnet sie wieder.");
};
$("#import-button").onclick = () => $("#import-session").click();
$("#import-session").onchange = (e) =>
  guarded(async () => {
    if (e.target.files[0])
      await restore(JSON.parse(await e.target.files[0].text()));
    e.target.value = "";
  });
$("#pack").onchange = (e) =>
  guarded(async () => {
    if (engine.recording) {
      e.target.value = session.pack;
      throw new Error("Erst REC beenden, dann Paket wechseln.");
    }
    const next = initialSession();
    next.pack = Number(e.target.value);
    if (next.pack === 1) next.tracks[0].variant = 2;
    if (next.pack === 2) {
      next.tracks[0].variant = 1;
      next.tracks[1].variant = 3;
      next.tracks[2].variant = 1;
      next.tracks[3].variant = 3;
    }
    if (next.pack >= 3) {
      next.drive = 0;
      next.pump = 0;
    }
    await restore(next);
  });
$("#help").onclick = () => {
  const open = $("#help-text").hidden;
  $("#help-text").hidden = !open;
  $("#help").setAttribute("aria-expanded", String(open));
};
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    activePointer = null;
    session.fx.hold = false;
    release();
    if (engine.running)
      guarded(async () => {
        if (engine.recording) await engine.stopRecording();
        await engine.pause();
        notice("Im Hintergrund pausiert. Zum Fortsetzen PLAY.");
      });
  }
});
if (import.meta.env.PROD && "serviceWorker" in navigator)
  window.addEventListener("load", () =>
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .then(() => navigator.serviceWorker.ready)
      .then(() => {
        $("#offline-state").textContent =
          "Offline bereit · Zum Home-Bildschirm hinzufügen · Nur Vordergrund";
      })
      .catch(() => {
        $("#offline-state").textContent = "Offline benötigt HTTPS.";
      }),
  );
window.boomstep = {
  get engine() {
    return engine;
  },
  get session() {
    return session;
  },
  renderDiagnostic,
};
refresh();
setInterval(refresh, 80);
