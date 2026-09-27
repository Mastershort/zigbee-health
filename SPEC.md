# Zigbee Health – Projektbeschreibung & Entwicklungs-Prompt

> Dieses Dokument ist der Start-Prompt für die Entwicklung in VS Code (mit einem Coding-Agenten).
> Es beschreibt vollständig, **was** die Integration können soll, **woher** die Daten kommen, **wie** sie ausgewertet werden und **in welcher Reihenfolge** gebaut wird.
> Code, Bezeichner und Kommentare auf Englisch; Benutzeroberfläche zweisprachig (Deutsch zuerst, Englisch).

---

## 0. Anweisung an den Coding-Agenten

Du baust eine **Custom Integration für Home Assistant** (installierbar über HACS) mit dem Namen **Zigbee Health** (Domain `zigbee_health`).

Arbeitsweise:
1. Lies dieses Dokument komplett, bevor du Code schreibst. Stelle Rückfragen, wenn etwas widersprüchlich ist.
2. Arbeite **in den Phasen aus Abschnitt 14** – jede Phase ist für sich lauffähig und getestet, bevor die nächste beginnt.
3. **Erfinde keine Datenformate.** Alle Zigbee2MQTT-Payloads werden gegen die Fixture-Dateien in `tests/fixtures/` (echte Daten) und die offizielle Z2M-Doku geprüft. Wenn ein Feld unklar ist: im Code als Annahme markieren (`# ASSUMPTION:`) und in `docs/ASSUMPTIONS.md` notieren.
4. Die Auswertungslogik (`analyzer/`) ist **reines Python ohne Home-Assistant-Abhängigkeit** und wird zuerst gebaut und vollständig mit pytest getestet.
5. Halte dich an aktuelle HA-Entwicklerstandards: vollständig async, keine blockierenden Aufrufe im Event-Loop, Typisierung (mypy strict), `ruff`, Config Flow statt YAML, `DataUpdateCoordinator`, `entity_description`s, Übersetzungen, Diagnostics, Repairs.
6. Die Integration ist **standardmäßig nur lesend**. Alles, was das Zigbee-Netz verändert (Gerät entfernen, Z2M-Option ändern), passiert ausschließlich über einen bestätigten Fix-Flow des Nutzers.

---

## 1. Ziel & Nutzen

**Problem:** Zigbee-Netze werden mit wachsender Geräteanzahl instabil – Sensoren fallen sporadisch aus, Batterien sind plötzlich leer, Lampen am Wandschalter reißen Lücken ins Netz. Zigbee2MQTT liefert zwar Rohdaten (Verfügbarkeit, `last_seen`, Linkqualität, Health-Topic, Netzwerkkarte), **wertet sie aber nicht aus**. Der Nutzer sieht Linien auf einer Karte, aber nicht *warum* sein Netz zickt und *was* er tun soll.

**Lösung:** Zigbee Health liest die vorhandenen Daten laufend mit, verknüpft sie mit dem Wissen aus Home Assistant (Räume, Etagen, Entitäten, Zustände) und liefert:
- eine **Gesundheits-Punktzahl** für das Netz, jeden Raum und jedes Gerät,
- **konkrete Befunde mit Handlungsanweisung** im Reparaturen-Center von Home Assistant („Haustür Flur seit 84 Tagen still – Batterie prüfen“, „Im Raum Küche fehlt ein dauerhaft aktiver Router“),
- **Prognosen** (Batterie-Restlaufzeit, sich verschlechternde Verbindungen),
- **Entitäten und Ereignisse** für Dashboards und Automationen.

**Zielgruppe:** Home-Assistant-Nutzer mit Zigbee2MQTT (später ZHA), typischerweise 15–200 Zigbee-Geräte, deutschsprachig (Community von mastershort.de).

**Abgrenzung (Nicht-Ziele):**
- Kein Ersatz für das Z2M-Frontend, keine eigene Zigbee-Steuerung.
- Keine automatischen Änderungen am Netz.
- Keine Cloud, kein Tracking, keine Telemetrie. Alles lokal.
- Keine Verkaufslinks im Produkt selbst (Hinweise verlinken auf neutrale Anleitungen).

---

## 2. Datenquellen (Zigbee2MQTT über MQTT)

Voraussetzung: Die offizielle **MQTT-Integration** von Home Assistant ist eingerichtet (`dependencies: ["mqtt"]`). Die Integration nutzt `homeassistant.components.mqtt.async_subscribe` / `async_publish` – **keine** eigene MQTT-Verbindung.

Basis-Topic konfigurierbar (Standard `zigbee2mqtt`), mehrere Z2M-Instanzen = mehrere Config-Einträge.

