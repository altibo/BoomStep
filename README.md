# BoomStep · Hard House Live

**Spielen: https://altibo.github.io/BoomStep/** · Offlinefähige Musik-PWA, keine Anmeldung, keine Samples, kein KI-Backend.

Vier laufende Spuren, **alle musikalischen Regler direkt auf einer Oberfläche**, ein XY-Feld zum Spielen statt verschachtelter Menüs. Kopfhörer empfohlen. Die Versionen bleiben über Git-Historie und separate Feature-/Deploybranches nachvollziehbar.

## Der neue Sound

- **Donk District · 150 BPM / A-Moll:** FM-Donk auf Offbeats, rollende Percussion, kurze Rave-Stabs.
- **Steel Warehouse · 147 BPM / Fis-Moll:** härter gesättigte Kick, metallischer Donk, Square-Riffs, Ride-/Warehouse-Variation.
- **Hoover Riot · 154 BPM / E-Moll:** verstimmte Sägezahn-Hoover mit Pitch-Drop, rasante Riffs und Rush-Fills.
- Pro Paket vier deutlich unterschiedliche Patterns je Spur: **Drums / Bass / Stabs / Riff**. Alle teilen die viertaktige Harmonie; zusätzliche Fill-Entscheidungen laufen über eine **achttaktige Phrase**. Die drei ursprünglichen Pakete bleiben als **Classic** verfügbar — insgesamt 96 Spur-Patterns.
- Die Kick hat getrennten tiefen Body, Pitch-Hüllkurve, Click und kontrollierte Waveshaper-Sättigung. Offbeat-Open-Hats, 16tel-Hats, Clap-Bursts, Snare-Layer, Percussion und Tom-Fills werden lokal synthetisiert. Donk verwendet eine abklingende FM-Modulation; Hoover nutzt mehrere detunete Oszillatoren. Keine simplen vier Metronome und keine fremden Samples.
- Ein kickgesteuertes, audiozeitgeplantes **Ducking** schafft Platz für Kick und Bass. Der sichtbare PUMP-Regler steuert dessen Tiefe auf Bass/Stabs/Riff; eine stummgeschaltete oder lautlose Kick löst es nicht aus. Stereoabbildung, Kompressor und abschließende begrenzte Kennlinie sorgen für Headroom. Die Safety-Kennlinie bleibt auch bei überfahrenem Eingang unter Vollaussteuerung; sie ersetzt kein menschliches Mastering.

## Eine Oberfläche, keine musikalischen Untermenüs

**Pro Spur:** vier große Pattern-Tasten, **STUMM**, **SOLO**, direkt darunter **VOL / FILTER / ECHO**. Cyan spielt, amber/gestrichelt ist für den nächsten noch planbaren Takt vorgemerkt. Ein erneuter Tap aufs aktive Pattern löscht die Vormerkung. Die globale Akkordphase bleibt erhalten. Der 100-ms-Lookahead kann sehr späte Taps erst zum folgenden Takt übernehmen.

**Master:** FILTER, HALL, DRIVE und PUMP sind immer sichtbar.

**XY-Performancefeld:**

- X fährt von dunklem Tiefpass über die neutrale Mitte zum schneidenden Hochpass.
- Y steuert die Tiefe des gewählten Effekts: **ECHO** (tempoabhängiges 3/16-Delay mit Feedback), **FLANGE** (echte modulierte Kurzdelay-/Feedback-Schaltung), **GATE** (audiozeit-synchrones Gain-Gating) oder **DRIVE** (parallele Waveshaper-Sättigung).
- GATE nochmals tippen schaltet sichtbar **1/8 ↔ 1/16**. Es ist bewusst kein erfundener Sample-Stutter.
- Ohne HOLD fällt die Position beim Loslassen auf X-Mitte/Y-null zurück. Gain-/Filter-Rampen vermeiden harte Parametersprünge; vorhandene Echotails klingen musikalisch aus. **HOLD** vor oder während der Geste hält die letzte Position. HOLD ausschalten löst sie wieder.
- **DRY!** neutralisiert XY, Masterfilter, Hall, Drive, Pump und Spurfilter/Echo-Sends, lässt aber Patterns, Lautstärken und Mute/Solo unberührt. Gate wird auf Durchlass gerampt. Limiter/Safety bleiben aktiv.
- Pointer-Capture hält die Geste beim Verlassen des Felds; nur der erste Pointer steuert XY, ein weiterer Finger kann Spuren bedienen. Pointer-Cancel löst sicher. Pfeiltasten steuern Farbe/Tiefe, Escape ist DRY!, Verlassen des Feldes löst ohne HOLD.

**PLAY / PAUSE / Stop / REC / SAVE / HOLD / DRY!** sind direkt erreichbar. Keine Zahnrad- oder Mixdialoge. Nur Hilfe sowie Session-Dateiimport sind sekundär; dort stecken keine musikalischen Funktionen.

### Displaygrößen (gemessen, nicht geschätzt)

Automatisierte Chromium-Prüfung in CSS-Pixeln:

| Viewport       | Musikbereich einschließlich Transport | Verhalten                                          |
| -------------- | ------------------------------------: | -------------------------------------------------- |
| 390 × 844      |                      unten bei 688 px | alles direkt im Viewport                           |
| 390 × 700      |                      unten bei 594 px | alles direkt im Viewport                           |
| 320 × 568      |                  unten bei ca. 786 px | vertikales Scrollen, keine versteckten Musikregler |
| 844 × 390 quer |                  unten bei ca. 492 px | vertikales Scrollen                                |

