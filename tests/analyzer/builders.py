"""Small builders for synthetic analyzer inputs."""

from __future__ import annotations

import json
from dataclasses import replace
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

from analyzer.models import (
    DeviceType,
    NetworkScan,
    NetworkSnapshot,
    Relationship,
    ScanLink,
    ScanNode,
    ZigbeeDevice,
)

FIXTURES = Path(__file__).resolve().parents[1] / "fixtures"
NOW = datetime(2026, 9, 23, 12, 0, tzinfo=UTC)
COORD = "0x0000000000000000"


def load_fixture(name: str) -> Any:
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


def ago(**kwargs: float) -> datetime:
    return NOW - timedelta(**kwargs)


def coordinator() -> ZigbeeDevice:
    return ZigbeeDevice(ieee=COORD, friendly_name="Coordinator", type=DeviceType.COORDINATOR)


def router(ieee: str, **kwargs: Any) -> ZigbeeDevice:
    defaults: dict[str, Any] = {
        "friendly_name": ieee,
        "power_source": "Mains (single phase)",
        "exposes": frozenset({"state", "linkquality"}),
        "last_seen": ago(minutes=5),
    }
    return ZigbeeDevice(ieee=ieee, type=DeviceType.ROUTER, **(defaults | kwargs))


def end_device(ieee: str, *, chatty: bool = False, **kwargs: Any) -> ZigbeeDevice:
    exposes = {"temperature", "humidity", "battery"} if chatty else {"contact", "battery"}
    defaults: dict[str, Any] = {
        "friendly_name": ieee,
        "power_source": "Battery",
        "exposes": frozenset(exposes),
        "last_seen": ago(minutes=5),
    }
    return ZigbeeDevice(ieee=ieee, type=DeviceType.END_DEVICE, **(defaults | kwargs))


def child_link(child: str, parent: str, lqi: int) -> ScanLink:
    return ScanLink(
        source=child,
        target=parent,
        lqi=lqi,
        relationship=Relationship.CHILD,
        device_type=2,
        depth=2,
    )


def scan(
    devices: list[ZigbeeDevice],
    *,
    failed: set[str] | None = None,
    links: list[ScanLink] | None = None,
    at: datetime | None = None,
) -> NetworkScan:
    failed = failed or set()
    nodes = {
        d.ieee: ScanNode(
            ieee=d.ieee,
            friendly_name=d.friendly_name,
            type=d.type,
            failed=d.ieee in failed,
            last_seen=d.last_seen,
        )
        for d in devices
    }
    return NetworkScan(timestamp=at or NOW, nodes=nodes, links=tuple(links or ()))


def snapshot(devices: list[ZigbeeDevice], **kwargs: Any) -> NetworkSnapshot:
    all_devices = {d.ieee: d for d in [coordinator(), *devices]}
    return NetworkSnapshot(now=kwargs.pop("now", NOW), devices=all_devices, **kwargs)


def in_area(device: ZigbeeDevice, area: str) -> ZigbeeDevice:
    return replace(device, area_id=area, area_name=area.title())
