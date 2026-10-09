# Nachrichten: Quellen, Auswahl, Prüfung, Betrieb

Unter **Welt › Nachrichten** (`#nachrichten`, Detail `#nachricht/<id>`) zeigt Depotfokus täglich höchstens fünf wichtige Wirtschaftsentwicklungen, einfach erklärt. Die Übersicht zeigt bis zu drei davon. Ein ruhiger Tag mit „keine neue relevante Entwicklung“ ist ein zulässiges Ergebnis. Es werden keine Meldungen erfunden, um die Auswahl zu füllen.

## Quellen (`data/news/sources.json`)

Nur Originalveröffentlichungen amtlicher Stellen, deren Inhalte mit Quellenangabe weiterverwendet werden dürfen. Depotfokus veröffentlicht eigene Kurzfassungen, kurze wörtliche Belege (höchstens 300 Zeichen) und Links, keine vollständigen Texte.

| Quelle | Abruf | Stand 09.10.2026 | Nutzung |
|---|---|---|---|
| EZB | RSS `ecb.europa.eu/rss/press.html` | funktioniert | Wiedergabe mit Quellenangabe |
| Eurostat | Atom-Feed der Pressemitteilungen (`CAT_PREREL`) | eingetragen, im ersten Lauf geprüft | Weiterverwendung mit Quellenangabe |
| Destatis | RSS `…/RSSNewsfeed/Aktuell.xml` | funktioniert | Datenlizenz Deutschland 2.0 |
| Bundesbank | RSS Pressemitteilungen | funktioniert (Auktionen ausgeschlossen) | Nachdruck mit Quellenangabe |
| Federal Reserve | RSS `press_all.xml` | funktioniert | gemeinfrei |
| BEA | RSS `apps.bea.gov/rss/rss.xml` | funktioniert | gemeinfrei |
| EIA | RSS „Today in Energy“ | funktioniert | gemeinfrei |
| IWF | RSS News | zeitweise Ratenlimit (HTTP 429) | Wiedergabe mit Quellenangabe |
| FAO | RSS `fao.org/feeds/fao-newsroom-rss` | funktioniert | CC BY-NC-SA 3.0 IGO |
| BLS | RSS | **gesperrt** (HTTP 403 für automatische Abrufe) | gemeinfrei |

**Nicht eingebunden:** Kommerzielle Nachrichtenfeeds (z. B. Agenturen, tagesschau.de). Ihre Nutzungsbedingungen erlauben eine automatische Weiterverarbeitung nicht klar. Weitere Lücken: China nur über IWF, FAO und Weltlage-Meldungen, nicht über chinesische Originalquellen; OECD und Weltbank ohne stabilen Feed.

Fällt eine Quelle aus, laufen die übrigen weiter. Fallen alle aus, bleibt die letzte gültige Ausgabe mit ihrem ursprünglichen Datum sichtbar (Status „Abruf fehlgeschlagen“).

## Auswahlregeln

1. Nur Meldungen der letzten drei Tage laut Veröffentlichungsdatum der Quelle.
2. Ausschlüsse je Quelle: Reden, Interviews, Personalien, Aufsicht über Einzelbanken, Regionaldaten, Anleiheauktionen.
3. **Ereignisse:** gleiche (bereinigte) Adresse oder sehr ähnlicher Titel innerhalb von 36 Stunden ergeben ein Ereignis mit stabiler ID. Weitere Fundstellen erscheinen als „auch:“.
4. **Punkte:** Gewicht der Quelle (0,8–1), dazu +1 je Themenfeld (höchstens +2), +1 für Kernveröffentlichungen (Zinsentscheid, Inflation, BIP, Arbeitsmarkt, Lebensmittelpreisindex, Energieausblick), +0,5 bei höchstens einem Tag Alter, −1 für reißerische Wörter. Mindestens 2 Punkte.
5. Höchstens zwei Meldungen je Quelle, acht Kandidaten, fünf Veröffentlichungen.
6. Claude kann eine Quelle als nicht wirtschaftlich bedeutsam einstufen; sie wird dann zurückgehalten.

