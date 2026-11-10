# BoomStep · Dark Bounce

**Spielen: https://altibo.github.io/BoomStep/** · Offlinefähige Musik-PWA, keine Anmeldung, kein KI-Backend. Klang aus **CC0-Samples** (≈ 8,2 MB, beim ersten Laden offline gespeichert).

**Zehn eigene dunkle Bouncy-Techno-Songs**, pro Spur frei wählbar per **Tippen (‹ voriger · nächster ›)**, **Querformat als Hauptlayout** (globale Regler links, vier Spuren als Block mittig, Effekte + XY unten rechts), ein **Pattern-Regler mit vier Rasten** je Spur und eine Oberfläche, die die **Farbe des gewählten Songs** annimmt. Krassheit, sieben XY-Effekte (u. a. **STUTTER**), REC und Offline-PWA. Kopfhörer empfohlen.

## Dark Bounce · 4.3 – Stage-Layout + Stutter

- **Einmal-Specials entfernt** (BARK HIT, BASS SHOT, ROLL FILL, UP SWEEP, IMPACT, LASER, Strum, HITPEGEL). Engine, Rauschriser, Tests und Hilfe sind bereinigt; alle Samples werden weiter von Songs benutzt. Session **v5**: alte Sessions (v1–v4) laden weiter, `specialLevel` wird beim Migrieren verworfen.
- **Querformat in drei Spalten**: **links** alles, was global gilt – Takt-Anzeige oben links (Ring 88 px mit Ziffern, „Takt x/8“ 17 px, Akkord bzw. REC 12 px, Gestenmeldung), ALLE AUF SONG… mit BPM/Tonart, Licht, KRASSHEIT, M-FILTER/HALL/DRIVE/PUMP und unten PLAY/REC/Stop (linker Daumen); **mittig** die vier Spuren als geschlossener Block; **rechts** FX-Kacheln, HOLD/FX AUS und das größere XY-Feld unten rechts (≥ 28 px vom rechten/unteren Rand). Hochformat: gleiche Bausteine gestapelt, Takt-Anzeige links neben dem XY-Feld, Musikbereich endet bei 804 px (390×844).
- **XY-Effekte**: STUTTER (große Kachel), M-ECHO, FLANGER, GATE, DRIVE, TAPE-STOP, CRUSH. Achsenbeschriftung je Effekt (≥ 11 px). HOLD und FX AUS wie bisher; Loslassen ohne HOLD ist neutral.
  - **STUTTER** = Beat-Repeat im Audiotakt: an jedem Schlag wird die erste Scheibe aufgenommen und bis Schlagende wiederholt. **X** wählt die Scheibe **1/8 · 1/16 · 1/32**, **Y** den Mix (oben = nur Wiederholung). Umsetzung ohne Rückkopplungsschleife (sieben getaktete Delay-Abgriffe, 2-ms-Blenden an jeder Kante), daher exakt periodisch und deterministisch; läuft vor dem Limiter und landet in REC.
  - **TAPE-STOP**: Y über null bremst ab dem nächsten 16tel bis Stillstand (Tonhöhe fällt), X = Bremsdauer kurz ↔ lang; bleibt stehen bis Loslassen/FX AUS.
  - **CRUSH**: Bitcrusher, X = 8 ↔ 2 Bit, Y = Mix.
  - X ist bei M-ECHO/FLANGER/GATE/DRIVE weiterhin der Farbfilter dunkel ↔ hell.
- **SAVE** heißt jetzt **Speichern** und liegt bei Öffnen/Export/Import (nicht musikalisch, Platz für Transport).
- 4.2 (Review-Fix): Songfeld in drei Zonen ‹ | Anzeige (nicht tippbar) | ›, 150-ms-Tippblitz (bei reduzierter Bewegung statisch), Stumm/Solo in der Faderzeile, „ALLE AUF SONG…“.

## Dark Bounce · 4.1 – Querformat + Song-Tippen (Layout abgelöst durch 4.3)

