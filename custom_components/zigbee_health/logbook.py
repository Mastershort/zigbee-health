"""Logbook entries for raised and resolved findings (section 7.6)."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from homeassistant.core import Event, HomeAssistant, callback

from .const import DOMAIN, EVENT_FINDING_RAISED, EVENT_FINDING_RESOLVED

if TYPE_CHECKING:
    from collections.abc import Callable

# Short labels; the logbook has no translation support for integration messages.
_LABELS: dict[str, dict[str, str]] = {
    "de": {
        "dead_device": "nicht mehr erreichbar",
        "disappeared": "meldet sich nicht mehr",
        "battery_low": "Batterie vermutlich leer",
        "battery_forecast": "Batterie bald leer",
        "part_time_router": "Router wird regelmäßig ausgeschaltet",
        "children_on_part_time_router": "Geräte hängen an ausgeschaltetem Router",
        "weak_link": "schwache Verbindung",
        "weak_backbone": "schwache Router-Verbindung",
        "degradation": "Verbindung wird schlechter",
        "unstable_device": "instabil",
        "message_flood": "sendet sehr viele Nachrichten",
        "overloaded_parent": "zu viele Kinder",
        "interview_incomplete": "Anlernen unvollständig",
        "unsupported_device": "nicht unterstützt",
        "raised": "Zigbee Health: {label}",
        "resolved": "Zigbee Health: behoben - {label}",
    },
    "en": {
        "dead_device": "unreachable",
        "disappeared": "has gone quiet",
        "battery_low": "battery probably empty",
        "battery_forecast": "battery empty soon",
        "part_time_router": "router regularly switched off",
        "children_on_part_time_router": "devices depend on a switched-off router",
        "weak_link": "weak connection",
        "weak_backbone": "weak router connection",
        "degradation": "connection getting worse",
        "unstable_device": "unstable",
        "message_flood": "sends very many messages",
        "overloaded_parent": "too many children",
        "interview_incomplete": "pairing incomplete",
        "unsupported_device": "not supported",
        "raised": "Zigbee Health: {label}",
        "resolved": "Zigbee Health: resolved - {label}",
    },
}


@callback
def async_describe_events(
    hass: HomeAssistant,
    async_describe_event: Callable[[str, str, Callable[[Event], dict[str, Any]]], None],
) -> None:
    labels = _LABELS["de" if hass.config.language.startswith("de") else "en"]

    def describe(kind: str) -> Callable[[Event], dict[str, Any]]:
        @callback
        def _describe(event: Event) -> dict[str, Any]:
            finding_type = event.data.get("type", "")
            label = labels.get(finding_type, finding_type)
            return {
                "name": event.data.get("data", {}).get("name", "Zigbee"),
                "message": labels[kind].format(label=label),
            }

        return _describe

    async_describe_event(DOMAIN, EVENT_FINDING_RAISED, describe("raised"))
    async_describe_event(DOMAIN, EVENT_FINDING_RESOLVED, describe("resolved"))
