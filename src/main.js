import "./style.css";
import {
  TRACKS,
  NAMES,
  PACKS,
  initialSession,
  validateSession,
} from "./music.js";
import { Engine } from "./engine.js";
const app = document.querySelector("#app");
let session = initialSession(),
  engine = new Engine(session, refresh),
  busy = false,
  downloadUrl;
const $ = (s) => document.querySelector(s);
app.innerHTML = `
<main>
<header><div><h1>BoomStep<span>POCKET JAM</span></h1></div><button id="help" aria-label="Hilfe öffnen">?</button></header>
<div class="packline"><label for="pack">Soundpaket</label><select id="pack">${PACKS.map((p, i) => `<option value="${i}">${p.name}</option>`).join("")}</select><span id="pack-meta"></span></div>
<div class="phase" aria-label="Gemeinsamer Viertakt-Loop">${[1, 2, 3, 4].map((n) => `<div data-bar="${n}"><span>${n}</span><i></i></div>`).join("")}</div>
<div class="statusline"><span id="transport-state">Bereit für deinen ersten Jam</span><span id="beat">4 TAKTE · IM SYNC</span></div>
<section class="grid" aria-label="Vier Musikspuren">${TRACKS.map((name, i) => `<article class="track" id="track-${i}"><div class="trackhead"><h2>${name}</h2><button class="details" data-detail="${i}" aria-label="${name}: Lautstärke und Effekte">⚙</button></div><div class="variant-name" id="name-${i}"></div><div class="patterns" role="group" aria-label="${name} Pattern">${NAMES[i].map((name, v) => `<button data-track="${i}" data-variant="${v}" title="${name}" aria-label="${name}, Pattern ${v + 1}">${v + 1}</button>`).join("")}</div><div class="pending" id="pending-${i}" aria-live="polite"></div><button class="mute" data-mute="${i}" aria-pressed="false">◖ Stumm</button></article>`).join("")}</section>
<section class="master panel"><div><label for="master-filter">Master-Filter</label><button id="mix" aria-label="Master-Hall einstellen">Mix ↗</button></div><input id="master-filter" aria-label="Master-Filter" type="range" min="0" max="1" step="0.01" value="1"><div class="range-labels"><span>Gedämpft</span><span>Offen</span></div></section>
<div class="transport"><button id="play" class="primary">▶ Spielen</button><button id="record"><span class="record-dot"></span><span>Aufnahme</span></button><button id="save">↓ Speichern</button></div>
<div class="secondary"><button id="stop">■ Anfang</button><button id="load">↺ Öffnen</button><button id="export-session">Export</button><button id="import-button">Import</button></div>
<input id="import-session" type="file" accept="application/json,.json" hidden>
<div id="notice" role="status">Tippe Spielen. Kopfhörer an, Alltag aus.</div><a id="download" hidden>WAV herunterladen</a>
<footer>Offline-Synthese · keine Samples · keine Live-KI<br><span id="offline-state">Am Handy: HTTPS-Link öffnen → Zum Home-Bildschirm</span></footer>
</main>
<dialog id="details-dialog"><form method="dialog"><div class="dialog-head"><h2 id="details-title"></h2><button aria-label="Schließen">✕</button></div></form><div id="detail-controls"></div></dialog>
<dialog id="help-dialog"><form method="dialog"><div class="dialog-head"><h2>Dein Daumen. Dein Jam.</h2><button aria-label="Schließen">✕</button></div></form><p>Vier Spuren, eine gemeinsame Akkordfolge. Tippe ein Pattern: Der Wechsel wartet auf den nächsten Takt und bleibt an der aktuellen Loopposition.</p><p><b>Cyan</b> spielt. <b>Amber gestrichelt</b> ist vorgemerkt. Stumm wirkt sofort; ⚙ öffnet Lautstärke, Solo und Effekte.</p><p>Aufnahme zeichnet deinen echten Stereo-Mix auf (max. 2 Minuten), auch Filterfahrten und Mutes. Aufnahme beenden, dann WAV herunterladen. Sessions speichern nur Einstellungen, keine Audiodateien.</p><p>Die drei Pakete wurden mit KI-Unterstützung für diese App komponiert; alles klingt durch lokale Synthese. Keine KI-Verbindung oder Fremd-Samples.</p><p>Nur im Vordergrund spielen. Bei Displaysperre oder Appwechsel kann das Handy Audio anhalten. Zum Fortsetzen erneut Spielen tippen. Im Browser-Menü kannst du die App zum Home-Bildschirm hinzufügen; für Offline einmal vollständig laden. iPhone: aktuellen Safari verwenden, Lautstärke und ggf. Stummmodus prüfen.</p></dialog>`;
function notice(text) {
  $("#notice").textContent = text;
}
function refresh() {
  const pos = engine.position(),
    pack = PACKS[session.pack];
  $("#pack").value = session.pack;
  $("#pack-meta").textContent = `${pack.bpm} BPM · ${pack.key}`;
  $("#play").textContent = engine.running ? "Ⅱ Pause" : "▶ Spielen";
  $("#play").setAttribute(
    "aria-label",
    engine.running ? "Musik pausieren" : "Musik spielen",
  );
  $("#record").classList.toggle("recording", engine.recording);
  $("#record").lastElementChild.textContent = engine.recording
    ? "■ WAV fertig"
    : "Aufnahme";
  $("#record").setAttribute("aria-pressed", String(engine.recording));
  $("#transport-state").textContent = engine.running
    ? "● Läuft im Sync"
    : engine.paused
      ? "Pausiert · Phase bleibt erhalten"
      : "Bereit für deinen Jam";
  $("#beat").textContent = engine.recording
    ? `REC ${Math.floor((engine.recordedFrames || 0) / (engine.ctx?.sampleRate || 48000))} / 120 s`
    : "4 TAKTE · IM SYNC";
  document.querySelectorAll("[data-bar]").forEach((el, i) => {
    el.classList.toggle("current", i === Math.floor((pos.step % 64) / 16));
    el.querySelector("i").style.width =
      `${i === Math.floor((pos.step % 64) / 16) ? (((pos.step % 16) + 1) / 16) * 100 : 0}%`;
  });
  session.tracks.forEach((t, i) => {
    const pending = engine.clock.pending.get(i),
      active = engine.running || engine.paused ? pos.variants[i] : t.variant;
    $(`#name-${i}`).textContent = NAMES[i][active];
    $(`#track-${i}`).classList.toggle("muted", t.mute);
    $(`[data-mute="${i}"]`).setAttribute("aria-pressed", String(t.mute));
    $(`[data-mute="${i}"]`).textContent = t.mute ? "◖ Stumm AN" : "◖ Stumm";
    $(`#pending-${i}`).textContent = pending
      ? `${NAMES[i][pending.variant]} → ab Takt ${Math.floor((pending.at % 64) / 16) + 1}`
      : t.solo
        ? "SOLO"
        : "";
    document.querySelectorAll(`[data-track="${i}"]`).forEach((el) => {
      const v = Number(el.dataset.variant);
      el.classList.toggle("active", v === active);
      el.classList.toggle("queued", pending?.variant === v);
      el.setAttribute("aria-pressed", String(v === active));
    });
  });
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
$("#play").onclick = () =>
  guarded(async () => {
    if (engine.running) await engine.pause();
    else await engine.play();
  });
$("#stop").onclick = () =>
  guarded(async () => {
    if (engine.recording) await engine.stopRecording();
    await engine.stop();
    notice("Am Anfang. Dein Mix bleibt erhalten.");
  });
app.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.dataset.track !== undefined)
    engine.queue(Number(b.dataset.track), Number(b.dataset.variant));
  if (b.dataset.mute !== undefined) {
    const i = Number(b.dataset.mute);
    session.tracks[i].mute = !session.tracks[i].mute;
    engine.applyMix();
    refresh();
  }
  if (b.dataset.detail !== undefined) openDetails(Number(b.dataset.detail));
});
$("#master-filter").oninput = (e) => {
  session.master = Number(e.target.value);
  engine.applyMix();
};
function slider(label, key, value) {
  return `<label class="slider-label">${label}<input data-mix="${key}" type="range" min="0" max="1" step="0.01" value="${value}"></label>`;
}
function openDetails(i) {
  const master = i === undefined,
    t = master ? session : session.tracks[i];
  $("#details-title").textContent = master
    ? "Master-Mix"
    : `${TRACKS[i]} · Details`;
  $("#detail-controls").innerHTML = master
    ? slider("Raum / Hall", "reverb", t.reverb)
    : `${slider("Lautstärke", "volume", t.volume)}${slider("Tiefpass-Filter", "filter", t.filter)}${slider("Delay", "delay", t.delay)}<button id="solo" aria-pressed="${t.solo}">Solo ${t.solo ? "AN" : "AUS"}</button><p>Solo spielt nur ausgewählte Spuren. Stumm hat Vorrang.</p>`;
  $("#detail-controls").oninput = (e) => {
    if (e.target.dataset.mix) {
      t[e.target.dataset.mix] = Number(e.target.value);
      engine.applyMix();
    }
  };
  if (!master)
    $("#solo").onclick = () => {
      t.solo = !t.solo;
      $("#solo").setAttribute("aria-pressed", String(t.solo));
      $("#solo").textContent = `Solo ${t.solo ? "AN" : "AUS"}`;
      engine.applyMix();
      refresh();
    };
  $("#details-dialog").showModal();
}
$("#mix").onclick = () => openDetails();
$("#help").onclick = () => $("#help-dialog").showModal();
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
    a.textContent = `↓ Stereo-WAV herunterladen (${(buffer.byteLength / 1048576).toFixed(1)} MB)`;
    notice(
      limit
        ? "2 Minuten erreicht. Deine WAV ist bereit."
        : "Aufnahme fertig. WAV jetzt herunterladen.",
    );
  };
}
connectRecording();
$("#record").onclick = () =>
  guarded(async () => {
    if (engine.recording) await engine.stopRecording();
    else {
      await engine.startRecording();
      notice(
        "Aufnahme läuft · Mute, Pattern und Filter werden mit aufgenommen.",
      );
    }
  });