Themenfelder: Lebensmittel & Konsum · Energie & Rohstoffe · Inflation & Arbeit · Zinsen & Banken · Industrie, Handel & KI · Unternehmen & Finanzierung.

## Aufbereitung mit Claude

- Bestehende Anbindung: Secret `ANTHROPIC_API_KEY`, Modell aus `DEPOTFOKUS_MODEL` (Standard `claude-sonnet-5-5`).
- Strukturierte Ausgabe über `output_config.format` (JSON-Schema). Sonnet 5.5 lehnt erzwungene Werkzeugaufrufe (`tool_choice: tool`) ab. Deshalb ist auch die bestehende Berichtseinordnung (`assess-reports.mjs`) darauf umgestellt.
- Claude erhält nur den Text der Originalquelle zwischen `<quelle>`-Markierungen; der Inhalt ist ausdrücklich Datenmaterial ohne Anweisungscharakter. Keine Depotdaten.
- Vorab-Denken ist für Sonnet 5.5 abgeschaltet (`thinking: between_tools`), Höchstlänge 4000 Tokens je Meldung.
- Gliederung jeder Meldung: Was ist passiert? (Fakten) · Warum betrifft uns das? · Was könnte es für Unternehmen, Aktien und Dividenden bedeuten? · Was beobachten wir als Nächstes? (jeweils Einordnung), dazu ein antippbares Glossar.

## Prüfregeln (`scripts/news-check.mjs`)

Eine Tatsache wird nur veröffentlicht, wenn:

- ihr Zitat wörtlich im abgerufenen Quelltext steht (20–300 Zeichen),
- jede Zahl der Aussage im Zitat vorkommt (deutsche und englische Schreibweise, Toleranz 0,5 %),
- „Prozentpunkte“ nur stehen, wenn die Quelle Prozentpunkte oder Basispunkte nennt,
- ein Minuszeichen durch einen Rückgang in der Quelle gedeckt ist,
- Erwartungen oder Prognosen in der Quelle als solche belegt sind,
- keine Empfehlungssprache vorkommt (kaufen, verkaufen, Kursziel …).

Die **Einordnung** wird nur gezeigt, wenn sie ausschließlich belegte Zahlen enthält und die Finanzwirkung bedingt formuliert ist („kann“, „wenn“, „hängt davon ab“). Pauschalaussagen („sinkende Zinsen lassen Aktien steigen“) sind ausgeschlossen. „Preise sinken“ ist ohne Beleg für Deflation ausgeschlossen, denn eine niedrigere Inflationsrate heißt langsamer steigende Preise. Dividenden heißen nur „angekündigt“, wenn die Quelle eine Erklärung enthält; sonst „erwartet“ mit Beleg oder gar nicht. Abgeleitete Zahlen ohne dokumentierte Rechnung fallen weg (Beispiel aus dem Test: 0,25 Prozentpunkte aus 25 Basispunkten). Hat die Überschrift eine solche Zahl, erscheint der Originaltitel.

**Prüfstatus in der App**

| Status | Bedeutung |
|---|---|
| Daten geprüft | Fakten und Einordnung haben alle Prüfungen bestanden. Daraus folgt keine Kursprognose. |
| Nur Fakten geprüft | Die Einordnung ist durchgefallen und wird nicht gezeigt. |
| Kurzmeldung ohne Einordnung | Kein Schlüssel oder Modellfehler: Originaltitel und ein wörtlicher Satz der Quelle. |
| zurückgehalten | Nicht veröffentlicht (keine belegte Aussage, Quellseite unlesbar oder nicht bedeutsam); Grund unter „Stand, Quellen und Prüfung“. |

Grenze der Prüfung: Sätze ohne Zahl kann das Skript nur auf verbotene Muster prüfen, nicht inhaltlich. Deshalb bleibt die Einordnung sichtbar als „Einordnung“ gekennzeichnet.

## Speicherung (`data/news/`)

