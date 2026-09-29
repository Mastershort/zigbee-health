"""Generate strings.json and translations/{en,de}.json from one source.

Run after changing texts:  python scripts/gen_translations.py
Issue texts answer: what is wrong, why it matters, what to do (section 13).
"""

from __future__ import annotations

import copy
import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1] / "custom_components" / "zigbee_health"

# --- issues: (title, description) per language ------------------------------------------

ISSUES: dict[str, dict[str, tuple[str, str]]] = {
    "dead_device": {
        "de": (
            "Zigbee: {name} seit {days} Tagen nicht erreichbar",
            "{name} ({room}) hat sich zuletzt am {date} gemeldet.\n\nWenn das Gerät noch gebraucht wird: Batterie bzw. Stromversorgung prüfen und einmal auslösen. Sonst in Zigbee2MQTT entfernen – tote Geräte verlangsamen die Netzwerkkarte.",
        ),
        "en": (
            "Zigbee: {name} unreachable for {days} days",
            "{name} ({room}) last reported on {date}.\n\nIf you still need the device: check the battery or power supply and trigger it once. Otherwise remove it in Zigbee2MQTT – dead devices slow down the network map.",
        ),
    },
    "disappeared": {
        "de": (
            "Zigbee: {name} meldet sich nicht mehr",
            "{name} ({room}) hat sich zuletzt am {date} gemeldet – länger als für dieses Gerät üblich.\n\nBatterie bzw. Stromversorgung prüfen. Automationen, die dieses Gerät nutzen, funktionieren gerade möglicherweise nicht.",
        ),
        "en": (
            "Zigbee: {name} has gone quiet",
            "{name} ({room}) last reported on {date}, longer than usual for this device.\n\nCheck the battery or power supply. Automations that use this device may not work at the moment.",
        ),
    },
    "battery_low": {
        "de": (
            "Zigbee: Batterie von {name} vermutlich leer",
            "{name} ({room}): Messwert {value}, Batterietyp {battery_type}. Das Gerät meldet sich bald gar nicht mehr, wenn die Batterie nicht getauscht wird.\n\nBatterie tauschen. Die Prognose wird danach automatisch zurückgesetzt.",
        ),
        "en": (
            "Zigbee: battery of {name} probably empty",
            "{name} ({room}): reading {value}, battery type {battery_type}. The device will soon stop reporting if the battery is not replaced.\n\nReplace the battery. The forecast resets automatically afterwards.",
        ),
    },
    "battery_forecast": {
        "de": (
            "Zigbee: Batterie von {name} bald leer",
            "Nach dem bisherigen Verlauf ist die Batterie von {name} ({room}) voraussichtlich am {date} leer (Batterietyp {battery_type}).\n\nBatterie in den nächsten Wochen tauschen.",
        ),
        "en": (
            "Zigbee: battery of {name} empty soon",
            "Based on its history, the battery of {name} ({room}) will probably be empty on {date} (battery type {battery_type}).\n\nReplace the battery in the coming weeks.",
        ),
    },
    "part_time_router": {
        "de": (
            "Zigbee: {name} wird regelmäßig ausgeschaltet",
            "{name} ({room}) ist ein Router – ein Gerät mit Netzstrom, das Funk für andere Geräte weiterleitet. Es ist regelmäßig nicht erreichbar, vermutlich weil es am Wandschalter ausgeschaltet wird.\n\nJedes Mal verlieren die Geräte, die darüber verbunden sind, ihre Verbindung. Lampe dauerhaft mit Strom versorgen (Wandschalter z. B. durch einen Zigbee-Taster ersetzen) oder einen immer aktiven Router wie eine Zigbee-Steckdose im selben Raum ergänzen.",
        ),
        "en": (
            "Zigbee: {name} is regularly switched off",
            "{name} ({room}) is a router – a mains-powered device that forwards radio messages for others. It is regularly unreachable, probably because it is switched off at the wall.\n\nEach time, devices connected through it lose their connection. Keep it powered permanently (e.g. replace the wall switch with a Zigbee button) or add an always-on router such as a Zigbee plug in the same room.",
        ),
    },
    "children_on_part_time_router": {
        "de": (
            "Zigbee: {count} Geräte hängen an {name}",
            "{children} sind über {name} ({room}) verbunden. {name} wird regelmäßig ausgeschaltet – diese Geräte verlieren dann ihre Verbindung.\n\n{name} dauerhaft mit Strom versorgen oder einen immer aktiven Router (z. B. Zigbee-Steckdose) in der Nähe ergänzen.",
        ),
        "en": (
            "Zigbee: {count} devices depend on {name}",
            "{children} are connected through {name} ({room}). {name} is regularly switched off – these devices then lose their connection.\n\nKeep {name} powered permanently or add an always-on router (e.g. a Zigbee plug) nearby.",
        ),
    },
    "weak_link": {
        "de": (
            "Zigbee: schwache Verbindung von {name}",
            "{name} ({room}) erreicht {parent} nur mit einer Linkqualität von {lqi} (gut: ab 80). Nachrichten gehen dadurch leichter verloren.\n\nEinen Router näher an das Gerät stellen oder im Raum ergänzen. Danach das Gerät neu anlernen oder warten, bis es den besseren Weg wählt.",
        ),
        "en": (
            "Zigbee: weak connection of {name}",
            "{name} ({room}) reaches {parent} with a link quality of only {lqi} (good: 80 or more). Messages get lost more easily.\n\nPlace a router closer to the device or add one in the room. Afterwards, re-pair the device or wait until it picks the better route.",
        ),
    },
    "weak_backbone": {
        "de": (
            "Zigbee: {name} ist schlecht an das Netz angebunden",
            "Die beste Verbindung des Routers {name} ({room}) zum Koordinator oder einem anderen Router ({peer}) hat nur eine Linkqualität von {lqi}. Alles, was über {name} läuft, ist dadurch unzuverlässig.\n\nEinen weiteren Router dazwischen setzen oder den Koordinator zentraler platzieren (USB-Verlängerung, weg von USB-3-Ports und Metallgehäusen).",
        ),
        "en": (
            "Zigbee: {name} is poorly connected to the network",
            "The best link of router {name} ({room}) to the coordinator or another router ({peer}) has a link quality of only {lqi}. Everything routed through {name} is unreliable.\n\nAdd a router in between or place the coordinator more centrally (USB extension cable, away from USB 3 ports and metal cases).",
        ),
    },
    "degradation": {
        "de": (
            "Zigbee: Verbindung von {name} wird schlechter",
            "Die Linkqualität von {name} ({room}) ist in den letzten zwei Wochen von {before} auf {after} gefallen (−{percent} %).\n\nUmgebung prüfen: neue Störquelle, umgestellte Möbel, neues WLAN oder ein ausgeschalteter Router in der Nähe?",
        ),
        "en": (
            "Zigbee: connection of {name} getting worse",
            "The link quality of {name} ({room}) dropped from {before} to {after} over the last two weeks (−{percent} %).\n\nCheck the surroundings: a new source of interference, moved furniture, a new Wi-Fi network or a router nearby that is switched off?",
        ),
    },
    "unstable_device": {
        "de": (
            "Zigbee: {name} ist instabil",
            "{name} ({room}) hat sich in den letzten 24 Stunden mehrfach neu verbunden ({events} Adresswechsel/Abmeldungen, {announces} Neuanmeldungen).\n\nDas Eltern-Gerät ist instabil oder {name} liegt am Rand der Reichweite. Router in der Nähe prüfen und nach einem Firmware-Update für das Gerät schauen.",
        ),
        "en": (
            "Zigbee: {name} is unstable",
            "{name} ({room}) reconnected several times in the last 24 hours ({events} address changes/leaves, {announces} announcements).\n\nIts parent is unstable or {name} is at the edge of the range. Check the routers nearby and look for a firmware update for the device.",
        ),
    },
    "message_flood": {
        "de": (
            "Zigbee: {name} sendet sehr viele Nachrichten",
            "{name} ({room}) sendet dauerhaft etwa {per_minute} Nachrichten pro Minute. Das belastet das ganze Netz.\n\nMeldeintervall bzw. Reporting in Zigbee2MQTT reduzieren (typisch bei manchen Tuya-Geräten und Energiemessern).",
        ),
        "en": (
            "Zigbee: {name} sends very many messages",
            "{name} ({room}) permanently sends about {per_minute} messages per minute. This loads the whole network.\n\nReduce the reporting interval in Zigbee2MQTT (typical for some Tuya devices and energy meters).",
        ),
    },
    "network_message_flood": {
        "de": (
            "Zigbee: sehr viel Funkverkehr im Netz",
            "Im Zigbee-Netz werden gerade etwa {per_second} Nachrichten pro Sekunde gesendet. Dadurch gehen Befehle verloren oder kommen verspätet an.\n\nGeräte mit sehr häufigen Meldungen suchen (Sensor „Nachrichten/s“ und Hinweise zu einzelnen Geräten) und deren Reporting reduzieren.",
        ),
        "en": (
            "Zigbee: very high radio traffic",
            "The Zigbee network currently carries about {per_second} messages per second. Commands get lost or arrive late.\n\nLook for devices that report very often and reduce their reporting.",
        ),
    },
    "overloaded_parent": {
        "de": (
            "Zigbee: {name} versorgt viele Geräte",
            "{count} Batteriegeräte hängen direkt an {name} ({room}); empfohlen sind höchstens {limit}.\n\nEinen zweiten Router in der Nähe ergänzen, damit sich die Geräte verteilen.",
        ),
        "en": (
            "Zigbee: {name} serves many devices",
            "{count} battery devices are directly connected to {name} ({room}); at most {limit} are recommended.\n\nAdd a second router nearby so the devices spread out.",
        ),
    },
    "room_without_router": {
        "de": (
            "Zigbee: kein dauerhaft aktiver Router in {room}",
            "Im Raum {room} gibt es {count} Batteriegeräte, aber keinen Router, der dauerhaft eingeschaltet ist. Ihre Funksignale müssen weite Wege gehen.\n\nEine Zigbee-Steckdose oder ein anderer immer aktiver Router in diesem Raum macht die Verbindung deutlich stabiler.",
        ),
        "en": (
            "Zigbee: no always-on router in {room}",
            "{room} has {count} battery devices but no router that is permanently on. Their radio messages have to travel far.\n\nA Zigbee plug or another always-on router in this room makes the connection much more reliable.",
        ),
    },
    "too_few_routers": {
        "de": (
            "Zigbee: zu wenige Router im Netz",
            "{end_devices} Batteriegeräte teilen sich {routers} dauerhaft aktive Router. Empfohlen sind höchstens 8 Geräte pro Router und mindestens ein Router pro Etage.\n\nEtwa {recommended} weitere dauerhaft aktive Router (z. B. Zigbee-Steckdosen) ergänzen, verteilt auf die Räume mit den meisten Batteriegeräten.",
        ),
        "en": (
            "Zigbee: too few routers",
            "{end_devices} battery devices share {routers} always-on routers. At most 8 devices per router and at least one router per floor are recommended.\n\nAdd about {recommended} more always-on routers (e.g. Zigbee plugs), spread over the rooms with the most battery devices.",
        ),
    },
    "prerequisite_missing": {
        "de": (
            "Zigbee2MQTT: Option „{option}“ ist ausgeschaltet",
            "Zigbee Health kann das Netz genauer auswerten, wenn in Zigbee2MQTT die Option **{option}** eingeschaltet ist.\n\nÜber „Beheben“ kann Zigbee Health die Option nach Bestätigung für dich einschalten.",
        ),
        "en": (
            "Zigbee2MQTT: option \"{option}\" is disabled",
            "Zigbee Health analyses the network more precisely when the Zigbee2MQTT option **{option}** is enabled.\n\nUse \"Fix\" to let Zigbee Health enable it after your confirmation.",
        ),
    },
    "outdated_firmware": {
        "de": (
            "Zigbee: Koordinator-Firmware veraltet",
            "Der Koordinator ({adapter}) läuft mit Firmware {current}. Empfohlen ist mindestens {minimum}; neuere Versionen beheben bekannte Stabilitätsprobleme.\n\nFirmware nach der Anleitung des Adapter-Herstellers aktualisieren.",
        ),
        "en": (
            "Zigbee: coordinator firmware outdated",
            "The coordinator ({adapter}) runs firmware {current}. At least {minimum} is recommended; newer versions fix known stability issues.\n\nUpdate the firmware following the adapter manufacturer's guide.",
        ),
    },
    "interview_incomplete": {
        "de": (
            "Zigbee: {name} wurde nicht vollständig angelernt",
            "Das Anlernen von {name} ({room}) wurde nicht abgeschlossen. Einige Funktionen fehlen deshalb.\n\nGerät in Zigbee2MQTT neu anlernen („Interview“ erneut starten).",
        ),
        "en": (
            "Zigbee: {name} was not paired completely",
            "The pairing (interview) of {name} ({room}) did not finish. Some features are missing.\n\nRe-pair the device or restart the interview in Zigbee2MQTT.",
        ),
    },
    "unsupported_device": {
        "de": (
            "Zigbee: {name} wird nicht unterstützt",
            "Zigbee2MQTT kennt {name} ({room}) nicht. Werte und Befehle funktionieren deshalb nur eingeschränkt.\n\nNach einem externen Konverter suchen oder Zigbee2MQTT aktualisieren.",
        ),
        "en": (
            "Zigbee: {name} is not supported",
            "Zigbee2MQTT does not know {name} ({room}). Values and commands only work partially.\n\nLook for an external converter or update Zigbee2MQTT.",
        ),
    },
    "devices_without_area": {
        "de": (
            "Zigbee: {count} Geräte haben keinen Raum",
            "{count} Zigbee-Geräte sind in Home Assistant keinem Bereich zugewiesen. Die Raum-Empfehlungen sind dadurch ungenau.\n\nDen Geräten unter Einstellungen → Geräte einen Bereich zuweisen.",
        ),
        "en": (
            "Zigbee: {count} devices have no area",
            "{count} Zigbee devices have no area in Home Assistant, so room recommendations are inaccurate.\n\nAssign an area to these devices under Settings → Devices.",
        ),
    },
}

