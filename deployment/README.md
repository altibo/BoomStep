# Bereitstellung (bewusst noch nicht aktiviert)

Der veröffentlichbare Inhalt entsteht mit `npm ci && npm run build` in `dist/`. Den **Inhalt** dieses Verzeichnisses auf einen genehmigten statischen HTTPS-Host hochladen. Unterstützt Root-Pfad oder einen Unterordner; keine Rewrite-Regeln oder Backend-Routen nötig. `manifest.webmanifest` sollte als JSON/Manifest, `.js` als JavaScript ausgeliefert werden. Service Worker benötigt denselben Origin und den App-Pfad als Scope.

## Warum noch kein öffentlicher Link?

`altibo/BoomStep` ist privat, war leer und hat `has_pages: false`. Kein existierendes Deployment, keine Vorschau-URL und keine vorherige Website wurden gefunden. Das Repository wurde nicht öffentlich gemacht, Pages nicht aktiviert, nicht gemergt und kein Hostingvertrag abgeschlossen. Eine lokale Vorschau ist kein öffentlich erreichbarer Handy-Link.

Vor dem Veröffentlichen ist eine konkrete Freigabe nötig:

1. Soll die App öffentlich unter einem HTTPS-Link erreichbar sein, obwohl der Quellcode privat bleibt?
2. Welcher vorhandene Host darf dafür verwendet werden? GitHub Pages für ein privates Repository hängt von Tarif/Organisation ab; Verfügbarkeit und ggf. öffentliche Sichtbarkeit zuerst prüfen. Keine Sichtbarkeitsänderung oder Tarifbuchung ohne Zustimmung.
3. Pull Request prüfen/mergen und die hier gebauten Assets dort bereitstellen. Ein Merge allein reicht ohne Hosting nicht.

Der angemeldete GitHub-CLI-Zugang besitzt `repo`, aber **nicht** `workflow`. Deshalb wird kein `.github/workflows`-Schreibversuch unternommen, keine Berechtigung erweitert und kein automatisch deployender Workflow aktiviert. Die vorhandenen npm-Befehle reichen für den Build und jeden statischen Host. CI oder ein Pages-Workflow kann nach entsprechender Freigabe und Berechtigungswahl ergänzt werden.

## Abnahme nach Veröffentlichung

- Vollständigen HTTPS-Link auf iPhone/Safari und Android/Chrome öffnen; nicht `file://` verwenden.
- Nach einmaligem Laden Flugmodus: neu öffnen und alle Pakete spielen.
- Kopfhörer: vier Spuren, Taktwechsel während Takt 2/3, keine Akkord-Neustarts.
- Mute/Solo/Filter/Delay/Hall und Pause/Resume prüfen.
- 10 Sekunden Performance aufnehmen, WAV herunterladen und in anderer Audio-App anhören.
- Session exportieren/importieren und zum Home-Bildschirm hinzufügen.
- Appwechsel/Displaysperre: Unterbrechung erwartet, bewusstes Fortsetzen per Spielen.
