# BoomStep · Orbit Deck

**Spielen: https://altibo.github.io/BoomStep/** · Offlinefähige Musik-PWA, keine Anmeldung, keine Samples, kein KI-Backend.

Neues eigenes Standardpaket **Berlin Bounce** und **sechs einmalige Live-Specials**. Vier laufende Spuren, **alle musikalischen Regler direkt auf einer Oberfläche**, ein XY-Feld zum Spielen statt verschachtelter Menüs. Kopfhörer empfohlen. Die Versionen bleiben über Git-Historie und separate Feature-/Deploybranches nachvollziehbar.

## Orbit Deck · lokaler Reviewstand 3.1 / R3

Noch **nicht veröffentlicht**: der aktuelle UI-Stand wartet auf unabhängigen Screenshot-/Interaktionsreview. Die öffentliche Pages-Version bleibt bis zur Freigabe unverändert.

- **Patternbänder**: vier diskrete große Segmente je Spur bleiben direkt tippbar. Ziehen = weiße Vorschau; Loslassen = letzte Variante taktgenau vormerken; Mehr als 24px nach oben/unten herausziehen = sichtbares Abbrechen, dort Loslassen verwirft; Reentry erlaubt wieder Vormerken. Escape/Systemcancel/lost capture verwerfen ebenfalls, vorhandene Pending-Wahl bleibt. Keine Hörvorschau. Cyan/Auswahl bzw. Spielt, ausschließlich Amber/vorgemerkt und Weiß/Ziehauswahl trennen die Zustände. Pfeile/Home/End und Enter/Space bleiben nutzbar. Kein behauptetes kontinuierliches Klangmorphing.
- **Strum Specials**: über die sechs sichtbaren Pads streichen; jeder neue Feldeintritt spielt einmal, Zurückstreichen erneut. Stillhalten wiederholt nie. Fingerhistorien sind unabhängig, Pointercancel räumt die Geste auf, endliche Sounds klingen aus. Tastatur weiterhin möglich.
- **Audiozeit-Orbit**: echte gemeinsame achttaktige Phase, Audiozeit-Playhead und Pending-Wechselmarken; kein CSS-Spinner, kein Seek. Bestehendes XY-Feld im Orbit und vier direkte FX-Pads daneben. Reduced Motion zeigt nur Taktwechsel statt kontinuierlichem Kopf. Keine neuen Sound-/Sessionparameter, unverändertes validiertes V1–3-Format.
- Lesbare Reviewkorrektur: alle musikalischen Labels mindestens 11px, Haupt- und Padlabels 12px, kompakte Status-/Achsenlabels 11px; keine Skalierung für kleine Viewports. Achsen außerhalb des 96×88px-XY-Feldes. R3 entfernt die vier zusätzlichen Statuszeilen: 44px Pattern-/Spurkopf plus 44px Fader pro Spur. Masterfilter/Hall/Drive/Pump und HITPEGEL teilen eine direkt sichtbare 44px-Zeile. Der 184px-Performancebereich enthält den lesbaren Orbit, 67px-FX-Pads und getrennte Phase-/Gestenmeldungen; Specials sind 48px hoch. Die Musik passt bei 390×844 vollständig, kleinere Viewports scrollen ehrlich. Amber nur für Pending; gewählter FX-Modus/HOLD cyan, REC rot. **SPUR-ECHO** ist der nasse Pegel des jeweiligen Spurdelays; **MASTER-ECHO** ist das zusätzliche globale XY-Delay. **FX AUS** setzt alle regelbaren Effekte/Filter neutral, nicht den festen Schutzlimiter; vorhandene Tails klingen aus.
- SAVE übernimmt bewusst vorgemerkte Pattern als Startauswahl beim nächsten Öffnen.
- Vier gelesene Herstellerquellen, übernommene Prinzipien und bewusst verworfene Ideen: [GUI-Recherche](docs/gui-research.md). Keine Behauptung einer neuen Erfindung; keine kopierten Markenlayouts oder Assets.

## Stilreferenz: textgestützt, keine Songkopie