BUNDLES: dict[str, dict[str, tuple[str, str]]] = {
    "dead_device": {
        "de": ("Zigbee: {count} Geräte seit langem nicht erreichbar", "Diese Geräte haben sich seit langem nicht gemeldet:\n\n{devices}\n\nWenn sie noch gebraucht werden: Batterie bzw. Stromversorgung prüfen und einmal auslösen. Sonst in Zigbee2MQTT entfernen – tote Geräte verlangsamen die Netzwerkkarte. Über „Beheben“ kannst du sie gesammelt entfernen."),
        "en": ("Zigbee: {count} devices unreachable for a long time", "These devices have not reported for a long time:\n\n{devices}\n\nIf you still need them: check battery or power supply and trigger them once. Otherwise remove them in Zigbee2MQTT – dead devices slow down the network map. Use \"Fix\" to remove them in one go."),
    },
    "disappeared": {
        "de": ("Zigbee: {count} Geräte melden sich nicht mehr", "Diese Geräte sind länger still als üblich:\n\n{devices}\n\nBatterien bzw. Stromversorgung prüfen. Automationen, die diese Geräte nutzen, funktionieren gerade möglicherweise nicht."),
        "en": ("Zigbee: {count} devices have gone quiet", "These devices have been quiet for longer than usual:\n\n{devices}\n\nCheck batteries or power supply. Automations that use these devices may not work at the moment."),
    },
    "battery_low": {
        "de": ("Zigbee: {count} Batterien vermutlich leer", "Bei diesen Geräten ist die Batterie vermutlich leer:\n\n{devices}\n\nBatterien tauschen."),
        "en": ("Zigbee: {count} batteries probably empty", "The battery of these devices is probably empty:\n\n{devices}\n\nReplace the batteries."),
    },
    "battery_forecast": {
        "de": ("Zigbee: {count} Batterien bald leer", "Diese Batterien sind voraussichtlich bald leer:\n\n{devices}\n\nBatterien in den nächsten Wochen tauschen."),
        "en": ("Zigbee: {count} batteries empty soon", "These batteries will probably be empty soon:\n\n{devices}\n\nReplace them in the coming weeks."),
    },
    "part_time_router": {
        "de": ("Zigbee: {count} Router werden regelmäßig ausgeschaltet", "Router sind Geräte mit Netzstrom, die Funk für andere Geräte weiterleiten. Diese Router sind regelmäßig nicht erreichbar, vermutlich weil sie am Wandschalter ausgeschaltet werden:\n\n{devices}\n\nDauerhaft mit Strom versorgen oder in diesen Räumen immer aktive Router (z. B. Zigbee-Steckdosen) ergänzen."),
        "en": ("Zigbee: {count} routers are regularly switched off", "Routers are mains-powered devices that forward radio messages for others. These routers are regularly unreachable, probably because they are switched off at the wall:\n\n{devices}\n\nKeep them powered permanently or add always-on routers (e.g. Zigbee plugs) in these rooms."),
    },
    "children_on_part_time_router": {
        "de": ("Zigbee: Geräte hängen an {count} ausgeschalteten Routern", "Endgeräte sind über Router verbunden, die regelmäßig ausgeschaltet werden:\n\n{devices}\n\nDiese Router dauerhaft mit Strom versorgen oder immer aktive Router in der Nähe ergänzen."),
        "en": ("Zigbee: devices depend on {count} switched-off routers", "End devices are connected through routers that are regularly switched off:\n\n{devices}\n\nKeep these routers powered permanently or add always-on routers nearby."),
    },
    "weak_link": {
        "de": ("Zigbee: {count} schwache Verbindungen", "Diese Geräte haben eine schwache Verbindung (gut: Linkqualität ab 80):\n\n{devices}\n\nRouter näher an diese Geräte stellen oder in diesen Räumen ergänzen."),
        "en": ("Zigbee: {count} weak connections", "These devices have a weak connection (good: link quality 80 or more):\n\n{devices}\n\nPlace routers closer to these devices or add routers in these rooms."),
    },
    "weak_backbone": {
        "de": ("Zigbee: {count} Router schlecht angebunden", "Diese Router sind nur schwach mit dem Koordinator oder anderen Routern verbunden:\n\n{devices}\n\nRouter dazwischen setzen oder den Koordinator zentraler platzieren."),
        "en": ("Zigbee: {count} routers poorly connected", "These routers have only weak links to the coordinator or other routers:\n\n{devices}\n\nAdd routers in between or place the coordinator more centrally."),
    },
    "degradation": {
        "de": ("Zigbee: {count} Verbindungen werden schlechter", "Bei diesen Geräten ist die Linkqualität in zwei Wochen deutlich gefallen:\n\n{devices}\n\nUmgebung prüfen (Störquellen, Möbel, WLAN, ausgeschaltete Router)."),
        "en": ("Zigbee: {count} connections getting worse", "The link quality of these devices dropped clearly within two weeks:\n\n{devices}\n\nCheck the surroundings (interference, furniture, Wi-Fi, switched-off routers)."),
    },
    "unstable_device": {
        "de": ("Zigbee: {count} Geräte sind instabil", "Diese Geräte haben sich in 24 Stunden mehrfach neu verbunden:\n\n{devices}\n\nRouter in der Nähe prüfen und Firmware-Updates suchen."),
        "en": ("Zigbee: {count} devices are unstable", "These devices reconnected several times within 24 hours:\n\n{devices}\n\nCheck the routers nearby and look for firmware updates."),
    },
    "message_flood": {
        "de": ("Zigbee: {count} Geräte senden sehr viele Nachrichten", "Diese Geräte senden dauerhaft sehr viele Nachrichten:\n\n{devices}\n\nMeldeintervall bzw. Reporting in Zigbee2MQTT reduzieren."),
        "en": ("Zigbee: {count} devices send very many messages", "These devices permanently send very many messages:\n\n{devices}\n\nReduce their reporting in Zigbee2MQTT."),
    },
    "overloaded_parent": {
        "de": ("Zigbee: {count} Router versorgen viele Geräte", "An diesen Routern hängen sehr viele Batteriegeräte:\n\n{devices}\n\nZusätzliche Router in der Nähe ergänzen."),
        "en": ("Zigbee: {count} routers serve many devices", "Very many battery devices depend on these routers:\n\n{devices}\n\nAdd more routers nearby."),
    },
    "room_without_router": {
        "de": ("Zigbee: {count} Räume ohne dauerhaft aktiven Router", "In diesen Räumen gibt es mehrere Batteriegeräte, aber keinen dauerhaft eingeschalteten Router:\n\n{devices}\n\nEine Zigbee-Steckdose oder ein anderer immer aktiver Router je Raum macht die Verbindung deutlich stabiler."),
        "en": ("Zigbee: {count} rooms without an always-on router", "These rooms have several battery devices but no permanently powered router:\n\n{devices}\n\nA Zigbee plug or another always-on router in each room makes the connection much more reliable."),
    },
    "interview_incomplete": {
        "de": ("Zigbee: {count} Geräte nicht vollständig angelernt", "{devices}\n\nDiese Geräte in Zigbee2MQTT neu anlernen."),
        "en": ("Zigbee: {count} devices not paired completely", "{devices}\n\nRe-pair these devices in Zigbee2MQTT."),
    },
    "unsupported_device": {
        "de": ("Zigbee: {count} Geräte nicht unterstützt", "{devices}\n\nNach externen Konvertern suchen oder Zigbee2MQTT aktualisieren."),
        "en": ("Zigbee: {count} devices not supported", "{devices}\n\nLook for external converters or update Zigbee2MQTT."),
    },
}

