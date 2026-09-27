# Annahmen & verifizierte Datenformate

Stand: 23.09.2026 · Grundlage: Fixtures in `tests/fixtures/` (Zigbee2MQTT 2.14.1, Koordinator ZStack3x0, Firmware 20260310, 49 Nodes).

Legende: **✔ verifiziert** = durch Fixture belegt · **⚠ Annahme** = nicht durch Daten belegt, im Code mit `ASSUMPTION` markiert.

## Netzwerkkarte (`bridge/response/networkmap`, `type: raw`)

| # | Aussage | Status |
|---|---|---|
| N1 | Antwortformat `{"data":{"routes":false,"type":"raw","value":{"nodes":[…],"links":[…]}},"status":"ok","transaction":…}` | ✔ |
| N2 | `lastSeen` der Nodes ist immer Epoch in **Millisekunden** (int) | ✔ |
| N3 | Nur Router und Koordinator haben ein `failed`-Feld (`[]` oder `["lqi"]`). **Endgeräte haben gar keinen `failed`-Key.** | ✔ |
| N4 | Ein Link wurde vom abgefragten Gerät `target` über seinen Nachbarn `source` gemeldet (Koordinator-Tabelle: `target` = Koordinator). | ✔ |
| N5 | `relationship == 1` tritt nur mit `deviceType == 2` (Endgerät) auf → `target` ist Eltern von `source`. Mehrere Eltern-Einträge: höchste LQI. | ✔ (14/14 Links) |
| N6 | `relationship == 0` (Nachbar ist Eltern): z. B. Koordinator → Schranklicht Wohnzimmer. Wird für Endgeräte nicht benötigt. | ✔ |
| N7 | `lqi` 0 **und 1** in Router-Tabellen bedeuten „nicht gemessen“, nicht „tot“ (z. B. Licht Kinderzimmer → Koordinator `1`, obwohl Licht Kinderzimmer selbst mit 91 antwortet). Für F-07 werden nur Werte > 0 genutzt. | ✔ / ⚠ für den Wert 1 |
| N8 | `depth` ist in Router-Einträgen unbrauchbar (`15` oder `255`). Wird nicht ausgewertet. | ✔ |
| N9 | `rxOnWhenIdle`: 0 = Endgerät, 1 = Router, 2 = unbekannt. Wird nicht ausgewertet. | ✔ |
| N10 | In Nachbartabellen können Geräte auftauchen, die Z2M nicht kennt (`0x001788010b25b9f6`, Philips-OUI, als Router). → `NetworkReport.unknown_neighbors`, (noch) kein Befund. | ✔ |
| N11 | Ein Endgerät kann mit falscher Rolle in einer Tabelle stehen (Tür Hauswirtschaft: `relationship 2`, `deviceType 1` in der Koordinator-Tabelle). Es wird dann kein Eltern-Gerät abgeleitet. | ✔ |
| N12 | Endgeräte, deren Eltern ein nicht antwortender (Teilzeit-)Router ist, erscheinen in **keinem** Link. Ihr Eltern-Gerät ist unbekannt → `NetworkReport.unknown_parent`. F-06 greift nur, wenn der Teilzeit-Router in einem der letzten 7 Scans geantwortet hat. | ✔ (5 Geräte) / ⚠ Lookback 7 Scans |

## `bridge/devices`

| # | Aussage | Status |
|---|---|---|
| D1 | Schlüssel `ieee_address`; `type` ∈ Coordinator/Router/EndDevice; Koordinator ohne `definition` und ohne `power_source`. | ✔ |
| D2 | Z2M 2.x liefert `interview_state` (`SUCCESSFUL`) **und** `interview_completed`. `interview_state` hat Vorrang. | ✔ |
| D3 | `power_source`: `"Battery"` bzw. `"Mains (single phase)"`. | ✔ |
| D4 | Andere Rollen (z. B. GreenPower) → `DeviceType.UNKNOWN`, werden nicht analysiert. | ⚠ |

## `bridge/info`

| # | Aussage | Status |
|---|---|---|
| I1 | `config.advanced.last_seen` = `"ISO_8601"`; deaktiviert = `"disable"`. | ✔ / ⚠ für `"disable"` |
| I2 | Z2M 2.x: `config.availability = {"enabled": bool, "active": …, "passive": …}`. In der Fixture **deaktiviert** → F-15 (Phase 3). Z2M 1.x: bool. | ✔ / ⚠ für 1.x |
| I3 | `config.health = {"interval": 10, "reset_on_check": false}`. | ✔ |
| I4 | Firmware-Revision steht in `coordinator.meta.revision` (int, Datumsformat `YYYYMMDD` bei Z-Stack). | ✔ |

## `bridge/health`