ANUUK wurde anhand seines [offiziellen Amplia-Artistprofils](https://www.ampliaberlin.com/artists/anuuk) als Berliner Liveact mit Rap-Energie und hartem, federndem Techno zugeordnet. [Spotify „Jump“](https://open.spotify.com/track/5IHOeYfMY3ZhuUPXDKH7sf) und [OTOTOY „Make It Clap“](https://ototoy.jp/_/default/p/4145720) bestätigen Anuuk/Kø:lab-Releasezuordnungen. **Es wurden nur öffentliche Text-/Metadaten geöffnet, keine Musik gehört oder transkribiert.** 152 BPM/F-Moll sind eigene Kompositionsentscheidungen, keine verifizierten Trackdaten. Keine fremden Songs, Melodien, Samples, Vocals oder Künstlerstimmen, keine offizielle ANUUK-App. Details: [Quellen und Ableitung](docs/style-research.md).

## Der neue Sound

- **Berlin Bounce · 152 BPM / F-Moll, neuer Standard:** kürzere, federnde Kick mit eigener Hüllkurve, synkopierter FM-/Triangle-Bass mit Oktavantworten, Swing-Hats/Rims/Claps, formantgefilterte synthetische Bark-Stabs und eigene Call-and-Response-Motive. Neue Patternereignisse und Synthesestimmen, nicht bloß ein umbenanntes Hard-House-Paket.

- **Donk District · 150 BPM / A-Moll:** FM-Donk auf Offbeats, rollende Percussion, kurze Rave-Stabs.
- **Steel Warehouse · 147 BPM / Fis-Moll:** härter gesättigte Kick, metallischer Donk, Square-Riffs, Ride-/Warehouse-Variation.
- **Hoover Riot · 154 BPM / E-Moll:** verstimmte Sägezahn-Hoover mit Pitch-Drop, rasante Riffs und Rush-Fills.
- Pro Paket vier deutlich unterschiedliche Patterns je Spur: **Drums / Bass / Stabs / Riff**. Alle teilen die viertaktige Harmonie; zusätzliche Fill-Entscheidungen laufen über eine **achttaktige Phrase**. Die drei ursprünglichen Pakete bleiben als **Classic** verfügbar — insgesamt 112 Spur-Patterns.
- Die Kick hat getrennten tiefen Body, Pitch-Hüllkurve, Click und kontrollierte Waveshaper-Sättigung. Offbeat-Open-Hats, 16tel-Hats, Clap-Bursts, Snare-Layer, Percussion und Tom-Fills werden lokal synthetisiert. Donk verwendet eine abklingende FM-Modulation; Hoover nutzt mehrere detunete Oszillatoren. Keine simplen vier Metronome und keine fremden Samples.
- Ein kickgesteuertes, audiozeitgeplantes **Ducking** schafft Platz für Kick und Bass. Der sichtbare PUMP-Regler steuert dessen Tiefe auf Bass/Stabs/Riff; eine stummgeschaltete oder lautlose Kick löst es nicht aus. Stereoabbildung, Kompressor und abschließende begrenzte Kennlinie sorgen für Headroom. Die Safety-Kennlinie bleibt auch bei überfahrenem Eingang unter Vollaussteuerung; sie ersetzt kein menschliches Mastering.

## Sechs direkt sichtbare Einmal-Pads

**BARK HIT / BASS SHOT / ROLL FILL / UP SWEEP / IMPACT / LASER**: Ein Tap startet genau ein finites Klangereignis. Kein Toggle, kein dauerhaftes Loop und keine Spurpattern-Ersetzung. Bark/Bass sind tonal an aktuelle Tonart/Akkordphase gebunden; der Roll Fill startet sofort frei im Pakettempo, ohne versteckte Queue. Rise/Impact/Laser enden von selbst. Ein heller Padzustand zeigt den Trigger bzw. laufenden Sound.

**HITPEGEL** regelt alle sechs Pads direkt. Die Specials gehen durch denselben Masterfilter, Drive, Flanger, Echo, Hall, Gate, Kompressor und Safety-Ausgang wie der Jam und sind wirklich in der WAV-Aufnahme enthalten. Spur-Mute/Solo betrifft den Loop, nicht den separaten Special-Bus; PUMP duckt weiterhin die Loopspuren zur Kick.

Auch bei gestopptem oder pausiertem Jam spielbar: der Pad-Tap entsperrt Audio, startet aber **nicht heimlich den Loop**. Bei pausiertem Jam bleibt der Loopbus stumm; vorhandene Lookahead-Ereignisse werden beim Fortsetzen um die vergangene Audiozeit verschoben, ohne Clock-/Patternphase voranzusetzen. Eine endliche One-Shot-Hüllkurve bleibt nicht an Pointer-Hold gebunden. Mehrere Pads/Finger und wiederholte Taps sind erlaubt. Bis zu **acht Soundgruppen** überlappen; weitere Taps ersetzen die älteste mit kurzer Ausblendung, statt neue Taps still zu ignorieren. Alle Quellen und Gruppen werden nach Ende freigegeben. **■** stoppt Loop und Specials; **FX AUS** bleibt ein reiner Effektreset.

## Eine Oberfläche, keine musikalischen Untermenüs

**Pro Spur:** vier große Pattern-Tasten, **STUMM**, **SOLO**, direkt darunter **PEGEL / FILTER / SPUR-ECHO**. Cyan spielt, amber/gestrichelt ist für den nächsten noch planbaren Takt vorgemerkt. Ein erneuter Tap aufs aktive Pattern löscht die Vormerkung. Die globale Akkordphase bleibt erhalten. Der 100-ms-Lookahead kann sehr späte Taps erst zum folgenden Takt übernehmen.

**Master:** M-FILTER, HALL, DRIVE und PUMP sind immer sichtbar; HITPEGEL liegt als fünfter Fader in derselben Zeile.

**XY-Performancefeld:**

- X fährt von dunklem Tiefpass über die neutrale Mitte zum schneidenden Hochpass.
- Y steuert die Tiefe des gewählten Effekts: **MASTER-ECHO** (tempoabhängiges 3/16-Delay mit Feedback), **FLANGER** (echte modulierte Kurzdelay-/Feedback-Schaltung), **GATE** (audiozeit-synchrones Gain-Gating) oder **DRIVE** (parallele Waveshaper-Sättigung).
- GATE nochmals tippen schaltet sichtbar **1/8 ↔ 1/16**. Es ist bewusst kein erfundener Sample-Stutter.
- Ohne HOLD fällt die Position beim Loslassen auf X-Mitte/Y-null zurück. Gain-/Filter-Rampen vermeiden harte Parametersprünge; vorhandene Echotails klingen musikalisch aus. **HOLD** vor oder während der Geste hält die letzte Position. HOLD ausschalten löst sie wieder.
- **FX AUS** neutralisiert XY, Masterfilter, Hall, Drive, Pump und Spurfilter/Spur-Echo-Pegel, lässt aber Patterns, Lautstärken und Mute/Solo unberührt. Gate wird auf Durchlass gerampt. Limiter/Safety bleiben aktiv.
- Pointer-Capture hält die Geste beim Verlassen des Felds; nur der erste Pointer steuert XY, ein weiterer Finger kann Spuren bedienen. Pointer-Cancel löst sicher. Pfeiltasten steuern Farbe/Tiefe, Escape ist FX AUS, Verlassen des Feldes löst ohne HOLD.

**PLAY / PAUSE / Stop / REC / SAVE / HOLD / FX AUS** sind direkt erreichbar. Keine Zahnrad- oder Mixdialoge. Nur Hilfe sowie Session-Dateiimport sind sekundär; dort stecken keine musikalischen Funktionen.

### Displaygrößen (gemessen, nicht geschätzt)

Automatisierte Chromium-Prüfung in CSS-Pixeln:

| Viewport       | Musikbereich einschließlich Transport | Verhalten                                                               |
| -------------- | ------------------------------------: | ----------------------------------------------------------------------- |
| 390 × 844      |                      unten bei 822 px | alle musikalischen Controls sichtbar; kein Musik-Scroll nötig           |
| 390 × 700      |                      unten bei 822 px | 122px Musik-Scroll                                                      |
| 320 × 568      |                      unten bei 936 px | 368px Musik-Scroll; zusätzliche Namenszeilen und zweireihiger Transport |
| 844 × 390 quer |                      unten bei 638 px | 248px Musik-Scroll                                                      |

Nichtmusikalische Dateiaktionen/Hilfe liegen dahinter und dürfen unter dem Fold stehen. Die 59 direkten musikalischen Trefferflächen sind per echten DOM-Bounds geprüft; zusätzlich prüft die Suite Fontgrößen, sichtbare Labels, Clipping und Achsenabstände. Orbit-Ziffern: 14 SVG-Einheiten bei 144/160-Darstellung = effektiv 12,6 CSS-Pixel, ebenfalls gegen den tatsächlich gerenderten Maßstab geprüft. Lange Patternnamen dürfen nur in der schmalen Namenszelle auf zwei Zeilen gekürzt werden; vollständiger Name bleibt über ARIA und die Pattern-Tasten verfügbar. Pending steht am Band und als verständlicher Text in der zentralen Meldung, Details zusätzlich für Screenreader.

Alle direkten musikalischen Eingabeflächen — Pattern, STUMM/SOLO, FX, Specials, Transport, Paketauswahl, XY und alle 17 Fader — haben **mindestens 44×44 CSS-Pixel**. Fader sind echte 44px hohe Felder, keine überlappenden vergrößerten Trefferzonen. Kein horizontaler Scroll. Betriebssystem-Schriftvergrößerung, Safari-Browserleisten oder andere Geräte können zusätzliche Höhe brauchen. Lieber dann scrollen statt Bedienfelder abschneiden.

## Aufnahme und Sessions

- **REC** zeichnet den echten Post-Master-Stereomix samt Patternwechseln, Mutes, XY-Drive/Echo/Flange/Gate, Hall und Filterfahrten auf — nicht nur einen nachträglich rekonstruierten Endzustand.
- Nochmals REC/WAV tippen, dann den **Stereo-WAV-Link** herunterladen. 16-bit PCM in der AudioContext-Samplerate, maximal **120 Audiosekunden**. Bei 48 kHz etwa 23 MB WAV / 46 MB Float-Aufnahmepuffer. Pausen frieren Audiozeit und Aufnahme ein. Kein Mikrofonzugriff.
- AudioWorklet braucht HTTPS oder localhost. Fehlt er, funktioniert Musik weiter und Aufnahme zeigt eine Fehlermeldung.
- SAVE/Öffnen: ein lokaler Slot auf diesem Gerät; Export/Import: validierte JSON-Session. Browserdaten können vom Betriebssystem gelöscht werden. WAV-Datei zum Behalten herunterladen.
- **Sessionformat v3**, mit validierter Migration aller drei **v1**-Pakete auf ihre Classic-Entsprechung und aller sechs **v2**-Paketindizes ohne Verschiebung. SPECIAL LEVEL wird neutral mit 0,7 ergänzt. Patternwahl, Mute/Solo, Lautstärke, Filter, Sends und Masterwerte bleiben erhalten; Drive/Pump/XY-Effekte starten nur bei der V1-Migration neutral, bestehende V2-Effekte bleiben erhalten. Gehaltene XY-Positionen lassen sich speichern; nicht gehaltene Gesten werden neutral gespeichert.

## Handy / offline / Grenzen

Aktuellen Safari oder Chrome verwenden. HTTPS-Link öffnen, **PLAY** tippen (kein Autoplay), optional **Zum Home-Bildschirm hinzufügen**. Nach dem ersten vollständigen Laden erscheint „Offline bereit“. Alle Klänge entstehen lokal; keine Audio-, Font-CDN- oder KI-API-Anfragen. Nach einem Update alte App-Tabs vollständig schließen und neu öffnen, damit der neue versionierte Serviceworker aktiviert wird.

Nur **Vordergrund-Audio**: Appwechsel, Displaysperre, Anruf oder Energiesparen können unterbrechen. Zum Fortsetzen wieder PLAY tippen. Keine Hintergrundgarantie, kein APK/IPA. Automatisierte Linux-Chromium-Tests ersetzen keinen echten Android-/iPhone-Test. Safari/WebKit bleibt unbestätigt; die offizielle WebKit-Abhängigkeitsinstallation auf der Box scheiterte an HTTP-500 der Debian-Paketquellen.

Patterns, Synthese, Rauschen, Hallimpuls und Icons wurden eigens mit KI-Unterstützung für BoomStep erstellt. Keine fremden Musikaufnahmen. Die Signaltests belegen Unterschiede und Pegelgrenzen, **keinen subjektiven Hörtest oder eine Qualitätsgarantie**.

## Entwicklung und Prüfung

Node **22.12+** oder **24 LTS**, npm:

```sh
npm ci
npm run dev                   # Entwicklung, Port 5173
npm test                      # 26 Node-Tests
npm run lint
npm run build                 # statische PWA in dist/
npm run preview               # Produktionsvorschau, Port 4173
npx playwright install chromium
npm run test:browser           # 34 Chromium-Tests, inkl. echter PCM-Aufnahme und Offline-Rendering
npm audit --omit=dev
```

`src/music.js`: Paketindizes, Sessionmigration, PatternClock. `src/bounce-music.js`: neue Bounce-Komposition. `src/specials.js`: finite, tonartbezogene Special-Pläne. `src/legacy-music.js`: ursprüngliche Classic-Komposition. `src/synth.js`: deterministische Stimmen. `src/fx.js`: reine XY-/Release-/Gate-/Kurvenentscheidungen. `src/engine.js`: gemeinsamer AudioContext, 20-ms-Wecktimer, samplezeitgeplanter 100-ms-Lookahead, Ducking und Effektgraph. `src/main.js` / `src/style.css`: direktes Mischpult. `public/recorder.js` / `src/wav.js`: echter PCM-Capture/WAV. `public/sw.js` / `vite.config.js`: pro Build und App-Scope versionierter Offlinecache.

Node-Tests prüfen zusätzlich die sechs distinkten finiten Pläne, F-Moll und indexerhaltende V2-Migration. Browser-Tests ergänzen Standalone-Taps ohne Loopstart, Retrigger/Keyboard/achtfaches Voice-Stealing und Cleanup, unveränderte Clock/Patterns, Pause mit Specials, echte Special-PCM-Aufnahme bei stummen Loopspuren, Offline-Pads und neue Layoutgrößen. Die bisherige Suite bleibt erhalten. Node-Tests erhalten die früheren Clock-/WAV-/Capture-Regressionen und prüfen zusätzlich Migration, FX-Ziele, Release/Hold/DRY, Gatephase, Viertaktphase/Achttaktfills und unterschiedliche Patterns. Browser-Tests erhalten die früheren Audio-/Session-/Offline-Prüfungen und ergänzen Layouts, XY-Gesten, echte live aufgenommene Drive-Änderung, 48 Offline-Renders mit Signalunterschieden zwischen allen Hard-House-Varianten, begrenzte Peaks und hörbare Signaländerungen durch alle Effektwege. Native DSP-Ausgaben dürfen kleine numerische Abweichungen haben; Kompositionsereignisse bleiben deterministisch.

`test-results/readable-artifacts/` enthält die R3-Viewport-/Fullpage-Ansichten, Playing/Pending und HOLD/Stumm/Solo. Der zusätzliche R3-Test protokolliert alle 59 echten Control-Bounds. `test-results/gui-artifacts/` enthält die drei neuen Viewport-Screenshots, Playing/Pending/FX- und Recording-Ansicht sowie `orbit-strum-live.wav`. Neue Browserfälle prüfen Preview/Commit/Cancel/lost capture, Tastatur, zwei simultane Finger, Audiozeit-Orbit/Pause, tatsächliche Strum-/Drive-PCM-Aufnahme und Idle-/Reduced-Motion-Verhalten. `test-results/artifacts/` enthält weiterhin Screenshots, einen Signalbericht, echte Live-WAVs, drei 14-sekündige synthetisierte Demo-WAVs, eine 35-sekündige eigene Berlin-Bounce-Performance mit Specials und eine tatsächliche Special-/FX-Liveaufnahme. Das sind lokale Testartefakte, keine automatisch publizierte Audio-Bibliothek. Statische HTTPS-Bereitstellung siehe [deployment/README.md](deployment/README.md).