| Topic | Inhalt | Verwendung |
|---|---|---|
| `<base>/bridge/state` | `{"state":"online"/"offline"}` (retained) | Z2M läuft? Bei `offline` Auswertung **pausieren**, keine Befunde erzeugen. |
| `<base>/bridge/info` | Version, Koordinator (Typ, Firmware-Revision), Netzwerk (Kanal, PAN-ID), Konfiguration (`advanced.last_seen`, `availability`, `health`) | Versions-/Firmware-Checks, prüfen ob `last_seen`/Availability aktiv sind. |
| `<base>/bridge/devices` | Liste aller Geräte: `ieee_address`, `friendly_name`, `type` (Coordinator/Router/EndDevice), `power_source`, `model_id`, `manufacturer`, `definition` (vendor, model, description, exposes), `supported`, `disabled`, `interview_completed`/`interview_state`, `network_address` (retained) | Stammdaten. **Schlüssel ist immer die IEEE-Adresse**, nie der Friendly Name. |
| `<base>/bridge/health` | Systemwerte und pro Gerät `leave_count`, `network_address_changes`, `messages`, `messages_per_sec` (Intervall laut Z2M-Config, Standard 10 min) | Instabilitäts- und Batterie-Erkennung. Werte können seit Start kumulativ oder pro Intervall sein (`reset_on_check`) – beide Fälle behandeln (Deltas selbst bilden). |
| `<base>/<friendly_name>` | Zustands-Payload: `linkquality`, `battery`, `voltage`, `last_seen` (wenn in Z2M aktiviert), sonstige Werte | LQI letzter Hop, Batterie, Spannung, Nachrichtenfrequenz. |
| `<base>/<friendly_name>/availability` | `{"state":"online"/"offline"}` (retained, wenn Availability aktiv) | Online/Offline, Flattern erkennen. |
| `<base>/bridge/event` | `device_joined`, `device_leave`, `device_announce`, `device_interview` | Ereignis-Historie, Rejoins zählen. |
| `<base>/bridge/request/networkmap` → `<base>/bridge/response/networkmap` | Rohe Netzwerkkarte: `nodes` (inkl. `failed: ["lqi"]`), `links` (source/target, `lqi`, `relationship`, `depth`, `deviceType`) | Topologie: Eltern-Router, Router-Backbone, Teilzeit-Router. |

**Wichtige Details:**
- **Nicht** `<base>/#` abonnieren (zu viel Last bei großen Netzen). Stattdessen: `bridge/#` plus gezielt die Topics der Geräte aus `bridge/devices`. Bei Änderungen der Geräteliste (Umbenennung!) neu abonnieren. Friendly Names können `/` enthalten – deshalb keine `+`-Wildcards für Geräte.
- **Netzwerkkarte:** Anforderung mit Payload `{"type":"raw","routes":false}`. Die Abfrage ist **langsam und belastet das Netz** (Router werden einzeln abgefragt). Daher: standardmäßig **einmal nachts** (konfigurierbare Uhrzeit, Standard 03:30), zusätzlich per Button/Aktion. Nie parallel, Timeout konfigurierbar (Standard 5 min), Ergebnis mit Zeitstempel speichern. Antwortformat (Z2M 2.x): `{"data":{"routes":false,"type":"raw","value":{"nodes":[…],"links":[…]}},"status":"ok"}` – siehe Fixture.
- **Bedeutung der Link-Felder** (Zigbee-Neighbor-Table, aus Sicht des abgefragten Geräts `target`): `relationship` des Nachbarn `source` zu `target`: `0` = Nachbar ist Eltern, `1` = Nachbar ist Kind, `2` = Geschwister, `3` = keine, `4` = früheres Kind. `deviceType`: `0` Koordinator, `1` Router, `2` Endgerät. `lqi: 0` bedeutet meist „nicht gemessen“, nicht „tot“. `depth: 255` = unbekannt. → Gegen Fixture verifizieren und in `ASSUMPTIONS.md` dokumentieren.
- **Eltern eines Endgeräts** = Link mit `relationship == 1` (Endgerät ist Kind von `target`); bei mehreren Einträgen der mit höchster LQI.
- **`failed: ["lqi"]`** an einem Router-Node = Router hat die Nachbartabelle nicht geliefert (ausgeschaltet oder überlastet).
- **Z2M-Voraussetzungen prüfen:** Ist `last_seen` deaktiviert oder Availability aus, erzeugt die Integration einen eigenen Reparatur-Hinweis mit Anleitung (und optional Fix-Flow, siehe 7.3). Ohne `last_seen` läuft die Integration eingeschränkt weiter (Fallback: Zeitpunkt der letzten empfangenen MQTT-Nachricht, selbst gemessen).

---

## 3. Verknüpfung mit Home Assistant

- **Geräte-Zuordnung:** Z2M-Geräte erscheinen in HA über MQTT-Discovery mit Identifier `zigbee2mqtt_<ieee>`. Über die Geräte-Registry wird jedem Zigbee-Gerät das HA-Gerät zugeordnet → daraus **Bereich (Area)** und **Etage (Floor)**. Fallback: Bereich der Entitäten des Geräts.
- **Geräte ohne Bereich** werden in der Raum-Auswertung als „Ohne Raum“ geführt und erzeugen einen Info-Hinweis („12 Zigbee-Geräte haben keinen Raum – Raumempfehlungen sind ungenau“).
- **Zustände:** Für Router, die Lampen sind, wird der HA-Zustand der Licht-Entität mitgelesen (Korrelation „Lampe unavailable ↔ Router offline“ → Beleg für Wandschalter-Betrieb).
- **Eigene Entitäten** der Integration hängen sich per `device_info` an die **bestehenden** Z2M-Geräte (gleicher Identifier), damit keine Doppelgeräte entstehen. Hub-Entitäten hängen an einem eigenen Gerät „Zigbee Health (<Instanzname>)“.

