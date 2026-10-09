# Depotfokus

Persönliches Werkzeug, um ein Wertpapierdepot zu verstehen und Kauf- oder Verkaufsentscheidungen gut zu begründen.

**Startseite (`index.html`):** eine App mit fünf Tabs nach Aufgabe (Muster aus Apple Human Interface Guidelines und Material 3: 3–5 feste Ziele unten, Neues als Badge, Seltenes eine Ebene tiefer):

| Tab | Inhalt |
|---|---|
| **Übersicht** (`#heute`) | Stories, Vermögen, bis zu drei Neuigkeiten, Szenario-Karte, Lernserie |
| **Depot** (`#depot`) | Depot-Wetter, Umschalter Liste/Stadt, Wertentwicklung, Abweichungen, Positionen mit Kompass und Check |
| **Einkommen** | Unterseiten Dividenden (`#kalender`), Plan (`#plan`), Zeitreise (`#zeit`) |
| **Welt** | Unterseiten Szenarien (`#szenarien`), Berichte (`#berichte`); Badge bei neuen Berichten |
| **Lernen** (`#liga`) | Prognose-Liga, Quiz, Kurstipps, Entscheidungsnotizen |

Zahnrad oben rechts: Einstellungen (Import, Darstellung, Datenstand). Die einzelnen Funktionen im Detail:

- **Heute:** Vermögen, Depot-Wetter (Abstand zu deinen Zielen), Storys wie bei WhatsApp (laufen automatisch weiter, rechts/links tippen, halten pausiert, danach folgt die nächste Position), Veränderungen je Position und Datenstand.
- **Wirtschaft & Szenarien** (`#szenarien`, Karte auf Heute): drei feste Makroszenarien bis 09.10.2029 (A Zähe Erholung, B Breiter Aufschwung, C Längerer Stress) als „Szenario-Wahrscheinlichkeit – Modellschätzung“. Jeden Montag aus amtlichen Daten (EZB, Eurostat, FRED) mit festen Regeln neu gerechnet, ohne Sprachmodell: Veränderung zur Vorwoche in Prozentpunkten, belegte Treiber und Gegensignale, Verlauf 13/26/52 Wochen, jede Woche antippbar, Datenqualität und Ablauf, dazu eine getrennte Modellrechnung mit eigenen Renditeannahmen. Keine Trefferquote vor der Auflösung 2029. Details: [`docs/SZENARIEN.md`](docs/SZENARIEN.md).
- **Datenstand und Ablauf** (`#stand`): was automatisch läuft (Kurse, Rechnen), was manuell geprüft ist (Einordnungen, Regeln), wann der nächste Kursabruf geplant ist und welche Berichte als Nächstes erwartet werden.
- **Depot-Stadt** (oben im Depot): jede Position ein illustriertes Gebäude (Rechenzentrum, Getränkefabrik, Pflegeheim, Kreditbank, Weltviertel …). Höhe = Wert, gelbe Fenster = Dividende, Sonne/Wolke = Rückenwind/Gegenwind aus belegten Trends; mit dem Zeitregler wächst die Stadt (mittleres Szenario der Zeitreise). Antippen öffnet den Steckbrief (`#haus/…`): Was macht die Firma, was gehört dir (z. B. „7,7 Getränke pro Tag“), wohin geht dein Geld (Umsatz, Gewinn, Dividende, was in der Firma bleibt), wohin geht die Welt, macht die Firma es gut (Regeln plus Umwelt, Soziales, Führung mit Quellen). Dazu dein Warum: einmal ein Anleger-Profil, je Position bis zu zwei Gründe; der Entscheidungs-Check greift das auf. Daten: `data/world.json`, recherchiert am 05.10.2026, jede Zahl mit Quelle.
- **Dividendenkalender** (`#kalender`, aus Heute und Depot): Zahlungen der nächsten 12 Monate je Monat mit Summe und Monatsbalken. **Angekündigt** heißt vom Unternehmen erklärt, mit Ex-Tag, Zahltag, Betrag je Aktie und Quelle (`data/dividends.json`). **Geschätzt** heißt gleicher Termin und gleiche Höhe wie deine Buchung vor einem Jahr, auf den heutigen Bestand hochgerechnet; ohne Umsätze gibt es keine Schätzungen. Dazu „Erhalten“: deine gebuchten Dividenden der letzten 12 Monate. Beträge netto, Fremdwährung zum aktuellen Devisenkurs.
- **Depot:** Abweichungen von deinen Vorgaben, offene Datenfragen, Positionen nach Baustein. Je Position: Einordnung, Kompass (Dafür/Dagegen aus geprüften Regeln), belegte Fakten mit Quelle, beobachtete Bedingungen und Risiken, Entscheidungs-Check für Kauf oder Verkauf.
- **Plan:** Zielverteilung, Grenze je Einzelwert, monatliche Einzahlung und centgenaue Verteilung ohne Verkauf.
- **Zeitreise** (`#zeit`, aus Heute und Plan): monatliche Dividende über 20 Jahre mit Finger verschieben; Spanne vorsichtig–mittel–gut aus offenen, änderbaren Annahmen je Baustein; Sparplan aus dem Plan, Wiederanlage nach Steuern, Kaufkraft, Kürzungs-Weichen für Positionen mit nicht erfüllten Regeln; Säulen je Position. Dazu Kurstipps für 12 Monate, die in der Liga gewertet werden. Keine Prognose, sondern eine Rechnung mit deinen Annahmen.
- **Liga:** echte Prognosefragen zu deinen Positionen mit Sicherheitsangabe und deine Entscheidungsnotizen.
- **Hell und Dunkel:** Kontrast-Symbol auf Heute oder Zahnrad › Darstellung (System, Hell, Dunkel). Die Depot-Stadt wird nachts zur Abendszene.
- **Daten & Import** (Zahnrad): CSV-Import aus Portfolio Performance (Vermögensaufstellung und Umsätze, mehrere Dateien auf einmal), Zuordnungen bestätigen, Tageskurse an/aus, Vermögen außerhalb des Depots, Daten löschen.

