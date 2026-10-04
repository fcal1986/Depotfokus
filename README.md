# Depotfokus

Persönliches Werkzeug, um ein Wertpapierdepot zu verstehen und Kauf- oder Verkaufsentscheidungen gut zu begründen.

**Startseite (`index.html`):** eine App mit vier Bereichen.

- **Heute:** Vermögen, Depot-Wetter (Abstand zu deinen Zielen), Storys und Veränderungen je Position.
- **Depot:** Abweichungen von deinen Vorgaben, offene Datenfragen, Positionen nach Baustein. Je Position: Einordnung, Kompass (Dafür/Dagegen aus geprüften Regeln), belegte Fakten mit Quelle, beobachtete Bedingungen und Risiken, Entscheidungs-Check für Kauf oder Verkauf.
- **Plan:** Zielverteilung, Grenze je Einzelwert, monatliche Einzahlung und centgenaue Verteilung ohne Verkauf.
- **Liga:** echte Prognosefragen zu deinen Positionen mit Sicherheitsangabe und deine Entscheidungsnotizen.
- **Daten & Import** (Zahnrad): CSV-Import aus Portfolio Performance, Zuordnungen bestätigen, Vermögen außerhalb des Depots, Daten löschen.

**`/app/`:** die vorherige Version (v4). Sie nutzt denselben Speicher; importierte Daten erscheinen in beiden.

**Keine Anlageberatung. Depotfokus führt keine Orders aus.** Alle Einordnungen sind manuell recherchierte Beispieldaten vom 04.10.2026. Wahrscheinlichkeiten werden erst gezeigt, wenn eine öffentliche Trefferquote existiert.

## Quelltext

`index.html` wird aus `src/logic.js` (Daten, CSV-Parser, Regeln, Rechner), `src/parts.js` (Import- und Datenkarten) und `src/ui.js` (Oberfläche, Routing) zusammengesetzt. Die Seite kommt ohne Build-Schritt aus.

## Datenschutz

- Diese Seite enthält nur ein **Musterdepot mit erfundenen Beständen**.
- Eigene Daten importierst du über das Zahnrad › Daten importieren. Sie werden **nur im Speicher deines Browsers** abgelegt und nie an GitHub oder einen anderen Server gesendet.
- Lade niemals eine CSV-Datei mit echten Beständen in dieses Repository hoch: GitHub-Pages-Seiten sind öffentlich (`.gitignore` blockiert `*.csv` und `*.xlsx`).
- Löschen: Zahnrad › Datenquelle › „Daten auf diesem Gerät löschen“.

## Veröffentlichen

Settings › Pages › Source „GitHub Actions“. Jeder Push auf `main` veröffentlicht automatisch (`.github/workflows/pages.yml`).

## Grenzen

- Nur Vermögensaufstellung aus Portfolio Performance (CSV). Umsätze, Rendite und Live-Kurse sind noch nicht verfügbar.
- Prognose-Liga: Fragen werden noch nicht automatisch aufgelöst; Familien-Rangliste braucht Benutzerkonten.
- Daten liegen pro Browser und Gerät; es gibt keine Synchronisierung und keine Sicherung.
