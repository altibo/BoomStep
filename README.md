# BoomStep · Pocket Jam

Ein spielbares, installierbares Musikspielzeug fürs Handy. Vier Spuren statt einer DAW: Pattern wählen, Spuren herausnehmen, den Master-Filter fahren und den eigenen Jam als WAV mitnehmen.

## Starten

Node.js **22.12+** oder **24 LTS**, npm:

```sh
npm ci
npm run dev           # Entwicklungsserver, normalerweise http://localhost:5173
npm run build         # statische Website in dist/
npm run preview      # Produktionsbuild lokal ansehen (Port 4173)
```

Fürs Handy `dist/` auf einem genehmigten **HTTPS**-Host veröffentlichen. Ein localhost-Link des Entwicklungscomputers ist **kein** Handy-Link. Es gibt keinen Server, keine Datenbank, keinen API-Schlüssel und keine Kontoanmeldung. `base: './'` unterstützt auch einen Unterordner wie `/BoomStep/`.

**Hostingstand bei der Umsetzung:** Das GitHub-Repository ist privat und war leer; es gab weder GitHub Pages noch einen vorhandenen Deployment-Workflow. Es wurde keine Veröffentlichung aktiviert und keine Sichtbarkeit geändert. Vor einer öffentlichen Bereitstellung muss der Eigentümer Hosting und Sichtbarkeit ausdrücklich freigeben. Der Pull Request allein veröffentlicht die App nicht. Näheres unter [deployment/README.md](deployment/README.md).

## Spielen

1. Soundpaket wählen: **Night Drive** (120 BPM / A-Moll), **Lo-Fi Garden** (84 BPM / D-Moll), **House Lights** (126 BPM / E-Moll).
2. **Spielen** tippen: Audio wird erst durch deine Interaktion freigeschaltet. Kopfhörer empfohlen.
3. Drums, Bass, Akkorde und Melodie laufen in einem gemeinsamen **viertaktigen** Loop. Jede Spur bietet vier benannte Varianten (48 vollständige Spur-Patterns insgesamt).
4. Cyan ist aktiv; amber/gestrichelt ist vorgemerkt. Patternwechsel greifen an der nächsten noch nicht eingeplanten Taktgrenze — innerhalb des 100-ms-Audio-Lookaheads kann ein sehr später Tap erst den folgenden Takt erreichen. **Die gemeinsame Akkordphase bleibt erhalten**, neue Patterns beginnen nicht unpassend bei Takt eins. Ein erneuter Tap auf das aktive Pattern löscht die Vormerkung.
5. **Stumm** wirkt direkt und wird durch eine dunklere Karte und einen markierten Schalter angezeigt. **⚙** öffnet Lautstärke, Solo, Spur-Tiefpass und tempoabhängiges Delay. Mehrere Solos sind möglich, Stumm hat Vorrang. Delay/Hall dürfen nach einem Mute natürlich ausklingen.
6. Der breite **Master-Filter** ist direkt spielbar. **Mix** öffnet den Master-Hall.
7. **Pause** friert Audiozeit und Phase ein; **Spielen** setzt den Jam fort. **Anfang** stoppt die Quellen und setzt auf Takt eins zurück; Einstellungen bleiben erhalten, Effekttails klingen aus. Nach dem Ausklang wird Audio zum Energiesparen suspendiert.

### Speichern und Audio aufnehmen

- **Speichern / Öffnen:** ein lokaler Session-Slot auf diesem Gerät. Gespeichert werden Paket, gewählte/vorgemerkte Patterns, Mute/Solo und Mix, **keine** Audiodatei und keine Wiedergabeposition. Browserspeicher kann vom Betriebssystem gelöscht werden.
- **Export / Import:** Session-Einstellungen als validierte JSON-Datei sichern und auf einem anderen Gerät öffnen.
- **Aufnahme:** zeichnet den tatsächlich ausgegebenen Stereo-Mix hinter Filter, Delay, Hall und Kompressor auf, inklusive live gespielter Änderungen. Kein Mikrofonzugriff und keine Rekonstruktion nur aus dem Endzustand.
- Mit **WAV fertig** beenden und den Download-Link tippen: unkomprimiertes **16-bit Stereo-PCM-WAV** in der AudioContext-Samplerate. Maximal **120 Audiosekunden** (bei 48 kHz etwa 23 MB WAV; Aufnahmepuffer etwa 46 MB). Pausen frieren auch die Aufnahme ein und werden nicht als zusätzliche Stille aufgezeichnet. Die WAV bleibt bis zum nächsten Download/Seitenwechsel im Speicher; zum Behalten herunterladen.
- Für Aufnahme ist **AudioWorklet** in einem sicheren Kontext (HTTPS oder localhost) erforderlich. Falls nicht verfügbar, funktioniert Musik weiter und Aufnahme zeigt eine konkrete Fehlermeldung. Ein Paketwechsel während der Aufnahme wird verhindert.

## Auf dem Handy installieren / offline

