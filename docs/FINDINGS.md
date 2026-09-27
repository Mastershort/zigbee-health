# Befund-Regeln

Umgesetzt in `custom_components/zigbee_health/analyzer/findings.py`. Standardwerte in `analyzer/config.py`.
Topologie-Regeln in `findings.py`, Historien-Regeln in `rules_health.py`, Netz- und Backend-Regeln in `rules_network.py`.

| ID | Typ (`translation_key`) | Bedingung | Schwere | Befund-ID |
|---|---|---|---|---|
| F-01 | `dead_device` | Endgerät: nicht gesehen ≥ 30 Tage. Router: nicht gesehen ≥ 30 Tage **und** im letzten Scan `failed` bzw. Availability offline **und** weder im Scan geantwortet noch online. Koordinator nie. | critical | `dead_device:<ieee>` |
| F-02 | `disappeared` | Endgerät: nicht gesehen > 12 h (gesprächig) bzw. > 3 Tage (still). Router: Availability offline > 1 h; ohne Availability: letzter Scan `failed` und `last_seen` > 1 h. Nie für Teilzeit-Router, nie in den ersten 15 min nach Z2M-Start. | warning | `disappeared:<ieee>` |
| F-05 | `part_time_router` | Router mit `failed` in ≥ 2 der letzten 3 Scans, **oder** ≥ 3 Wechsel offline→online in 7 Tagen, **oder** ≥ 3 `unavailable`-Ereignisse der Licht-Entität in 7 Tagen. | warning, critical wenn F-06 | `part_time_router:<ieee>` |
| F-06 | `children_on_part_time_router` | Teilzeit-Router ist letztes bekanntes Eltern-Gerät (letzte 7 Scans) mindestens eines lebenden Endgeräts. Ein Befund pro Router mit allen Kindern. | critical | `children_on_part_time_router:<ieee>` |
| F-07 | `weak_link` | Endgerät: Median der letzten 3 LQI-Messungen zum aktuellen Eltern-Gerät < 80 (LQI 0 wird ignoriert). | warning | `weak_link:<ieee>` |
| F-03 | `battery_low` | Batterie ≤ 15 %, **oder** Spannung unter Grenzwert des Batterietyps (Tabelle in `battery.py`), **oder** gesprächiges Gerät sendet 6 h lang < 20 % seiner Stunden-Baseline (≥ 24 h Baseline, ≥ 1 Nachricht/h). | warning | `battery_low:<ieee>` |
| F-04 | `battery_forecast` | Lineare Regression der Tageswerte (Spannung bevorzugt, sonst %) über ≥ 14 Tage, R² ≥ 0,5 → leer in < 21 Tagen. Nicht zusätzlich zu F-03. | info | `battery_forecast:<ieee>` |
| F-08 | `weak_backbone` | Dauerhaft aktiver Router: Median (letzte 3 Scans) der besten Verbindung zu Koordinator/anderen dauerhaften Routern < 80 (LQI ≤ 1 ignoriert). | warning | `weak_backbone:<ieee>` |
| F-09 | `degradation` | Tages-LQI der letzten 14 Tage (≥ 7 Tage Daten): Mittel der letzten 3 Tage ≥ 30 % unter dem der ersten 3 Tage. | info | `degradation:<ieee>` |
| F-10 | `unstable_device` | ≥ 3 Ereignisse (`leave_count` + `network_address_changes`) oder ≥ 3 `device_announce` in 24 h. | warning | `unstable_device:<ieee>` |
| F-11 | `message_flood` / `network_message_flood` | Gerät: 3 volle Stunden je > 6/min (Messgeräte × 5). Netz: letzte volle Stunde > 10/s. | warning | `message_flood:<ieee>`, `network_message_flood` |
| F-12 | `overloaded_parent` | Router mit ≥ 8, Koordinator mit ≥ 20 lebenden Endgerät-Kindern. | info | `overloaded_parent:<ieee>` |
| F-14 | `too_few_routers` | Endgeräte je dauerhaft aktivem Router > 8 oder Etage ohne dauerhaft aktiven Router. | warning | `too_few_routers` |
| F-15 | `prerequisite_missing` | Z2M `last_seen`, `availability` oder `health` aus. Immer im Reparaturen-Center (mit Fix-Flow). | info | `prerequisite_missing:<option>` |
| F-16 | `outdated_firmware` | Koordinator-Firmware älter als Tabelle `MIN_COORDINATOR_REVISION` in `rules_network.py`. | info | `outdated_firmware` |
| F-17 | `interview_incomplete` / `unsupported_device` | `interview_state` ≠ SUCCESSFUL bzw. `supported == false`. | info | `<typ>:<ieee>` |
| F-13 | `room_without_router` | Bereich mit ≥ 2 lebenden Endgeräten und 0 dauerhaft aktiven Routern. | warning | `room_without_router:<area_id>` |
| F-18 | `devices_without_area` | ≥ 1 analysiertes Gerät ohne Bereich (ein Befund fürs ganze Netz). | info | `devices_without_area` |

