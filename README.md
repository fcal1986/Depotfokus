# Depotfokus

Persönliches Werkzeug, um ein Wertpapierdepot zu verstehen und Kauf- oder Verkaufsentscheidungen gut zu begründen.

**Startseite (`index.html`):** eine App mit vier Bereichen.

- **Heute:** Vermögen, Depot-Wetter (Abstand zu deinen Zielen), Storys wie bei WhatsApp (laufen automatisch weiter, rechts/links tippen, halten pausiert, danach folgt die nächste Position), Veränderungen je Position und Datenstand.
- **Datenstand und Ablauf** (`#stand`): was automatisch läuft (Kurse, Rechnen), was manuell geprüft ist (Einordnungen, Regeln), wann der nächste Kursabruf geplant ist und welche Berichte als Nächstes erwartet werden.
- **Depot:** Abweichungen von deinen Vorgaben, offene Datenfragen, Positionen nach Baustein. Je Position: Einordnung, Kompass (Dafür/Dagegen aus geprüften Regeln), belegte Fakten mit Quelle, beobachtete Bedingungen und Risiken, Entscheidungs-Check für Kauf oder Verkauf.
- **Plan:** Zielverteilung, Grenze je Einzelwert, monatliche Einzahlung und centgenaue Verteilung ohne Verkauf.
- **Liga:** echte Prognosefragen zu deinen Positionen mit Sicherheitsangabe und deine Entscheidungsnotizen.
- **Daten & Import** (Zahnrad): CSV-Import aus Portfolio Performance (Vermögensaufstellung und Umsätze, mehrere Dateien auf einmal), Zuordnungen bestätigen, Tageskurse an/aus, Vermögen außerhalb des Depots, Daten löschen.

**Aus den Umsätzen** (Depot- und Kontoumsätze): Einstand nach FIFO, Kursgewinn, realisierte Gewinne, erhaltene Ausschüttungen, Rendite p. a. als interner Zinsfuß und eine Steuerschätzung im Verkaufs-Check. Abweichungen zwischen Umsätzen und Bestand werden angezeigt statt verrechnet.

**Tageskurse:** Die GitHub Action ruft werktags nach Börsenschluss Kurse für die Symbole aus den Stammdaten (und optional `symbols.txt`) ab und veröffentlicht sie als `prices.json`. Es werden keine Bestände übertragen; gerechnet wird im Browser. Ohne Kurse gelten die Exportwerte.

**Liga:** Rückblick-Quiz mit sofortiger Auflösung aus den letzten Berichten, offene Prognosen bis zum nächsten Bericht, Treffsicherheit mit Brier-Wert.

**`/app/`:** leitet auf die Startseite um. Gespeicherte Daten bleiben erhalten.

Installierbar als App (Zum Home-Bildschirm) und offline nutzbar.

**Keine Anlageberatung. Depotfokus führt keine Orders aus.** Alle Einordnungen sind manuell recherchierte Beispieldaten vom 04.10.2026. Wahrscheinlichkeiten werden erst gezeigt, wenn eine öffentliche Trefferquote existiert.

## Quelltext

`python3 scripts/build.py` setzt `index.html` aus `src/shell.html` (Gerüst und CSS), `src/tx.js` (Umsätze, Rendite, Kurse), `src/logic.js` (Daten, CSV-Parser, Regeln, Rechner), `src/parts.js` (Import- und Datenkarten) und `src/ui.js` (Oberfläche, Routing) zusammen. Die Action baut bei jedem Veröffentlichen neu. Musterumsätze sind erfunden (`scripts/gen_demo_tx.py`).

## Datenschutz

- Diese Seite enthält nur ein **Musterdepot mit erfundenen Beständen**.
- Eigene Daten importierst du über das Zahnrad › Daten importieren. Sie werden **nur im Speicher deines Browsers** abgelegt und nie an GitHub oder einen anderen Server gesendet.
- Lade niemals eine CSV-Datei mit echten Beständen in dieses Repository hoch: GitHub-Pages-Seiten sind öffentlich (`.gitignore` blockiert `*.csv` und `*.xlsx`).
- Löschen: Zahnrad › Datenquelle › „Daten auf diesem Gerät löschen“.

## Veröffentlichen

Settings › Pages › Source „GitHub Actions“. Jeder Push auf `main` veröffentlicht automatisch (`.github/workflows/pages.yml`).

## Grenzen

- Umsätze nur aus Euro-Konten. Steuerschätzung vereinfacht (ohne Kirchensteuer, Sparerpauschbetrag, Verlusttöpfe, Vorabpauschale).
- Kurse einmal täglich und verzögert, nur für Wertpapiere mit bekanntem Symbol.
- Kompass-Wahrscheinlichkeiten erst mit öffentlicher Trefferquote. Offene Prognosen werden aufgelöst, sobald ein neuer Bericht in den Daten hinterlegt ist.
- Familien-Rangliste braucht Benutzerkonten.
- Daten liegen pro Browser und Gerät; es gibt keine Synchronisierung und keine Sicherung.