- `latest.json`: aktuelle Tagesauswahl (`date`, `result` = items | none, bei „none“ die letzte Auswahl als `previous`).
- `archive/<Datum>.json` und `archive/index.json`: Tagesarchiv ab dem ersten echten Lauf am 09.10.2026, mit zurückgehaltenen Meldungen.
- `events.json`: Ereignisregister (Adresse → Ereignis-ID, Quell-Hash, Revision, letzte Fassung). Ein erneut abgerufener oder nur umformulierter Text ist keine neue Meldung. Ändert sich die Quelle, steigt die Revision sichtbar („Revision 2“ mit Hinweis). Unveränderte Quellen werden nicht erneut an Claude geschickt.
- `status.json`: letzter Lauf, letzter Erfolg, Quellenstatus, zurückgehaltene Meldungen, Token und Kosten.

Jede Meldung enthält: `id`, `event_id`, `revision`, Titel, Kurzfassung, Fakten mit Zitat, Zahlen mit Einheit und Zeitraum, Alltagseinordnung, Finanzwirkung, nächster Beobachtungspunkt, Kategorien, Regionen, Branchen und Unternehmen, Quelle mit URL und Lizenz, Ereignis-, Veröffentlichungs-, Abruf- und Erstellungszeit, Prüfstatus mit Protokoll, Modell und Ablaufversion.

## Bezug zu Depot und Szenarien

- Die App markiert lokal im Browser, welche Positionen nach Branche, Ticker oder ISIN berührt sein könnten. Bestände verlassen das Gerät nicht; die Pipeline kennt keine persönlichen Daten (per Test geprüft).
- Ein Szenariobezug (A/B/C) ist nur qualitativ. Nachrichten ändern keine Szenario-Wahrscheinlichkeiten; der Szenario-Rechner verarbeitet nur seine festen Datenreihen. Eine doppelte Gewichtung desselben Ereignisses ist damit ausgeschlossen.
- Nachrichten (Welt › Nachrichten), Unternehmensberichte (Welt › Berichte, mit Freigabe per Pull Request) und Szenario-Modellwerte (Welt › Szenarien) bleiben getrennt.

## Betrieb

- **Zeitplan:** täglich 08:20 Uhr Berliner Zeit (Sommer und Winter), nur ein Lauf je Tag. Manuell über Actions › Nachrichten › Run workflow.
- **Veröffentlichen:** Commit von `data/news`, danach `workflow_dispatch` des Pages-Workflows. Der Lauf prüft, dass `data/news/latest.json` und die App den neuen Stand ausliefern.
- **Einrichtung:** keine weitere. `ANTHROPIC_API_KEY` ist bereits als Secret hinterlegt. Ohne Schlüssel entstehen nur Kurzmeldungen.
- **Kosten:** gemessen im ersten echten Lauf rund 25 000 Eingabe- und 7 000 Ausgabe-Token für fünf Meldungen. Mit den im Repository hinterlegten Preisen (2 $ bzw. 10 $ je Mio. Token) sind das etwa 0,12 $ am Tag, also höchstens rund 4 $ im Monat. Unveränderte Meldungen kosten nichts. Aktuelle Preise: https://www.anthropic.com/pricing. Höchstens 80 Abrufe und 12 Minuten je Lauf.

## Tests

`node --test scripts/news-test.mjs` (läuft vor jedem Tageslauf; alle Daten sind als TESTDATEN markiert). Geprüft werden:

- doppelte Ereignisse, wiederholte Läufe ohne neue Modellaufrufe, Revisionen,
- falsche Zahlen und Vorzeichen, Prozent gegenüber Prozentpunkten, abgeleitete Zahlen, „Preise sinken“, unbelegte Erwartungen und Pauschalurteile,
- angekündigte gegenüber erwarteten Dividenden,
- fehlender Schlüssel, Modellfehler, Quellenausfall, ruhiger Tag, Sommer-/Winterzeit,
- lokale Depotzuordnung ohne Übertragung.