Deaktivierte und ignorierte Geräte erzeugen keine Befunde. Einzelne Befund-Typen lassen sich pro Gerät ignorieren.

## Scores

Siehe Docstring in `analyzer/score.py`:

- **Gerät:** 100 − (critical 40, warning 20, info 5) je aktivem Befund, mindestens 0.
- **Raum:** Mittelwert der Geräte-Scores − 20 bei F-13, begrenzt auf 0–100.
- **Netz:** gewichteter Mittelwert (Router × 2) − netzweite Abzüge (F-14 −12, F-11 netzweit −8), begrenzt auf 5–100.
- **Stufe:** ≥ 80 stabil, 55–79 mit Aussetzern, < 55 fragil.

## Referenz-Auswertung (Fixture-Test)

`tests/analyzer/test_fixture_reference.py`: `networkmap_raw.json` und `networkmap_raw_2.json` (6 min Abstand) plus `bridge_devices.json`. Zeitbezug: jüngstes `lastSeen` der zweiten Karte (23.09.2026, 12:04 UTC). Schwelle „tot“: 60 Tage. Keine Bereiche.

> Die Referenzliste in SPEC §11 stammt von einem älteren Datenstand (47 Geräte) und passt nicht zu diesen Fixtures. Die folgenden Erwartungen sind aus den aktuellen Daten hergeleitet.

| Ergebnis | Geräte | Begründung |
|---|---|---|
| **Tot (13)** | Klima Flur (564 d), Klima Gäste-WC (537 d), Bewegung Bad (451 d), Sensor Schlafzimmer (428 d), Fenster Büro Vorne (151 d), Haustür Flur (87 d) | Endgeräte > 60 Tage still |
| | Licht Bad (563 d), Stimmungslicht Wohnzimmer (410 d), Stehlampe Wohnzimmer (298 d), Steckdose Flur (98 d), Steckdose Hauswirtschaft (95 d), Deko Flur unten (87 d), Licht Schlafzimmer (69 d) | Router > 60 Tage still und `failed` im Scan |
| **Lebt trotz altem `lastSeen`** | Router Flur (247 d) | liefert Nachbartabelle |
| **Verschwunden (2)** | Fernbedienung Wohnzimmer (18 d, Taster = still > 3 d), Klima Wohnzimmer (7 d, Thermometer = gesprächig > 12 h) | |
| **Teilzeit-Router (7)** | Deckenlicht Küche, Deckenlicht Esszimmer, Licht Bad RGB, Licht Ankleide, Deko Flur oben, Steckdose Wohnzimmer TV, Steckdose Kinderzimmer TV | `failed` in 2 von 2 Scans, < 60 d |
| **Dauerhaft aktive Router (7)** | Router Flur, Lampe Wohnzimmer, Licht Kinderzimmer, Steckdosenleiste Büro, Schranklicht Wohnzimmer, Steckdose Küche, Steckdose Wohnzimmer Fernseher | |
| **Endgeräte an Teilzeit-Router** | keine | kein Teilzeit-Router hat je geantwortet |
| **Schwache Verbindung (1)** | Klima Küche → Koordinator, LQI 60 | Median aus 57 und 62 |
| **Ohne Raum** | 48 Geräte | Fixture hat keine Bereiche |
| **Unbekannter Nachbar** | `0x001788010b25b9f6` | in Tabellen von Koordinator und Router Flur, nicht in Z2M |
| **Eltern unbekannt** | Tor Garage, Fenster Küche, Fenster Dachboden, Tür Hauswirtschaft, Klima Büro | aktiv, aber in keinem Eltern-Link |
| **Netz-Score** | 83 („stabil“) | siehe Rückfrage zur Gewichtung |

## Top-3-Maßnahmen

Reihenfolge nach Wirkung (`report.py`): tote Geräte entfernen → Batterien tauschen → Teilzeit-Router mit Kindern dauerhaft bestromen → Router in Räumen ohne Router → zusätzliche Router (F-14) → Backbone → übrige Teilzeit-Router → verschwundene Geräte → schwache Verbindungen → Reporting reduzieren → instabile Geräte. Die Logik des Web-Tools auf mastershort.de lag nicht vor; die Reihenfolge folgt SPEC §5.4.