- **Songfeld tippen statt wischen:** das Songfeld jeder Spur ist zweigeteilt (gestrichelte Mitte, ‹ › an den Rändern, jede Hälfte ≥ 44×44 px, eigene Buttons). **Rechte Hälfte = nächster Song, linke = voriger** (ringförmig 10 → 1). Der Wechsel wird für den nächsten Takt vorgemerkt (Amber gestrichelt nur am Feld, „→ ab Tn“); das Feld zeigt **sofort Name und Farbe des Ziel-Songs**, die ganze Oberfläche nimmt sofort dessen Farbe an (keine Amber-Zwischenfarbe). Mehrfach tippen zählt vom vorgemerkten Ziel weiter; zurück auf den laufenden Song tippen hebt die Vormerkung auf. Jede Spur unabhängig, Multitouch, Tastatur (Enter/Leertaste auf den Hälften, Pfeile/Home/End im Feld). Die alte Wischgeste samt Vorschau/Abbruchzone ist entfernt; der Pattern-Regler behält seine Zieh-Vorschau und Abbruchzone.
- **Querformat ist das Hauptlayout** (`@media (orientation: landscape) and (min-width: 560px)`): **linke Hälfte** = vier Spurkarten untereinander (Songfeld | 4-Stufen-Regler | STUMM | SOLO, darunter PEGEL/FILTER/SPUR-ECHO), **rechte Hälfte** = ALLE SPUREN + Krassheit + Licht, Masterzeile (M-FILTER/HALL/DRIVE/PUMP/HITPEGEL), FX-Kacheln, Transport, Specials 3×2, kleiner Orbit-Ring + Status und das **XY-Feld unten rechts** (rechter Daumen). Ränder per `env(safe-area-inset-*)`. Kein Scrollen für Musik bei 844×390, 932×430, 740×360 und 667×375 (gemessen, siehe Tabelle). Dateiaktionen/Hilfe liegen darunter (Scroll).
- **Hochformat** bleibt voll bedienbar wie in 4.0 (gestapelt, XY im Orbit-Ring) – kein „bitte drehen“-Zwang. Das Manifest erzwingt deshalb **keine** Orientierung (`orientation` bewusst nicht gesetzt), damit auch die installierte PWA im Hochformat nutzbar bleibt.
- Querformat-Orbit: Ring 44 px ohne Ziffern (Ziffern wären < 11 px); Takt/Akkord stehen als Text daneben. GATE-Kachel zeigt kompakt „1/8 (→1/16)“.

## Dark Bounce · 4.0

### Zehn Songs (alle 150 BPM · F-Moll)

| # | Song | Farbe | Akkorde (4 Takte) | Kick | Bass | Stabs | Riff |
|---|---|---|---|---|---|---|---|
| 1 | Schwarzlicht | `#ff5fd7` | Fm – Fm – Des – Es | 808 BD2525 | Sub-Bass | Bowed Pad | FM-E-Piano |
| 2 | Neonregen | `#e2f65c` | Fm – Es – Des – Cm | 808 BD5025 | Fingerbass | Synth Strings | Hang |
| 3 | Lindenfrost | `#a5f05c` | Fm – Bm – Des – Cm | 808 BD2525 | Sub-Bass | New-Age Pad | FM-E-Piano |
| 4 | Giftgarten | `#45e28b` | Fm – Fm – Bm – Bm | 808 BD5025 | FM-Bass (Lately) | Synth Brass | Hang |
| 5 | Nebelbank | `#3fe6c6` | Fm – Des – As – Es | 808 BD0050 | Sub-Bass | Choir Pad | FM-E-Piano |
| 6 | Spreekanal | `#40d4f2` | Fm – Cm – Des – Bm | 808 BD2525 | Fingerbass | Synth Fifths | Synth Brass |
| 7 | Eisschacht | `#64abff` | Fm – Fm – Es – Des | 808 BD5025 | Sub-Bass | Sweep Pad | Hang |
| 8 | Tiefgarage | `#9a92ff` | Fm – As – Bm – Fm | 808 BD0050 | FM-Bass (Lately) | Bowed Pad | FM-E-Piano |
| 9 | Samtbunker | `#bd84ff` | Fm – Bm – Fm – Es | 808 BD2525 | Fingerbass | Synth Strings | Synth Brass |
| 10 | Mitternacht | `#ef6dff` | Des – Es – Fm – Fm | 808 BD5025 | Sub-Bass | Choir Pad | Hang |