**Aus den Umsätzen** (Depot- und Kontoumsätze): Einstand nach FIFO, Kursgewinn, realisierte Gewinne, erhaltene Ausschüttungen, Rendite p. a. als interner Zinsfuß und eine Steuerschätzung im Verkaufs-Check. Abweichungen zwischen Umsätzen und Bestand werden angezeigt statt verrechnet.

**Kurse:** Die GitHub Action ruft Mo–Fr während der Handelszeit etwa alle 15 Minuten (Tradegate, 8–22 Uhr) und abends nach US-Börsenschluss Kurse für die Symbole aus den Stammdaten (und optional `symbols.txt`) ab und veröffentlicht sie als `prices.json`. Es werden keine Bestände übertragen; gerechnet wird im Browser. Ohne Kurse gelten die Exportwerte.

**Dividenden:** Beim Veröffentlichen sammelt die Action höchstens einmal am Tag Dividenden für die Symbole aus den Stammdaten und `symbols.txt` (`scripts/fetch-dividends.mjs`) und veröffentlicht sie als `dividends.json`: stockanalysis.com für US-Aktien und US-ETFs (Ex-Tag, Zahltag, bereits erklärte Zahlungen, auch NYSE), sonst Nasdaq und Yahoo Finance. Je Lauf werden die acht Wertpapiere mit den ältesten Daten erneuert, Fehlversuche frühestens nach zwei Stunden. Europäische UCITS-ETFs haben dort keine Daten; für sie schätzt der Kalender aus deinen Umsätzen. Der Dividendenkalender rechnet damit für deinen Bestand, auch ohne Umsätze. Neu abrufen: Actions › GitHub Pages › Run workflow › „Dividenden jetzt neu abrufen“ (alle auf einmal). Für eigene US-Aktien in `symbols.txt` den US-Ticker als dritte Spalte angeben.

**Berichte (Stufe 1, automatisch, kostenlos):** Beim Veröffentlichen prüft die Action bei SEC EDGAR, ob die Unternehmen seit der letzten Einordnung neue Ergebnismeldungen (8-K), Quartals- oder Jahresberichte oder Mitteilungen (6-K) eingereicht haben, und veröffentlicht das als `reports.json`. Die App markiert betroffene Storys und Positionen.

**Einordnung (Stufe 2, Claude mit Freigabe):** `.github/workflows/assess.yml` läuft täglich morgens. Für jeden neuen Bericht liest Claude das Dokument und schlägt Einordnung, Fakten und Regelstatus vor. Jede Aussage braucht ein wörtliches Zitat aus dem Bericht, und jede Zahl muss im Zitat stehen; das prüft `scripts/assess-reports.mjs` und verwirft sonst die Aussage. Das Ergebnis kommt als Pull Request (Änderung an `data/info.json` und `data/resolved.json`). Erst nach dem Zusammenführen ändert sich die App; offene Liga-Prognosen werden dabei aufgelöst.

Einrichtung:
1. Settings › Secrets and variables › Actions › New repository secret: `ANTHROPIC_API_KEY`.
2. Settings › Actions › General › Workflow permissions: „Read and write permissions“ und „Allow GitHub Actions to create and approve pull requests“ aktivieren.
3. Optional: Repository-Variable `DEPOTFOKUS_MODEL` (Standard `claude-sonnet-5-5`), Secret oder Variable `SEC_USER_AGENT` (z. B. `Depotfokus deine@mail.de`): Die SEC verlangt eine Kontaktadresse; ohne Variable wird die GitHub-noreply-Adresse verwendet.
4. Testlauf: Actions › Berichte einordnen › Run workflow.

