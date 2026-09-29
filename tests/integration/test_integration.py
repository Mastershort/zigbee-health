"""End-to-end: config flow, MQTT data → entities, repairs, services, fix flow."""

from __future__ import annotations

import asyncio
import json
from datetime import timedelta
from typing import Any
from unittest.mock import patch

import pytest
from freezegun.api import FrozenDateTimeFactory
from homeassistant import config_entries
from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import FlowResultType
from homeassistant.helpers import area_registry as ar
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers import issue_registry as ir
from homeassistant.setup import async_setup_component
from pytest_homeassistant_custom_component.common import (
    MockConfigEntry,
    async_capture_events,
    async_fire_mqtt_message,
    async_fire_time_changed,
)
from pytest_homeassistant_custom_component.typing import MqttMockHAClient, WebSocketGenerator

from custom_components.zigbee_health.const import DOMAIN
from custom_components.zigbee_health.repairs import async_create_fix_flow

from .conftest import BASE, COORDINATOR_IEEE, FROZEN_TIME, fixture_json, fixture_text


async def _feed_bridge(hass: HomeAssistant) -> None:
    async_fire_mqtt_message(hass, f"{BASE}/bridge/state", '{"state":"online"}')
    async_fire_mqtt_message(hass, f"{BASE}/bridge/info", fixture_text("bridge_info.json"))
    async_fire_mqtt_message(hass, f"{BASE}/bridge/devices", fixture_text("bridge_devices.json"))
    await hass.async_block_till_done()


async def _feed_scans(hass: HomeAssistant) -> None:
    for name in ("networkmap_raw.json", "networkmap_raw_2.json"):
        async_fire_mqtt_message(hass, f"{BASE}/bridge/response/networkmap", fixture_text(name))
        await hass.async_block_till_done()


def _state(hass: HomeAssistant, entity_id: str) -> str:
    state = hass.states.get(entity_id)
    assert state is not None, entity_id
    return state.state


# --- config flow -------------------------------------------------------------------------


async def test_config_flow_with_prerequisites_hint(
    hass: HomeAssistant, mqtt_mock: MqttMockHAClient
) -> None:
    with (
        patch("custom_components.zigbee_health.config_flow.DISCOVERY_WAIT", 0.01),
        patch("custom_components.zigbee_health.async_setup_entry", return_value=True),
    ):
        result = await hass.config_entries.flow.async_init(
            DOMAIN, context={"source": config_entries.SOURCE_USER}
        )
        assert result["type"] is FlowResultType.FORM
        assert result["step_id"] == "user"

        task = hass.async_create_task(
            hass.config_entries.flow.async_configure(
                result["flow_id"], {"base_topic": BASE, "name": "Test"}
            )
        )
        await asyncio.sleep(0.05)
        async_fire_mqtt_message(hass, f"{BASE}/bridge/state", '{"state":"online"}')
        async_fire_mqtt_message(hass, f"{BASE}/bridge/info", fixture_text("bridge_info.json"))
        result = await task
        # Availability is disabled in the fixture → hint step.
        assert result["type"] is FlowResultType.FORM
        assert result["step_id"] == "prerequisites"
        assert result["description_placeholders"] == {"missing": "availability"}

        result = await hass.config_entries.flow.async_configure(result["flow_id"], {})
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["title"] == "Test"
    assert result["data"] == {"base_topic": BASE}
    assert result["result"].unique_id == COORDINATOR_IEEE


async def test_config_flow_no_response(hass: HomeAssistant, mqtt_mock: MqttMockHAClient) -> None:
    with (
        patch("custom_components.zigbee_health.config_flow.DISCOVERY_WAIT", 0.01),
        patch("custom_components.zigbee_health.config_flow.VALIDATION_TIMEOUT", 0.05),
    ):
        result = await hass.config_entries.flow.async_init(
            DOMAIN, context={"source": config_entries.SOURCE_USER}
        )
        result = await hass.config_entries.flow.async_configure(
            result["flow_id"], {"base_topic": "wrong", "name": "Test"}
        )
    assert result["type"] is FlowResultType.FORM
    assert result["errors"] == {"base": "no_response"}