- Je Spur vier Patterns: **Drums** Grund/Treiben/Bounce/Rollen, **Bass** Tief/Federnd/Gegenlauf/Rollend, **Stabs** Schatten/Puls/Weite/Stoß, **Riff** Ruf/Antwort/Hoch/Kreis – 10 × 4 × 4 = 160 Spur-Patterns, alle deterministisch und per Test paarweise verschieden.
- Alle Songs teilen **150 BPM und F-Moll (äolisch)**. Ehrlich dokumentiert: das ist eine bewusste Einschränkung, damit jede Spur einen anderen Song spielen kann. **Die Bass-Spur bestimmt die gemeinsame Akkordfolge**; Bass, Stabs und Riff sind in Skalenstufen relativ zu diesem Akkord geschrieben. Jede der 10⁴ Song-Kombinationen bleibt so tonartrein (Unit-Test über alle Bass/Riff-Paare). Stabs/Riff anderer Songs klingen über dem Bass-Song daher harmonisch angepasst, nicht wie im Original-Song.
- Klang: TR-808-Drums (Michael Fischer) und FreePats-Instrumente (Sub-/Finger-/FM-Bass, Pads, Strings, Choir, DX7-E-Piano, Hang, Brass, Fifths), alle **CC0 1.0** – siehe [CREDITS.md](CREDITS.md) mit Quelle, Autor, Lizenz und SHA-256 je Datei. Warme Pads/weiche Bässe statt Rechteck-/8-bit-Oszillatoren. Keine synthetische Klangquelle mehr (der frühere UP-SWEEP-Rauschriser ist mit den Specials entfallen). Nächstgelegene Aufnahmezone + `playbackRate`, gemessen höchstens ±3 Halbtöne Verschiebung je gespielter Note; Register werden dafür oktavgefaltet. Hinweis: FreePats rät, Hang-Töne nicht zu verstimmen; BoomStep verschiebt sie um bis zu ±2 Halbtöne (gemessen).
- Eigene Kompositionen; keine kopierten Songs, Melodien, Vocals oder ANUUK-Motive. Die ANUUK-Recherche (siehe unten) bleibt reine Text-/Stilorientierung.
- Entfernt: die Pakete Berlin Bounce, Donk District, Steel Warehouse, Hoover Riot und die drei Classic-Pakete samt Oszillator-Synthese (`legacy-music.js`, `bounce-music.js`).

### Song tippen (pro Spur)

- Linkes Feld jeder Spur zeigt Spurname, Status und Songname, geteilt in zwei Tipp-Hälften: **rechts = nächster, links = vorheriger Song** (ringförmig). Merkt zum nächsten Takt vor (Amber gestrichelt, „→ ab Tn“, Name in Zielfarbe), gemeinsame Loop-Phase bleibt. Beim Stop wird sofort übernommen.
- Mehrfach tippen zählt weiter; Tippen zurück zum laufenden Song löscht die Vormerkung. Mehrere Finger auf verschiedenen Spuren arbeiten unabhängig. Tastatur: Enter/Leertaste auf ‹/›, Pfeiltasten/Home/End im Feld.
- **ALLE SPUREN…** setzt alle vier Spuren zum nächsten Takt auf einen Song (Mix und Patternstufen bleiben).

### Pattern-Regler (ersetzt die Tasten 1–4)

Vier Rasten je Spur (role=slider, 1–4). Tippen oder Ziehen wählt; Ziehen zeigt nur eine weiße Vorschau, **Loslassen** merkt zum nächsten Takt vor (Amber); mehr als 24px nach oben/unten, Escape, `pointercancel` oder Capture-Verlust verwerfen; Pfeile/Home/End. Aktive Raste = gefüllter Daumen in der Songfarbe mit dunkler Ziffer (Kontrast ≥ 7:1).

### Songfarbe auf der ganzen Oberfläche

- **Regel:** Die App übernimmt die Farbe des Songs, der **zuletzt per Tippen oder Tastatur** auf einer Spur gewählt wurde (`session.themeTrack`) – schon während er vorgemerkt ist. Beim Start und nach „ALLE SPUREN“ führt die Drums-Spur. Die führende Spur trägt eine helle Kante.
- Beim Tippen wird die ganze Oberfläche sofort in die kommende Songfarbe getönt, auch während der Vormerkung. Akzente (`--theme`: Regler, Orbit, Play/Pause, FX-Kacheln, Krassheit) wechseln **sofort** – ein Farbübergang zwischen zwei Songfarben würde Zwischentöne wie Sand/Amber erzeugen, die für „vorgemerkt“ reserviert sind. Nur die dunkle Hintergrundtönung (`--theme-bg`) blendet 0,4 s weich. **Reduced Motion**: auch der Hintergrund sofort. Jede Spurkarte zeigt zusätzlich ihre eigene Songfarbe.
- Hintergrund bleibt dunkel (Seitenluminanz < 0,02). **Amber bleibt ausschließlich Vormerkung, Rot ausschließlich Aufnahme**; Songfarben halten ≥ 25° Farbtonabstand zu beiden. Gemessene Kontraste (Chromium, alle 10 Themes): Songname auf Songfeld 5,6–10,8:1, Spurtext 11,8–14:1, Ziffer auf aktiver Raste 7,2–16:1, FX-Text 8,7–12,2:1 (Details: [docs/songs-qa.md](docs/songs-qa.md)).
- Krassheit hellt die Songfarbe bis 22 % Richtung Weiß auf und verstärkt den Glow (statt der früheren Cyan→Pink-Palette); max. 3 Pulse/s wie bisher.

