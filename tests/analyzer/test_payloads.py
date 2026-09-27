"""Parsing of Z2M payloads and last_seen formats, checked against the real fixtures."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta, timezone

import pytest

from analyzer.models import DeviceType
from analyzer.timeutil import parse_last_seen
from analyzer.z2m_payloads import (
    PayloadError,
    apply_device_state,
    parse_availability,
    parse_bridge_devices,
    parse_bridge_info,
    parse_networkmap,
)
from builders import NOW, load_fixture

CEST = timezone(timedelta(hours=2))


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        (1790164680275, datetime(2026, 9, 23, 11, 58, 0, 275000, tzinfo=UTC)),  # epoch ms
        (1790164680, datetime(2026, 9, 23, 11, 58, 0, tzinfo=UTC)),  # epoch s
        ("1790164680275", datetime(2026, 9, 23, 11, 58, 0, 275000, tzinfo=UTC)),
        ("2026-09-23T11:58:00.000Z", datetime(2026, 9, 23, 11, 58, tzinfo=UTC)),  # ISO_8601
        ("2026-09-23T13:58:00+02:00", datetime(2026, 9, 23, 11, 58, tzinfo=UTC)),  # ISO local
        (None, None),
        ("", None),
        ("garbage", None),
        (0, None),
        (True, None),
        ([], None),
    ],
)
def test_parse_last_seen(value: object, expected: datetime | None) -> None:
    assert parse_last_seen(value) == expected


def test_parse_last_seen_naive_uses_local_tz() -> None:
    assert parse_last_seen("2026-09-23T13:58:00", CEST) == datetime(2026, 9, 23, 11, 58, tzinfo=UTC)


def test_parse_bridge_devices_fixture() -> None:
    devices = parse_bridge_devices(load_fixture("bridge_devices.json"))
    assert len(devices) == 49
    types = [d.type for d in devices.values()]
    assert types.count(DeviceType.ROUTER) == 21
    assert types.count(DeviceType.END_DEVICE) == 27
    assert types.count(DeviceType.COORDINATOR) == 1
    th = next(d for d in devices.values() if d.friendly_name == "Klima Küche")
    assert th.is_battery_powered
    assert {"temperature", "humidity", "battery"} <= th.exposes
    assert th.interview_completed and th.supported and not th.disabled
    plug = next(d for d in devices.values() if d.friendly_name == "Steckdose Küche")
    assert not plug.is_battery_powered
    assert {"power", "energy"} <= plug.exposes


def test_parse_bridge_devices_edge_cases() -> None:
    devices = parse_bridge_devices(
        [
            {"ieee_address": "0x1", "type": "GreenPower", "interview_completed": False},
            {"ieee_address": "0x2", "type": "EndDevice", "interview_state": "FAILED",
             "definition": None, "supported": False, "disabled": True},
            {"no": "ieee"},
            "junk",
        ]
    )  # fmt: skip
    assert devices["0x1"].type is DeviceType.UNKNOWN
    assert not devices["0x1"].interview_completed
    assert devices["0x1"].friendly_name == "0x1"
    assert not devices["0x2"].interview_completed
    assert devices["0x2"].exposes == frozenset()
    assert devices["0x2"].disabled and not devices["0x2"].supported
    with pytest.raises(PayloadError):
        parse_bridge_devices({})


def test_parse_networkmap_fixture() -> None:
    scan = parse_networkmap(load_fixture("networkmap_raw.json"), NOW)
    assert len(scan.nodes) == 49
    assert len(scan.links) == 81
    assert scan.timestamp == NOW
    failed = {n.friendly_name for n in scan.nodes.values() if n.failed}
    assert len(failed) == 14
    assert "Deckenlicht Küche" in failed
    coordinator = scan.nodes["0x00124b0000000001"]
    assert coordinator.type is DeviceType.COORDINATOR
    assert scan.responded("0x00124b0000000001")
    assert not scan.responded("0xunknown")
    assert not scan.failed("0xunknown")


def test_parse_networkmap_nested_link_format_and_errors() -> None:
    payload = {
        "status": "ok",
        "data": {
            "type": "raw",
            "value": {
                "nodes": [{"ieeeAddr": "0xa", "type": "Router"}, {"no": 1}, "junk"],
                "links": [
                    {"source": {"ieeeAddr": "0xb"}, "target": {"ieeeAddr": "0xa"},
                     "linkquality": 99, "relationship": 1},
                    {"source": {}, "target": {"ieeeAddr": "0xa"}},
                    "junk",
                ],
            },
        },
    }  # fmt: skip
    scan = parse_networkmap(payload, NOW)
    assert list(scan.nodes) == ["0xa"]
    [link] = scan.links
    assert (link.source, link.target, link.lqi, link.relationship) == ("0xb", "0xa", 99, 1)

    bad_payloads: tuple[object, ...] = (
        [],
        {"status": "error", "error": "timeout"},
        {"status": "ok", "data": {"type": "graphviz", "value": "digraph"}},
        {"status": "ok", "data": {"type": "raw"}},
    )
    for bad in bad_payloads:
        with pytest.raises(PayloadError):
            parse_networkmap(bad, NOW)


def test_parse_bridge_info_fixture() -> None:
    info = parse_bridge_info(load_fixture("bridge_info.json"))
    assert info.version == "2.14.1"
    assert info.coordinator_ieee == "0x00124b0000000001"
    assert info.coordinator_type == "ZStack3x0"
    assert info.coordinator_revision == "20260310"
    assert info.last_seen_format == "ISO_8601"
    assert info.last_seen_enabled
    assert not info.availability_enabled
    assert info.health_interval == 10
    assert not info.health_reset_on_check


def test_parse_bridge_info_variants() -> None:
    info = parse_bridge_info(
        {"config": {"advanced": {"last_seen": "disable"}, "availability": True,
                    "health": {"interval": 0}}}
    )  # fmt: skip
    assert not info.last_seen_enabled
    assert info.availability_enabled
    assert info.health_interval is None
    assert info.coordinator_revision is None
    with pytest.raises(PayloadError):
        parse_bridge_info([])


def test_apply_device_state() -> None:
    device = parse_bridge_devices(load_fixture("bridge_devices.json"))["0x00158d0000000002"]
    updated = apply_device_state(
        device,
        {"linkquality": 120, "battery": 87, "voltage": 2995,
         "last_seen": "2026-09-23T11:00:00Z", "occupancy": False},
        received_at=NOW,
    )  # fmt: skip
    assert updated.linkquality == 120
    assert updated.battery == 87.0
    assert updated.voltage == 2995.0
    assert updated.last_seen == datetime(2026, 9, 23, 11, tzinfo=UTC)
    # Without last_seen the receive time is used; bools are not numbers.
    fallback = apply_device_state(device, {"battery": True, "linkquality": "x"}, NOW)
    assert fallback.last_seen == NOW
    assert fallback.battery is None
    assert fallback.linkquality is None


@pytest.mark.parametrize(
    ("payload", "expected"),
    [
        ({"state": "online"}, True),
        ({"state": "offline"}, False),
        ("online", True),
        ("offline", False),
        ({}, None),
        (None, None),
    ],
)
def test_parse_availability(payload: object, expected: bool | None) -> None:
    assert parse_availability(payload) is expected
