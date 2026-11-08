# GitHub Pages

Live: **https://altibo.github.io/BoomStep/**

Das Repository ist nach ausdrücklicher Freigabe öffentlich. GitHub Pages verwendet **gh-pages**, Pfad **/**, HTTPS erzwungen und GitHubs eigenen Pages-Build (`legacy` / branch source). Kein zusätzlicher Anbieter oder kostenpflichtiger Dienst.

## Aktualisieren

1. Featurebranch vom aktuellen main anlegen, Quellcode testen und als PR bereitstellen. Kein automatischer Main-Merge.
2. `npm ci && npm test && npm run lint && npm run build && npm run test:browser`.
3. `dist/` prüfen: nur index.html, gehashte JS/CSS, Manifest, Icons, recorder.js und sw.js. Keine Source Maps, Zugangsdaten oder Entwicklungsdateien.
4. Im separaten gh-pages-Worktree aktuellen Remote-Stand vorwärts holen. Nur den geprüften `dist/`-Inhalt plus `.nojekyll` als normalen neuen Commit veröffentlichen. **Kein Forcepush und kein History-Rewrite.** Vorherige Deploycommits bleiben erhalten.
5. Pages-API-/Actions-Status bis erfolgreich prüfen. Tatsächliche `html_url` verwenden, HTTPS200 für Index und sämtliche Assets einschließlich Worklet/Serviceworker prüfen. Öffentliche Browser-Smokes gegen den `/BoomStep/`-Unterpfad ausführen.

Relative Vite-Basis `./` und relativer Manifest-/Serviceworker-Scope unterstützen den Projekt-Unterpfad. Der Serviceworker bekommt je Produktionsbuild eine neue Hash-Version. Ein bereits offener alter App-Tab kann den alten Worker noch halten; zum vollständigen Update Tabs schließen und neu öffnen. Offlinebetrieb erst nach vollständigem Download des neuen Builds prüfen.

Der angemeldete CLI-Zugang braucht kein erweitertes Workflow-Scope: die App wird fertig gebaut auf gh-pages gepusht, kein eigener `.github/workflows`-Schreibzugriff nötig. Ein lokaler Vorschau-Link ist kein öffentlicher Handy-Link. Keine Veröffentlichung über andere Dienste oder Sichtbarkeitsänderungen ohne Freigabe.

## Echte Geräteabnahme

Auf iPhone/Safari und Android/Chrome: Ton, Offbeat-Kick/Bass, schnelle Patternwechsel über Takt 2/3, Vordergrund-Pause/Resume, XY-Hold/Release/DRY, WAV samt FX in anderer Audio-App anhören, Sessionimport und Offline-Start prüfen. Browser-Schriftvergrößerung und Browserleisten können die benötigte Bildschirmhöhe ändern. Die automatisierte Chromium-Abnahme ist kein behaupteter iPhone-Hörtest.