| # | Aussage | Status |
|---|---|---|
| H1 | Struktur `response_time` (Epoch ms), `os`, `process.uptime_sec`, `mqtt`, `devices{ieee: {messages, messages_per_sec, leave_count, network_address_changes}}`. | ✔ |
| H2 | Bei `reset_on_check: false` sind die Zähler kumulativ seit Z2M-Start (zwei Mitschnitte, 600 s Abstand, kein Zähler sinkt). | ✔ |
| H3 | Geräte, die seit dem Z2M-Start nichts gesendet haben, **fehlen** in `devices` (20 von 49 in der Fixture). Fehlen bedeutet „seit Start still“, nicht „unbekannt“. | ✔ |
| H4 | Nach Z2M-Neustart beginnen die Zähler bei 0 (`uptime_sec` springt zurück) → Delta verwerfen. | ⚠ (Phase 2) |

## Zustand & `last_seen`

| # | Aussage | Status |
|---|---|---|
| S1 | `last_seen` kann ISO 8601 (UTC, `Z`), ISO lokal (mit Offset), naiv lokal oder Epoch (ms/s) sein. Alle Formate werden geparst. | ⚠ (nur Epoch durch Fixture belegt) |
| S2 | Ohne `last_seen` im Payload gilt der Empfangszeitpunkt der MQTT-Nachricht. | Spezifikation |
| S3 | `last_seen` von Routern ist **kein** verlässliches Lebenszeichen: Router Flur (247 Tage) und Koordinator (436 Tage) antworten normal im Scan. Router gelten nur als tot, wenn sie zusätzlich im letzten Scan nicht antworten bzw. Availability offline ist. | ✔ |

## Regeln

| # | Aussage | Status |
|---|---|---|
| R1 | „Gesprächig“ (chatty) nach `exposes`: temperature, humidity, pressure, co2, voc, pm25, pm10, formaldehyd, illuminance(_lux), soil_moisture, power, energy, current. **Nicht**: `device_temperature` (Aqara-Kontakte), `voltage` allein. Ab Phase 2 überschreibt die gemessene Nachrichtenrate. | ⚠ |
| R2 | F-02 für Router ohne Availability: Router gilt als offline, wenn er im **letzten** Scan nicht geantwortet hat und `last_seen` > 1 h ist (und kein Teilzeit-Router). | ⚠ |
| R3 | F-01 hat Vorrang vor F-02 und F-05: ein totes Gerät erzeugt nur F-01. | ⚠ |
| R4 | F-05 zählt nur Scans, in denen der Router als Node vorkommt; Mindestens 2 Fehlschläge in den letzten 3 Scans. Mit nur einem Scan kann kein Teilzeit-Router erkannt werden. | Spezifikation |
| R5 | F-06 wird pro Router **zusätzlich** zu F-05 erzeugt (F-05 wird dann `critical`). Score-Abzug trifft nur den Router, nicht die Kinder. | ⚠ |
| R6 | F-13 zählt als „dauerhaft aktive Router“ nur Router, die weder Teilzeit-Router noch tot noch verschwunden sind. | ⚠ |
| R7 | F-18 zählt Router und Endgeräte (nicht Koordinator, nicht deaktiviert, nicht ignoriert). | ⚠ |
| R8 | Die Hysterese (30 min Mindestdauer, 3 Läufe bis gelöst) gilt nur für **Meldungen** (Reparaturen, später Ereignisse). Entitäten und Scores zeigen den aktuellen Stand sofort – sonst stünde nach der Einrichtung 30 min lang „100 % stabil“ da. Scan-basierte Regeln glätten zusätzlich selbst (F-05: 2 von 3 Scans, F-07: Median der letzten 3 Messungen). | Abweichung von §5.3 („je aktivem Befund“), mit Owner abgestimmt |
| R9 | Router, die im letzten Scan nicht geantwortet haben, aber (noch) kein Teilzeit-Router sind, gelten als **„unklar“** – weder dauerhaft aktiv noch Teilzeit. Sie zählen nicht für F-13. Ohne Availability sind sie nach > 1 h Stille „offline“ (F-02), bis ein weiterer Scan entscheidet. | ⚠ |
| R10 | Messgeräte (gesprächig) dürfen bei F-11 fünfmal so viele Nachrichten senden wie andere Geräte (§5.2 nennt die Grenze nur für Nicht-Messgeräte). Netzgrenze: 10 Nachrichten/s. | ⚠ |
| R11 | Batterietyp je Modell aus Tabelle `BATTERY_TYPES` (`battery.py`); unbekannte Modelle werden nur nach Prozent und Nachrichtenrate beurteilt. Spannung in mV. | ⚠ |
| R12 | Batteriewechsel = Sprung um ≥ 15 % bzw. ≥ 200 mV nach oben → Batterie-Historie wird geleert. | ⚠ |
| R13 | Gerät fehlt in `bridge/health` = seit Z2M-Start still; Health-Zähler sinken → neuer Ausgangswert (Neustart oder `reset_on_check`). | ✔ (H2/H3) |
| R14 | F-15 erscheint immer im Reparaturen-Center, obwohl `info` (einziger Info-Befund mit Fix-Flow). | Abweichung von §7.1 |
| R15 | Die Ignorierliste liegt im Store der Integration, nicht in den Optionen – sonst würde jedes Ignorieren die Integration neu laden. | ⚠ |
