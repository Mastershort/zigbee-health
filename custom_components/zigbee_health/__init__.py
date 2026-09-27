"""Zigbee Health: analyses the health of a Zigbee2MQTT network."""

from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING, Any

from homeassistant.components import mqtt
from homeassistant.const import Platform
from homeassistant.exceptions import ConfigEntryNotReady
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.storage import Store
from homeassistant.loader import async_get_integration

from .const import DOMAIN, STORAGE_VERSION
from .coordinator import ZigbeeHealthConfigEntry, ZigbeeHealthCoordinator
from .floorplan import FloorplanStore
from .issues import async_delete_all_issues
from .services import async_register_services
from .websocket import async_register_websocket

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant
    from homeassistant.helpers.typing import ConfigType

CARD_URL = f"/{DOMAIN}/zigbee-health-card.js"
PANEL_URL_PATH = "zigbee-health"
DATA_PANEL = f"{DOMAIN}_panel"
CARD_FILE = Path(__file__).parent / "frontend" / "zigbee-health-card.js"
# three.js scene, loaded by the card only when the 3D view is opened
SCENE_URL = f"/{DOMAIN}/zigbee-health-3d.js"
SCENE_FILE = Path(__file__).parent / "frontend" / "zigbee-health-3d.js"

PLATFORMS: list[Platform] = [Platform.BINARY_SENSOR, Platform.BUTTON, Platform.SENSOR]

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    async_register_services(hass)
    async_register_websocket(hass)
    await _async_register_card(hass)
    return True


async def _async_register_card(hass: HomeAssistant) -> None:
    """Serve the Lovelace card and load it in every frontend (no manual resource needed)."""
    if hass.http is None or "frontend" not in hass.config.components:
        return
    from homeassistant.components.frontend import add_extra_js_url  # noqa: PLC0415
    from homeassistant.components.http import StaticPathConfig  # noqa: PLC0415

    integration = await async_get_integration(hass, DOMAIN)
    await hass.http.async_register_static_paths(
        [
            StaticPathConfig(CARD_URL, str(CARD_FILE), cache_headers=False),
            StaticPathConfig(SCENE_URL, str(SCENE_FILE), cache_headers=False),
        ]
    )
    add_extra_js_url(hass, f"{CARD_URL}?v={integration.version}")


async def _async_register_panel(hass: HomeAssistant, entry: ZigbeeHealthConfigEntry) -> None:
    """Sidebar entry "Zigbee Health" with the full-page view (one for all instances)."""
    if hass.data.get(DATA_PANEL) or "frontend" not in hass.config.components:
        return
    from homeassistant.components import panel_custom  # noqa: PLC0415

    integration = await async_get_integration(hass, DOMAIN)
    await panel_custom.async_register_panel(
        hass,
        frontend_url_path=PANEL_URL_PATH,
        webcomponent_name="zigbee-health-panel",
        sidebar_title="Zigbee Health",
        sidebar_icon="mdi:zigbee",
        module_url=f"{CARD_URL}?v={integration.version}",
        config={"config_entry_id": entry.entry_id},
        require_admin=False,
    )
    hass.data[DATA_PANEL] = entry.entry_id


def _async_remove_panel(hass: HomeAssistant, entry: ZigbeeHealthConfigEntry) -> None:
    if hass.data.get(DATA_PANEL) != entry.entry_id:
        return
    from homeassistant.components import frontend  # noqa: PLC0415

    frontend.async_remove_panel(hass, PANEL_URL_PATH)
    hass.data.pop(DATA_PANEL, None)


async def async_setup_entry(hass: HomeAssistant, entry: ZigbeeHealthConfigEntry) -> bool:
    if not await mqtt.async_wait_for_mqtt_client(hass):
        raise ConfigEntryNotReady("MQTT is not available")
    coordinator = ZigbeeHealthCoordinator(hass, entry)
    await coordinator.async_setup()
    entry.runtime_data = coordinator
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    if coordinator.options.sidebar_panel:
        await _async_register_panel(hass, entry)
    entry.async_on_unload(entry.add_update_listener(_async_options_updated))
    return True


async def _async_options_updated(hass: HomeAssistant, entry: ZigbeeHealthConfigEntry) -> None:
    """Thresholds, scan schedule and entity options apply after a reload."""
    await hass.config_entries.async_reload(entry.entry_id)


async def async_unload_entry(hass: HomeAssistant, entry: ZigbeeHealthConfigEntry) -> bool:
    unloaded = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unloaded:
        _async_remove_panel(hass, entry)
        await entry.runtime_data.async_shutdown()
    return unloaded


async def async_remove_entry(hass: HomeAssistant, entry: ZigbeeHealthConfigEntry) -> None:
    async_delete_all_issues(hass, entry)
    # Remove everything the entry stored: history and ignores, floor plans, building.
    await Store[dict[str, Any]](hass, STORAGE_VERSION, f"{DOMAIN}.{entry.entry_id}").async_remove()
    await FloorplanStore(hass, entry.entry_id).async_remove()
