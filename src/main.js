import {
  ribbonVariant,
  ribbonCancelled,
  orbitPosition,
  orbitPoint,
  glideEntry,
} from "./instrument-ui.js";
import { SPECIALS } from "./specials.js";
import { encodeWav } from "./wav.js";
import "./style.css";
import {
  TRACKS,
  NAMES,
  namesFor,
  PACKS,
  initialSession,
  validateSession,
  audible,
} from "./music.js";
import { Engine, renderDiagnostic } from "./engine.js";
import { xyPoint, releaseFX, panicSession } from "./fx.js";
const padFlashes = new Map(),
  ribbonGestures = new Map(),
  glidePointers = new Map();
let refreshTimer;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
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
<section id="performance" aria-label="Orbit Deck Performance">
<header><h1>BoomStep<span>ORBIT · <b id="transport-state">BEREIT</b></span></h1><div class="pack-select"><label class="sr-only" for="pack">Soundpaket</label><select id="pack">${PACKS.map((p, i) => `<option value="${i}">${p.name}</option>`).join("")}</select><span class="package-meta" id="pack-meta"></span></div></header>
<section class="tracks" aria-label="Vier Spuren">${TRACKS.map((name, i) => `<article class="track" id="track-${i}"><div class="track-top"><div class="track-name"><h2>${name}</h2><span class="track-short-name" id="name-${i}"></span></div><div class="pattern-ribbon" data-ribbon="${i}" role="group" aria-label="${name} Patternband: ziehen wählt, loslassen merkt vor; mehr als 24 Pixel nach oben oder unten herausziehen verwirft; Escape bricht ab">${NAMES[i].map((n, v) => `<button class="pattern" data-track="${i}" data-variant="${v}" title="${n}" aria-label="${name}: ${n}, Pattern ${v + 1}"><b>${v + 1}</b><small class="pattern-cue"></small></button>`).join("")}</div><button class="mute" data-mute="${i}" aria-label="${name} stumm" aria-pressed="false">STUMM</button><button class="solo" data-solo="${i}" aria-label="${name} solo" aria-pressed="false">SOLO</button></div><span class="sr-only" id="pending-${i}" aria-live="polite"></span><div class="track-bottom">${slider("PEGEL", "volume", session.tracks[i].volume, i)}${slider("FILTER", "filter", 1, i)}${slider("SPUR-ECHO", "delay", session.tracks[i].delay, i)}</div></article>`).join("")}</section>
<div class="mix-strip" aria-label="Master und Special-Pegel"><section class="master" aria-label="Direkte Mastereffekte">${slider("M-FILTER", "master", 1)}${slider("HALL", "reverb", 0.08)}${slider("DRIVE", "drive", 0.16)}${slider("PUMP", "pump", 0.7)}</section><div class="special-level">${slider("HITPEGEL", "specialLevel", session.specialLevel)}</div></div>
<section class="fx-section" aria-label="Orbit und direkte Performanceeffekte"><div class="orbit-deck"><strong id="xy-label" class="sr-only">MASTER-ECHO</strong><div class="xy-axis">Farbe: dunkel ↔ hell</div><div class="orbit-visual"><svg id="orbit" viewBox="0 0 160 160" role="img" aria-label="Gemeinsame 8-Takt-Phase, keine Seekfunktion"><g class="orbit-bars">${Array.from(
  { length: 8 },
  (_, i) => {
    const a = orbitPoint(i / 8 + 0.014),
      b = orbitPoint((i + 1) / 8 - 0.014);
    return `<path data-orbit-bar="${i}" d="M ${a.x} ${a.y} A 69 69 0 0 1 ${b.x} ${b.y}"/>`;
  },
).join("")}</g><g class="orbit-numbers">${Array.from({ length: 8 }, (_, i) => {
  const p = orbitPoint((i + 0.5) / 8, 69);
  return `<text x="${p.x}" y="${p.y + 3}">${i + 1}</text>`;
}).join(
  "",
)}</g><g id="orbit-pending"></g><circle id="orbit-head" r="4" cx="80" cy="11"/></svg><div id="xy" role="slider" tabindex="0" aria-label="XY Effektfeld: links rechts Klangfarbe, hoch Effektstärke" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i id="xy-dot"></i></div></div><div class="xy-depth" id="xy-hint">↑ Tiefe · loslassen neutral</div></div><div class="fx-right"><div class="fx-pads" role="group" aria-label="Master-Effektmodus"><button data-fx="echo">MASTER-ECHO</button><button data-fx="flanger">FLANGER</button><button data-fx="gate">GATE<span id="gate-label">1/8 · tippen: 1/16</span></button><button data-fx="drive">DRIVE</button></div><div class="performance-status"><div id="orbit-status">Takt 1/8 · Akkord 1/4</div><div id="interaction-status" role="status">Pattern ziehen · Hits streichen</div></div></div></section>
<section class="specials" aria-label="Einmalige Live-Specials"><h2 class="specials-caption">SPECIALS <small>Tippen / streichen · einmalig</small></h2><div class="special-pads" id="special-board" aria-label="Sechs Einmal-Pads: über Feldgrenzen streichen spielt je einen Hit, Halten wiederholt nicht">${SPECIALS.map((p) => `<button class="special-pad" data-special="${p.id}" aria-label="${p.name}, einmal abspielen">${p.name}</button>`).join("")}</div></section>
<div class="transport"><button id="play" class="primary" aria-label="Musik spielen">▶ PLAY</button><button id="record" aria-pressed="false"><i></i><span>REC</span></button><button id="save">SAVE</button><button id="stop" aria-label="Stop und Takt eins">■</button><button id="hold" aria-pressed="false">HOLD</button><button id="panic">FX AUS</button></div>
</section>
<div id="notice" role="status"></div><a id="download" hidden>WAV herunterladen</a>
<div class="secondary"><button id="load">Öffnen</button><button id="export-session">Export</button><button id="import-button">Import</button><button id="help" aria-expanded="false">Hilfe</button></div><input id="import-session" type="file" accept="application/json,.json" hidden>
<div id="help-text" hidden><h2>Orbit Deck: ein sichtbares Instrument.</h2><p class="reset-help">FX AUS: Filter, Echo, Hall, Drive, Pump und XY neutral; Nachklang klingt aus, Schutzlimiter bleibt.</p><p><b>PATTERNBAND:</b> Tippen wählt wie bisher. Ziehen markiert nur eine Auswahl, ohne sie abzuspielen; erst Loslassen merkt die letzte Variante für den nächsten Takt vor. Mehr als 24px nach oben oder unten aus dem Band ziehen zeigt Abbrechen; dort loslassen verwirft nur die Auswahl. Zurück ins Band ziehen erlaubt wieder Vormerken. Escape, Systemabbruch oder Fingerverlust verwerfen ebenfalls. Keine Hörvorschau. Auf Band, XY und Specials ist Scrollen zugunsten der Musikgeste gesperrt; zum Scrollen auf Beschriftungen oder Zwischenräumen ziehen. Pfeiltasten im Band wählen die Nachbarvariante, Home/End die erste/letzte. Cyan = aktives Pattern/gewählter FX-Modus; ausschließlich Amber = vorgemerkter Patternwechsel; weiß = unverbindliche Ziehauswahl. Keine stufenlose Klangmischung behauptet.</p><p><b>ORBIT:</b> Der Ring zeigt die echte gemeinsame 8-Takt-Phrase aus der Audiozeit. 1–4 und 5–8 teilen die vier Akkorde, Fills kommen in Takt 8. Ambermarken markieren den tatsächlichen nächsten Wechselort. Der Ring ist bewusst keine Seeksteuerung. Das innere Feld bleibt dein XY-Effektinstrument.</p><p><b>STRUM:</b> Über die sechs beschrifteten Pads streichen: jeder neue Feldeintritt spielt einmal, Zurückstreichen erneut. Stillhalten spielt nie automatisch weiter. Jeder Finger hat seinen eigenen Verlauf; Abbrechen beendet nur die Geste, bereits ausgelöste Sounds klingen endlich aus. Tastatur: jedes Pad mit Enter/Leertaste.</p><p><b>LIVE SPECIALS:</b> Jeder Tap spielt genau einmal. Kein Toggle, keine Loop-Ersetzung, kein automatischer Jamstart. Auch bei Pause/Stop spielbar. Tonale Hits folgen der aktuellen Akkordphase; der Roll Fill startet sofort frei im aktuellen Tempo. Acht Special-Gruppen dürfen überlappen; weitere Taps ersetzen die älteste mit kurzer Ausblendung. HITPEGEL regelt alle Pads. ■ beendet auch Specials; FX AUS setzt nur Effekte zurück. Die Specials laufen durch Master-FX und werden in REC aufgenommen.</p><p>Berlin Bounce ist eine eigene instrumentale Komposition: federnder Bass, knappe Kick, Swing, synthetische Bark-Stabs und Call-and-Response. Textbeschreibungen der Berliner Rap-/Bounce-Techno-Szene dienen als Inspiration; keine fremden Songs, Melodien, Vocals oder Künstlerstimme wurden kopiert.</p><p>1–4 wählen Patterns, M schaltet stumm, S solo. Durch Solo ausgeschlossene Spuren sind abgedunkelt und zeigen Solo-aus; Stumm hat Vorrang. Mehrere Solos sind gleichzeitig möglich. Die STUMM-Taste zeigt ausschließlich den ausdrücklich gesetzten Mutezustand. Amber wartet auf den nächsten Takt. Unten pro Spur: Lautstärke, Tiefpass und Spur-Echo-Pegel. Alle Spuren teilen die vier Akkorde; besondere Fills kommen nach acht Takten.</p><p><b>XY:</b> links dunkler Tiefpass, rechts schneidender Hochpass; hoch = mehr vom ausgewählten Effekt. ECHO, FLANGE, GATE oder DRIVE wählen. GATE erneut tippen wechselt 1/8 ↔ 1/16 — echtes taktsynchrones Lautstärke-Gating, kein Sample-Stutter. Im Feld ziehen, loslassen = neutral (25-ms-Rampen, vorhandene Echotails klingen aus). HOLD hält die letzte Position; HOLD ausschalten löst sie. FX AUS setzt alle Effekte und Sends zurück, nicht deine Patterns oder Lautstärken. Pfeiltasten im XY-Feld steuern Farbe/Tiefe; Escape = FX AUS.</p><p>Die gemeinsame Reglerzeile enthält M-FILTER, Hall, Drive, Pump und HITPEGEL. Die Klangfolge wiederholt vier Akkorde über die acht Takte der Phrase. Pump duckt Bass/Stabs/Riff zur hörbaren Kick. Die vier großen Effektpads verändern den tatsächlichen Audioweg und sind in der Aufnahme enthalten.</p><p>REC zeichnet den echten Stereo-Mix auf (max. 120 Audiosekunden). Nochmals tippen, dann WAV herunterladen. SAVE speichert bewusst auch vorgemerkte Pattern als neue Startauswahl; Öffnen lädt diesen lokalen Slot; Export/Import eine JSON-Datei. Alte Sessions werden als Classic-Pakete übernommen. Paketwechsel setzt den Mix zurück.</p><p>Aktueller Safari/Chrome, HTTPS und Vordergrund erforderlich. Nach Appwechsel erneut PLAY tippen. Zum Home-Bildschirm hinzufügen; nach erstmaligem vollständigem Laden offline spielbar. Keine Samples, keine Live-KI, keine Mikrofonaufnahme. Bei sehr kleinen Displays scrollen die gleich sichtbaren Bedienfelder, statt auf winzige Ziele zu schrumpfen.</p></div><footer id="offline-state">Vordergrund-Audio · eigene Synthese</footer></main>`;
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
    p = PACKS[session.pack],
    orbit = orbitPosition(
      pos,
      engine.ctx?.currentTime || 0,
      p.bpm,
      engine.running,
    );
  const head = orbitPoint(
    reducedMotion.matches ? orbit.bar / 8 : orbit.progress,
  );
  $("#orbit").dataset.motion = reducedMotion.matches ? "bar" : "step";
  $("#orbit-head").setAttribute("cx", head.x);
  $("#orbit-head").setAttribute("cy", head.y);
  document
    .querySelectorAll("[data-orbit-bar]")
    .forEach((el, i) => el.classList.toggle("current", i === orbit.bar));
  const waiting = [...engine.clock.pending.values()];
  $("#orbit-pending").innerHTML = waiting
    .map((q) => {
      const p = orbitPoint((q.at % 128) / 128, 77);
      return `<circle cx="${p.x}" cy="${p.y}" r="3"/>`;
    })
    .join("");
  $("#orbit-status").textContent =
    `Takt ${orbit.bar + 1}/8 · Akkord ${orbit.chord + 1}/4`;
  if (engine.recording)
    $("#orbit-status").textContent =
      `Takt ${orbit.bar + 1}/8 · REC ${Math.floor((engine.recordedFrames || 0) / (engine.ctx?.sampleRate || 48000))}s`;
  $("#orbit").setAttribute(
    "aria-label",
    `Gemeinsame Phase: Takt ${orbit.bar + 1} von 8, Akkord ${orbit.chord + 1}, Beat ${orbit.beat}${waiting.length ? `, ${waiting.length} vorgemerkte Wechsel an Takt ${Math.floor((waiting[0].at % 128) / 16) + 1}` : ""}. Anzeige, kein Seek.`,
  );
  $("#pack").value = session.pack;
  $("#pack-meta").textContent = `${p.bpm} BPM · ${p.key}`;
  $("#play").textContent = engine.running ? "Ⅱ PAUSE" : "▶ PLAY";
  $("#transport-state").textContent = engine.running
    ? "● LIVE"
    : engine.paused
      ? "PAUSE"
      : "BEREIT";
  $("#record").classList.toggle("recording", engine.recording);
  $("#record").setAttribute("aria-pressed", String(engine.recording));
  $("#record span").textContent = engine.recording ? "■ WAV" : "REC";
  session.tracks.forEach((t, i) => {
    const pending = engine.clock.pending.get(i),
      active = engine.running || engine.paused ? pos.variants[i] : t.variant;
    const gesture = ribbonGestures.get(i);
    const mixAudible = audible(session.tracks, i);
    const silenceReason = t.mute ? "mute" : mixAudible ? "" : "solo";
    const silenceLabel = t.mute ? "Stumm" : "Solo-aus";
    const silenceDescription = t.mute
      ? "stummgeschaltet"
      : "durch Solo ausgeschlossen";
    $("#name-" + i).textContent = namesFor(session.pack, i)[active];
    $("#name-" + i).setAttribute(
      "aria-label",
      `${TRACKS[i]}: aktives Pattern ${active + 1}, ${namesFor(session.pack, i)[active]}${mixAudible ? "" : `, ${silenceDescription}`}`,
    );
    $("#name-" + i).title = namesFor(session.pack, i)[active];
    const band = $(`[data-ribbon="${i}"]`);
    band.classList.toggle("canceling", !!gesture?.cancel);
    band.dataset.gesture = gesture
      ? gesture.cancel
        ? "cancel"
        : "choose"
      : "idle";
    const card = $("#track-" + i);
    card.classList.toggle("muted", t.mute);
    card.classList.toggle("inaudible", !mixAudible);
    card.dataset.mixAudible = String(mixAudible);
    card.dataset.silenceReason = silenceReason;
    card.setAttribute(
      "aria-label",
      `${TRACKS[i]}: ${mixAudible ? "im Mix freigegeben" : silenceDescription}`,
    );
    $("#track-" + i).classList.toggle("soloed", t.solo);
    $(`[data-mute="${i}"]`).setAttribute("aria-pressed", String(t.mute));
    $(`[data-solo="${i}"]`).setAttribute("aria-pressed", String(t.solo));
    $("#pending-" + i).textContent = pending
      ? `${pending.variant + 1} ab Takt ${Math.floor((pending.at % 128) / 16) + 1}`
      : "";
    document.querySelectorAll(`[data-track="${i}"]`).forEach((el) => {
      const v = Number(el.dataset.variant);
      const name = namesFor(session.pack, i)[v];
      el.title = name;
      el.setAttribute(
        "aria-label",
        `${TRACKS[i]}: ${name}, Pattern ${v + 1}${pending?.variant === v ? `, ab Takt ${Math.floor((pending.at % 128) / 16) + 1}` : ""}${v === active && !mixAudible ? `, ${silenceDescription}` : ""}`,
      );
      el.classList.toggle("active", v === active);
      el.classList.toggle("queued", pending?.variant === v);
      el.setAttribute("aria-pressed", String(v === active));
      const preview = !gesture?.cancel && gesture?.variant === v;
      el.classList.toggle("scrub-preview", preview);
      el.querySelector(".pattern-cue").textContent = preview
        ? "Wahl"
        : pending?.variant === v
          ? `ab T${Math.floor((pending.at % 128) / 16) + 1}`
          : v === active
            ? !mixAudible
              ? silenceLabel
              : engine.running
                ? "Spielt"
                : engine.paused
                  ? "Pause"
                  : "Auswahl"
            : "";
      el.style.setProperty(
        "--step-progress",
        `${(reducedMotion.matches ? Math.floor(orbit.stepProgress * 4) / 4 : orbit.stepProgress) * 100}%`,
      );
    });
  });
  const gestures = [...ribbonGestures.entries()];
  if (gestures.length) {
    const [track, g] = gestures.find(([, g]) => g.cancel) || gestures[0];
    $("#interaction-status").textContent =
      gestures.length > 1
        ? `${gestures.length} Auswahlen · ${gestures.filter(([, g]) => g.cancel).length} Abbruch`
        : g.cancel
          ? `${TRACKS[track]}: Abbrechen – loslassen`
          : `${TRACKS[track]}: ${g.variant + 1} wählen – loslassen`;
  } else if (engine.clock.pending.size) {
    const [track, q] = [...engine.clock.pending][0];
    $("#interaction-status").textContent =
      engine.clock.pending.size === 1
        ? `${TRACKS[track]}: ${q.variant + 1} ab Takt ${Math.floor((q.at % 128) / 16) + 1}`
        : `${engine.clock.pending.size} Wechsel ab Takt ${Math.floor((q.at % 128) / 16) + 1}`;
  } else
    $("#interaction-status").textContent = "Pattern ziehen · Hits streichen";
  document
    .querySelectorAll("[data-fx]")
    .forEach((el) =>
      el.setAttribute(
        "aria-pressed",
        String(el.dataset.fx === session.fx.mode),
      ),
    );
  document.querySelectorAll("[data-special]").forEach((el) => {
    const active =
      (padFlashes.get(el.dataset.special) || 0) > performance.now() ||
      engine.specialGroups.some((g) => g.id === el.dataset.special);
    el.classList.toggle("firing", active);
  });
  $("#hold").setAttribute("aria-pressed", String(session.fx.hold));
  $("#xy").classList.toggle("held", session.fx.hold);
  $("#xy-label").textContent =
    session.fx.mode === "gate"
      ? `GATE 1/${session.fx.division}`
      : session.fx.mode === "echo"
        ? "MASTER-ECHO"
        : session.fx.mode === "flanger"
          ? "FLANGER"
          : session.fx.mode.toUpperCase();
  $("#xy-hint").textContent = session.fx.hold
    ? "↑ Tiefe · HOLD hält"
    : "↑ Tiefe · loslassen neutral";
  $("#gate-label").textContent =
    `1/${session.fx.division} · tippen: 1/${session.fx.division === 8 ? 16 : 8}`;
  $("#xy-dot").style.left = `${14 + session.fx.x * 72}%`;
  $("#xy-dot").style.top = `${14 + (1 - session.fx.depth) * 72}%`;
  $("#xy").setAttribute(
    "aria-valuenow",
    String(Math.round(session.fx.depth * 100)),
  );
  $("#xy").setAttribute(
    "aria-valuetext",
    `${session.fx.mode}, Tiefe ${Math.round(session.fx.depth * 100)} Prozent, Farbe ${Math.round(session.fx.x * 100)} Prozent`,
  );
  // One bounded paint timer while audio/finite flashes need it; none while idle.
  const moving =
    engine.running ||
    engine.recording ||
    engine.specialGroups.length ||
    [...padFlashes.values()].some((t) => t > performance.now());
  if (moving && !refreshTimer)
    refreshTimer = setTimeout(() => {
      refreshTimer = null;
      refresh();
    }, 80);
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
  notice("FX AUS: Filter und Klangregler neutral; Patterns und Pegel bleiben.");
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
  if (b.dataset.special && e.detail === 0) triggerPad(b.dataset.special);
  if (b.dataset.track !== undefined && e.detail === 0)
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
function triggerPad(id) {
  padFlashes.set(id, performance.now() + 180);
  refresh();
  void engine
    .triggerSpecial(id)
    .then(() => refresh())
    .catch((e) => {
      notice(e.message);
      console.error(e);
    });
}
// Independent per-track captures: simultaneous drags do not steal another lane.
for (const ribbon of document.querySelectorAll("[data-ribbon]")) {
  const track = Number(ribbon.dataset.ribbon);
  const preview = (e) => {
    const g = ribbonGestures.get(track);
    if (g?.pointerId !== e.pointerId) return;
    const rect = ribbon.getBoundingClientRect();
    g.variant = ribbonVariant(e.clientX, rect);
    g.cancel = ribbonCancelled(e.clientY, rect);
    refresh();
  };
  ribbon.onpointerdown = (e) => {
    if (e.button !== 0 || ribbonGestures.has(track)) return;
    e.preventDefault();
    ribbonGestures.set(track, { pointerId: e.pointerId, variant: 0 });
    ribbon.setPointerCapture(e.pointerId);
    preview(e);
  };
  ribbon.onpointermove = preview;
  const finish = (e, commit) => {
    const g = ribbonGestures.get(track);
    if (g?.pointerId !== e.pointerId) return;
    ribbonGestures.delete(track);
    if (commit && !g.cancel) engine.queue(track, g.variant);
    if (ribbon.hasPointerCapture(e.pointerId))
      ribbon.releasePointerCapture(e.pointerId);
    refresh();
  };
  ribbon.onpointerup = (e) => {
    preview(e);
    finish(e, true);
  };
  ribbon.onpointercancel = (e) => finish(e, false);
  ribbon.onlostpointercapture = (e) => finish(e, false);
  ribbon.onkeydown = (e) => {
    const active = Number(e.target.closest("[data-variant]")?.dataset.variant);
    if (!Number.isFinite(active)) return;
    const next = {
      ArrowLeft: Math.max(0, active - 1),
      ArrowRight: Math.min(3, active + 1),
      Home: 0,
      End: 3,
    }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    engine.queue(track, next);
    ribbon.querySelector(`[data-variant="${next}"]`).focus();
  };
}
document.addEventListener(
  "keydown",
  (e) => {
    if (e.key !== "Escape" || !ribbonGestures.size) return;
    e.preventDefault();
    e.stopPropagation();
    for (const [track, g] of [...ribbonGestures]) {
      ribbonGestures.delete(track);
      const band = $(`[data-ribbon="${track}"]`);
      if (band.hasPointerCapture(g.pointerId))
        band.releasePointerCapture(g.pointerId);
    }
    refresh();
  },
  true,
);
const board = $("#special-board");
function glide(e) {
  const state = glidePointers.get(e.pointerId);
  if (!state) return;
  const hit = document
    .elementFromPoint(e.clientX, e.clientY)
    ?.closest("[data-special]");
  const id = hit && board.contains(hit) ? hit.dataset.special : null;
  const next = glideEntry(state.last, id);
  state.last = next.current;
  if (next.trigger) triggerPad(id);
}
board.onpointerdown = (e) => {
  if (e.button !== 0) return;
  e.preventDefault();
  glidePointers.set(e.pointerId, { last: null });
  board.setPointerCapture(e.pointerId);
  glide(e);
};
board.onpointermove = glide;
const endGlide = (e) => {
  glidePointers.delete(e.pointerId);
  if (board.hasPointerCapture(e.pointerId))
    board.releasePointerCapture(e.pointerId);
};
board.onpointerup = endGlide;
board.onpointercancel = endGlide;
board.onlostpointercapture = endGlide;
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
  ribbonGestures.clear();
  glidePointers.clear();
  padFlashes.clear();
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
    if (next.pack >= 3 && next.pack <= 5) {
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
    ribbonGestures.clear();
    glidePointers.clear();
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
        $("#offline-state").textContent = "Offline bereit · Vordergrund-Audio";
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
  async renderDiagnosticWav(config) {
    const buffer = await renderDiagnostic(config);
    return encodeWav(
      [[buffer.getChannelData(0), buffer.getChannelData(1)]],
      buffer.sampleRate,
    );
  },
};
refresh();