NOT_FIXABLE = {
    "room_without_router", "too_few_routers", "network_message_flood",
    "outdated_firmware", "devices_without_area",
}  # fmt: skip

FIX_FINDING = {
    "de": {
        "step": {
            "init": {
                "title": "Zigbee Health",
                "description": "Was möchtest du tun?",
                "menu_options": {
                    "remove": "Aus Zigbee2MQTT entfernen",
                    "ignore_finding": "Diesen Hinweis für {name} ignorieren",
                    "ignore_device": "{name} komplett ignorieren",
                },
            },
            "remove": {
                "title": "{name} aus Zigbee2MQTT entfernen",
                "description": "Das Gerät wird aus dem Zigbee-Netz entfernt und muss bei Bedarf neu angelernt werden.\n\n„Erzwingen“ entfernt es auch dann aus der Datenbank, wenn es nicht antwortet – bei toten Geräten meist nötig. {error}",
                "data": {"force": "Erzwingen"},
            },
            "ignore_device": {
                "title": "{name} ignorieren",
                "description": "Für {name} werden keine Hinweise mehr erzeugt. Rückgängig über die Integrations-Optionen → Ignorierliste.",
            },
            "ignore_finding": {
                "title": "Hinweis ignorieren",
                "description": "Dieser Hinweis wird für {name} nicht mehr angezeigt. Andere Hinweise zu {name} bleiben aktiv.",
            },
        },
        "error": {"remove_failed": "Entfernen fehlgeschlagen."},
        "abort": {"not_available": "Die Integration ist gerade nicht geladen."},
    },
    "en": {
        "step": {
            "init": {
                "title": "Zigbee Health",
                "description": "What do you want to do?",
                "menu_options": {
                    "remove": "Remove from Zigbee2MQTT",
                    "ignore_finding": "Ignore this finding for {name}",
                    "ignore_device": "Ignore {name} completely",
                },
            },
            "remove": {
                "title": "Remove {name} from Zigbee2MQTT",
                "description": "The device is removed from the Zigbee network and has to be paired again if needed.\n\n\"Force\" also removes it from the database when it does not answer – usually needed for dead devices. {error}",
                "data": {"force": "Force"},
            },
            "ignore_device": {
                "title": "Ignore {name}",
                "description": "No more findings are created for {name}. Undo in the integration options → ignore list.",
            },
            "ignore_finding": {
                "title": "Ignore finding",
                "description": "This finding is no longer shown for {name}. Other findings for {name} stay active.",
            },
        },
        "error": {"remove_failed": "Removing failed."},
        "abort": {"not_available": "The integration is not loaded at the moment."},
    },
}