# --- full run with the real fixtures -----------------------------------------------------


async def _spin(times: int = 20) -> None:
    """Let pending callbacks run without relying on (frozen) timers."""
    for _ in range(times):
        await asyncio.sleep(0)


@pytest.fixture
async def loaded(
    hass: HomeAssistant, mqtt_mock: MqttMockHAClient, freezer: FrozenDateTimeFactory
) -> MockConfigEntry:
    freezer.move_to(FROZEN_TIME)
    mqtt_entry = hass.config_entries.async_entries("mqtt")[0]
    device_registry = dr.async_get(hass)
    # Two Z2M devices known to HA via MQTT discovery.
    for ieee in ("0x00158d0000000002", "0x00158d000272ed5f"):
        device_registry.async_get_or_create(
            config_entry_id=mqtt_entry.entry_id,
            identifiers={("mqtt", f"zigbee2mqtt_{ieee}")},
            name=ieee,
        )
    entry = MockConfigEntry(
        domain=DOMAIN,
        title="Z2M",
        unique_id=COORDINATOR_IEEE,
        data={"base_topic": BASE},
        options={"hysteresis_minutes": 0},
    )
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    await _feed_bridge(hass)
    await _feed_scans(hass)
    # Past the 15 min grace period after the Z2M start (section 9).
    freezer.tick(timedelta(minutes=16))
    await entry.runtime_data.async_analyze_now()
    await hass.async_block_till_done()
    return entry


async def test_grace_period_after_z2m_start(
    hass: HomeAssistant, mqtt_mock: MqttMockHAClient, freezer: FrozenDateTimeFactory
) -> None:
    freezer.move_to(FROZEN_TIME)
    entry = MockConfigEntry(domain=DOMAIN, title="Z2M", data={"base_topic": BASE})
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await _feed_bridge(hass)
    await _feed_scans(hass)
    await entry.runtime_data.async_analyze_now()
    report = entry.runtime_data.data
    assert report is not None
    assert report.counts["offline"] == 0  # no "gone quiet" right after a Z2M start
    assert report.counts["dead"] == 16
    assert await hass.config_entries.async_unload(entry.entry_id)


async def test_entities_by_unique_id(hass: HomeAssistant, loaded: MockConfigEntry) -> None:
    registry = er.async_get(hass)

    def value(key: str) -> str:
        entity_id = registry.async_get_entity_id("sensor", DOMAIN, f"{loaded.entry_id}_{key}")
        assert entity_id is not None, key
        return _state(hass, entity_id)

    assert value("dead") == "16"
    assert value("offline") == "2"
    assert value("routers_part_time") == "4"
    assert value("routers_always_on") == "7"
    assert value("weak_links") == "1"
    assert value("devices") == "48"
    assert value("status") in ("stable", "degraded", "fragile")
    assert int(value("network_health")) < 100

    problems = registry.async_get_entity_id("binary_sensor", DOMAIN, f"{loaded.entry_id}_problems")
    assert problems is not None
    assert _state(hass, problems) == "on"

    # dead_after is 30 days here: 13 from the reference plus Steckdose Wohnzimmer TV,
    # Steckdose Kinderzimmer TV, Deko Flur oben (40-43 days, not answering the network map).
    # Device entity attached to the existing Z2M device (Bewegung Bad is dead).
    state_entity = registry.async_get_entity_id(
        "sensor", DOMAIN, f"{loaded.entry_id}_0x00158d0000000002_zigbee_state"
    )
    assert state_entity is not None
    assert _state(hass, state_entity) == "dead"
    entry = registry.async_get(state_entity)
    assert entry is not None
    device = dr.async_get(hass).async_get(entry.device_id or "")
    assert device is not None
    assert ("mqtt", "zigbee2mqtt_0x00158d0000000002") in device.identifiers


