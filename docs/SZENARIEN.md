# Szenario-Monitor: Methode, Quellen, Betrieb

**Szenario-Wahrscheinlichkeit – Modellschätzung.** Drei feste Makroszenarien für den Zeitraum 09.10.2026 bis 09.10.2029, jeden Montag aus amtlichen Wirtschaftsdaten neu gerechnet. Die Werte sind eine heuristische Rechnung mit festen, offen dokumentierten Regeln. Sie sind nicht kalibriert, keine statistisch validierte Bayes-Prognose und keine Anlageberatung.

## Szenarien (`data/scenarios/scenario_set.json`, Version 1.0.0)

| ID | Name | Startgewicht |
|---|---|---|
| A | Zähe Erholung | 50 % |
| B | Breiter Aufschwung | 20 % |
| C | Längerer Wirtschafts- und Finanzmarktstress | 30 % |

Die Startgewichte stammen aus der eigenen Szenarioanalyse vom 09.10.2026 und sind subjektive Annahmen. Das Ziel 2029-10-09 bleibt für alle Wochenvergleiche fest. Ein neuer Dreijahreshorizont bekommt einen neuen `scenario_set_id` und einen eigenen Verlauf.

**Auflösung am 09.10.2029** (nur damals veröffentlichte Daten; zuerst C, dann B, sonst A):

- **C**, wenn eines gilt: Euroraum-BIP real wächst von 2026-Q3 bis 2029-Q3 kumuliert um weniger als 1,5 %; oder zwei aufeinanderfolgende Quartale mit negativem BIP-Wachstum; oder der CISS liegt in mindestens sechs Monaten im Monatsmittel über 0,30.
- **B**, wenn C nicht zutrifft und alles gilt: BIP kumuliert mindestens +5,0 %; Kerninflation Euroraum im Zwölfmonatsmittel bis 2029-09 höchstens 2,5 %; US-Unternehmensgewinne nach Steuern 2029-Q2 mindestens 15 % über 2026-Q2.
- **A** sonst.

Makroszenario und Rendite sind getrennt: Auch in A oder B kann der Aktienmarkt zeitweise fallen, auch in C kann er bis 2029 steigen.

## Rechenregel (`data/scenarios/model_config.json`, Modell 1.0.0)

```
x_i    = begrenztes Signal je Indikator in [−1, +1]   (+1 Entspannung/Aufschwung, −1 Belastung/Stress)
x_g    = Mittel der gültigen x_i einer Gruppe          (nicht Summe)
score_s = ln(startgewicht_s) + beta × Σ_g gruppengewicht_g × ladung_s × x_g
p_s    = exp(score_s − max) / Σ exp(score − max)        (numerisch stabiles Softmax)
Ladungen: A = 0, B = +1, C = −1;  beta = 1
```

- **Jeder Stand wird aus denselben Startgewichten neu gerechnet**, nie aus dem Vorwochenwert. Gleiche Eingaben ergeben gleiche Gewichte; wiederholte Meldungen derselben Daten verschieben nichts.
- **Neutral heißt unverändert:** Bei x = 0 überall bleiben 50/20/30 stehen. A ist Referenzfall und ändert sich nur über die Normierung.
- **Begrenzung:** Selbst durchweg extreme Signale bringen B höchstens auf rund 47 % und C höchstens auf rund 58 %.
- **Korrelation:** Indikatoren einer Gruppe werden gemittelt; mehr Quellen bedeuten nicht mehr Evidenz.
- **Lücken:** Fehlende oder veraltete Indikatoren fallen aus dem Gruppenmittel. Eine Gruppe ohne gültigen Wert trägt nichts bei; die übrigen Gruppen werden nicht hochskaliert. Fehlende Daten zählen also weder als Entspannung noch als Belastung. Schlägt ein Abruf fehl, gilt der zuletzt gespeicherte Wert, solange er die Altersgrenze einhält (sichtbar als „Altwert“).
- **Kritischer Ausfall:** Fehlt in Konjunktur, Inflation oder Kredit/Stress jeder gültige Wert oder liegt die Abdeckung unter 60 % der Gruppengewichte, gibt es „keine belastbare Neubewertung“: Die letzten gültigen Gewichte bleiben stehen.
- **Anzeige:** ganze Prozente nach dem Verfahren des größten Rests, Summe immer genau 100. Veränderungen in Prozentpunkten werden aus den angezeigten Werten berechnet.

| Gruppe | Gewicht | Begründung |
|---|---|---|
| Konjunktur und Aktivität | 25 % | Wachstum ist Kern aller drei Definitionen |
| Inflation und Geldpolitik | 20 % | Nachlassender Preisdruck trennt A/B von C |
| Energie und geopolitische Belastungen | 15 % | Genannter Auslöser von C, Bedingung für B; Geopolitik nur über Preise |
| Kreditbedingungen und Finanzmarktstress | 25 % | Definiert C mit, reagiert früh |
| Gewinne, Bewertungen, KI-Investitionen | 15 % | Kern von B; nur US-Daten amtlich frei verfügbar |