FIX_BUNDLE = {
    "de": {
        "step": {
            "init": {
                "title": "Geräte auswählen",
                "description": "Wähle die Geräte aus ({count} betroffen) und was mit ihnen passieren soll.",
                "data": {"devices": "Geräte", "action": "Aktion"},
            },
            "remove": {
                "title": "{count} Geräte aus Zigbee2MQTT entfernen",
                "description": "Die Geräte werden aus dem Zigbee-Netz entfernt und müssen bei Bedarf neu angelernt werden.\n\n„Erzwingen“ entfernt sie auch dann aus der Datenbank, wenn sie nicht antworten – bei toten Geräten meist nötig. {error}",
                "data": {"force": "Erzwingen"},
            },
        },
        "error": {"remove_failed": "Entfernen teilweise fehlgeschlagen."},
        "abort": {
            "nothing_selected": "Keine Geräte ausgewählt.",
            "not_available": "Die Integration ist gerade nicht geladen.",
        },
    },
    "en": {
        "step": {
            "init": {
                "title": "Select devices",
                "description": "Select the devices ({count} affected) and what should happen to them.",
                "data": {"devices": "Devices", "action": "Action"},
            },
            "remove": {
                "title": "Remove {count} devices from Zigbee2MQTT",
                "description": "The devices are removed from the Zigbee network and have to be paired again if needed.\n\n\"Force\" also removes them from the database when they do not answer – usually needed for dead devices. {error}",
                "data": {"force": "Force"},
            },
        },
        "error": {"remove_failed": "Removing partly failed."},
        "abort": {
            "nothing_selected": "No devices selected.",
            "not_available": "The integration is not loaded at the moment.",
        },
    },
}