Kosten: rund 10 Cent je Quartalsbericht (Sonnet 5.5, Stand Oktober 2026), höchstens drei Berichte je Lauf. Bereits bewertete Einreichungen stehen in `data/assessed.json` und werden nicht erneut bewertet.

**Liga:** Rückblick-Quiz mit sofortiger Auflösung aus den letzten Berichten, offene Prognosen bis zum nächsten Bericht, Treffsicherheit mit Brier-Wert.

**`/app/`:** leitet auf die Startseite um. Gespeicherte Daten bleiben erhalten.

Installierbar als App (Zum Home-Bildschirm) und offline nutzbar.

**Keine Anlageberatung. Depotfokus führt keine Orders aus.** Die Einordnungen in `data/info.json` sind am 04.10.2026 manuell recherchiert und werden danach per freigegebenem Pull Request aktualisiert. Wahrscheinlichkeiten werden erst gezeigt, wenn eine öffentliche Trefferquote existiert.

## Quelltext

`python3 scripts/build.py` setzt `index.html` aus `src/shell.html` (Gerüst und CSS), `src/tx.js` (Umsätze, Rendite, Kurse), `src/logic.js` (Daten, CSV-Parser, Regeln, Rechner), `src/parts.js` (Import- und Datenkarten), `src/zeit.js` (Zeitreise und Kurstipps), `src/stadt.js` (Depot-Stadt und Steckbriefe), `src/kalender.js` (Dividendenkalender), `src/szenario.js` (Wirtschaft & Szenarien) und `src/ui.js` (Oberfläche, Routing) sowie `data/info.json`, `data/resolved.json`, `data/world.json`, `data/dividends.json` sowie Definitionen, Prüfstatus und den jüngsten Wochenstand aus `data/scenarios/` zusammen. Ältere Wochenstände lädt die App bei Bedarf aus `data/scenarios/snapshots/` (beim Veröffentlichen nach `_site` kopiert).

**Szenario-Monitor:** `scripts/scenario-run.mjs` (Ablauf), `scripts/scenario-model.mjs` (Rechenkern), `scripts/scenario-sources.mjs` (Datenadapter), Tests `node --test scripts/scenario-test.mjs`, Workflow `.github/workflows/scenarios.yml` (Montag 07:20 Uhr Berliner Zeit, manuell über Actions › Szenario-Monitor › Run workflow). Die Action baut bei jedem Veröffentlichen neu. Musterumsätze sind erfunden (`scripts/gen_demo_tx.py`).

## Datenschutz

- Diese Seite enthält nur ein **Musterdepot mit erfundenen Beständen**.
- Eigene Daten importierst du über das Zahnrad › Daten importieren. Sie werden **nur im Speicher deines Browsers** abgelegt und nie an GitHub oder einen anderen Server gesendet.
- Lade niemals eine CSV-Datei mit echten Beständen in dieses Repository hoch: GitHub-Pages-Seiten sind öffentlich (`.gitignore` blockiert `*.csv` und `*.xlsx`).
- Löschen: Zahnrad › Datenquelle › „Daten auf diesem Gerät löschen“.

## Veröffentlichen

Settings › Pages › Source „GitHub Actions“. Jeder Push auf `main` veröffentlicht automatisch (`.github/workflows/pages.yml`).

## Grenzen

- Umsätze nur aus Euro-Konten. Steuerschätzung vereinfacht (ohne Kirchensteuer, Sparerpauschbetrag, Verlusttöpfe, Vorabpauschale).
- Kurse etwa alle 15 Minuten, durch GitHub-Zeitpläne oft 15–30 Minuten alt; nur für Wertpapiere mit ISIN in den Stammdaten oder `symbols.txt`.
- Kompass-Wahrscheinlichkeiten erst mit öffentlicher Trefferquote. Die Szenario-Wahrscheinlichkeiten sind ausdrücklich eine unkalibrierte Modellschätzung mit festen Regeln; Gewinne und KI-Investitionen nur aus US-Daten, Bewertungen nicht abgedeckt.
- Berichte nur von der SEC (US-Unternehmen und ausländische Emittenten mit US-Notierung); keine Presseartikel, keine ETFs.
- GitHub pausiert geplante Läufe in Repositories ohne Aktivität nach 60 Tagen; ein Commit oder manueller Start reaktiviert sie.
- Familien-Rangliste braucht Benutzerkonten.
- Daten liegen pro Browser und Gerät; es gibt keine Synchronisierung und keine Sicherung.