---

## 4. Datenhaltung

- Laufzeitmodell im Speicher (`models.py`, dataclasses): `ZigbeeDevice`, `LinkSnapshot`, `NetworkScan`, `HealthSample`, `Finding`, `RoomReport`, `NetworkReport`.
- **Persistenz** über `homeassistant.helpers.storage.Store` (versioniert, mit Migration):
  - letzte Netzwerkkarte + die letzten 7 Scans (kompakt: nur Eltern/Kinder, Router-Status, LQI),
  - pro Gerät rollierende Historie: LQI (Tageswerte, 30 Tage), Batterie/Spannung (Tageswerte, 180 Tage), Nachrichtenrate (Stundenwerte, 14 Tage, als Baseline), Availability-Wechsel (30 Tage), Deltas von `leave_count`/`network_address_changes`,
  - Zustand aller Befunde (erstmals gesehen, zuletzt gesehen, bestätigt, gelöst, ignoriert),
  - Ignorierliste (Geräte und einzelne Befund-Typen pro Gerät).
- Schreiben gedrosselt (`async_delay_save`, z. B. alle 5 min), nie bei jedem MQTT-Paket.
- Recorder schonen: Keine großen Attribute an Entitäten. Detaildaten nur über Diagnostics, Aktion `get_report` und optional eine Karte. Große Attribute in `_unrecorded_attributes`.

---

## 5. Auswertungs-Engine (`analyzer/`, reines Python)

Eingabe: ein `NetworkSnapshot` (Geräte, Bereiche, letzter Scan, Historie, Konfiguration). Ausgabe: `NetworkReport` mit Befunden, Scores, Raum-Berichten, Empfehlungen. **Deterministisch, ohne I/O, ohne Uhrzeit-Aufrufe** (Zeit wird als Parameter übergeben) → vollständig testbar.

Lauf: alle 5 Minuten (konfigurierbar) + entprellt nach relevanten Ereignissen (Availability-Wechsel, neuer Scan, neue Geräteliste). Pro Lauf < 200 ms bei 200 Geräten.

### 5.1 Geräteklassifikation
- **Koordinator / Router / Endgerät** aus `bridge/devices`.
- **Router-Unterart:** „dauerhaft aktiv“ (Steckdosen, Relais, USB-Router, fest bestromte Lampen) vs. **„Teilzeit-Router“** (siehe 5.2 F-05).
- **Gesprächiges Gerät** („chatty“): meldet regelmäßig ohne Ereignis (Temperatur/Feuchte, Leistungsmessung, Helligkeit) – erkannt an `exposes` bzw. an der gemessenen Nachrichtenfrequenz. Wichtig für Batterie- und Ausfall-Erkennung.
- **Stilles Gerät**: meldet nur bei Ereignis (Tür/Fenster, Taster) → längere Toleranzen.

### 5.2 Befunde (Findings)

Jeder Befund hat: `id` (stabil, z. B. `dead_device:0x00158d0000000002`), `type`, `severity` (`critical` / `warning` / `info`), betroffenes Gerät/Raum, Messwerte, Übersetzungs-Schlüssel, Handlungsempfehlung, optional Fix-Flow, `learn_more_url`.

**Hysterese:** Ein Befund wird erst gemeldet, wenn er in **N aufeinanderfolgenden Läufen** bzw. über eine **Mindestdauer** besteht (Standard 30 min, bei Scan-basierten Befunden in 2 von 3 Scans), und erst als gelöst markiert, wenn er **M Läufe** lang nicht mehr zutrifft. Kein Flattern im Reparaturen-Center.