FIX_PREREQUISITE = {
    "de": {
        "step": {
            "init": {
                "title": "Option „{option}“ in Zigbee2MQTT einschalten",
                "description": "Zigbee Health sendet diese Änderung an Zigbee2MQTT:\n\n{change}\n\nDie Einstellung wird in der Zigbee2MQTT-Konfiguration gespeichert. {error}",
            }
        },
        "error": {"option_failed": "Zigbee2MQTT hat die Änderung abgelehnt."},
        "abort": {
            "restart_required": "Gespeichert. Zigbee2MQTT muss neu gestartet werden, damit die Option wirkt.",
            "not_available": "Die Integration ist gerade nicht geladen.",
        },
    },
    "en": {
        "step": {
            "init": {
                "title": "Enable option \"{option}\" in Zigbee2MQTT",
                "description": "Zigbee Health sends this change to Zigbee2MQTT:\n\n{change}\n\nThe setting is saved in the Zigbee2MQTT configuration. {error}",
            }
        },
        "error": {"option_failed": "Zigbee2MQTT rejected the change."},
        "abort": {
            "restart_required": "Saved. Restart Zigbee2MQTT for the option to take effect.",
            "not_available": "The integration is not loaded at the moment.",
        },
    },
}

# --- config & options flow ----------------------------------------------------------------

CONFIG = {
    "de": {
        "step": {
            "user": {
                "title": "Zigbee2MQTT verbinden",
                "description": "Zigbee Health liest die Daten mit, die Zigbee2MQTT ohnehin über MQTT veröffentlicht, und wertet sie aus. An deinem Zigbee-Netz wird nichts verändert.",
                "data": {"base_topic": "MQTT-Basis-Topic", "name": "Name"},
                "data_description": {
                    "base_topic": "Basis-Topic deiner Zigbee2MQTT-Instanz (Standard: zigbee2mqtt).",
                    "name": "Erscheint im Gerätenamen, z. B. „Zigbee Health (Zigbee2MQTT)“.",
                },
            },
            "prerequisites": {
                "title": "Empfohlene Zigbee2MQTT-Einstellungen",
                "description": "Diese Zigbee2MQTT-Optionen sind ausgeschaltet: **{missing}**.\n\nOhne `last_seen` kennt Zigbee Health nur den Zeitpunkt der letzten empfangenen Nachricht. Ohne `availability` werden ausgeschaltete Router nur beim nächtlichen Netzwerk-Scan erkannt. Ohne `health` fehlen die Nachrichten-Zähler für Live-Verkehr und Nachrichten-Flut.\n\n**Am einfachsten:** fortfahren. Nach der ersten Auswertung (ca. 10 Minuten, oder sofort mit „Neu auswerten“) erscheint im Reparaturen-Center je Option ein Hinweis; „Absenden“ schaltet sie in Zigbee2MQTT ein.\n\n**Von Hand** im Zigbee2MQTT-Frontend unter Einstellungen:\n- `last_seen`: Reiter *Erweitert* → *Last seen* → **ISO_8601**\n- `availability`: Reiter *Verfügbarkeit* → **aktivieren**\n- `health`: Reiter *Health* → Intervall z. B. **10** Minuten",
            },
            "reconfigure": {
                "title": "MQTT-Basis-Topic ändern",
                "data": {"base_topic": "MQTT-Basis-Topic"},
            },
        },
        "error": {
            "no_response": "Unter diesem Basis-Topic antwortet keine Zigbee2MQTT-Instanz. Bitte Topic prüfen.",
            "z2m_offline": "Zigbee2MQTT ist offline. Bitte starten und erneut versuchen.",
            "version_too_old": "Zigbee2MQTT 2.0 oder neuer wird benötigt.",
        },
        "abort": {
            "already_configured": "Dieses Zigbee-Netz ist bereits eingerichtet.",
            "mqtt_not_connected": "Die MQTT-Integration ist nicht eingerichtet oder nicht verbunden.",
            "reconfigure_successful": "Das Basis-Topic wurde geändert.",
            "wrong_network": "Dieses Basis-Topic gehört zu einem anderen Zigbee-Netz.",
        },
    },
    "en": {
        "step": {
            "user": {
                "title": "Connect Zigbee2MQTT",
                "description": "Zigbee Health reads the data Zigbee2MQTT already publishes via MQTT and analyses it. Nothing in your Zigbee network is changed.",
                "data": {"base_topic": "MQTT base topic", "name": "Name"},
                "data_description": {
                    "base_topic": "Base topic of your Zigbee2MQTT instance (default: zigbee2mqtt).",
                    "name": "Shown in the device name, e.g. \"Zigbee Health (Zigbee2MQTT)\".",
                },
            },
            "prerequisites": {
                "title": "Recommended Zigbee2MQTT settings",
                "description": "The following Zigbee2MQTT options are disabled: **{missing}**.\n\nWithout `last_seen`, Zigbee Health can only use the time it last received a message. Without `availability`, offline routers are only detected by the nightly network scan. Without `health`, the message counters for live traffic and message floods are missing.\n\n**Easiest:** continue. After the first analysis (about 10 minutes, or right away with \"Analyse now\") the repairs dashboard shows one issue per option; \"Submit\" enables it in Zigbee2MQTT.\n\n**Manually** in the Zigbee2MQTT frontend under Settings:\n- `last_seen`: tab *Advanced* → *Last seen* → **ISO_8601**\n- `availability`: tab *Availability* → **enable**\n- `health`: tab *Health* → interval e.g. **10** minutes",
            },
            "reconfigure": {
                "title": "Change MQTT base topic",
                "data": {"base_topic": "MQTT base topic"},
            },
        },
        "error": {
            "no_response": "No Zigbee2MQTT instance answered on this base topic. Check the topic.",
            "z2m_offline": "Zigbee2MQTT is offline. Start it and try again.",
            "version_too_old": "Zigbee2MQTT 2.0 or newer is required.",
        },
        "abort": {
            "already_configured": "This Zigbee network is already set up.",
            "mqtt_not_connected": "The MQTT integration is not set up or not connected.",
            "reconfigure_successful": "The base topic was changed.",
            "wrong_network": "This base topic belongs to a different Zigbee network.",
        },
    },
}

