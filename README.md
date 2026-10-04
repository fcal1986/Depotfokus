# Depotfokus

Persönliches Werkzeug, um ein Wertpapierdepot zu verstehen: Depot-Check gegen eigene Vorgaben, Rechner für die Sparrate und Einordnungen einzelner Positionen mit Quellen.

**Keine Anlageberatung.** Alle Einordnungen sind Beispieldaten, manuell zusammengestellt am 04.10.2026.

## Datenschutz

- Diese Seite enthält nur ein **Musterdepot mit erfundenen Beständen**.
- Eigene Daten importierst du im Browser (Depot › Daten importieren). Sie werden **nur im Speicher deines Browsers** abgelegt und nie an GitHub oder einen anderen Server gesendet.
- Lade niemals eine CSV-Datei mit echten Beständen in dieses Repository hoch: GitHub-Pages-Seiten sind öffentlich.
- Löschen: Depot › Datenquelle › „Daten auf diesem Gerät löschen“.

## Veröffentlichen mit GitHub Pages

1. Auf github.com ein neues Repository anlegen, z. B. `depotfokus`.
2. Die Dateien `index.html`, `.nojekyll` und `README.md` hochladen (Add file › Upload files › Commit).
3. Settings › Pages › Build and deployment: Source „Deploy from a branch“, Branch `main`, Ordner `/ (root)`, Save.
4. Nach ein bis zwei Minuten ist die Seite erreichbar unter `https://<dein-benutzername>.github.io/depotfokus/`.

## Aktualisieren

Neue Version von `index.html` hochladen und committen. Deine lokal gespeicherten Daten bleiben erhalten, solange die Adresse gleich bleibt.

## Grenzen

- Nur Vermögensaufstellung aus Portfolio Performance (CSV). Umsätze, Rendite und Live-Kurse sind noch nicht verfügbar.
- Daten liegen pro Browser und Gerät; es gibt keine Synchronisierung und keine Sicherung.