## Krassheit · 3.2 (unverändert, Farbe jetzt aus dem Song)

**KRASSHEIT 0–100** sitzt als großer horizontaler 44px-Makrofader direkt im bisherigen Header, neben Soundpaket und **LICHT BEAT/RUHIG**. Keine zusätzlichen Musikzeilen oder Untermenüs; alle bisherigen Regler bleiben erreichbar.

- **0 Locker** = unveränderte eigene Pattern-/Mix-Baseline. **50 Druck / 100 Abriss** addieren bis zu 0,65 Master-Drive und 0,25 Pump (jeweils begrenzt), mehr Kick-Sättigung, hellere Synthese und beim Bounce-Bass mehr FM-Kante. 12% zusätzliche Ausgangsreserve am Maximum; Kompressor und Safety bleiben. Es ist ausdrücklich kein bloßer Lautstärkeregler.
- Ab 25 mehr leise Hats, ab 50 Rim-Percussion, ab 55 kurze harmonische Riff-Antworten, ab 75 zusätzliche 32tel-Snare-Akzente am Ende jedes achten Takts. Ausschließlich deterministisch auf dem bestehenden musikalischen Raster; keine zufälligen Bursts, Tempo-/Tonart-/Phase- oder heimlichen Patternwechsel. Mute/Solo und manuelle Faderwerte werden nicht überschrieben; Zurückziehen auf 0 entfernt die Makrozusätze wieder.
- **FX AUS** setzt zusätzlich Krassheit auf **0**, ansonsten gelten die bisherigen neutralen Filter-/Effektresets. Patterns, Pegel, Mute/Solo und Lichtwahl bleiben. **REC** erfasst die live gefahrene Krassheit im tatsächlichen Post-Master-WAV.
- Farbe: Songfarbe, mit Krassheit aufgehellt; weicher lokaler Glow aus der echten Audiozeit (maximal 3 Pulse/s, bei schnellerem Tempo automatisch halbes Tempo). Kein Fullscreen-/Stroboskopblitz. Pause/Stop ohne Beatpuls. **RUHIG** und `prefers-reduced-motion` unterdrücken Puls und automatisches Pad-Aufblinken, behalten statische Farben/Glow. Die direkte Lichtwahl bleibt lokal gespeichert. Amber bleibt ausschließlich Pending; REC bleibt rot.
- Sessionformat V3 bekommt validierte additive Felder `intensity` (0–1) und `beatLights` (Boolean). Fehlende Felder in alten V1–3-/Orbit-Sessions werden mit **0 / true** ergänzt: bisheriger Klang unverändert, bestehende Indexmigration bleibt erhalten.
- Neue Tests prüfen Migration/Grenzen, additive Baseline, deterministische Notendichte/Phase, Palette, Lichtfrequenz/Stillstand/Reduced Motion, echten Live-WAV und nicht nur gainbedingte PCM-Unterschiede. [Lokaler Messbericht](docs/krassheit-qa.md). Kein behaupteter subjektiver Hörtest oder Safari-/Echtgeräteabnahme.

## Orbit Deck · 3.1 / R4 (historische Freigabe, R3-Geometrie)

Der R4-Stand ist nach unabhängigen Screenshot-/Interaktionsreviews zur Veröffentlichung freigegeben. Der Produktionsbuild wird separat über `gh-pages` bereitgestellt; die Quellcode-PRs bleiben bewusst ohne automatischen Main-Merge gestapelt.

