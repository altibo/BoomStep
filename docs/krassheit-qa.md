# Krassheit 3.2 · lokaler Messbericht

Stand: 8. November 2026 (Europe/Berlin). Linux-Chromium, echte Produktionsvorschau; kein Safari-/Echtgeräte- oder subjektiver Hörtest.

## Prüfung

- 33 Unit-Tests (26 bestehende + 7 neue), 42 Browserfälle (37 bestehende + 5 neue), ESLint, Vite-Produktionsbuild und npm-Audit ohne Befund. Keine bisherigen Regressionstests entfernt.
- Öffentlich wird anschließend dieselbe vollständige Browser-Suite plus ein zusätzlicher HTTPS-/Serviceworker-Scope-/Altcache-Fall ausgeführt. Ergebnisse, Asset-Hashes und Screenshots liegen außerhalb des Sourcebuilds unter `/workspace/boomstep/krassheit-qa/public/`; dies ist vor dem Deployment noch keine behauptete öffentliche Abnahme.
- Neue Fälle: V1–3-Defaults/Validierung und Roundtrip, unveränderte manuelle Baselines/Pending/Phase, deterministische monotone Zusatzdichte auf allen Paketen, FX-AUS-Makroreset, Kontrast der gesamten Palette, weiche <=3Hz-Hüllkurve, Pause/Ruhig/Reduced Motion und ruhender Paint-Loop; echter Post-Master-WAV während 0→100→0.

## Signal statt bloßer Gain-Änderung

Berlin Bounce, identische deterministische Grundereignisse; linke PCM-Spur, 2,6 Sekunden pro Stufe:

| Krassheit |     RMS | Samplepeak |
| --------- | ------: | ---------: |
| 0         | 0,17354 |    0,70013 |
| 50        | 0,22617 |    0,75497 |
| 100       | 0,28707 |    0,78117 |

Nach optimalem linearem Gain-Fit bleiben normalisierte Signalreste **0,50048** (0→50) und **0,32925** (50→100), deutlich über der Testgrenze 0,05. Das belegt eine andere Wellenform/Ereignisdichte, keine subjektive Klangbewertung. 100 plus maximales XY-Drive und sechs simultane Specials: Peak **0,84711**, unter 0,95. Der tatsächliche live aufgenommene Stereo-WAV wird zusätzlich über beide interleavten Kanäle auf Nichtleere und Peak <0,95 geprüft.

`krassheit-24s-sweep.wav` ist ein deterministischer 24s-Offline-Testmix mit 0/50/100/0 ab Sekunde 0/7/14/21 und sechs verteilten Specials. `krassheit-live-recording.wav` ist dagegen die tatsächliche kürzere AudioWorklet-Aufnahme während einer live gefahrenen Makrobewegung. Beide sind lokale Prüfdateien, keine automatisch abgespielte oder auf Pages publizierte Audiobibliothek.

## Tatsächliche Layoutgrenzen

| Viewport | Musikende einschließlich Transport | Musik-Scroll |
| -------- | ---------------------------------: | -----------: |
| 390×844  |                               y822 |            0 |
| 390×700  |                               y822 |        122px |
| 320×568  |                               y936 |        368px |
| 844×390  |                               y638 |        248px |

61 reale musikalische Eingabeflächen mindestens 44×44 CSS-px; alle 61 auf 390×844 im Display. Alle 17 bisherigen Fader bleiben, hinzu kommen Makrofader und direkter Lichttaster. Kein horizontaler Scroll und kein Makrolabel-Clipping bei 0/50/100 auf 390/320px. Schrift mindestens 11px; Orbit-Ziffern effektiv 12,6px. Keine neue Menüebene und keine zusätzliche Musikzeile. Betriebssystem-Schriftvergrößerung und echte Browserleisten können zusätzliche Höhe benötigen.

Artefakte: `test-results/intensity-artifacts/` mit echten Viewportbildern 0/50/100, Fullpage, laufendem 50/Pending, 100/Solo/Pending, Reduced Motion, vollständigen Bounds-JSONs, Signalreport und beiden WAVs. Die öffentliche Wiederholung erzeugt dieselben Artefakte unter dem oben genannten Public-Verzeichnis.

## Semantik

Makro 0 ist die bisherige Grundmischung, nicht Stille. Steigerung addiert Drive/Pump und Synthesefarbe plus deterministische Hat-/Rim-/Riff-/Achttakt-Fill-Ereignisse, ohne Userpattern oder Mixwerte umzuschreiben. Parameter werden mit 25ms-Zielrampen gefahren, neue Stimmen übernehmen die Makrofarbe auf dem bestehenden Raster. Beim Zurückziehen entfallen Zusätze wieder; bereits geplante 100ms-Lookahead-Noten und endliche Tails werden nicht hart abgeschnitten. FX AUS setzt auch Makro 0 und neutralisiert wie bisher manuelle Effekte/Filter, lässt Patterns/Lautstärke/Mute/Solo bestehen.

Beatglow folgt derselben Audiozeit wie der Orbit, nicht einer unabhängigen CSS-Uhr. Ruhig/Reduced Motion behalten statische Farbe/Glow und unterdrücken automatische Pulse/Padblitze. Amber ausschließlich Pending, Aufnahme rot. Keine neuen Netzwerkdienste, Fremdassets oder Berechtigungen.
