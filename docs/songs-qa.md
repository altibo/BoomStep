# Dark Bounce 4.3 · lokaler Messbericht

Automatisiert in Linux-Chromium (Playwright), lokaler Produktionsbuild. **Keine Hörabnahme, kein Safari/Echtgerät.**

## Layout (CSS-px, echte DOM-Bounds)

| Viewport | Musikbereich unten | XY (x,y · B×H) | min. Font | Überlauf |
|---|---:|---|---:|---|
| 390×844 | 804 | 198,580 · 184×160 | 11px | keiner |
| 390×700 | 804 (Scroll) | 198,580 · 184×160 | 11px | keiner |
| 320×568 | 804 (Scroll) | 162,580 · 150×160 | 11px | keiner |

Hochformat: Kopfzeile (ALLE AUF SONG…, Krassheit, Licht), 4 Spuren, Masterzeile, FX-Kacheln 4-spaltig (STUTTER doppelt breit), Takt-Anzeige links neben XY, darunter PLAY/REC/Stop | HOLD/FX AUS.

### Querformat (Hauptlayout, 3 Spalten)

| Viewport | Musik unten | Links (global) | Spurblock mittig | Rechts (FX/XY) | FX-Raster | XY (x,y · B×H) | Abstand XY rechts/unten |
|---|---:|---|---|---|---|---|---|
| 844×390 | 386 | x 6–233 | x 239–605 (Mitte 422 = w/2) | x 611–838 | 4 Sp. | 611,164 · 204×194 | 29 / 32 |
| 932×430 | 426 | x 6–258 | x 264–669 (466,5 = w/2) | x 674–926 | 4 Sp. | 674,164 · 229×234 | 29 / 32 |
| 740×360 | 359 | x 6–206 | x 210–530 (370 = w/2) | x 534–734 | 3 Sp. | 534,209 · 177×122 | 29 / 29 |
| 667×375 | 371 | x 6–173 | x 179–489 (334 ≈ w/2) | x 495–662 | 3 Sp. | 495,212 · 144×131 | 28 / 32 |

Links von oben: Takt-Anzeige (Ring 88 px, Ziffern 11 px, „Takt x/8“ 17 px, Akkord/REC 12 px, Meldung 12 px), Menü + Licht + Krassheit (92 px), M-FILTER/HALL/DRIVE/PUMP 2×2 (92 px), PLAY/REC/Stop unten (44 px). Rechts: FX-Kacheln (STUTTER volle bzw. doppelte Breite), HOLD/FX AUS, Achsenzeile, XY, Hinweis.

Geprüft je Viewport (`landscape.spec.js`): alle Controls im Viewport und ≥ 44×44, Spurteile überlappen nicht, Spurblock horizontal zentriert (±3 % Breite), linke Blöcke rechts begrenzt durch Spurblock, rechte Blöcke links davon begrenzt, jeweils paarweise überlappungsfrei; Takt-Anzeige oben links (≤ 8/12 px), Ring ≥ 84 px, Taktschrift ≥ 16 px; Transport unten links; XY ≥ 120×120, Mittelpunkt im rechten unteren Quadranten, 28–40 px vom rechten und 28–44 px vom unteren Rand, ≥ 8 px Luft zu HOLD/FX AUS; kein Text-Clipping, kein horizontaler Überlauf, min. Font 11 px. Safe-Area-Ränder (`env(safe-area-inset-*)`) sind gesetzt, in Chromium nicht emulierbar und daher ungetestet.

Songnamen ohne Abschneiden und ohne Überdeckung durch ‹ › (alle 10 Namen in allen Breiten gemessen). 50 direkte musikalische Trefferflächen ≥ 44×44 (8 Song-Tasten, 4 Pattern-Regler, 8 Stumm/Solo, 7 FX-Kacheln, 3 Transport, 16 Fader, XY, Menü, Krassheit, Licht).

## Kontrast je Song (gemessen aus berechneten Styles, WCAG)

