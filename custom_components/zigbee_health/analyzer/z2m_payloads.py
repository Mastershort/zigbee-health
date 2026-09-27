"""Conversion of Zigbee2MQTT MQTT payloads into analyzer models.

Pure functions without I/O, verified against the fixtures in ``tests/fixtures``.
Anything not covered by the fixtures is marked with ``ASSUMPTION`` and listed in
``docs/ASSUMPTIONS.md``.
"""

from __future__ import annotations

from dataclasses import dataclass, replace
from datetime import UTC, tzinfo
from typing import TYPE_CHECKING, Any

from .history import HealthCounters, HealthSample
from .models import DeviceType, NetworkScan, ScanLink, ScanNode, SourceInfo, ZigbeeDevice
from .timeutil import parse_last_seen

if TYPE_CHECKING:
    from collections.abc import Iterable, Mapping
    from datetime import datetime


class PayloadError(ValueError):
    """Raised when a payload does not have the expected structure."""


def _device_type(value: object) -> DeviceType:
    try:
        return DeviceType(str(value))
    except ValueError:
        # ASSUMPTION: GreenPower and other roles are not analysed.
        return DeviceType.UNKNOWN


def _collect_properties(exposes: Iterable[Any], out: set[str]) -> set[str]:
    for expose in exposes:
        if not isinstance(expose, dict):
            continue
        prop = expose.get("property")
        if isinstance(prop, str):
            out.add(prop)
        _collect_properties(expose.get("features") or (), out)
    return out


def parse_bridge_devices(payload: object) -> dict[str, ZigbeeDevice]:
    """Parse ``<base>/bridge/devices`` into devices keyed by IEEE address."""
    if not isinstance(payload, list):
        raise PayloadError("bridge/devices payload must be a list")
    devices: dict[str, ZigbeeDevice] = {}
    for raw in payload:
        if not isinstance(raw, dict) or not isinstance(raw.get("ieee_address"), str):
            continue
        definition = raw.get("definition")
        if not isinstance(definition, dict):
            definition = {}
        interview_state = raw.get("interview_state")
        if isinstance(interview_state, str):
            interview_completed = interview_state == "SUCCESSFUL"
        else:
            interview_completed = bool(raw.get("interview_completed", True))
        ieee = raw["ieee_address"]
        devices[ieee] = ZigbeeDevice(
            ieee=ieee,
            friendly_name=str(raw.get("friendly_name") or ieee),
            type=_device_type(raw.get("type")),
            power_source=raw.get("power_source"),
            manufacturer=raw.get("manufacturer"),
            model_id=raw.get("model_id"),
            vendor=definition.get("vendor"),
            model=definition.get("model"),
            exposes=frozenset(_collect_properties(definition.get("exposes") or (), set())),
            supported=bool(raw.get("supported", True)),
            disabled=bool(raw.get("disabled", False)),
            interview_completed=interview_completed,
            network_address=raw.get("network_address"),
        )
    return devices


def apply_device_state(
    device: ZigbeeDevice,
    payload: Mapping[str, Any],
    received_at: datetime,
    local_tz: tzinfo = UTC,
) -> ZigbeeDevice:
    """Merge a ``<base>/<friendly_name>`` state payload into the device.

    Without ``last_seen`` in the payload (option disabled in Z2M) the receive time is used.
    """
    last_seen = parse_last_seen(payload.get("last_seen"), local_tz) or received_at
    changes: dict[str, Any] = {"last_seen": last_seen}
    lqi = payload.get("linkquality")
    if isinstance(lqi, int) and not isinstance(lqi, bool):
        changes["linkquality"] = lqi
    for key in ("battery", "voltage"):
        value = payload.get(key)
        if isinstance(value, int | float) and not isinstance(value, bool):
            changes[key] = float(value)
    return replace(device, **changes)


def parse_availability(payload: object) -> bool | None:
    """Parse ``<base>/<friendly_name>/availability`` (Z2M 2.x JSON or legacy plain string)."""
    state = payload.get("state") if isinstance(payload, dict) else payload
    if state == "online":
        return True
    if state == "offline":
        return False
    return None