OPTIONS = {
    "de": {
        "step": {
            "init": {
                "title": "Zigbee Health Optionen",
                "menu_options": {
                    "scan": "Netzwerk-Scan",
                    "thresholds": "Schwellwerte",
                    "notifications": "Meldungen",
                    "entities": "Entitäten",
                    "ignore": "Ignorierliste",
                    "help": "Hilfe-Links",
                },
            },
            "scan": {
                "title": "Netzwerk-Scan",
                "description": "Die Netzwerkkarte belastet das Netz einige Minuten. Deshalb standardmäßig einmal nachts.",
                "data": {
                    "scan_auto": "Automatisch scannen",
                    "scan_time": "Uhrzeit",
                    "scan_timeout": "Timeout (Minuten)",
                    "scan_only_away": "Nur scannen, wenn diese Personen nicht zu Hause sind",
                },
            },
            "thresholds": {
                "title": "Schwellwerte",
                "data": {
                    "dead_days": "Tot ab (Tage ohne Meldung)",
                    "disappeared_chatty_hours": "Verschwunden ab – Messgeräte (Stunden)",
                    "disappeared_silent_days": "Verschwunden ab – Tür-/Fenstersensoren, Taster (Tage)",
                    "weak_lqi": "Schwache Verbindung unter (LQI)",
                    "battery_percent": "Batterie-Warnschwelle (%)",
                    "forecast_days": "Batterie-Prognose: warnen wenn leer in (Tagen)",
                    "flood_per_minute": "Nachrichten-Flut ab (pro Minute)",
                    "max_children": "Max. Batteriegeräte pro Router",
                },
            },
            "notifications": {
                "title": "Meldungen",
                "data": {
                    "wall_switch_alert": "Sofort benachrichtigen, wenn ein Router mit abhängigen Geräten ausgeht",
                    "repairs_include_info": "Auch Info-Hinweise im Reparaturen-Center zeigen",
                    "bundle_threshold": "Gleichartige Hinweise bündeln ab",
                    "hysteresis_minutes": "Hinweis erst melden nach (Minuten)",
                },
            },
            "entities": {
                "title": "Entitäten",
                "data": {
                    "device_entities": "Sensoren an den Zigbee-Geräten anlegen",
                    "room_sensors": "Sensor „Zigbee-Gesundheit“ pro Raum anlegen",
                    "sidebar_panel": "„Zigbee Health“ in der Seitenleiste anzeigen",
                },
            },
            "ignore": {
                "title": "Ignorierliste",
                "description": "Für diese Geräte werden keine Hinweise erzeugt.",
                "data": {"ignored_devices": "Ignorierte Geräte"},
            },
            "help": {
                "title": "Hilfe-Links",
                "data": {"learn_more_url": "Basis-URL für „Mehr erfahren“ (leer = kein Link)"},
            },
        },
        "abort": {"not_loaded": "Die Integration muss geladen sein."},
    },
    "en": {
        "step": {
            "init": {
                "title": "Zigbee Health options",
                "menu_options": {
                    "scan": "Network scan",
                    "thresholds": "Thresholds",
                    "notifications": "Notifications",
                    "entities": "Entities",
                    "ignore": "Ignore list",
                    "help": "Help links",
                },
            },
            "scan": {
                "title": "Network scan",
                "description": "The network map loads the network for a few minutes, so by default it runs once at night.",
                "data": {
                    "scan_auto": "Scan automatically",
                    "scan_time": "Time",
                    "scan_timeout": "Timeout (minutes)",
                    "scan_only_away": "Only scan when these persons are not at home",
                },
            },
            "thresholds": {
                "title": "Thresholds",
                "data": {
                    "dead_days": "Dead after (days without message)",
                    "disappeared_chatty_hours": "Gone quiet after – measuring devices (hours)",
                    "disappeared_silent_days": "Gone quiet after – door/window sensors, buttons (days)",
                    "weak_lqi": "Weak connection below (LQI)",
                    "battery_percent": "Battery warning level (%)",
                    "forecast_days": "Battery forecast: warn when empty within (days)",
                    "flood_per_minute": "Message flood from (per minute)",
                    "max_children": "Max. battery devices per router",
                },
            },
            "notifications": {
                "title": "Notifications",
                "data": {
                    "wall_switch_alert": "Notify immediately when a router with dependent devices goes off",
                    "repairs_include_info": "Also show info findings in the repairs dashboard",
                    "bundle_threshold": "Bundle findings of the same kind from",
                    "hysteresis_minutes": "Report a finding after (minutes)",
                },
            },
            "entities": {
                "title": "Entities",
                "data": {
                    "device_entities": "Create sensors on the Zigbee devices",
                    "room_sensors": "Create a \"Zigbee health\" sensor per room",
                    "sidebar_panel": "Show \"Zigbee Health\" in the sidebar",
                },
            },
            "ignore": {
                "title": "Ignore list",
                "description": "No findings are created for these devices.",
                "data": {"ignored_devices": "Ignored devices"},
            },
            "help": {
                "title": "Help links",
                "data": {"learn_more_url": "Base URL for \"Learn more\" (empty = no link)"},
            },
        },
        "abort": {"not_loaded": "The integration has to be loaded."},
    },
}