async def test_repairs_bundled_and_prerequisite(
    hass: HomeAssistant, loaded: MockConfigEntry
) -> None:
    issues = {
        issue_id.removeprefix(f"{loaded.entry_id}_")
        for (domain, issue_id) in ir.async_get(hass).issues
        if domain == DOMAIN
    }
    assert "dead_device_bundle" in issues
    assert "part_time_router_bundle" in issues
    assert "weak_link:0x5c0272fffe2bc8c7" in issues or any(
        i.startswith("weak_link:") for i in issues
    )
    assert "prerequisite_missing:availability" in issues
    # Info findings (e.g. devices without area) are not shown by default.
    assert "devices_without_area" not in issues


async def test_get_report_service(hass: HomeAssistant, loaded: MockConfigEntry) -> None:
    response = await hass.services.async_call(
        DOMAIN, "get_report", {"format": "full"}, blocking=True, return_response=True
    )
    assert response is not None
    assert response["ready"] is True
    assert response["counts"]["dead"] == 16
    assert response["actions"][0]["key"] == "remove_dead"
    assert len(response["devices"]) == 48


async def test_ignore_service(hass: HomeAssistant, loaded: MockConfigEntry) -> None:
    await hass.services.async_call(
        DOMAIN, "ignore", {"device": "0x00158d0000000002"}, blocking=True
    )
    report = loaded.runtime_data.data
    assert report is not None
    assert report.devices["0x00158d0000000002"].state.value == "ignored"
    assert report.counts["dead"] == 15


async def test_prerequisite_fix_flow_publishes_option(
    hass: HomeAssistant, loaded: MockConfigEntry, mqtt_mock: MqttMockHAClient
) -> None:
    issue_id = f"{loaded.entry_id}_prerequisite_missing:availability"
    issue = ir.async_get(hass).async_get_issue(DOMAIN, issue_id)
    assert issue is not None and issue.is_fixable
    flow = await async_create_fix_flow(hass, issue_id, issue.data)
    flow.hass = hass
    result: Any = await flow.async_step_init()
    assert result["type"] is FlowResultType.FORM

    mqtt_mock.async_publish.reset_mock()
    # An empty form ({}) is the confirmation.
    task = hass.async_create_task(flow.async_step_init({}))
    await _spin()
    topic, payload = mqtt_mock.async_publish.call_args[0][:2]
    assert topic == f"{BASE}/bridge/request/options"
    sent = json.loads(payload)
    assert sent["options"] == {"availability": {"enabled": True}}
    async_fire_mqtt_message(
        hass,
        f"{BASE}/bridge/response/options",
        json.dumps(
            {"status": "ok", "data": {"restart_required": True}, "transaction": sent["transaction"]}
        ),
    )
    result = await task
    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "restart_required"


async def test_health_history(hass: HomeAssistant, loaded: MockConfigEntry) -> None:
    coordinator = loaded.runtime_data
    async_fire_mqtt_message(hass, f"{BASE}/bridge/health", fixture_text("bridge_health.json"))
    async_fire_mqtt_message(hass, f"{BASE}/bridge/health", fixture_text("bridge_health_2.json"))
    await hass.async_block_till_done()
    assert coordinator.history.messages_per_second == round(73 / 600, 2)
    # A device state message updates the history.
    async_fire_mqtt_message(
        hass, f"{BASE}/Klima Küche", json.dumps({"linkquality": 60, "battery": 80, "voltage": 2900})
    )
    await hass.async_block_till_done()
    th = next(i for i, d in coordinator.source.devices.items() if d.friendly_name == "Klima Küche")
    assert coordinator.history.devices[th].battery
    assert fixture_json("bridge_info.json")["version"] == "2.14.1"


