# Depotfokus

**Startseite:** klickbarer Vision-Prototyp (Heute, Story, Entscheidungs-Kompass, Entscheidungs-Check, Prognose-Liga, Hinter den Kulissen) mit Beispielwerten.

**`/app/`:** die bisherige Depot-App mit CSV-Import. Persönliches Werkzeug, um ein Wertpapierdepot zu verstehen: Depot-Check gegen eigene Vorgaben, Rechner für die Sparrate und Einordnungen einzelner Positionen mit Quellen.

**Keine Anlageberatung.** Alle Einordnungen sind Beispieldaten, manuell zusammengestellt am 04.10.2026.

## Datenschutz

- Diese Seite enthält nur ein **Musterdepot mit erfundenen Beständen**.
- Eigene Daten importierst du in der App unter `/app/` (Depot › Daten importieren). Sie werden **nur im Speicher deines Browsers** abgelegt und nie an GitHub oder einen anderen Server gesendet.
- Lade niemals eine CSV-Datei mit echten Beständen in dieses Repository hoch: GitHub-Pages-Seiten sind öffentlich.
- Löschen: Depot › Datenquelle › „Daten auf diesem Gerät löschen“.

## Veröffentlichen mit GitHub Pages

1. Auf github.com ein neues Repository anlegen, z. B. `depotfokus`.
2. Settings › Pages › Source „GitHub Actions“. Jeder Push auf `main` veröffentlicht automatisch (`.github/workflows/pages.yml`).
3. Nach ein bis zwei Minuten ist die Seite erreichbar unter `https://<dein-benutzername>.github.io/depotfokus/`.

## Aktualisieren

Neue Version von `index.html` hochladen und committen. Deine lokal gespeicherten Daten bleiben erhalten, solange die Adresse gleich bleibt.

## Grenzen

- Nur Vermögensaufstellung aus Portfolio Performance (CSV). Umsätze, Rendite und Live-Kurse sind noch nicht verfügbar.
- Daten liegen pro Browser und Gerät; es gibt keine Synchronisierung und keine Sicherung.