- iPhone/iPad: aktuellen Safari verwenden, HTTPS-Seite öffnen → Teilen → **Zum Home-Bildschirm**. Gerätelautstärke und ggf. Stummmodus prüfen.
- Android: aktuellen Chrome verwenden → Menü → **App installieren / Zum Startbildschirm hinzufügen**.
- Nach dem erstmaligen vollständigen Laden zeigt die App **Offline vorbereitet**. Der Produktionsbuild cached App-Shell, JavaScript/CSS, Icons und den Aufnahme-Worklet. Alle Sounds entstehen lokal. Updates sind build-versioniert; zum Aktivieren einer neuen Version alle alten App-Tabs schließen und neu öffnen.
- Nur **Vordergrund-Audio** ist vorgesehen. Displaysperre, Appwechsel, Anruf und Betriebssystem-Energiesparen können Audio unterbrechen. Dann im Vordergrund erneut **Spielen** tippen. Keine Zusage für Hintergrundwiedergabe.
- Kein natives APK/IPA. Installiert wird eine PWA. Nach der Bereitstellung muss noch auf einem echten Android/iPhone getestet werden; automatisiertes Chromium mit Handy-Viewport ersetzt diesen Gerätetest nicht.

## Klang / Herkunft

Patterns und Synthese wurden für BoomStep mit KI-Unterstützung neu komponiert und im Quellcode definiert. Die drei Pakete teilen innerhalb ihres Pakets Tonart, Akkordfolge, BPM, Pegel und Soundcharakter. Bass, Akkorde und Melodie beziehen die Tonhöhe immer aus derselben globalen Loopposition.

Kick (Pitch-Hüllkurve), Snare/Hi-Hats (deterministisches Rauschen), Bass, Akkorde und Lead werden über Web Audio synthetisiert. Hallimpuls und Rauschpuffer sind lokal deterministisch erzeugt. **Keine fremden Samples, keine extern lizenzierten Musikaufnahmen, kein KI-Backend, kein Abruf fremder Audio- oder Font-CDNs.** Es wird keine menschliche Hörkurationsstudie behauptet. Die generierten Patterns sind fest eingebaut, nicht auf dem Handy neu generiert.

## Architektur

- `src/music.js`: validiertes Session-Modell, musikalische Ereignisse, taktbasiertes Pattern-Queueing, deterministischer Clock-Kern.
- `src/engine.js`: ein gemeinsamer AudioContext, 20-ms-Timer als **Wecker**, 100-ms-Lookahead; alle Quellen verwenden **AudioContext-Zeitstempel** für samplegenaue Starts und Hüllkurven. Nach einem längeren JS-Stall werden veraltete Schritte übersprungen, nicht als Notenburst nachgeholt. Browser/OS-Stalls können dennoch hörbare Aussetzer erzeugen — kein browserbasiertes System ist dagegen garantiert.
- Pro Spur: Synthese → Tiefpass → Lautstärke/Mute/Solo → Stereo-Pan, plus Delay-Send/Feedback. Master: Tiefpass → Dry/Convolver-Hall → Dynamikkompressor → Capture-Worklet → Lautsprecher.
- `public/recorder.js` / `src/wav.js`: PCM-Capture in 2048-Frame-Batches, Grenzprüfung, Teilpuffer-Flush, gültige WAV-Datei.
- `src/main.js` / `src/style.css`: deutschsprachiges, responsives Navy/Cyan Pocket-Grid. Echte ≥44×44-CSS-Pixel-Trefferflächen für Pattern, Mute, Details und Transport, mit Fokusrahmen, ARIA-Zuständen und Reduced-Motion-Unterstützung.
- `public/sw.js` / `vite.config.js`: Offline-App-Shell; pro Build und App-Scope versionierter Cache, kein Autoplay, keine externen Dienste.

## Prüfen

```sh
npm test                      # 11 Node-Tests
npm run lint                  # ESLint
npm run build                 # Vite Produktionsbuild
npx playwright install chromium
npm run test:browser          # 5 automatisierte Chromium-Tests
```

Browser-Tests prüfen echte nichtleere PCM-Aufnahme, Mute/Filter während der Performance, exakte Audiozeit-Pause/Resume, Session-Roundtrip, tatsächliche Gain/Filter/Delay/Hall-Parameter, echte PCM-Absenkung beim Stummschalten aller Spuren, Start aller drei Pakete, Offline-Neuladen und Touchziele bei 390 und 320 CSS-Pixel Breite. Testartefakte liegen portabel in `test-results/artifacts/` (gitignoriert). Unit-Tests prüfen Pattern-Determinismus/Unterscheidbarkeit, globale Akkordphase, Takt-Queue und Abbruch, Lookahead/Stall-Entscheidungen, Mute/Solo, ungültige Sessions, WAV-Header/PCM und echten Capture-Puffer-Flush/120-s-Grenze.

**Verifizierte Plattform:** Headless Chromium auf Linux. WebKit wurde heruntergeladen, konnte auf der Ausführungsumgebung mangels Systembibliotheken nicht gestartet werden; die offizielle Installation scheiterte an den Debian-Paketquellen (HTTP 500). Safari/iPhone wurde nicht als getestet ausgegeben. Kein Remote-CI-Lauf wird behauptet; die Prüfungen laufen lokal über die obigen Befehle.