Pattern-, STUMM-/SOLO-, FX- und Transporttasten sowie Paketauswahl haben **mindestens 44×44 CSS-Pixel**. Die zwölf direkten Spur-Fader verwenden kompakte 36–40 px hohe Touchbereiche und klar beschriftete horizontale Regler; sie werden nicht als 44-px-Tasten ausgegeben. Kein horizontaler Scroll. Betriebssystem-Schriftvergrößerung, Safari-Browserleisten oder andere Geräte können zusätzliche Höhe brauchen. Lieber dann scrollen statt Bedienfelder abschneiden.

## Aufnahme und Sessions

- **REC** zeichnet den echten Post-Master-Stereomix samt Patternwechseln, Mutes, XY-Drive/Echo/Flange/Gate, Hall und Filterfahrten auf — nicht nur einen nachträglich rekonstruierten Endzustand.
- Nochmals REC/WAV tippen, dann den **Stereo-WAV-Link** herunterladen. 16-bit PCM in der AudioContext-Samplerate, maximal **120 Audiosekunden**. Bei 48 kHz etwa 23 MB WAV / 46 MB Float-Aufnahmepuffer. Pausen frieren Audiozeit und Aufnahme ein. Kein Mikrofonzugriff.
- AudioWorklet braucht HTTPS oder localhost. Fehlt er, funktioniert Musik weiter und Aufnahme zeigt eine Fehlermeldung.
- SAVE/Öffnen: ein lokaler Slot auf diesem Gerät; Export/Import: validierte JSON-Session. Browserdaten können vom Betriebssystem gelöscht werden. WAV-Datei zum Behalten herunterladen.
- **Sessionformat v2**, mit validierter Migration aller drei **v1**-Pakete auf ihre Classic-Entsprechung. Patternwahl, Mute/Solo, Lautstärke, Filter, Sends und Masterwerte bleiben erhalten; neue Drive/Pump/XY-Effekte starten bei der Migration neutral. Gehaltene XY-Positionen lassen sich speichern; nicht gehaltene Gesten werden neutral gespeichert.

## Handy / offline / Grenzen

Aktuellen Safari oder Chrome verwenden. HTTPS-Link öffnen, **PLAY** tippen (kein Autoplay), optional **Zum Home-Bildschirm hinzufügen**. Nach dem ersten vollständigen Laden erscheint „Offline bereit“. Alle Klänge entstehen lokal; keine Audio-, Font-CDN- oder KI-API-Anfragen. Nach einem Update alte App-Tabs vollständig schließen und neu öffnen, damit der neue versionierte Serviceworker aktiviert wird.

Nur **Vordergrund-Audio**: Appwechsel, Displaysperre, Anruf oder Energiesparen können unterbrechen. Zum Fortsetzen wieder PLAY tippen. Keine Hintergrundgarantie, kein APK/IPA. Automatisierte Linux-Chromium-Tests ersetzen keinen echten Android-/iPhone-Test. Safari/WebKit bleibt unbestätigt; die offizielle WebKit-Abhängigkeitsinstallation auf der Box scheiterte an HTTP-500 der Debian-Paketquellen.

Patterns, Synthese, Rauschen, Hallimpuls und Icons wurden eigens mit KI-Unterstützung für BoomStep erstellt. Keine fremden Musikaufnahmen. Die Signaltests belegen Unterschiede und Pegelgrenzen, **keinen subjektiven Hörtest oder eine Qualitätsgarantie**.

## Entwicklung und Prüfung

Node **22.12+** oder **24 LTS**, npm:

```sh
npm ci
npm run dev                   # Entwicklung, Port 5173
npm test                      # 18 Node-Tests
npm run lint
npm run build                 # statische PWA in dist/
npm run preview               # Produktionsvorschau, Port 4173
npx playwright install chromium
npm run test:browser           # 11 Chromium-Tests, inkl. echter PCM-Aufnahme und Offline-Rendering
npm audit --omit=dev
```

`src/music.js`: Hard-House-Komposition, Sessionmigration, PatternClock. `src/legacy-music.js`: ursprüngliche Classic-Komposition. `src/synth.js`: deterministische Stimmen. `src/fx.js`: reine XY-/Release-/Gate-/Kurvenentscheidungen. `src/engine.js`: gemeinsamer AudioContext, 20-ms-Wecktimer, samplezeitgeplanter 100-ms-Lookahead, Ducking und Effektgraph. `src/main.js` / `src/style.css`: direktes Mischpult. `public/recorder.js` / `src/wav.js`: echter PCM-Capture/WAV. `public/sw.js` / `vite.config.js`: pro Build und App-Scope versionierter Offlinecache.

Node-Tests erhalten die früheren Clock-/WAV-/Capture-Regressionen und prüfen zusätzlich Migration, FX-Ziele, Release/Hold/DRY, Gatephase, Viertaktphase/Achttaktfills und unterschiedliche Patterns. Browser-Tests erhalten die früheren Audio-/Session-/Offline-Prüfungen und ergänzen Layouts, XY-Gesten, echte live aufgenommene Drive-Änderung, 48 Offline-Renders mit Signalunterschieden zwischen allen Hard-House-Varianten, begrenzte Peaks und hörbare Signaländerungen durch alle Effektwege. Native DSP-Ausgaben dürfen kleine numerische Abweichungen haben; Kompositionsereignisse bleiben deterministisch.

`test-results/artifacts/` enthält Screenshots, einen Signalbericht, echte Live-WAVs und drei 14-sekündige synthetisierte Demo-WAVs. Das sind lokale Testartefakte, keine automatisch publizierte Audio-Bibliothek. Statische HTTPS-Bereitstellung siehe [deployment/README.md](deployment/README.md).