async def test_unload(hass: HomeAssistant, loaded: MockConfigEntry) -> None:
    assert await hass.config_entries.async_unload(loaded.entry_id)


async def test_live_traffic_websocket(
    hass: HomeAssistant,
    loaded: MockConfigEntry,
    hass_ws_client: WebSocketGenerator,
    freezer: FrozenDateTimeFactory,
) -> None:
    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": "zigbee_health/traffic"})
    result = await client.receive_json()
    assert result["success"]
    initial = await client.receive_json()
    assert initial["event"] == {"counts": {}, "alerts": []}

    async_fire_mqtt_message(hass, f"{BASE}/Klima Küche", json.dumps({"linkquality": 60}))
    async_fire_mqtt_message(hass, f"{BASE}/Klima Küche", json.dumps({"linkquality": 61}))
    await hass.async_block_till_done()
    freezer.tick(timedelta(seconds=2))
    async_fire_time_changed(hass)
    event = await client.receive_json()
    th = next(
        i for i, d in loaded.runtime_data.source.devices.items() if d.friendly_name == "Klima Küche"
    )
    assert event["event"]["counts"] == {th: 2}


async def test_wall_switch_alert(hass: HomeAssistant, loaded: MockConfigEntry) -> None:
    coordinator = loaded.runtime_data
    offline_events = async_capture_events(hass, "zigbee_health_router_offline")
    online_events = async_capture_events(hass, "zigbee_health_router_online")
    topic = f"{BASE}/Licht Kinderzimmer/availability"
    # First (retained) state after start: no alert.
    async_fire_mqtt_message(hass, topic, '{"state":"online"}')
    await hass.async_block_till_done()
    assert not offline_events

    async_fire_mqtt_message(hass, topic, '{"state":"offline"}')
    await hass.async_block_till_done()
    [event] = offline_events
    assert event.data["name"] == "Licht Kinderzimmer"
    assert len(event.data["children"]) == 4
    assert [a["name"] for a in coordinator.traffic.alerts] == ["Licht Kinderzimmer"]

    async_fire_mqtt_message(hass, topic, '{"state":"online"}')
    await hass.async_block_till_done()
    assert len(online_events) == 1
    assert coordinator.traffic.alerts == []


async def test_check_and_plan_websocket(
    hass: HomeAssistant, loaded: MockConfigEntry, hass_ws_client: WebSocketGenerator
) -> None:
    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": "zigbee_health/check"})
    result = await client.receive_json()
    assert result["success"]
    assert result["result"]["ready"] is True
    assert result["result"]["counts"]["dead"] == 16
    assert result["result"]["scan_started"] is False  # the map is fresh

    # Give two kitchen devices an area: the planner works per area.
    area = ar.async_get(hass).async_create("Küche")
    for ieee in ("0x00158d0000000002", "0x00158d000272ed5f"):
        device = dr.async_get(hass).async_get_device(identifiers={("mqtt", f"zigbee2mqtt_{ieee}")})
        assert device is not None
        dr.async_get(hass).async_update_device(device.id, area_id=area.id)
    await loaded.runtime_data.async_analyze_now()
    await client.send_json_auto_id({"type": "zigbee_health/plan"})
    result = await client.receive_json()
    assert result["success"]
    plans = result["result"]["plans"]
    assert isinstance(plans, list)
    assert all("room_score_after" in plan for plan in plans)


