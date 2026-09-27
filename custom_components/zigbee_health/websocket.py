"""Websocket API for the card: live traffic subscription."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.components.websocket_api.decorators import (
    async_response,
    require_admin,
    websocket_command,
)
from homeassistant.components.websocket_api.messages import event_message
from homeassistant.config_entries import ConfigEntryState
from homeassistant.core import HomeAssistant, callback

from .const import DOMAIN
from .floorplan import FloorplanError

if TYPE_CHECKING:
    from homeassistant.components.websocket_api.connection import ActiveConnection

    from .coordinator import ZigbeeHealthCoordinator


def _coordinator(hass: HomeAssistant, entry_id: str | None) -> ZigbeeHealthCoordinator | None:
    for entry in hass.config_entries.async_entries(DOMAIN):
        if entry.state is ConfigEntryState.LOADED and entry_id in (None, entry.entry_id):
            coordinator: ZigbeeHealthCoordinator = entry.runtime_data
            return coordinator
    return None


@websocket_command(
    {
        vol.Required("type"): "zigbee_health/traffic",
        vol.Optional("config_entry_id"): str,
    }
)
@callback
def ws_subscribe_traffic(
    hass: HomeAssistant, connection: ActiveConnection, msg: dict[str, Any]
) -> None:
    """Push {"counts": {ieee: n}, "alerts": [...]} about once per second."""
    coordinator = _coordinator(hass, msg.get("config_entry_id"))
    if coordinator is None:
        connection.send_error(msg["id"], "not_found", "No loaded Zigbee Health instance")
        return

    @callback
    def forward(payload: dict[str, Any]) -> None:
        connection.send_message(event_message(msg["id"], payload))

    connection.subscriptions[msg["id"]] = coordinator.traffic.subscribe(forward)
    connection.send_result(msg["id"])
    forward({"counts": {}, "alerts": coordinator.traffic.alerts})


@websocket_command(
    {vol.Required("type"): "zigbee_health/check", vol.Optional("config_entry_id"): str}
)
@async_response
async def ws_check(hass: HomeAssistant, connection: ActiveConnection, msg: dict[str, Any]) -> None:
    """Network check: fresh analysis now, full report back."""
    coordinator = _coordinator(hass, msg.get("config_entry_id"))
    if coordinator is None:
        connection.send_error(msg["id"], "not_found", "No loaded Zigbee Health instance")
        return
    connection.send_result(msg["id"], await coordinator.async_check())


@websocket_command(
    {vol.Required("type"): "zigbee_health/plan", vol.Optional("config_entry_id"): str}
)
@async_response
async def ws_plan(hass: HomeAssistant, connection: ActiveConnection, msg: dict[str, Any]) -> None:
    """Router planner: simulated effect of one more always-on router per area."""
    coordinator = _coordinator(hass, msg.get("config_entry_id"))
    if coordinator is None:
        connection.send_error(msg["id"], "not_found", "No loaded Zigbee Health instance")
        return
    connection.send_result(msg["id"], {"plans": await coordinator.async_plan()})


@websocket_command(
    {vol.Required("type"): "zigbee_health/floorplan/list", vol.Optional("config_entry_id"): str}
)
@async_response
async def ws_floorplan_list(
    hass: HomeAssistant, connection: ActiveConnection, msg: dict[str, Any]
) -> None:
    coordinator = _coordinator(hass, msg.get("config_entry_id"))
    if coordinator is None:
        connection.send_error(msg["id"], "not_found", "No loaded Zigbee Health instance")
        return
    connection.send_result(msg["id"], {"plans": await coordinator.floorplans.async_list()})


@require_admin
@websocket_command(
    {
        vol.Required("type"): "zigbee_health/floorplan/save",
        vol.Optional("config_entry_id"): str,
        vol.Required("plan_id"): vol.All(str, vol.Length(min=1, max=64)),
        vol.Optional("name"): vol.All(str, vol.Length(max=64)),
        vol.Optional("image"): str,
        vol.Optional("floor_id"): vol.All(str, vol.Length(max=64)),
        vol.Optional("level"): vol.Coerce(int),
        vol.Optional("positions"): {str: vol.All([vol.Coerce(float)], vol.Length(min=2, max=2))},
    }
)
@async_response
async def ws_floorplan_save(
    hass: HomeAssistant, connection: ActiveConnection, msg: dict[str, Any]
) -> None:
    coordinator = _coordinator(hass, msg.get("config_entry_id"))
    if coordinator is None:
        connection.send_error(msg["id"], "not_found", "No loaded Zigbee Health instance")
        return
    try:
        plan = await coordinator.floorplans.async_save(
            msg["plan_id"],
            name=msg.get("name"),
            image=msg.get("image"),
            positions=msg.get("positions"),
            floor_id=msg.get("floor_id"),
            level=msg.get("level"),
        )
    except FloorplanError as err:
        connection.send_error(msg["id"], "invalid_format", str(err))
        return
    connection.send_result(msg["id"], {"plan": plan})


@require_admin
@websocket_command(
    {
        vol.Required("type"): "zigbee_health/floorplan/delete",
        vol.Optional("config_entry_id"): str,
        vol.Required("plan_id"): str,
    }
)
@async_response
async def ws_floorplan_delete(
    hass: HomeAssistant, connection: ActiveConnection, msg: dict[str, Any]
) -> None:
    coordinator = _coordinator(hass, msg.get("config_entry_id"))
    if coordinator is None:
        connection.send_error(msg["id"], "not_found", "No loaded Zigbee Health instance")
        return
    await coordinator.floorplans.async_delete(msg["plan_id"])
    connection.send_result(msg["id"])


_POINT = vol.All([vol.Coerce(float)], vol.Length(min=2, max=2))
_ROOM = {
    vol.Required("id"): str,
    vol.Required("name"): vol.All(str, vol.Length(max=64)),
    vol.Optional("area_id"): vol.Any(None, str),
    vol.Required("points"): vol.All([_POINT], vol.Length(min=3, max=200)),
}
_BACKGROUND = {
    # The image itself is stored separately (zigbee_health/building/image).
    vol.Remove("image"): str,
    vol.Required("x"): vol.Coerce(float),
    vol.Required("y"): vol.Coerce(float),
    vol.Required("width"): vol.All(vol.Coerce(float), vol.Range(min=0.5)),
    vol.Required("opacity"): vol.All(vol.Coerce(float), vol.Range(min=0, max=1)),
}
_FLOOR = {
    vol.Required("id"): vol.All(str, vol.Length(min=1, max=64)),
    vol.Required("name"): vol.All(str, vol.Length(max=64)),
    vol.Optional("floor_id"): vol.Any(None, str),
    vol.Required("elevation"): vol.Coerce(float),
    vol.Required("height"): vol.All(vol.Coerce(float), vol.Range(min=1, max=10)),
    vol.Required("rooms"): vol.All([_ROOM], vol.Length(max=100)),
    vol.Optional("background"): vol.Any(None, _BACKGROUND),
}
BUILDING_SCHEMA = vol.Schema(
    {
        vol.Required("floors"): vol.All([_FLOOR], vol.Length(max=10)),
        vol.Required("positions"): {
            str: {
                vol.Required("floor"): str,
                vol.Required("x"): vol.Coerce(float),
                vol.Required("y"): vol.Coerce(float),
            }
        },
    }
)


@websocket_command(
    {vol.Required("type"): "zigbee_health/building/get", vol.Optional("config_entry_id"): str}
)
@async_response
async def ws_building_get(
    hass: HomeAssistant, connection: ActiveConnection, msg: dict[str, Any]
) -> None:
    coordinator = _coordinator(hass, msg.get("config_entry_id"))
    if coordinator is None:
        connection.send_error(msg["id"], "not_found", "No loaded Zigbee Health instance")
        return
    building, images = await coordinator.floorplans.async_get_building()
    connection.send_result(msg["id"], {"building": building, "images": images})


@require_admin
@websocket_command(
    {
        vol.Required("type"): "zigbee_health/building/save",
        vol.Optional("config_entry_id"): str,
        vol.Required("building"): BUILDING_SCHEMA,
    }
)
@async_response
async def ws_building_save(
    hass: HomeAssistant, connection: ActiveConnection, msg: dict[str, Any]
) -> None:
    coordinator = _coordinator(hass, msg.get("config_entry_id"))
    if coordinator is None:
        connection.send_error(msg["id"], "not_found", "No loaded Zigbee Health instance")
        return
    try:
        await coordinator.floorplans.async_save_building(msg["building"])
    except FloorplanError as err:
        connection.send_error(msg["id"], "invalid_format", str(err))
        return
    connection.send_result(msg["id"])


@require_admin
@websocket_command(
    {
        vol.Required("type"): "zigbee_health/building/image",
        vol.Optional("config_entry_id"): str,
        vol.Required("floor"): vol.All(str, vol.Length(min=1, max=64)),
        vol.Required("image"): vol.Any(None, str),
    }
)
@async_response
async def ws_building_image(
    hass: HomeAssistant, connection: ActiveConnection, msg: dict[str, Any]
) -> None:
    coordinator = _coordinator(hass, msg.get("config_entry_id"))
    if coordinator is None:
        connection.send_error(msg["id"], "not_found", "No loaded Zigbee Health instance")
        return
    try:
        await coordinator.floorplans.async_set_building_image(msg["floor"], msg["image"])
    except FloorplanError as err:
        connection.send_error(msg["id"], "invalid_format", str(err))
        return
    connection.send_result(msg["id"])


@require_admin
@websocket_command(
    {
        vol.Required("type"): "zigbee_health/device/update",
        vol.Optional("config_entry_id"): str,
        vol.Required("ieee"): str,
        vol.Required("action"): vol.In(["remove", "rename", "area", "ignore", "unignore"]),
        vol.Optional("force", default=False): bool,
        vol.Optional("name"): vol.All(str, vol.Strip, vol.Length(min=1, max=100)),
        vol.Optional("area_id"): vol.Any(None, str),
    }
)
@async_response
async def ws_device_update(
    hass: HomeAssistant, connection: ActiveConnection, msg: dict[str, Any]
) -> None:
    """Device panel in the card: remove, rename, area, ignore - one device at a time."""
    coordinator = _coordinator(hass, msg.get("config_entry_id"))
    if coordinator is None:
        connection.send_error(msg["id"], "not_found", "No loaded Zigbee Health instance")
        return
    ieee = msg["ieee"]
    if ieee not in coordinator.source.devices:
        connection.send_error(msg["id"], "not_found", "Unknown device")
        return
    action = msg["action"]
    error: str | None = None
    if action == "remove":
        error = await coordinator.async_remove_device(ieee, msg["force"])
    elif action == "rename":
        if "name" not in msg:
            connection.send_error(msg["id"], "invalid_format", "name is required")
            return
        error = await coordinator.async_rename_device(ieee, msg["name"])
    elif action == "area":
        error = await coordinator.async_set_device_area(ieee, msg.get("area_id"))
    elif action == "ignore":
        await coordinator.async_ignore(ieee)
    else:
        await coordinator.async_unignore(ieee)
    if error is not None:
        connection.send_error(msg["id"], "failed", error)
        return
    connection.send_result(msg["id"])


@callback
def async_register_websocket(hass: HomeAssistant) -> None:
    websocket_api.async_register_command(hass, ws_subscribe_traffic)
    websocket_api.async_register_command(hass, ws_check)
    websocket_api.async_register_command(hass, ws_plan)
    websocket_api.async_register_command(hass, ws_floorplan_list)
    websocket_api.async_register_command(hass, ws_floorplan_save)
    websocket_api.async_register_command(hass, ws_floorplan_delete)
    websocket_api.async_register_command(hass, ws_building_get)
    websocket_api.async_register_command(hass, ws_building_save)
    websocket_api.async_register_command(hass, ws_building_image)
    websocket_api.async_register_command(hass, ws_device_update)
