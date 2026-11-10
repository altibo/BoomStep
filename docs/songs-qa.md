# Dark Bounce 4.1 · lokaler Messbericht

Automatisiert in Linux-Chromium (Playwright), lokaler Produktionsbuild. **Keine Hörabnahme, kein Safari/Echtgerät.**

## Layout (CSS-px, echte DOM-Bounds)

| Viewport | Musikbereich unten | Songfeld | Pattern-Regler | min. Font | Überlauf |
|---|---:|---|---|---:|---|
| 390×844 | 822 | 108×44 (Hälften 53×44) | 164×44 | 11px | keiner |
| 390×700 | 822 (Scroll) | 108×44 (53×44) | 164×44 | 11px | keiner |
| 320×568 | 872 (Scroll) | 104×44 (51×44) | 98×44 | 11px | keiner |

### Querformat (Hauptlayout)

| Viewport | Musik unten | Spuren (links) | rechte Spalte ab | Songfeld (Hälften) | Pattern-Regler | XY (x,y,B×H) | min. Font | Scroll Musik |
|---|---:|---|---:|---|---|---|---:|---|
| 844×390 | 386 | x 6–418, 4 Karten à 94 | 422 | 125×44 (62×44) | 185×44 | 678,214 · 160×154 | 11px | keiner |
| 932×430 | 426 | x 6–462, à 104 | 466 | 132×44 (65×44) | 222×44 | 749,214 · 177×194 | 11px | keiner |
| 740×360 | 359 | x 6–367, à 88 | 370 | 110×44 (54×44) | 150×44 | 584,206 · 150×136 | 11px | keiner |
| 667×375 | 371 | x 6–330, à 90 | 334 | 108×44 (53×44) | 114×44 | 511,214 · 150×139 | 11px | keiner |

Geprüft je Viewport: alle Controls im Viewport und ≥ 44×44, Spurteile überlappen nicht, rechte Blöcke (Kopfzeile, Master, FX, Transport, Specials, Orbit, Status, XY-Achse, XY, XY-Hinweis) paarweise überlappungsfrei und rechts der Mitte, XY-Mittelpunkt im rechten unteren Quadranten (x ≥ 75 % Breite), XY ≤ 24 px vom rechten und ≤ 36 px vom unteren Rand, kein Text-Clipping, kein horizontaler Überlauf. Bei 740×360 wird der äußere Rand auf 1 px und der Spaltenabstand auf 3 px reduziert, damit 4 × 88 px Spurkarten ohne Scroll passen. Unter 356 px Höhe (z. B. sehr kleine Geräte quer) scrollt die Seite minimal, statt Ziele < 44 px oder Schrift < 11 px zu verwenden. Safe-Area-Ränder (`env(safe-area-inset-*)`) sind im CSS gesetzt, in Chromium aber nicht emulierbar und daher ungetestet.

Songnamen ohne Abschneiden und ohne Überdeckung durch ‹ › (alle 10 Namen in allen Breiten gemessen). 57 direkte musikalische Trefferflächen ≥ 44×44 (8 Songfeld-Hälften).

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
| Mix 4 Songs + Wechsel + 3 Specials | 0.182 | 0.821 | 0 | 2174 Hz (1. Hälfte 2346 / 2. Hälfte 2032) |
| Max. Krassheit + Drive + 6 Specials | 0.422 | 0.848 | 0 | 3095 Hz |
| Live-REC quer 844×390 mit 2 getippten Songwechseln (5,6 s) | 0.174 | 0.724 | 0 | 2168 Hz |

Pattern-Varianten: kleinste relative RMS-Differenz zur Grundvariante über 160 Renders 0.073 (Schwelle 0.05). Oberflächenfarbe: Akzente (`--theme`) wechseln sofort, nur `--theme-bg` blendet 0,4 s; Tests prüfen Root-Variablen und Krassheit-/Master-Regler, Orbit-Kopf, FX-Kachel, Hintergrund nach Tippen, Vormerkung und Rücknahme, im Hoch- und Querformat – identisch mit Reduced Motion, nie amberähnlich.

Pitch-Verschiebung je gespielter Note max. ±3 Halbtöne (Hang ±2).

## Größe

81 WAV-Samples = 8,25 MiB (`public/samples`), dist gesamt 8,6 MB, keine Sourcemaps. Serviceworker precacht alle Samples + CREDITS.txt (Browsertest: 89 Cache-Einträge, offline Rendern aus dem Cache).