def parse_networkmap(payload: object, timestamp: datetime) -> NetworkScan:
    """Parse ``<base>/bridge/response/networkmap`` (``type: raw``)."""
    if not isinstance(payload, dict):
        raise PayloadError("networkmap payload must be an object")
    if payload.get("status") != "ok":
        raise PayloadError(f"networkmap failed: {payload.get('error', payload.get('status'))}")
    data = payload.get("data")
    if not isinstance(data, dict) or data.get("type") != "raw":
        raise PayloadError("networkmap payload is not a raw map")
    value = data.get("value")
    if not isinstance(value, dict):
        raise PayloadError("networkmap payload has no value")

    nodes: dict[str, ScanNode] = {}
    for raw in value.get("nodes") or ():
        ieee = raw.get("ieeeAddr") if isinstance(raw, dict) else None
        if not isinstance(ieee, str):
            continue
        failed = raw.get("failed") or ()
        nodes[ieee] = ScanNode(
            ieee=ieee,
            friendly_name=str(raw.get("friendlyName") or ieee),
            type=_device_type(raw.get("type")),
            # End devices carry no ``failed`` key at all; only routers are queried.
            failed="lqi" in failed,
            last_seen=parse_last_seen(raw.get("lastSeen")),
        )

    links: list[ScanLink] = []
    for raw in value.get("links") or ():
        if not isinstance(raw, dict):
            continue
        source = raw.get("sourceIeeeAddr") or (raw.get("source") or {}).get("ieeeAddr")
        target = raw.get("targetIeeeAddr") or (raw.get("target") or {}).get("ieeeAddr")
        if not isinstance(source, str) or not isinstance(target, str):
            continue
        lqi = raw.get("lqi", raw.get("linkquality", 0))
        links.append(
            ScanLink(
                source=source,
                target=target,
                lqi=int(lqi) if isinstance(lqi, int | float) else 0,
                relationship=int(raw.get("relationship", 3)),
                device_type=int(raw.get("deviceType", 255)),
                depth=int(raw.get("depth", 255)),
            )
        )
    return NetworkScan(timestamp=timestamp, nodes=nodes, links=tuple(links))


@dataclass(frozen=True, slots=True)
class BridgeInfo:
    """Relevant parts of ``<base>/bridge/info``."""

    version: str | None
    coordinator_ieee: str | None
    coordinator_type: str | None
    coordinator_revision: str | None
    last_seen_format: str | None  # None/"disable" = last_seen disabled
    availability_enabled: bool
    health_interval: int | None  # minutes, None = health checks off
    health_reset_on_check: bool

    @property
    def last_seen_enabled(self) -> bool:
        return self.last_seen_format not in (None, "disable")

    def as_source_info(self) -> SourceInfo:
        return SourceInfo(
            version=self.version,
            coordinator_type=self.coordinator_type,
            coordinator_revision=self.coordinator_revision,
            last_seen_enabled=self.last_seen_enabled,
            availability_enabled=self.availability_enabled,
            health_enabled=self.health_interval is not None,
        )


def parse_bridge_info(payload: object) -> BridgeInfo:
    if not isinstance(payload, dict):
        raise PayloadError("bridge/info payload must be an object")
    coordinator = payload.get("coordinator") or {}
    meta = coordinator.get("meta") or {}
    config = payload.get("config") or {}
    advanced = config.get("advanced") or {}
    availability = config.get("availability")
    # Z2M 2.x: {"enabled": bool, ...}; 1.x: bool or object meaning enabled.
    if isinstance(availability, dict):
        availability_enabled = bool(availability.get("enabled", True))
    else:
        availability_enabled = bool(availability)
    health = config.get("health") or {}
    interval = health.get("interval")
    revision = meta.get("revision")
    return BridgeInfo(
        version=payload.get("version"),
        coordinator_ieee=coordinator.get("ieee_address"),
        coordinator_type=coordinator.get("type"),
        coordinator_revision=str(revision) if revision is not None else None,
        last_seen_format=advanced.get("last_seen"),
        availability_enabled=availability_enabled,
        health_interval=interval if isinstance(interval, int) and interval > 0 else None,
        health_reset_on_check=bool(health.get("reset_on_check", False)),
    )


def parse_bridge_health(payload: object, received_at: datetime) -> HealthSample:
    """Parse ``<base>/bridge/health``. Devices without messages since start are missing."""
    if not isinstance(payload, dict):
        raise PayloadError("bridge/health payload must be an object")
    stamp = parse_last_seen(payload.get("response_time")) or received_at
    process = payload.get("process") or {}
    uptime = process.get("uptime_sec")
    devices: dict[str, HealthCounters] = {}
    for ieee, raw in (payload.get("devices") or {}).items():
        if not isinstance(raw, dict):
            continue
        try:
            devices[ieee] = HealthCounters(
                messages=int(raw.get("messages", 0)),
                leave_count=int(raw.get("leave_count", 0)),
                network_address_changes=int(raw.get("network_address_changes", 0)),
            )
        except (TypeError, ValueError):
            continue
    return HealthSample(
        timestamp=stamp,
        uptime=int(uptime) if isinstance(uptime, int | float) else None,
        devices=devices,
    )


def parse_bridge_event(payload: object) -> tuple[str, str] | None:
    """Parse ``<base>/bridge/event`` into (event type, IEEE address)."""
    if not isinstance(payload, dict):
        return None
    event_type = payload.get("type")
    data = payload.get("data")
    ieee = data.get("ieee_address") if isinstance(data, dict) else None
    if not isinstance(event_type, str) or not isinstance(ieee, str):
        return None
    return event_type, ieee