| ID | Befund | Bedingung (Standardwerte konfigurierbar) | Schwere | Empfehlung |
|---|---|---|---|---|
| F-01 | **Totes Gerät** | nicht gesehen seit ≥ 30 Tagen (Router: offline + keine Antwort im Scan) | critical | In Z2M entfernen oder Batterie/Strom prüfen. Fix-Flow: entfernen. |
| F-02 | **Kürzlich verschwunden** | Endgerät: nicht gesehen seit > Toleranz (gesprächig 12 h, still 3 Tage, max. 30 Tage); Router: Availability offline > 1 h und nicht als Teilzeit-Router bekannt | warning | Batterie/Stromversorgung prüfen; betroffene Automationen nennen (Entitäten des Geräts in Automationen suchen). |
| F-03 | **Batterie vermutlich leer** | gesprächiges Gerät: Nachrichtenrate < 20 % der eigenen Baseline seit ≥ 6 h, oder Batterie ≤ Schwelle (Standard 15 %), oder Spannung unter typischem Grenzwert (CR2032 < 2,6 V, CR2450 < 2,6 V, AAA/AA 2× < 2,3 V) | warning | Batterie tauschen (Batterietyp nennen, falls bekannt). |
| F-04 | **Batterie-Prognose** | Lineare Regression der Tageswerte (Spannung bevorzugt, sonst %) über ≥ 14 Tage mit R² ≥ 0,5 → voraussichtlich leer in < 21 Tagen | info | Batterie in den nächsten Wochen tauschen. Zeigt Datum. |
| F-05 | **Teilzeit-Router** | Router, bei dem in ≥ 2 der letzten 3 Scans `failed:["lqi"]` stand **oder** der in 7 Tagen ≥ 3× offline→online gewechselt hat **oder** dessen Licht-Entität regelmäßig `unavailable` ist | warning (critical, wenn F-06 zutrifft) | Lampe dauerhaft bestromen (Wandschalter → Zigbee-Taster/Relais im Dauerbetrieb) oder immer-aktiven Router im selben Raum ergänzen. |
| F-06 | **Endgeräte an Teilzeit-Router** | Endgerät hat im letzten Scan einen Teilzeit-Router als Eltern | critical (pro Router zusammengefasst) | Wie F-05. Nennt alle betroffenen Kinder. |
| F-07 | **Schwache Verbindung** | Endgerät: LQI zum Eltern < 80 (Median der letzten 3 Messungen) | warning | Router näher an das Gerät / Router im Raum ergänzen, danach Gerät neu verbinden lassen. |
| F-08 | **Schwacher Router-Backbone** | Dauerhaft aktiver Router mit bester Verbindung zum Koordinator bzw. zu anderen Routern < 80 | warning | Router dazwischen setzen oder Koordinator zentraler platzieren (USB-Verlängerung, weg von USB 3 und Gehäusen). |
| F-09 | **Verschlechterung** | LQI-Trend eines Geräts über 14 Tage fällt um ≥ 30 % | info | Umgebung prüfen (neue Störquelle? umgestellte Möbel? neues WLAN?). |
| F-10 | **Instabiles Gerät** | `network_address_changes` oder `leave_count` steigt um ≥ 3 in 24 h, oder ≥ 3 `device_announce` in 24 h | warning | Eltern-Router instabil oder Gerät am Rand der Reichweite; Firmware prüfen. |
| F-11 | **Nachrichten-Flut** | Gerät sendet dauerhaft > X Nachrichten/min (Standard 6/min bei Nicht-Messgeräten) oder Gesamtnetz > Y Nachrichten/s | warning | Meldeintervall/Reporting reduzieren (typisch bei manchen Tuya-Geräten und Energiemessern). |
| F-12 | **Überlasteter Eltern-Router** | Router mit ≥ 8 aktiven Endgerät-Kindern (Koordinator: Warnschwelle abhängig vom Adapter-Typ, Standard 20) | info | Zweiten Router in der Nähe ergänzen. |
| F-13 | **Raum ohne dauerhaft aktiven Router** | Raum (Area) mit ≥ 2 aktiven Endgeräten und 0 dauerhaft aktiven Routern | warning | Zigbee-Steckdose/Router in diesem Raum. |
| F-14 | **Zu wenige Router im Netz** | Endgeräte je dauerhaft aktivem Router > 8, oder < 1 dauerhaft aktiver Router pro Etage | warning | Anzahl empfohlener Router nennen. |
| F-15 | **Voraussetzung fehlt** | Z2M `last_seen` deaktiviert / Availability deaktiviert / Health-Intervall aus | info | Anleitung + optionaler Fix-Flow (Option in Z2M setzen). |
| F-16 | **Alte Koordinator-Firmware / Z2M-Version** | Firmware-Revision älter als konfigurierte Mindestversion (Tabelle je Adaptertyp in `const.py`, pflegbar) | info | Update-Hinweis. |
| F-17 | **Interview unvollständig / nicht unterstützt** | `interview_completed == false` oder `supported == false` | info | Gerät neu anlernen bzw. externen Konverter prüfen. |
| F-18 | **Geräte ohne Raum** | ≥ 1 Zigbee-Gerät ohne Area | info | Räume zuweisen, damit Raumempfehlungen stimmen. |

Deaktivierte Geräte (`disabled: true`) und ignorierte Geräte erzeugen keine Befunde. Der Koordinator selbst nie „tot“.

### 5.3 Scores
- **Geräte-Score** (0–100): Start 100, Abzüge je aktivem Befund (critical 40, warning 20, info 5), Untergrenze 0.
- **Raum-Score**: Mittelwert der Geräte-Scores im Raum, minus Raum-Befunde (F-13: −20).
- **Netz-Score**: gewichteter Mittelwert (Router ×2), minus netzweite Befunde (F-14: −12, F-11 netzweit: −8), gedeckelt auf 5–100. Formel in `analyzer/score.py` zentral und dokumentiert, damit sie nachvollziehbar bleibt.
- **Stufen:** ≥ 80 „stabil“, 55–79 „mit Aussetzern zu rechnen“, < 55 „fragil“.

