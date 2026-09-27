"""Device triggers on the hub device (section 7.4)."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

import voluptuous as vol
from homeassistant.components.device_automation import DEVICE_TRIGGER_BASE_SCHEMA
from homeassistant.components.homeassistant.triggers import event as event_trigger
from homeassistant.const import CONF_DEVICE_ID, CONF_DOMAIN, CONF_PLATFORM, CONF_TYPE
from homeassistant.helpers import device_registry as dr

from .const import DOMAIN, EVENT_FINDING_RAISED, EVENT_ROUTER_OFFLINE, EVENT_STATUS_CHANGED

if TYPE_CHECKING:
    from homeassistant.core import CALLBACK_TYPE, HomeAssistant
    from homeassistant.helpers.trigger import TriggerActionType, TriggerInfo
    from homeassistant.helpers.typing import ConfigType

TRIGGER_CRITICAL_FINDING = "critical_finding"
TRIGGER_NEW_FINDING = "new_finding"
TRIGGER_STATUS_CHANGED = "status_changed"
TRIGGER_ROUTER_OFFLINE = "router_offline"
TRIGGER_TYPES = {
    TRIGGER_CRITICAL_FINDING,
    TRIGGER_NEW_FINDING,
    TRIGGER_STATUS_CHANGED,
    TRIGGER_ROUTER_OFFLINE,
}

TRIGGER_SCHEMA = DEVICE_TRIGGER_BASE_SCHEMA.extend({vol.Required(CONF_TYPE): vol.In(TRIGGER_TYPES)})


def _entry_id(hass: HomeAssistant, device_id: str) -> str | None:
    device = dr.async_get(hass).async_get(device_id)
    if device is None:
        return None
    return next((ident for domain, ident in device.identifiers if domain == DOMAIN), None)


async def async_get_triggers(hass: HomeAssistant, device_id: str) -> list[dict[str, Any]]:
    if _entry_id(hass, device_id) is None:
        return []
    return [
        {CONF_PLATFORM: "device", CONF_DOMAIN: DOMAIN, CONF_DEVICE_ID: device_id, CONF_TYPE: kind}
        for kind in sorted(TRIGGER_TYPES)
    ]


async def async_attach_trigger(
    hass: HomeAssistant,
    config: ConfigType,
    action: TriggerActionType,
    trigger_info: TriggerInfo,
) -> CALLBACK_TYPE:
    entry_id = _entry_id(hass, config[CONF_DEVICE_ID])
    kind = config[CONF_TYPE]
    event_data: dict[str, Any] = {"config_entry_id": entry_id}
    if kind == TRIGGER_STATUS_CHANGED:
        event_type = EVENT_STATUS_CHANGED
    elif kind == TRIGGER_ROUTER_OFFLINE:
        event_type = EVENT_ROUTER_OFFLINE
    else:
        event_type = EVENT_FINDING_RAISED
        if kind == TRIGGER_CRITICAL_FINDING:
            event_data["severity"] = "critical"
    event_config = event_trigger.TRIGGER_SCHEMA(
        {"platform": "event", "event_type": event_type, "event_data": event_data}
    )
    return await event_trigger.async_attach_trigger(
        hass, event_config, action, trigger_info, platform_type="device"
    )
