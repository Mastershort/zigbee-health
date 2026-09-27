"""Actions (section 7.3)."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

import voluptuous as vol
from homeassistant.config_entries import ConfigEntryState
from homeassistant.core import HomeAssistant, ServiceCall, ServiceResponse, SupportsResponse
from homeassistant.exceptions import ServiceValidationError
from homeassistant.helpers import config_validation as cv
from homeassistant.util import dt as dt_util

from .analyzer.models import FindingType
from .const import DOMAIN

if TYPE_CHECKING:
    from .coordinator import ZigbeeHealthCoordinator

ATTR_CONFIG_ENTRY_ID = "config_entry_id"
ATTR_FORMAT = "format"
ATTR_DEVICE = "device"
ATTR_FINDING_TYPE = "finding_type"
ATTR_UNTIL = "until"

SERVICE_SCAN_NETWORK = "scan_network"
SERVICE_GET_REPORT = "get_report"
SERVICE_IGNORE = "ignore"
SERVICE_UNIGNORE = "unignore"
SERVICE_RESET_HISTORY = "reset_history"

FINDING_TYPES = [t.value for t in FindingType]

SCAN_SCHEMA = vol.Schema({vol.Optional(ATTR_CONFIG_ENTRY_ID): cv.string})
REPORT_SCHEMA = vol.Schema(
    {
        vol.Optional(ATTR_CONFIG_ENTRY_ID): cv.string,
        vol.Optional(ATTR_FORMAT, default="summary"): vol.In(["summary", "full"]),
    }
)
IGNORE_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_DEVICE): cv.string,
        vol.Optional(ATTR_FINDING_TYPE): vol.In(FINDING_TYPES),
        vol.Optional(ATTR_UNTIL): cv.datetime,
    }
)
UNIGNORE_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_DEVICE): cv.string,
        vol.Optional(ATTR_FINDING_TYPE): vol.In(FINDING_TYPES),
    }
)
RESET_SCHEMA = vol.Schema({vol.Optional(ATTR_DEVICE): cv.string})


def _coordinators(hass: HomeAssistant, entry_id: str | None) -> list[ZigbeeHealthCoordinator]:
    entries = [
        entry
        for entry in hass.config_entries.async_entries(DOMAIN)
        if entry.state is ConfigEntryState.LOADED
        and (entry_id is None or entry.entry_id == entry_id)
    ]
    if not entries:
        raise ServiceValidationError(translation_domain=DOMAIN, translation_key="no_config_entry")
    return [entry.runtime_data for entry in entries]


def _resolve_device(hass: HomeAssistant, device: str) -> tuple[ZigbeeHealthCoordinator, str]:
    """Accept a HA device id or an IEEE address."""
    for coordinator in _coordinators(hass, None):
        if device in coordinator.source.devices:
            return coordinator, device
        ieee = coordinator.ieee_for_ha_device(device)
        if ieee is not None:
            return coordinator, ieee
    raise ServiceValidationError(
        translation_domain=DOMAIN,
        translation_key="unknown_device",
        translation_placeholders={"device": device},
    )


def async_register_services(hass: HomeAssistant) -> None:
    async def scan_network(call: ServiceCall) -> None:
        for coordinator in _coordinators(hass, call.data.get(ATTR_CONFIG_ENTRY_ID)):
            hass.async_create_background_task(coordinator.async_scan(), "zigbee_health_scan")

    async def get_report(call: ServiceCall) -> ServiceResponse:
        full = call.data[ATTR_FORMAT] == "full"
        coordinators = _coordinators(hass, call.data.get(ATTR_CONFIG_ENTRY_ID))
        reports: dict[str, Any] = {c.config_entry.title: c.report_dict(full) for c in coordinators}
        if len(reports) == 1:
            return dict(next(iter(reports.values())))
        return {"instances": reports}

    async def ignore(call: ServiceCall) -> None:
        coordinator, ieee = _resolve_device(hass, call.data[ATTR_DEVICE])
        finding_type = call.data.get(ATTR_FINDING_TYPE)
        until = call.data.get(ATTR_UNTIL)
        await coordinator.async_ignore(
            ieee,
            FindingType(finding_type) if finding_type else None,
            dt_util.as_utc(until) if until else None,
        )

    async def unignore(call: ServiceCall) -> None:
        coordinator, ieee = _resolve_device(hass, call.data[ATTR_DEVICE])
        finding_type = call.data.get(ATTR_FINDING_TYPE)
        await coordinator.async_unignore(ieee, FindingType(finding_type) if finding_type else None)

    async def reset_history(call: ServiceCall) -> None:
        device = call.data.get(ATTR_DEVICE)
        if device:
            coordinator, ieee = _resolve_device(hass, device)
            await coordinator.async_reset_history(ieee)
            return
        for coordinator in _coordinators(hass, None):
            await coordinator.async_reset_history()

    hass.services.async_register(DOMAIN, SERVICE_SCAN_NETWORK, scan_network, SCAN_SCHEMA)
    hass.services.async_register(
        DOMAIN,
        SERVICE_GET_REPORT,
        get_report,
        REPORT_SCHEMA,
        supports_response=SupportsResponse.ONLY,
    )
    hass.services.async_register(DOMAIN, SERVICE_IGNORE, ignore, IGNORE_SCHEMA)
    hass.services.async_register(DOMAIN, SERVICE_UNIGNORE, unignore, UNIGNORE_SCHEMA)
    hass.services.async_register(DOMAIN, SERVICE_RESET_HISTORY, reset_history, RESET_SCHEMA)