# --- entities ---------------------------------------------------------------------------

DEVICE_STATES = {
    "de": {"ok": "OK", "weak": "Schwache Verbindung", "battery": "Batterie", "offline": "Offline",
           "dead": "Tot", "part_time_router": "Teilzeit-Router", "ignored": "Ignoriert"},
    "en": {"ok": "OK", "weak": "Weak connection", "battery": "Battery", "offline": "Offline",
           "dead": "Dead", "part_time_router": "Part-time router", "ignored": "Ignored"},
}  # fmt: skip


def entities(lang: str) -> dict[str, Any]:
    de = lang == "de"
    unit = "Geräte" if de else "devices"

    def count(name_de: str, name_en: str) -> dict[str, str]:
        return {"name": name_de if de else name_en, "unit_of_measurement": unit}

    return {
        "binary_sensor": {"problems": {"name": "Probleme" if de else "Problems"}},
        "button": {
            "scan_network": {"name": "Netzwerk jetzt scannen" if de else "Scan network now"},
            "analyze": {"name": "Neu auswerten" if de else "Analyse now"},
        },
        "sensor": {
            "network_health": {"name": "Netz-Gesundheit" if de else "Network health"},
            "status": {
                "name": "Status",
                "state": {
                    "stable": "Stabil" if de else "Stable",
                    "degraded": "Mit Aussetzern zu rechnen" if de else "Expect dropouts",
                    "fragile": "Fragil" if de else "Fragile",
                    "paused": "Pausiert" if de else "Paused",
                },
            },
            "devices": count("Geräte gesamt", "Devices"),
            "routers": count("Router", "Routers"),
            "end_devices": count("Endgeräte", "End devices"),
            "routers_always_on": count("Router dauerhaft aktiv", "Always-on routers"),
            "routers_part_time": count("Teilzeit-Router", "Part-time routers"),
            "offline": count("Offline", "Offline"),
            "dead": count("Tot", "Dead"),
            "battery_critical": count("Batterie kritisch", "Battery critical"),
            "weak_links": count("Schwache Verbindungen", "Weak links"),
            "open_findings": {
                "name": "Offene Befunde" if de else "Open findings",
                "state_attributes": {
                    "critical": {"name": "Kritisch" if de else "Critical"},
                    "warning": {"name": "Warnung" if de else "Warning"},
                    "info": {"name": "Info"},
                },
            },
            "messages_per_second": {
                "name": "Nachrichten/s gesamt" if de else "Messages/s total",
                "unit_of_measurement": "msg/s",
            },
            "last_scan": {"name": "Letzter Netzwerk-Scan" if de else "Last network scan"},
            "scan_duration": {"name": "Scan-Dauer" if de else "Scan duration"},
            "zigbee_state": {
                "name": "Zigbee-Zustand" if de else "Zigbee state",
                "state": DEVICE_STATES[lang],
            },
            "device_health": {"name": "Zigbee-Gesundheit" if de else "Zigbee health"},
            "parent": {"name": "Eltern-Router" if de else "Parent router"},
            "parent_lqi": {"name": "LQI zum Eltern-Router" if de else "LQI to parent"},
            "battery_empty": {
                "name": "Batterie leer voraussichtlich" if de else "Battery empty (forecast)"
            },
            "children": {"name": "Kinder" if de else "Children", "unit_of_measurement": unit},
            "room_health": {"name": "Zigbee-Gesundheit {room}" if de else "Zigbee health {room}"},
        },
    }


# --- services, selectors, triggers, exceptions ---------------------------------------------

FINDING_LABELS = {
    "de": {
        "dead_device": "Totes Gerät", "disappeared": "Kürzlich verschwunden",
        "battery_low": "Batterie leer", "battery_forecast": "Batterie-Prognose",
        "part_time_router": "Teilzeit-Router",
        "children_on_part_time_router": "Endgeräte an Teilzeit-Router",
        "weak_link": "Schwache Verbindung", "weak_backbone": "Schwacher Router-Backbone",
        "degradation": "Verschlechterung", "unstable_device": "Instabiles Gerät",
        "message_flood": "Nachrichten-Flut", "overloaded_parent": "Überlasteter Router",
        "interview_incomplete": "Anlernen unvollständig",
        "unsupported_device": "Nicht unterstützt",
    },
    "en": {
        "dead_device": "Dead device", "disappeared": "Gone quiet",
        "battery_low": "Battery empty", "battery_forecast": "Battery forecast",
        "part_time_router": "Part-time router",
        "children_on_part_time_router": "End devices on part-time router",
        "weak_link": "Weak connection", "weak_backbone": "Weak router backbone",
        "degradation": "Degradation", "unstable_device": "Unstable device",
        "message_flood": "Message flood", "overloaded_parent": "Overloaded router",
        "interview_incomplete": "Pairing incomplete", "unsupported_device": "Not supported",
    },
}  # fmt: skip