### 5.4 Raum-Bericht & Empfehlungen
Pro Area: Anzahl Endgeräte, dauerhaft aktive Router, Teilzeit-Router, schwächste LQI, offene Befunde, Empfehlung (Text). Zusätzlich eine **Top-3-Maßnahmenliste** fürs ganze Netz (nach Wirkung sortiert: tote Geräte entfernen → Batterien → Router in Raum X, Y → Backbone), identisch zur Logik des Web-Tools auf mastershort.de.

---

## 6. Entitäten

### 6.1 Hub-Gerät „Zigbee Health (<Instanz>)“
| Entität | Typ | Beschreibung |
|---|---|---|
| Netz-Gesundheit | sensor (%, `state_class: measurement`) | Netz-Score 0–100 |
| Status | sensor (enum: stable / degraded / fragile / paused) | Stufe; `paused`, wenn Z2M offline |
| Geräte gesamt / Router / Endgeräte | sensor | Zählwerte |
| Router dauerhaft aktiv / Teilzeit-Router | sensor | Zählwerte |
| Offline / Tot / Batterie kritisch / Schwache Verbindungen | sensor | Zählwerte |
| Offene Befunde | sensor | Anzahl (Attribut: Anzahl je Schwere, **keine** Liste) |
| Probleme | binary_sensor (`device_class: problem`) | an, wenn ≥ 1 critical oder ≥ 1 warning offen |
| Letzter Netzwerk-Scan | sensor (timestamp) | Zeitpunkt des letzten erfolgreichen Scans |
| Scan-Dauer | sensor (s, diagnostic) | Dauer des letzten Scans |
| Nachrichten/s gesamt | sensor (diagnostic) | aus `bridge/health` |
| Netzwerk jetzt scannen | button | fordert Netzwerkkarte an |
| Neu auswerten | button (diagnostic) | sofortiger Analyse-Lauf |

### 6.2 Pro Zigbee-Gerät (an das bestehende Z2M-Gerät angehängt)
| Entität | Standard | Beschreibung |
|---|---|---|
| Zigbee-Zustand | aktiviert | enum: ok / weak / battery / offline / dead / part_time_router / ignored |
| Gesundheit | deaktiviert | Geräte-Score |
| Eltern-Router | deaktiviert | Friendly Name des Eltern (Endgeräte) |
| LQI zum Eltern | deaktiviert | Zahl |
| Batterie leer voraussichtlich | deaktiviert | timestamp (nur Batteriegeräte mit ausreichend Daten) |
| Kinder | deaktiviert | Anzahl Kinder (nur Router) |

Option im Options-Flow: „Geräte-Entitäten anlegen“ (Standard an, nur „Zigbee-Zustand“ aktiviert), damit große Installationen nicht überladen werden.

### 6.3 Pro Raum (optional, Standard aus)
Sensor „Zigbee-Gesundheit <Raum>“ je Area, zugeordnet zur Area.

---

## 7. Home-Assistant-Funktionen

### 7.1 Reparaturen (Issue Registry)
- Jeder gemeldete Befund (nach Hysterese) mit Schwere `warning`/`critical` erzeugt ein Issue über `issue_registry.async_create_issue` mit `translation_key` = Befund-Typ, `translation_placeholders` (Gerät, Raum, Werte, Datum), `severity`, `learn_more_url`.
- `info`-Befunde standardmäßig **nicht** als Issue (nur Entitäten/Report); per Option einschaltbar.
- **Bündelung:** gleichartige Befunde (z. B. 7 tote Geräte) als **ein** Issue mit Liste, damit das Reparaturen-Center nicht überläuft (Schwellwert konfigurierbar, Standard ab 3 gleichen).
- Gelöste Befunde → Issue automatisch löschen.
- Texte konkret und kurz, z. B. DE:
  - *Titel:* „Zigbee: {name} seit {days} Tagen nicht erreichbar“
  - *Beschreibung:* „{name} ({room}) hat sich zuletzt am {date} gemeldet. Wenn das Gerät noch gebraucht wird: Batterie prüfen und einmal auslösen. Sonst in Zigbee2MQTT entfernen – tote Geräte verlangsamen die Netzwerkkarte.“

### 7.2 Fix-Flows (nur mit Bestätigung)
| Befund | Fix-Flow |
|---|---|
| F-01 Totes Gerät | Optionen: „Aus Zigbee2MQTT entfernen“ (publiziert `bridge/request/device/remove` mit `{"id": "<ieee>", "force": <bool>}`; Checkbox „erzwingen“ mit Erklärung) · „Ignorieren“ |
| Alle Befunde | „Dieses Gerät ignorieren“ / „Diesen Hinweis für dieses Gerät ignorieren“ |
| F-15 Voraussetzung | „In Zigbee2MQTT aktivieren“ (publiziert `bridge/request/options` mit der passenden Option, zeigt vorher genau, was geändert wird; Antwort `bridge/response/options` auswerten, Fehler anzeigen) |

Fix-Flows nur für Administratoren. Nach jeder Änderung: neuer Analyse-Lauf.