function snapshot() {
  const copy = structuredClone(session);
  for (const [i, p] of engine.clock.pending) copy.tracks[i].variant = p.variant;
  return copy;
}
$("#save").onclick = () => {
  try {
    localStorage.setItem("boomstep-session", JSON.stringify(snapshot()));
    notice("Session auf diesem Gerät gespeichert. Öffnen lädt sie wieder.");
  } catch {
    notice("Speichern nicht möglich. Bitte Session-Datei exportieren.");
  }
};
async function restore(value) {
  if (engine.recording) throw new Error("Bitte zuerst Aufnahme beenden.");
  const next = validateSession(value);
  await engine.dispose();
  session = next;
  engine = new Engine(session, refresh);
  connectRecording();
  $("#master-filter").value = session.master;
  refresh();
  notice("Session geladen. Tippe Spielen.");
}
$("#load").onclick = () =>
  guarded(async () => {
    const saved = localStorage.getItem("boomstep-session");
    if (saved) await restore(JSON.parse(saved));
    else
      notice(
        "Noch keine lokale Session. Mit Session-Datei lässt sich eine importieren.",
      );
  });
$("#export-session").onclick = () => {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(snapshot(), null, 2)], {
      type: "application/json",
    }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "BoomStep-session.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  notice("Session-Datei exportiert. Mit Import kannst du sie wieder öffnen.");
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
      throw new Error("Bitte zuerst Aufnahme beenden, dann Paket wechseln.");
    }
    const next = initialSession();
    next.pack = Number(e.target.value);
    await restore(next);
  });
// Background audio is intentionally not promised. Keep clock frozen on a hidden tab.
document.addEventListener("visibilitychange", () => {
  if (document.hidden && engine.running)
    guarded(async () => {
      if (engine.recording) await engine.stopRecording();
      await engine.pause();
      notice("Im Hintergrund pausiert. Tippe Spielen zum Fortsetzen.");
    });
});
if (import.meta.env.PROD && "serviceWorker" in navigator)
  window.addEventListener("load", () =>
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .then(() => navigator.serviceWorker.ready)
      .then(() => {
        $("#offline-state").textContent =
          "Offline vorbereitet · Zum Home-Bildschirm hinzufügen";
      })
      .catch(() => {
        $("#offline-state").textContent =
          "Offline-Installation benötigt HTTPS.";
      }),
  );
refresh();
setInterval(refresh, 80);
// Small read-only diagnostic surface for automated real-audio smoke tests.
window.boomstep = {
  get engine() {
    return engine;
  },
  get session() {
    return session;
  },
};
