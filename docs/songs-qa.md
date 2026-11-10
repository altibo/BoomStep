# Dark Bounce 4.0 · lokaler Messbericht

Automatisiert in Linux-Chromium (Playwright), lokaler Produktionsbuild. **Keine Hörabnahme, kein Safari/Echtgerät.**

## Layout (CSS-px, echte DOM-Bounds)

| Viewport | Musikbereich unten | Songfeld | Pattern-Regler | min. Font | Überlauf |
|---|---:|---|---|---:|---|
| 390×844 | 822 | 100×44 | 172×44 | 11px | keiner |
| 390×700 | 822 (Scroll) | 100×44 | 172×44 | 11px | keiner |
| 320×568 | 872 (Scroll) | 92×44 | 110×44 | 11px | keiner |

Songnamen ohne Abschneiden (scrollWidth = clientWidth). 53 direkte musikalische Trefferflächen ≥ 44×44.

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
| Live-REC mit 2 gewischten Songwechseln (5,6 s) | 0.174 | 0.724 | 0 | 2168 Hz |

Pattern-Varianten: kleinste relative RMS-Differenz zur Grundvariante über 160 Renders 0.073 (Schwelle 0.05). Pitch-Verschiebung je gespielter Note max. ±3 Halbtöne (Hang ±2).

## Größe

81 WAV-Samples = 8,25 MiB (`public/samples`), dist gesamt 8,6 MB, keine Sourcemaps. Serviceworker precacht alle Samples + CREDITS.txt (Browsertest: 89 Cache-Einträge, offline Rendern aus dem Cache).