### 7.3 Aktionen (Services)
| Aktion | Parameter | Rückgabe |
|---|---|---|
| `zigbee_health.scan_network` | `config_entry_id` (optional) | – (Ergebnis kommt als Ereignis) |
| `zigbee_health.get_report` | `config_entry_id`, `format` (`summary`/`full`) | **SupportsResponse**: kompletter Bericht (Score, Top-3, Befunde, Räume, Router-Auslastung) als Dict – nutzbar in Skripten, für Benachrichtigungen, LLM/Assist |
| `zigbee_health.ignore` | `device` (Gerät oder IEEE), `finding_type` (optional), `until` (optional Datum) | – |
| `zigbee_health.unignore` | `device`, `finding_type` (optional) | – |
| `zigbee_health.reset_history` | `device` (optional) | – (z. B. nach Batteriewechsel Prognose zurücksetzen) |

`services.yaml` + Übersetzungen, Selektoren für Gerät/Config-Entry.

### 7.4 Ereignisse
- `zigbee_health_finding_raised` (type, severity, ieee, device_id, area_id, data)
- `zigbee_health_finding_resolved`
- `zigbee_health_scan_completed` (dauer, anzahl_geräte, erfolg)
- Zusätzlich **Device Triggers** am Hub-Gerät („Neuer kritischer Befund“, „Netz-Status geändert“) für den Automations-Editor.

### 7.5 Diagnostics
`diagnostics.py`: Konfiguration, letzte Netzwerkkarte, Geräteliste (Stammdaten), aktueller Report, Historie-Zusammenfassung. Redigierbar: optional Friendly Names durch Platzhalter ersetzen (für öffentliche Fehlerberichte).

### 7.6 Logbuch / Activity
Befund erstellt/gelöst als Logbuch-Einträge am betroffenen Gerät (`logbook` Plattform `async_describe_events`).

---

## 8. Konfiguration

### 8.1 Config Flow
1. Quelle wählen: **Zigbee2MQTT** (ZHA in späterer Phase ausgegraut mit Hinweis).
2. Basis-Topic (Standard `zigbee2mqtt`). Automatische Erkennung: auf `+/bridge/info` lauschen und gefundene Instanzen anbieten.
3. Prüfung: `bridge/state == online`, `bridge/devices` empfangen, Z2M-Version ≥ Mindestversion. Fehlermeldungen mit Klartext (MQTT nicht eingerichtet, Topic falsch, Z2M offline).
4. Name der Instanz.
5. Hinweis auf fehlende Voraussetzungen (last_seen/Availability) direkt im Flow, mit Link zur Anleitung.
6. Eindeutigkeit: `unique_id` = Z2M-Koordinator-IEEE (Doppel-Einrichtung verhindern). Reconfigure-Flow für Basis-Topic.

### 8.2 Options Flow (Menü mit Abschnitten)
- **Netzwerk-Scan:** automatisch an/aus, Uhrzeit, Timeout, nur scannen wenn niemand zu Hause (optional, Personen-Auswahl).
- **Schwellwerte:** tot ab (Tage), verschwunden ab (Stunden gesprächig / Tage still), schwache LQI, Batterie-Warnschwelle (%), Prognose-Horizont (Tage), Nachrichtenflut-Grenze, max. Kinder pro Router.
- **Meldungen:** welche Schweren ins Reparaturen-Center, Bündelungs-Schwelle, Hysterese-Dauer.
- **Entitäten:** Geräte-Entitäten anlegen ja/nein, Raum-Sensoren ja/nein.
- **Ignorierliste:** Geräte-Auswahl (Mehrfachauswahl).
- **Hilfe-Links:** Basis-URL für „Mehr erfahren“ (Standard: Anleitungsseiten auf mastershort.de, änderbar).

Alle Werte mit sinnvollen Standards, der Nutzer muss nichts einstellen.

---

## 9. Robustheit & Randfälle

- **Z2M offline / neu gestartet** (`bridge/state` offline, oder keine Nachrichten > 5 min): Status `paused`, keine neuen Befunde, bestehende bleiben. Nach Neustart von Z2M 15 min Schonfrist, bevor „verschwunden“-Befunde entstehen.
- **MQTT-Broker getrennt:** wie oben; nie „alle Geräte offline“ melden.
- **HA-Neustart:** Zustand aus Store laden, erste Auswertung erst nach vollständigem Empfang von `bridge/devices` + 10 min Datensammlung.
- **Umbenennung** in Z2M: Schlüssel ist IEEE; Abos und Namen aktualisieren, Historie behalten.
- **Gerät neu angelernt** (gleiche IEEE): Historie behalten, Befunde neu bewerten; `reset_history` anbieten.
- **Batteriewechsel erkannt** (Spannung/% springt deutlich nach oben): Prognose-Historie automatisch zurücksetzen.
- **Gruppen**, Green-Power-Geräte, Geräte ohne Definition, deaktivierte Geräte: korrekt überspringen oder gesondert behandeln.
- **Netzwerkkarte fehlgeschlagen/Timeout:** Befund-Typen, die auf Scans beruhen, behalten den letzten gültigen Stand; nach 3 fehlgeschlagenen Scans Info-Hinweis.
- **Große Netze (200+ Geräte):** Auswertung in Batches, Scan nachts, Entitäten-Updates nur bei Änderung.
- **Zeitzonen / last_seen-Formate:** ISO 8601, ISO lokal, epoch – alle parsen.
- **Mehrere Instanzen** unabhängig voneinander.