## Datenreihen

| ID | Reihe | Quelle und Abruf | Region | Frequenz | Auswertung | Regel (x = 0 / x = +1) | Max. Alter |
|---|---|---|---|---|---|---|---|
| EA_ESI | Wirtschaftsstimmung (ESI) | Eurostat `ei_bssi_m_r2`, JSON-stat | Euroraum (EA21) | monatlich | letzter Wert | 100 / 110 | 100 Tage |
| EA_GDP_QQ | Reales BIP, % zum Vorquartal | Eurostat `namq_10_gdp` (CLV_PCH_PRE, SCA) | Euroraum | Quartal | letzter Wert | 0,3 % / 0,7 % | 200 Tage |
| EA_HICP | HVPI, % zum Vorjahr | Eurostat `prc_hicp_minr` (ECOICOP 2, TOTAL) | Euroraum (EA) | monatlich | letzter Wert | Band: Ziel 2 % = +1, ±1 Pp. = 0 | 100 Tage |
| EA_HICP_CORE | Kern-HVPI, % zum Vorjahr | Eurostat `prc_hicp_minr` (TOT_X_NRG_FOOD) | Euroraum (EA) | monatlich | letzter Wert | wie HVPI | 100 Tage |
| US_CORE_PCE | Kern-PCE-Preisindex | BEA via FRED `PCEPILFE`, fredgraph.csv | USA | monatlich | % zum Vorjahr | wie HVPI | 100 Tage |
| ECB_DFR | EZB-Einlagezins | EZB `FM/D.U2.EUR.4F.KR.DFR.LEV`, SDMX-CSV | Euroraum | täglich | nur Kontext | – | 30 Tage |
| BRENT_YOY | Brent | IWF via FRED `POILBREUSDM` | Welt | monatlich | % zum Vorjahr | 0 % / −25 % | 110 Tage |
| EU_GAS | Erdgas Europa | IWF via FRED `PNGASEUUSDM` | Europa | monatlich | letzter Wert | 12 $ / 6 $ je MMBtu | 110 Tage |
| EA_CISS | Finanzstressindikator CISS | EZB `CISS/D.U2.Z0Z.4F.EC.SS_CIN.IDX` | Euroraum | täglich | Mittel 20 Tage | 0,15 / 0,05 | 14 Tage |
| EA_HY_OAS | Risikoaufschlag Hochzins Euro | ICE BofA via FRED `BAMLHE00EHYIOAS` | Euroraum | täglich | Mittel 20 Tage | 4,0 / 2,75 Pp. | 14 Tage |
| US_HY_OAS | Risikoaufschlag Hochzins USA | ICE BofA via FRED `BAMLH0A0HYM2` | USA | täglich | Mittel 20 Tage | 4,0 / 2,75 Pp. | 14 Tage |
| VIX | Erwartete Schwankung US-Aktien | Cboe via FRED `VIXCLS` | USA | täglich | Mittel 20 Tage | 20 / 13 | 14 Tage |
| US_PROFITS_YOY | Unternehmensgewinne nach Steuern | BEA via FRED `CP` | USA | Quartal | % zum Vorjahr | +4 % / +12 % | 200 Tage |
| US_INFO_INV_YOY | Investitionen IT-Ausrüstung und Software | BEA via FRED `A679RC1Q027SBEA` | USA | Quartal | % zum Vorjahr | +5 % / +15 % | 200 Tage |

Lineare Regel: `x = clamp((wert − neutral) / (voll − neutral), −1, 1)`; der Wert auf der Gegenseite von „voll“ ergibt x = −1. Bandregel: `x = clamp(1 − |wert − ziel| / breite, −1, 1)`.

**Nicht abgedeckt** (werden nicht geschätzt): Aktienbewertungen (kein amtlicher freier Index), Unternehmensgewinne Euroraum (keine amtliche freie Quartalsreihe), geopolitische Ereignisse (nur über Energiepreise und Stress erfasst).

Hinweis: Die EZB-Reihen `ICP.M.U2…` enden im Dezember 2025 (Umstellung auf ECOICOP 2, Euroraum mit 21 Ländern). Die Inflation kommt deshalb direkt von Eurostat.

## Speicherung (`data/scenarios/`)

- `scenario_set.json`, `model_config.json`: versionierte Definitionen und Regeln.
- `observations.json`: Beobachtungen je Serie und Periode mit `first_seen_at` (erstes Abrufdatum im Monitor, konservativer Ersatz für das Veröffentlichungsdatum), Revisionsnummer und Revisionshistorie. Mehrere Meldungen derselben Periode sind ein Ereignis.
- `snapshots/<KW>.json`: ein unveränderlicher Wochenstand mit allen im Auftrag genannten Feldern (`snapshot_id`, `week_id`, `config_hash`, `input_hash`, Roh- und Anzeigewerte, Änderungen in Prozentpunkten, Treiber, Quellen, Datenqualität …). Korrekturen in derselben Woche werden als `<KW>-r2` mit `revision_of` gespeichert.
- `snapshots/index.json`: Verzeichnis aller Stände. `status.json`: letzter Prüfversuch, letzte erfolgreiche Neubewertung, nächster Lauf, Abrufstatus je Quelle.