async def test_floorplan_websocket(
    hass: HomeAssistant, loaded: MockConfigEntry, hass_ws_client: WebSocketGenerator
) -> None:
    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": "zigbee_health/floorplan/list"})
    assert (await client.receive_json())["result"] == {"plans": []}

    # A new plan needs an image; a non-image is refused.
    await client.send_json_auto_id(
        {"type": "zigbee_health/floorplan/save", "plan_id": "eg", "image": "http://x"}
    )
    assert (await client.receive_json())["error"]["code"] == "invalid_format"

    image = "data:image/png;base64,iVBORw0KGgo="
    await client.send_json_auto_id(
        {"type": "zigbee_health/floorplan/save", "plan_id": "eg", "name": "EG", "image": image}
    )
    assert (await client.receive_json())["result"]["plan"]["name"] == "EG"
    await client.send_json_auto_id(
        {
            "type": "zigbee_health/floorplan/save",
            "plan_id": "eg",
            "positions": {"0x00158d0000000002": [0.25, 1.4], "coordinator": [0.5, 0.5]},
        }
    )
    plan = (await client.receive_json())["result"]["plan"]
    assert plan["positions"]["0x00158d0000000002"] == [0.25, 1.0]  # clamped to the image
    assert plan["image"] == image

    # Link the plan to a Home Assistant floor (storey order for the building view).
    await client.send_json_auto_id(
        {"type": "zigbee_health/floorplan/save", "plan_id": "eg", "floor_id": "eg", "level": 0}
    )
    plan = (await client.receive_json())["result"]["plan"]
    assert (plan["floor_id"], plan["level"]) == ("eg", 0)
    await client.send_json_auto_id(
        {"type": "zigbee_health/floorplan/save", "plan_id": "eg", "floor_id": ""}
    )
    assert (await client.receive_json())["result"]["plan"]["floor_id"] is None

    await client.send_json_auto_id({"type": "zigbee_health/floorplan/list"})
    [listed] = (await client.receive_json())["result"]["plans"]
    assert listed["plan_id"] == "eg"

    await client.send_json_auto_id({"type": "zigbee_health/floorplan/delete", "plan_id": "eg"})
    assert (await client.receive_json())["success"]
    await client.send_json_auto_id({"type": "zigbee_health/floorplan/list"})
    assert (await client.receive_json())["result"] == {"plans": []}


async def test_floorplan_save_requires_admin(
    hass: HomeAssistant,
    loaded: MockConfigEntry,
    hass_ws_client: WebSocketGenerator,
    hass_read_only_access_token: str,
) -> None:
    client = await hass_ws_client(hass, hass_read_only_access_token)
    await client.send_json_auto_id(
        {
            "type": "zigbee_health/floorplan/save",
            "plan_id": "eg",
            "image": "data:image/png;base64,x",
        }
    )
    assert (await client.receive_json())["error"]["code"] == "unauthorized"


BUILDING = {
    "floors": [
        {
            "id": "f1",
            "name": "EG",
            "floor_id": None,
            "elevation": 0,
            "height": 2.6,
            "rooms": [
                {
                    "id": "r1",
                    "name": "Wohnzimmer",
                    "area_id": "wohnzimmer",
                    "points": [[0, 0], [5, 0], [5, 4], [0, 4]],
                }
            ],
            "background": None,
        }
    ],
    "positions": {"coordinator": {"floor": "f1", "x": 1, "y": 1}},
}


async def test_building_websocket(
    hass: HomeAssistant, loaded: MockConfigEntry, hass_ws_client: WebSocketGenerator
) -> None:
    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": "zigbee_health/building/get"})
    assert (await client.receive_json())["result"] == {"building": None, "images": {}}

    await client.send_json_auto_id({"type": "zigbee_health/building/save", "building": BUILDING})
    assert (await client.receive_json())["success"]
    await client.send_json_auto_id({"type": "zigbee_health/building/get"})
    building = (await client.receive_json())["result"]["building"]
    assert building["floors"][0]["rooms"][0]["points"][2] == [5.0, 4.0]
    assert building["positions"]["coordinator"]["floor"] == "f1"

    # A room needs at least three corners.
    bad = {
        **BUILDING,
        "floors": [
            {
                **BUILDING["floors"][0],
                "rooms": [{"id": "r", "name": "x", "points": [[0, 0], [1, 1]]}],
            }
        ],
    }
    await client.send_json_auto_id({"type": "zigbee_health/building/save", "building": bad})
    assert (await client.receive_json())["error"]["code"] == "invalid_format"