---

## 10. Projektstruktur

```
zigbee-health/
├─ custom_components/zigbee_health/
│  ├─ __init__.py            # Setup, Coordinator starten, Services registrieren
│  ├─ manifest.json          # domain, name, version, config_flow:true, dependencies:["mqtt"],
│  │                         # iot_class:"local_push", integration_type:"hub", codeowners, documentation, issue_tracker
│  ├─ const.py               # Konstanten, Standardwerte, Firmware-Mindeststände, Batterie-Grenzwerte
│  ├─ config_flow.py         # Config-, Options-, Reconfigure-Flow
│  ├─ coordinator.py         # DataUpdateCoordinator: sammelt Snapshot, ruft Analyzer, verteilt Ergebnis
│  ├─ source/
│  │  ├─ base.py             # Abstrakte Datenquelle (für spätere ZHA-Unterstützung)
│  │  └─ z2m.py              # MQTT-Abos, Parser, Netzwerk-Scan
│  ├─ analyzer/              # reines Python, keine HA-Imports
│  │  ├─ models.py
│  │  ├─ classify.py         # Router/Teilzeit/gesprächig
│  │  ├─ topology.py         # Eltern/Kinder aus Netzwerkkarte
│  │  ├─ findings.py         # Regeln F-01 … F-18
│  │  ├─ battery.py          # Grenzwerte, Regression, Wechsel-Erkennung
│  │  ├─ rooms.py
│  │  ├─ score.py
│  │  └─ report.py           # Top-3, Zusammenfassung
│  ├─ history.py             # Store, Rollups, Migration
│  ├─ issues.py              # Repairs erstellen/löschen, Bündelung
│  ├─ repairs.py             # Fix-Flows
│  ├─ entity.py              # Basisklasse
│  ├─ sensor.py / binary_sensor.py / button.py
│  ├─ services.py + services.yaml
│  ├─ device_trigger.py
│  ├─ logbook.py
│  ├─ diagnostics.py
│  ├─ icons.json
│  └─ translations/de.json, translations/en.json   (strings.json als Quelle)
├─ tests/
│  ├─ fixtures/              # networkmap_raw.json, bridge_devices.json, bridge_info.json, bridge_health.json (anonymisiert)
│  ├─ analyzer/              # Unit-Tests je Regel
│  └─ integration/           # pytest-homeassistant-custom-component: Config Flow, MQTT-Mock, Entitäten, Repairs
├─ docs/ ASSUMPTIONS.md, ARCHITECTURE.md, FINDINGS.md (Regeln erklärt)
├─ hacs.json
├─ README.md (DE + EN, Screenshots, Voraussetzungen, Installation, FAQ)
├─ .github/workflows/ validate.yml (hassfest + HACS-Action), tests.yml (pytest, ruff, mypy)
└─ pyproject.toml / requirements_test.txt
```

Keine externen Python-Abhängigkeiten nötig (`requirements: []`).

---

## 11. Qualität & Tests

- **Unit-Tests für jede Regel** (F-01 … F-18) mit positiven und negativen Fällen, Grenzwerten und Hysterese.
- **Fixture-Test mit echten Daten:** Die mitgelieferte Netzwerkkarte (47 Geräte) muss exakt diese bekannten Ergebnisse liefern (Referenz-Auswertung von Hand):
  - 7 tote Geräte (> 60 Tage): Bewegung Bad, Klima Gäste-WC, Klima Flur, Sensor Schlafzimmer, Licht Bad, Stimmungslicht Wohnzimmer, Stehlampe Wohnzimmer
  - kürzlich verschwunden: Haustür Flur, Steckdose Hauswirtschaft, Fenster Büro Vorne, Steckdose Flur
  - Teilzeit-Router (failed lqi): u. a. Deckenlicht Küche, Deckenlicht Esszimmer, Licht Bad RGB, Licht Ankleide, Deko Flur oben/Unten, Licht Schlafzimmer
  - dauerhaft aktive Router: Router Flur, Lampe Wohnzimmer, Licht Kinderzimmer, Steckdosenleiste Büro, Schranklicht Wohnzimmer, Steckdose Küche, Steckdose Wohnzimmer Fernseher
  - schwache Links: Klima Küche → Koordinator (70), Klima Büro → Koordinator (61)
  (Hinweis: Schwellwert „tot“ für diesen Test auf 60 Tage setzen; Zeitbezug = jüngster `lastSeen` in der Datei.)
- Integrationstests: Einrichtung, MQTT-Nachrichten simulieren, Entitätszustände, Issue-Erzeugung/Löschung, Fix-Flow-Publish, Services mit Response.
- CI: hassfest, HACS-Validierung, pytest (≥ 90 % Coverage für `analyzer/`), ruff, mypy.

---

## 12. Dashboard-Vorschlag (Phase 1 ohne eigene Karte)