| Song | Farbe | Songname/Feld | Spurtext/Feld | Ziffer/aktive Raste | FX-Text | Seitenluminanz |
|---|---|---:|---:|---:|---:|---:|
| Schwarzlicht | #ff5fd7 | 5.75 | 13.97 | 7.16 | 12.19 | 0.0070 |
| Neonregen | #e2f65c | 10.83 | 11.78 | 15.98 | 8.72 | 0.0115 |
| Lindenfrost | #a5f05c | 9.65 | 12.12 | 13.84 | 9.30 | 0.0106 |
| Giftgarten | #45e28b | 8.24 | 12.59 | 11.37 | 10.13 | 0.0095 |
| Nebelbank | #3fe6c6 | 8.66 | 12.40 | 12.14 | 9.84 | 0.0099 |
| Spreekanal | #40d4f2 | 7.88 | 12.64 | 10.84 | 10.28 | 0.0094 |
| Eisschacht | #64abff | 6.12 | 13.28 | 8.01 | 11.45 | 0.0081 |
| Tiefgarage | #9a92ff | 5.62 | 13.54 | 7.21 | 11.86 | 0.0077 |
| Samtbunker | #bd84ff | 5.64 | 13.62 | 7.19 | 11.93 | 0.0076 |
| Mitternacht | #ef6dff | 5.96 | 13.73 | 7.55 | 11.89 | 0.0074 |

Zusätzlich (Node, `src/theme.js` spiegelt die CSS-Mischungen): alle Flächen auch mit Krassheit-Aufhellung 22 % ≥ 7:1 für Text, ≥ 4,5:1 für gedämpften Text; Farbtonabstand jeder Songfarbe ≥ 25° zu Amber `#ffbc4d` (Vormerkung) und Rot `#ff637a` (REC).

## Signal (Offline-Render, 48 kHz, objektive Metriken)

| Render | RMS | Peak | Clipping | Spektralschwerpunkt |
|---|---:|---:|---:|---:|
| alt 073bdf3, 7 Pakete × 8 Takte (Mittel) | 0.184 | 0.739 | 0 | 3646 Hz |
| neu, 10 Songs × 8 Takte (Mittel) | 0.184 | 0.730 | 0 | 2266 Hz |
| Mix 2 Songs (Tiefgarage/Giftgarten) | 0.240 | 0.774 | 0 | 2580 Hz |
| Mix 4 Songs + Wechsel + Stutter/Crush/Tape | 0.183 | 0.706 | 0 | 2069 Hz (1. Hälfte 1860 / 2. Hälfte 2387) |
| Max. Krassheit + Drive + Stutter 1/32/Crush 2 Bit/Tape | 0.376 | 0.844 | 0 | 2754 Hz |
| Live-REC quer 844×390 mit 2 getippten Songwechseln (5,6 s) | 0.174 | 0.724 | 0 | 2168 Hz |

Pattern-Varianten: kleinste relative RMS-Differenz zur Grundvariante über 160 Renders 0.073 (Schwelle 0.05). Oberflächenfarbe: Akzente (`--theme`) wechseln sofort, nur `--theme-bg` blendet 0,4 s; Tests prüfen Root-Variablen und Krassheit-/Master-Regler, Orbit-Kopf, FX-Kachel, Hintergrund nach Tippen, Vormerkung und Rücknahme, im Hoch- und Querformat – identisch mit Reduced Motion, nie amberähnlich.

### XY-Effekte (4,2 s, Tiefgarage/Giftgarten, `mixes.spec.js`)

| Messung | Ergebnis |
|---|---|
| STUTTER 1/16: Korrelation aufeinanderfolgender Wiederholungen (Schläge 2–8) | 0.999 (trocken an gleicher Stelle 0.614) |
| STUTTER 1/32: dito | 0.973 (trocken −0.884) |
| Zwei identische Renders, max. Abweichung | 1.4·10⁻⁴ (Float-Rauschen Offline-Graph) |
| TAPE-STOP ab 1,0 s: RMS vor / nach Stillstand relativ zu trocken | 1.00 / 0.00 |
| CRUSH 2 Bit: Spektralschwerpunkt | 4949 Hz (trocken 2608 Hz) |
| Peaks Stutter / Crush / Tape | 0.780 / 0.797 / 0.774, 0 geclippte Samples |
| Live-REC mit gehaltenem STUTTER (Browser, ~2,3 s) | RMS 0.241, Peak 0.725, Stereo |

Erste Version mit Rückkopplungs-Delay driftete um 128 Samples je Wiederholung (Render-Quantum in Web-Audio-Zyklen, Korrelation 0.49); ersetzt durch sieben getaktete Abgriffe ohne Schleife.

Pitch-Verschiebung je gespielter Note max. ±3 Halbtöne (Hang ±2).

## Größe

81 WAV-Samples = 8,25 MiB (`public/samples`), dist gesamt 8,6 MB, keine Sourcemaps. Serviceworker precacht alle Samples + CREDITS.txt (Browsertest: 89 Cache-Einträge, offline Rendern aus dem Cache).