Historische Stände enthalten nur Werte, die zum Laufzeitpunkt abrufbar waren. Es gibt keine nachträglich erzeugten Wochen; der Verlauf beginnt mit dem ersten echten Lauf am 09.10.2026.

## Ablauf (`.github/workflows/scenarios.yml`)

Montag 07:20 Uhr Berliner Zeit (Cron 05:20 und 06:20 UTC; das Skript startet nur den ersten Lauf nach 7 Uhr Berliner Zeit, damit funktioniert Sommer- und Winterzeit). Schritte: Tests → Quellen abrufen → validieren und deduplizieren → rechnen → erklären → Snapshot prüfen → committen → Pages-Workflow per `workflow_dispatch` starten (ein Push mit `GITHUB_TOKEN` löst keinen Workflow aus) → prüfen, dass die veröffentlichte Seite den neuen `snapshot_id` ausliefert.

Idempotenz: Gleiche Woche, gleiche Eingaben, gleiche Methode erzeugt keinen zweiten Stand. Ein geplanter Zweitlauf in einer bereits bewerteten Woche endet sofort. `concurrency` verhindert parallele Läufe; der Push wird bis zu dreimal mit Rebase wiederholt.

**Einrichtung:** keine. Der Workflow nutzt nur `GITHUB_TOKEN` mit `contents: write` und `actions: write`. Voraussetzung (schon für die Berichtseinordnung nötig): Settings › Actions › General › Workflow permissions „Read and write permissions“. Manuell: Actions › Szenario-Monitor › Run workflow (optional „Nur prüfen, nichts speichern“).

## Claude, Kosten, Datenschutz

- Kein Sprachmodell: Begründungen entstehen regelbasiert aus den tatsächlich veränderten Eingaben. Die Kernfunktion läuft ohne `ANTHROPIC_API_KEY`. Ein optionaler Claude-Text wäre über die bestehende Modellkonfiguration (`DEPOTFOKUS_MODEL`) möglich, bräuchte aber dieselbe Quellenprüfung und Freigabe wie die Berichtseinordnung und ist bewusst nicht eingebaut.
- Kosten: keine API-Kosten. Ein Lauf braucht etwa eine Minute GitHub-Actions-Zeit (öffentliches Repository: kostenlos) und höchstens 30 Abrufe.
- Es werden nur öffentliche Wirtschaftsdaten verarbeitet. Keine Depotbestände, keine Schlüssel im Frontend.

## Gesonderte Modellrechnung

In der Detailansicht lassen sich Renditeannahmen je Szenario eintragen (Vorgabe A +20 %, B +45 %, C −25 % über drei Jahre). Gezeigt wird die gewichtete Rendite (bei 50/20/30: 11,5 %). Das ist eine Rechnung mit Annahmen, kein erwarteter Ertrag; die Zeitreise bleibt unverändert. Bei kürzerem Resthorizont weist die App darauf hin, die Annahmen anzupassen.

## Kalibrierung

Erst nach der Auflösung am 09.10.2029 sinnvoll. Wochenstände mit demselben Endziel sind keine unabhängigen Treffer. Vorab festgelegt: Gewertet werden je Szenariosatz der erste Stand und der Durchschnitt aller Wochenstände (Brier-Wert), getrennt ausgewiesen. Bis dahin zeigt die App keine Trefferquote.

## Tests

`node --test scripts/scenario-test.mjs` (läuft auch vor jedem Wochenlauf): Normierung und Summe 100, Begrenzung, Determinismus, keine Drift bei wiederholter Evidenz, Lücken ohne Optimismus, Korrelation, kritischer Ausfall, veraltete und fehlgeschlagene Abrufe, Revisionen und Methodenwechsel, Zeitpunkttreue, Kalenderwochen über den Jahreswechsel (2026-W53), Sommer-/Winterzeit, Lücken im Verlauf, Startzustand, gegenläufige Treiber, Parser für EZB, Eurostat und FRED. Synthetische Daten gibt es nur in diesen Tests und in der ausdrücklich markierten Ansicht `#szenarien/demo`.

## Grenzen

- Schwellenwerte und Gewichte sind fachlich begründete Setzungen, nicht empirisch geschätzt.
- Monatliche und Quartalsdaten ändern sich nur bei Veröffentlichung; viele Wochen bleiben „unverändert“.
- Gewinne und KI-Investitionen nur aus den USA; Bewertungen und Geopolitik fehlen als eigene Größe.
- FRED-Grafik-CSV und Eurostat haben keine Service-Garantie; bei Ausfall greifen Altwerte innerhalb der Altersgrenze, sonst „keine belastbare Neubewertung“.
- GitHub pausiert geplante Läufe nach 60 Tagen ohne Repository-Aktivität; die regelmäßigen Bot-Commits halten sie aktiv.