async def test_building_save_requires_admin(
    hass: HomeAssistant,
    loaded: MockConfigEntry,
    hass_ws_client: WebSocketGenerator,
    hass_read_only_access_token: str,
) -> None:
    client = await hass_ws_client(hass, hass_read_only_access_token)
    await client.send_json_auto_id({"type": "zigbee_health/building/save", "building": BUILDING})
    assert (await client.receive_json())["error"]["code"] == "unauthorized"


async def test_building_background_image(
    hass: HomeAssistant, loaded: MockConfigEntry, hass_ws_client: WebSocketGenerator
) -> None:
    client = await hass_ws_client(hass)
    image = "data:image/jpeg;base64,/9j/4AAQ"
    await client.send_json_auto_id(
        {"type": "zigbee_health/building/image", "floor": "f1", "image": "http://x"}
    )
    assert (await client.receive_json())["error"]["code"] == "invalid_format"
    await client.send_json_auto_id(
        {"type": "zigbee_health/building/image", "floor": "f1", "image": image}
    )
    assert (await client.receive_json())["success"]

    # Saving the building never carries the image; a stray one is dropped by the schema.
    floor = {
        **BUILDING["floors"][0],
        "background": {"image": "x", "x": 0, "y": 0, "width": 8, "opacity": 0.5},
    }
    await client.send_json_auto_id(
        {"type": "zigbee_health/building/save", "building": {**BUILDING, "floors": [floor]}}
    )
    assert (await client.receive_json())["success"]
    await client.send_json_auto_id({"type": "zigbee_health/building/get"})
    result = (await client.receive_json())["result"]
    assert result["images"] == {"f1": image}
    assert "image" not in result["building"]["floors"][0]["background"]

    # Deleting the floor removes its image with the next save.
    await client.send_json_auto_id(
        {"type": "zigbee_health/building/save", "building": {"floors": [], "positions": {}}}
    )
    assert (await client.receive_json())["success"]
    await client.send_json_auto_id({"type": "zigbee_health/building/get"})
    assert (await client.receive_json())["result"]["images"] == {}