Im README eine fertige Dashboard-YAML mit Standard-Karten:
- Gauge „Netz-Gesundheit“, Kacheln für die Zählwerte, Button „Jetzt scannen“,
- Liste „Probleme“ (Entitäten-Karte gefiltert auf Zigbee-Zustand ≠ ok),
- Markdown-Karte mit Top-3-Maßnahmen (Template über `zigbee_health.get_report` via Skript oder über ein kompaktes Attribut am Status-Sensor, max. 3 Einträge).

**Später (Phase 5):** eigene Lovelace-Karte `zigbee-health-card` (TypeScript/Lit) mit radialer Netzkarte (Koordinator Mitte, dauerhafte Router innen, Teilzeit-Router außen, Endgeräte an ihren Eltern, Linienfarbe nach LQI, tote Geräte in eigener Leiste), Raum-Tabelle und Befundliste – gleiche Darstellung wie das Web-Tool auf mastershort.de.

---

## 13. Texte & Tonalität

- Deutsch als Hauptsprache, klar und handlungsorientiert, ohne Fachjargon wo möglich („Router“ = „Gerät, das Funk weiterleitet“ beim ersten Auftreten erklären).
- Jede Meldung beantwortet: **Was ist los? Warum ist das ein Problem? Was soll ich tun?**
- Keine Schuldzuweisung, keine Panik; „critical“ nur, wenn Geräte tatsächlich nicht mehr funktionieren.
- „Mehr erfahren“-Links auf Anleitungsseiten (konfigurierbare Basis-URL).

---

## 14. Umsetzung in Phasen

**Phase 1 – Fundament (MVP)**
- Projektgerüst, manifest, hacs.json, CI.
- `analyzer/` mit Modellen, Topologie, Regeln F-01, F-02, F-05, F-06, F-07, F-13, F-18, Score – komplett getestet mit Fixture.
- Z2M-Quelle: bridge/state, bridge/info, bridge/devices, availability, Gerätezustände, Netzwerk-Scan (Button + nächtlich).
- Config Flow (inkl. Auto-Erkennung), Hub-Entitäten, binary_sensor Probleme.
- Repairs für warning/critical mit Bündelung und Hysterese.
- Diagnostics, Übersetzungen DE/EN, README.

**Phase 2 – Tiefe**
- `bridge/health` + Historie (Store), Regeln F-03, F-04, F-08, F-09, F-10, F-11, F-12, F-14.
- Geräte-Entitäten (6.2), Batterie-Prognose, Batteriewechsel-Erkennung.
- Ereignisse, Device Triggers, Logbuch.
- Services inkl. `get_report` mit Response.

**Phase 3 – Handeln**
- Fix-Flows (entfernen, ignorieren, Z2M-Option setzen), Ignorierliste, Options-Flow komplett.
- Regeln F-15, F-16, F-17, Raum-Sensoren, Top-3-Maßnahmen.

**Phase 4 – ZHA**
- Zweite Datenquelle über die ZHA-Websocket-/Gateway-Schnittstellen (Geräte, LQI/RSSI, Nachbartabellen, last_seen); gleicher Analyzer. Vorher recherchieren, welche Daten ZHA stabil bereitstellt, und in ASSUMPTIONS.md festhalten.

**Phase 5 – Karte & Veröffentlichung**
- Eigene Lovelace-Karte, Brand-Assets (Icon/Logo) für `home-assistant/brands`, HACS-Standard-Repository, Release-Workflow mit Changelog.

**Definition of Done je Phase:** Tests grün, hassfest/HACS grün, auf einer echten Installation (47 Geräte) 48 h ohne Fehler im Log, keine flatternden Repairs, README aktualisiert.

---

## 15. Offene Fragen an den Projekt-Owner (vor Phase 1 klären)

1. Repository-Name und GitHub-Account (öffentlich ab Phase 1 oder erst ab Phase 3?).
2. Lizenz (Vorschlag: MIT).
3. Anzeigename final: „Zigbee Health“ oder deutscher Name?
4. Standard-„Mehr erfahren“-URLs: welche Anleitungsseiten auf mastershort.de gibt es zum Launch (Zigbee-Netz stabil, Router, Batterien)?
5. Mindestversion Zigbee2MQTT (Vorschlag: 2.0).
6. Soll `info` standardmäßig im Reparaturen-Center erscheinen? (Vorschlag: nein.)

---

## 16. Mitgelieferte Testdaten

In `tests/fixtures/` ablegen (vorher Friendly Names bei Bedarf anonymisieren):
- `networkmap_raw.json` – Antwort auf `bridge/request/networkmap` (`type: raw`, `routes: false`) aus der eigenen Installation.
- `bridge_devices.json` – Inhalt von `zigbee2mqtt/bridge/devices`.
- `bridge_info.json` – Inhalt von `zigbee2mqtt/bridge/info`.
- `bridge_health.json` – zwei Mitschnitte von `zigbee2mqtt/bridge/health` im Abstand von ≥ 10 Minuten (für Delta-Berechnung).

Mitschnitt jeweils über Home Assistant → Einstellungen → Geräte & Dienste → MQTT → Konfigurieren → „Auf ein Thema hören“.