def services(lang: str) -> dict[str, Any]:
    de = lang == "de"
    entry = {
        "name": "Zigbee-Netz" if de else "Zigbee network",
        "description": "Nur diese Instanz (leer = alle)" if de else "Only this instance (empty = all)",
    }
    device = {
        "name": "Gerät" if de else "Device",
        "description": "Zigbee-Gerät (Home-Assistant-Gerät oder IEEE-Adresse)"
        if de
        else "Zigbee device (Home Assistant device or IEEE address)",
    }
    finding = {
        "name": "Hinweis-Typ" if de else "Finding type",
        "description": "Nur diesen Hinweis (leer = alle Hinweise des Geräts)"
        if de
        else "Only this finding (empty = all findings of the device)",
    }
    return {
        "scan_network": {
            "name": "Netzwerk scannen" if de else "Scan network",
            "description": "Fordert die Netzwerkkarte an. Das Ergebnis kommt als Ereignis."
            if de
            else "Requests the network map. The result arrives as an event.",
            "fields": {"config_entry_id": entry},
        },
        "get_report": {
            "name": "Bericht abrufen" if de else "Get report",
            "description": "Liefert Score, Top-3-Maßnahmen, Befunde und Räume als Antwort."
            if de
            else "Returns score, top-3 measures, findings and rooms as response.",
            "fields": {
                "config_entry_id": entry,
                "format": {
                    "name": "Umfang" if de else "Format",
                    "description": "Zusammenfassung oder vollständig" if de else "Summary or full",
                },
            },
        },
        "ignore": {
            "name": "Ignorieren" if de else "Ignore",
            "description": "Unterdrückt Hinweise für ein Gerät." if de else "Suppresses findings for a device.",
            "fields": {
                "device": device,
                "finding_type": finding,
                "until": {
                    "name": "Bis" if de else "Until",
                    "description": "Leer = dauerhaft" if de else "Empty = permanently",
                },
            },
        },
        "unignore": {
            "name": "Nicht mehr ignorieren" if de else "Stop ignoring",
            "description": "Hebt das Ignorieren wieder auf." if de else "Removes an ignore.",
            "fields": {"device": device, "finding_type": finding},
        },
        "reset_history": {
            "name": "Historie zurücksetzen" if de else "Reset history",
            "description": "Löscht die gesammelte Historie, z. B. nach einem Batteriewechsel."
            if de
            else "Deletes the collected history, e.g. after a battery change.",
            "fields": {
                "device": {
                    **device,
                    "description": "Leer = alle Geräte" if de else "Empty = all devices",
                }
            },
        },
    }


def selectors(lang: str) -> dict[str, Any]:
    de = lang == "de"
    return {
        "report_format": {
            "options": {
                "summary": "Zusammenfassung" if de else "Summary",
                "full": "Vollständig" if de else "Full",
            }
        },
        "finding_type": {"options": FINDING_LABELS[lang]},
        "bundle_action": {
            "options": {
                "remove": "Aus Zigbee2MQTT entfernen" if de else "Remove from Zigbee2MQTT",
                "ignore_finding": "Nur diesen Hinweis ignorieren" if de else "Ignore this finding only",
                "ignore_device": "Geräte komplett ignorieren" if de else "Ignore the devices completely",
            }
        },
    }


def _with_fix_flow(title: str, description: str, flow: dict[str, Any]) -> dict[str, Any]:
    """Fixable issues carry their text in the first fix flow step (hassfest rule)."""
    flow = copy.deepcopy(flow)
    init = flow["step"]["init"]
    init["description"] = description + "\n\n" + init["description"]
    return {"title": title, "fix_flow": flow}


def build(lang: str) -> dict[str, Any]:
    issues: dict[str, Any] = {}
    for key, texts in ISSUES.items():
        title, description = texts[lang]
        if key == "prerequisite_missing":
            issues[key] = _with_fix_flow(title, description, FIX_PREREQUISITE[lang])
        elif key not in NOT_FIXABLE:
            issues[key] = _with_fix_flow(title, description, FIX_FINDING[lang])
        else:
            issues[key] = {"title": title, "description": description}
    for key, texts in BUNDLES.items():
        title, description = texts[lang]
        if key not in NOT_FIXABLE:
            issues[f"{key}_bundle"] = _with_fix_flow(title, description, FIX_BUNDLE[lang])
        else:
            issues[f"{key}_bundle"] = {"title": title, "description": description}
    de = lang == "de"
    return {
        "config": CONFIG[lang],
        "options": OPTIONS[lang],
        "entity": entities(lang),
        "issues": issues,
        "services": services(lang),
        "selector": selectors(lang),
        "device_automation": {
            "trigger_type": {
                "critical_finding": "Neuer kritischer Befund" if de else "New critical finding",
                "new_finding": "Neuer Befund" if de else "New finding",
                "status_changed": "Netz-Status geändert" if de else "Network status changed",
                "router_offline": "Router mit abhängigen Geräten ausgefallen"
                if de
                else "Router with dependent devices went offline",
            }
        },
        "exceptions": {
            "no_config_entry": {
                "message": "Keine geladene Zigbee-Health-Instanz gefunden."
                if de
                else "No loaded Zigbee Health instance found."
            },
            "unknown_device": {
                "message": "Unbekanntes Zigbee-Gerät: {device}" if de else "Unknown Zigbee device: {device}"
            },
        },
    }


def main() -> None:
    en = build("en")
    de = build("de")
    for path, data in (
        (ROOT / "strings.json", en),
        (ROOT / "translations" / "en.json", en),
        (ROOT / "translations" / "de.json", de),
    ):
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("written:", len(en["issues"]), "issue texts per language")


if __name__ == "__main__":
    main()