async def test_building_migrates_from_0_9_0(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    from custom_components.zigbee_health.floorplan import FloorplanStore  # noqa: PLC0415

    legacy = json.loads(json.dumps(BUILDING))
    legacy["floors"][0]["background"] = {
        "image": "data:image/png;base64,AAAA",
        "x": 0,
        "y": 0,
        "width": 8,
        "opacity": 0.5,
    }
    hass_storage[f"{DOMAIN}.legacy.floorplans"] = {
        "version": 1,
        "key": f"{DOMAIN}.legacy.floorplans",
        "data": {"plans": {}, "building": legacy},
    }
    store = FloorplanStore(hass, "legacy")
    building, images = await store.async_get_building()
    assert images == {"f1": "data:image/png;base64,AAAA"}
    assert building is not None
    assert "image" not in building["floors"][0]["background"]
    await hass.async_block_till_done()
    assert "building" not in hass_storage[f"{DOMAIN}.legacy.floorplans"]["data"]


async def test_device_update_websocket(
    hass: HomeAssistant, loaded: MockConfigEntry, hass_ws_client: WebSocketGenerator
) -> None:
    client = await hass_ws_client(hass)
    coordinator = loaded.runtime_data
    ieee = "0x00158d0000000002"
    assert ieee in coordinator.source.devices

    await client.send_json_auto_id(
        {"type": "zigbee_health/device/update", "ieee": "0xdead", "action": "ignore"}
    )
    assert (await client.receive_json())["error"]["code"] == "not_found"

    await client.send_json_auto_id(
        {"type": "zigbee_health/device/update", "ieee": ieee, "action": "ignore"}
    )
    assert (await client.receive_json())["success"]
    assert ieee in coordinator.ignored_devices
    await client.send_json_auto_id(
        {"type": "zigbee_health/device/update", "ieee": ieee, "action": "unignore"}
    )
    assert (await client.receive_json())["success"]
    assert ieee not in coordinator.ignored_devices

    await client.send_json_auto_id(
        {"type": "zigbee_health/device/update", "ieee": ieee, "action": "rename"}
    )
    assert (await client.receive_json())["error"]["code"] == "invalid_format"

    await client.send_json_auto_id(
        {"type": "zigbee_health/device/update", "ieee": ieee, "action": "area", "area_id": "nope"}
    )
    assert (await client.receive_json())["error"]["code"] == "failed"


async def test_device_update_requires_admin(
    hass: HomeAssistant,
    loaded: MockConfigEntry,
    hass_ws_client: WebSocketGenerator,
    hass_read_only_access_token: str,
) -> None:
    client = await hass_ws_client(hass, hass_read_only_access_token)
    await client.send_json_auto_id(
        {
            "type": "zigbee_health/device/update",
            "ieee": "0x00158d0000000002",
            "action": "remove",
        }
    )
    assert (await client.receive_json())["error"]["code"] == "unauthorized"


async def test_remove_entry_deletes_stored_data(
    hass: HomeAssistant, loaded: MockConfigEntry, hass_storage: dict[str, Any]
) -> None:
    coordinator = loaded.runtime_data
    await coordinator.floorplans.async_save_building({"floors": [], "positions": {}})
    await coordinator.async_ignore("0x00158d0000000002")
    await hass.async_block_till_done()
    await hass.config_entries.async_remove(loaded.entry_id)
    await hass.async_block_till_done()
    assert not [key for key in hass_storage if key.startswith(f"{DOMAIN}.{loaded.entry_id}")]


async def _repairs_manager(hass: HomeAssistant) -> Any:
    """The real repairs flow manager, as used by the repairs dashboard."""
    assert await async_setup_component(hass, "repairs", {})
    return hass.data["repairs"]["flow_manager"]


async def test_bundle_fix_flow_through_repairs_dashboard(
    hass: HomeAssistant, loaded: MockConfigEntry
) -> None:
    """Opening the dead-device bundle shows the form (was a 500 error)."""
    manager = await _repairs_manager(hass)
    issue_id = f"{loaded.entry_id}_dead_device_bundle"
    result: Any = await manager.async_init(DOMAIN, data={"issue_id": issue_id})
    assert result["type"] is FlowResultType.FORM
    assert result["step_id"] == "init"

    result = await manager.async_configure(
        result["flow_id"], {"devices": ["0x00158d0000000002"], "action": "ignore_device"}
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert "0x00158d0000000002" in loaded.runtime_data.ignored_devices


async def test_prerequisite_fix_flow_asks_before_changing(
    hass: HomeAssistant, loaded: MockConfigEntry, mqtt_mock: MqttMockHAClient
) -> None:
    """Opening the dialog must not change Zigbee2MQTT; only the confirmation does."""
    manager = await _repairs_manager(hass)
    mqtt_mock.async_publish.reset_mock()
    issue_id = f"{loaded.entry_id}_prerequisite_missing:availability"
    result: Any = await manager.async_init(DOMAIN, data={"issue_id": issue_id})
    await _spin()
    assert result["type"] is FlowResultType.FORM
    assert not [
        c for c in mqtt_mock.async_publish.call_args_list if "bridge/request/options" in c[0][0]
    ]


async def test_single_finding_fix_flow_through_repairs_dashboard(
    hass: HomeAssistant, loaded: MockConfigEntry
) -> None:
    manager = await _repairs_manager(hass)
    issue_id = next(
        issue_id
        for (domain, issue_id) in ir.async_get(hass).issues
        if domain == DOMAIN and ":" in issue_id and "prerequisite" not in issue_id
    )
    result: Any = await manager.async_init(DOMAIN, data={"issue_id": issue_id})
    assert result["type"] is FlowResultType.MENU