- **Patternbänder** (historisch, in 4.0 durch den Pattern-Regler ersetzt): vier diskrete große Segmente je Spur bleiben direkt tippbar. Ziehen = weiße Vorschau; Loslassen = letzte Variante taktgenau vormerken; Mehr als 24px nach oben/unten herausziehen = sichtbares Abbrechen, dort Loslassen verwirft; Reentry erlaubt wieder Vormerken. Escape/Systemcancel/lost capture verwerfen ebenfalls, vorhandene Pending-Wahl bleibt. Keine Hörvorschau. Cyan/Auswahl bzw. Spielt, ausschließlich Amber/vorgemerkt und Weiß/Ziehauswahl trennen die Zustände. Pfeile/Home/End und Enter/Space bleiben nutzbar. Kein behauptetes kontinuierliches Klangmorphing.
- *(entfernt in 4.3)* **Strum Specials**: über die sechs sichtbaren Pads streichen; jeder neue Feldeintritt spielt einmal, Zurückstreichen erneut. Stillhalten wiederholt nie. Fingerhistorien sind unabhängig, Pointercancel räumt die Geste auf, endliche Sounds klingen aus. Tastatur weiterhin möglich.
- **Audiozeit-Orbit**: echte gemeinsame achttaktige Phase, Audiozeit-Playhead und Pending-Wechselmarken; kein CSS-Spinner, kein Seek. Bestehendes XY-Feld im Orbit und vier direkte FX-Pads daneben. Reduced Motion zeigt nur Taktwechsel statt kontinuierlichem Kopf. Keine neuen Sound-/Sessionparameter, unverändertes validiertes V1–3-Format.
- Lesbare Reviewkorrektur: alle musikalischen Labels mindestens 11px, Haupt- und Padlabels 12px, kompakte Status-/Achsenlabels 11px; keine Skalierung für kleine Viewports. Achsen außerhalb des 96×88px-XY-Feldes. R3 entfernt die vier zusätzlichen Statuszeilen: 44px Pattern-/Spurkopf plus 44px Fader pro Spur. Masterfilter/Hall/Drive/Pump und HITPEGEL teilen eine direkt sichtbare 44px-Zeile. Der 184px-Performancebereich enthält den lesbaren Orbit, 67px-FX-Pads und getrennte Phase-/Gestenmeldungen; Specials sind 48px hoch. Die Musik passt bei 390×844 vollständig, kleinere Viewports scrollen ehrlich. Amber nur für Pending; gewählter FX-Modus/HOLD cyan, REC rot. **SPUR-ECHO** ist der nasse Pegel des jeweiligen Spurdelays; **MASTER-ECHO** ist das zusätzliche globale XY-Delay. **FX AUS** setzt alle regelbaren Effekte/Filter neutral, nicht den festen Schutzlimiter; vorhandene Tails klingen aus.
- **R4 Solo-Klarheit:** dieselbe `audible()`-Regel wie im Mixer steuert die reine UI-Darstellung: durch Solo ausgeschlossene Karten sind abgedunkelt und das aktive Pattern zeigt **Solo-aus** statt Spielt. Explizites Mute hat mit **Stumm** Vorrang; die STUMM-Taste und Session-Mutewerte bleiben unverfälscht. Mehrere Solos bleiben gemeinsam hörberechtigt. Aktive Patternphase und Amber-Pending bleiben erhalten; keine Engine- oder Layoutänderung. Drei zusätzliche Browsertests prüfen elf Schaltzustände gegen tatsächliche Mixer-Gains, Pending während Cancel sowie unveränderte Bounds/lesbare Labels auf 390/320px.
- SAVE (seit 4.3 „Speichern“) übernimmt bewusst vorgemerkte Pattern als Startauswahl beim nächsten Öffnen.
- Vier gelesene Herstellerquellen, übernommene Prinzipien und bewusst verworfene Ideen: [GUI-Recherche](docs/gui-research.md). Keine Behauptung einer neuen Erfindung; keine kopierten Markenlayouts oder Assets.

## Stilreferenz: textgestützt, keine Songkopie

ANUUK wurde anhand seines [offiziellen Amplia-Artistprofils](https://www.ampliaberlin.com/artists/anuuk) als Berliner Liveact mit Rap-Energie und hartem, federndem Techno zugeordnet. [Spotify „Jump“](https://open.spotify.com/track/5IHOeYfMY3ZhuUPXDKH7sf) und [OTOTOY „Make It Clap“](https://ototoy.jp/_/default/p/4145720) bestätigen Anuuk/Kø:lab-Releasezuordnungen. **Es wurden nur öffentliche Text-/Metadaten geöffnet, keine Musik gehört oder transkribiert.** 152 BPM/F-Moll sind eigene Kompositionsentscheidungen, keine verifizierten Trackdaten. Keine fremden Songs, Melodien, Samples, Vocals oder Künstlerstimmen, keine offizielle ANUUK-App. Details: [Quellen und Ableitung](docs/style-research.md).

## Mix und Headroom

- Ein kickgesteuertes, audiozeitgeplantes **Ducking** schafft Platz für Kick und Bass. PUMP steuert dessen Tiefe auf Bass/Stabs/Riff; eine stumme Kick löst es nicht aus. Kompressor und begrenzte Safety-Kennlinie halten den Ausgang unter Vollaussteuerung; kein Ersatz für Mastering.
- Gemessen (Offline-Render, 8 Takte je Song): Spektralschwerpunkt im Mittel **2266 Hz** gegenüber **3646 Hz** der alten Oszillator-Version 073bdf3 (−38 %), gleiche mittlere RMS 0,184, alle Peaks < 0,85, 0 geclippte Samples. Das sind Messwerte, **kein Hörurteil**.

## Einmal-Pads (entfernt in 4.3)

Die sechs One-Shot-Pads und HITPEGEL sind seit 4.3 entfernt (Owner-Wunsch: „einmalige Filler“). Live-Variation kommt jetzt aus den XY-Effekten, vor allem STUTTER.

## Eine Oberfläche, keine musikalischen Untermenüs

**Pro Spur:** Songfeld (‹ › tippen), Pattern-Regler mit vier Rasten, **STUMM**, **SOLO**, direkt darunter **PEGEL / FILTER / SPUR-ECHO**. Songfarbe spielt, Amber/gestrichelt ist für den nächsten noch planbaren Takt vorgemerkt. Erneute Wahl des aktiven Songs/Patterns löscht die Vormerkung. Die globale Akkordphase bleibt erhalten. Der 100-ms-Lookahead kann sehr späte Taps erst zum folgenden Takt übernehmen.

**Global (Querformat links):** Takt-Anzeige, ALLE AUF SONG…, Licht, KRASSHEIT, M-FILTER, HALL, DRIVE, PUMP und Transport sind immer sichtbar.

**XY-Performancefeld:**

- Bei M-ECHO/FLANGER/GATE/DRIVE fährt X von dunklem Tiefpass über die neutrale Mitte zum schneidenden Hochpass; bei STUTTER/TAPE/CRUSH ist X der Effektparameter (Scheibe, Bremsdauer, Bits), die Beschriftung über dem Feld nennt ihn.
- Y steuert die Tiefe des gewählten Effekts: **STUTTER** (Beat-Repeat 1/8 · 1/16 · 1/32), **M-ECHO** (Master-Echo, tempoabhängiges 3/16-Delay mit Feedback), **FLANGER** (echte modulierte Kurzdelay-/Feedback-Schaltung), **GATE** (audiozeit-synchrones Gain-Gating), **DRIVE** (parallele Waveshaper-Sättigung), **TAPE-STOP** (Bandbremse bis Stillstand) oder **CRUSH** (Bitcrusher).
- GATE nochmals tippen schaltet sichtbar **1/8 ↔ 1/16**.
- Ohne HOLD fällt die Position beim Loslassen auf X-Mitte/Y-null zurück. Gain-/Filter-Rampen vermeiden harte Parametersprünge; vorhandene Echotails klingen musikalisch aus. **HOLD** vor oder während der Geste hält die letzte Position. HOLD ausschalten löst sie wieder.
- **FX AUS** setzt Krassheit auf 0 und neutralisiert XY, Masterfilter, Hall, Drive, Pump und Spurfilter/Spur-Echo-Pegel, lässt aber Patterns, Lautstärken und Mute/Solo unberührt. Gate wird auf Durchlass gerampt. Limiter/Safety bleiben aktiv.
- Pointer-Capture hält die Geste beim Verlassen des Felds; nur der erste Pointer steuert XY, ein weiterer Finger kann Spuren bedienen. Pointer-Cancel löst sicher. Pfeiltasten steuern Farbe/Tiefe, Escape ist FX AUS, Verlassen des Feldes löst ohne HOLD.

**PLAY / PAUSE / Stop / REC / HOLD / FX AUS** sind direkt erreichbar. Keine Zahnrad- oder Mixdialoge. Nur Speichern/Öffnen, Export/Import und Hilfe sind sekundär; dort stecken keine musikalischen Funktionen.

### Displaygrößen (gemessen, nicht geschätzt)

Automatisierte Chromium-Prüfung in CSS-Pixeln:

| Viewport       | Musikbereich einschließlich Transport | Verhalten                                                               |
| -------------- | ------------------------------------: | ----------------------------------------------------------------------- |
| 390 × 844      |                      unten bei 804 px | alle musikalischen Controls sichtbar; kein Musik-Scroll nötig; XY 184×160 |
| 390 × 700      |                      unten bei 804 px | 104px Musik-Scroll                                                      |
| 320 × 568      |                      unten bei 804 px | 236px Musik-Scroll; Spurkürzel DR/BA/ST/RI; XY 150×160 |
| 844 × 390 quer |                      unten bei 386 px | 3 Spalten (links 227 / Spuren 366 mittig / rechts 227), kein Musik-Scroll; XY 204×194 |
| 932 × 430 quer |                      unten bei 426 px | Spalten 252 / 405 / 252; XY 229×234                                     |
| 740 × 360 quer |                      unten bei 359 px | Spalten 200 / 320 / 200 (Rand 1 px); FX 3-spaltig; XY 177×122           |
| 667 × 375 quer |                      unten bei 371 px | Spalten 167 / 310 / 167; FX 3-spaltig; XY 144×131                       |

Nichtmusikalische Dateiaktionen/Hilfe liegen dahinter und dürfen unter dem Fold stehen. Die 50 direkten musikalischen Trefferflächen (8 Song-Tasten, 4 Pattern-Regler, 8 Stumm/Solo, 7 FX-Kacheln, 3 Transport, 16 Fader, XY, Menü, Krassheit, Licht) sind per echten DOM-Bounds geprüft; zusätzlich prüft die Suite Fontgrößen, sichtbare Labels, Clipping und Achsenabstände. Orbit-Ziffern: 20 SVG-Einheiten bei 88/160-Darstellung = effektiv 11 CSS-Pixel, ebenfalls gegen den tatsächlich gerenderten Maßstab geprüft. Songnamen passen ungekürzt ins Songfeld (geprüft); unter 360px Breite stehen Spurkürzel, der volle Spurname bleibt in ARIA. Pending steht am Band und als verständlicher Text in der zentralen Meldung, Details zusätzlich für Screenreader.

Alle direkten musikalischen Eingabeflächen — Song-Tasten, Pattern-Regler, STUMM/SOLO, FX-Kacheln, Transport, ALLE-AUF-SONG-Auswahl, XY und alle 17 Fader (16 plus Krassheit) — haben **mindestens 44×44 CSS-Pixel**. Fader sind echte 44px hohe Felder, keine überlappenden vergrößerten Trefferzonen. Kein horizontaler Scroll. Betriebssystem-Schriftvergrößerung, Safari-Browserleisten oder andere Geräte können zusätzliche Höhe brauchen. Lieber dann scrollen statt Bedienfelder abschneiden.

## Aufnahme und Sessions

- **REC** zeichnet den echten Post-Master-Stereomix samt Patternwechseln, Mutes, XY-Drive/Echo/Flange/Gate, Hall und Filterfahrten auf — nicht nur einen nachträglich rekonstruierten Endzustand.
- Nochmals REC/WAV tippen, dann den **Stereo-WAV-Link** herunterladen. 16-bit PCM in der AudioContext-Samplerate, maximal **120 Audiosekunden**. Bei 48 kHz etwa 23 MB WAV / 46 MB Float-Aufnahmepuffer. Pausen frieren Audiozeit und Aufnahme ein. Kein Mikrofonzugriff.
- AudioWorklet braucht HTTPS oder localhost. Fehlt er, funktioniert Musik weiter und Aufnahme zeigt eine Fehlermeldung.
- Speichern/Öffnen: ein lokaler Slot auf diesem Gerät; Export/Import: validierte JSON-Session. Browserdaten können vom Betriebssystem gelöscht werden. WAV-Datei zum Behalten herunterladen.
- **Sessionformat v4**: Song pro Spur (`tracks[i].song`, 0–9) und `themeTrack` (0–3) statt `pack`. Validierte Migration v1 → v2 → v3 → v4: Patternstufen, Mute/Solo, Pegel, Filter, Sends, Master, FX, Krassheit und Licht bleiben; das entfernte Paket wird fest auf einen neuen Song abgebildet (alte Paketindizes 0–6 → Songs 4, 7, 10, 2, 5, 8, 1). Das ist ein dokumentierter Ersatz, **keine Klangentsprechung**; ein Hinweis erscheint beim Öffnen. Sessions mit übrig gebliebenem `pack` in v4 werden abgelehnt.

## Handy / offline / Grenzen

Aktuellen Safari oder Chrome verwenden. HTTPS-Link öffnen, **PLAY** tippen (kein Autoplay), optional **Zum Home-Bildschirm hinzufügen**. Nach dem ersten vollständigen Laden erscheint „Offline bereit“. Alle Klänge kommen aus lokal mitgelieferten Samples (Serviceworker cacht alle 81 WAVs + CREDITS beim Installieren); keine Audio-, Font-CDN- oder KI-API-Anfragen. Nach einem Update alte App-Tabs vollständig schließen und neu öffnen, damit der neue versionierte Serviceworker aktiviert wird.

Nur **Vordergrund-Audio**: Appwechsel, Displaysperre, Anruf oder Energiesparen können unterbrechen. Zum Fortsetzen wieder PLAY tippen. Keine Hintergrundgarantie, kein APK/IPA. Automatisierte Linux-Chromium-Tests ersetzen keinen echten Android-/iPhone-Test. Safari/WebKit bleibt unbestätigt; die offizielle WebKit-Abhängigkeitsinstallation auf der Box scheiterte an HTTP-500 der Debian-Paketquellen.

Patterns, Kompositionen, Rauschriser, Hallimpuls und Icons wurden eigens mit KI-Unterstützung für BoomStep erstellt; Instrumentenklänge sind CC0-Samples (siehe CREDITS.md). Die Signaltests belegen Unterschiede und Pegelgrenzen, **keinen subjektiven Hörtest oder eine Qualitätsgarantie**.

## Entwicklung und Prüfung

Node **22.12+** oder **24 LTS**, npm:

```sh
npm ci
npm run dev                   # Entwicklung, Port 5173
npm test                      # 38 Node-Tests
npm run lint
npm run build                 # statische PWA in dist/ (inkl. samples/)
npm run preview               # Produktionsvorschau, Port 4173
npx playwright install chromium
npm run test:browser           # 66 Chromium-Tests, inkl. echter PCM-Aufnahme und Offline-Rendering
npm audit --omit=dev
```

Samples neu erzeugen (Rohdateien aus den in CREDITS.md genannten Repositories, ffmpeg + numpy): `python3 tools/build-samples.py && python3 tools/credits.py`.

`src/songs.js`: zehn Songs, Patterns, Harmonie (Skalenstufen relativ zum Bass-Song). `src/music.js`: Session v5 + Migration, PatternClock (Song/Pattern je Spur zum nächsten Takt). `src/samples.js` / `src/sample-bank.json`: Sample-Liste, Laden/Decodieren, Zonen und Hüllkurven. `src/synth.js`: Sample-Stimmen und Drums. `src/theme.js`: Farbmischung/Kontrast wie im CSS. `src/intensity.js`: additives Makro und Licht. `src/fx.js` (FX-Modi, Stutter-Plan, Tape-Kurve, Crush), `src/engine.js`, `src/main.js`, `src/style.css`, `public/recorder.js`, `src/wav.js`, `public/sw.js` / `vite.config.js` (Precache inkl. Samples) wie bisher.

Browser-Specs: `song-tap.spec.js` (Tippen rechts/links, mehrfach, Wrap, Vormerkung/Rücknahme, Trefferflächen ≥ 44 px, Rollen/ARIA/Tastatur, Multitouch, Slider, Kontrast je Song, Layout), `landscape.spec.js` (Bounds 844×390/932×430/740×360/667×375: Global links, Spurblock mittig, FX/XY rechts, Takt-Anzeige oben links, XY im rechten unteren Quadranten, keine Überlappung/Clipping, Font/Touch-Minima, spielbar; 1280×720 + Hochformat-Regression), `theme-review.spec.js` (Oberflächenfarbe beim Tippen hoch/quer, Reduced Motion), `songs.spec.js` (Layouts, Migration, 160 Pattern-Renders, FX, Demos), `mixes.spec.js` (Mix-WAVs mit 2/4 Songs, Wechseln, FX-Sweeps, max. Krassheit; Stutter-PCM-Periodizität 1/16 + 1/32, Tape-Stop, Crush; Live-REC im Querformat mit getippten Songwechseln), `instrument.spec.js` (u. a. Live-REC mit gehaltenem STUTTER). Artefakte unter `test-results/song-artifacts/`. Statische HTTPS-Bereitstellung siehe [deployment/README.md](deployment/README.md).
