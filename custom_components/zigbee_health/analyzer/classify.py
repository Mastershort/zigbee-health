"""Device classification (section 5.1)."""

from __future__ import annotations

from typing import TYPE_CHECKING

from .models import DeviceType, NetworkSnapshot, RouterKind, ZigbeeDevice

if TYPE_CHECKING:
    from .config import AnalyzerConfig

# Exposed properties of devices that report periodically without an event.
# ASSUMPTION: ``device_temperature`` (Aqara contact sensors) and ``voltage`` alone do not
# make a device chatty; both are only sent along with events or rare heartbeats.
CHATTY_PROPERTIES = frozenset(
    {
        "temperature",
        "humidity",
        "pressure",
        "co2",
        "voc",
        "pm25",
        "pm10",
        "formaldehyd",
        "illuminance",
        "illuminance_lux",
        "soil_moisture",
        "power",
        "energy",
        "current",
    }
)


def is_analysed(device: ZigbeeDevice, snapshot: NetworkSnapshot) -> bool:
    """Routers and end devices that are neither disabled nor ignored."""
    return (
        device.type in (DeviceType.ROUTER, DeviceType.END_DEVICE)
        and not device.disabled
        and device.ieee not in snapshot.ignored_devices
    )


def is_chatty(device: ZigbeeDevice) -> bool:
    """Device reports periodically (measurements) rather than only on events."""
    return not CHATTY_PROPERTIES.isdisjoint(device.exposes)


def scan_failures(ieee: str, snapshot: NetworkSnapshot, window: int) -> tuple[int, int]:
    """Return (failed, considered) over the last ``window`` scans containing the node."""
    considered = [scan for scan in snapshot.scans[-window:] if ieee in scan.nodes]
    return sum(1 for scan in considered if scan.failed(ieee)), len(considered)


def reconnects(ieee: str, snapshot: NetworkSnapshot, config: AnalyzerConfig) -> int:
    """Power cycles in the flap window: offline→online changes, light ``unavailable``
    events, or ``device_announce`` messages (a router announces itself every time it gets
    power again, which also works when Z2M availability is disabled)."""
    since = snapshot.now - config.part_time_flap_window
    changes = snapshot.availability_changes.get(ieee, ())
    count = 0
    previous_online: bool | None = None
    for change in changes:
        if change.timestamp >= since and change.online and previous_online is False:
            count += 1
        previous_online = change.online
    light_events = sum(1 for ts in snapshot.light_unavailable_events.get(ieee, ()) if ts >= since)
    hist = snapshot.history.devices.get(ieee)
    announces = sum(1 for ts in hist.announces if ts >= since) if hist else 0
    return max(count, light_events, announces)


def is_part_time_router(
    device: ZigbeeDevice, snapshot: NetworkSnapshot, config: AnalyzerConfig
) -> bool:
    """F-05 condition: router that is regularly switched off."""
    if device.type is not DeviceType.ROUTER:
        return False
    failed, _ = scan_failures(device.ieee, snapshot, config.part_time_scan_window)
    if failed >= config.part_time_scan_failures:
        return True
    return reconnects(device.ieee, snapshot, config) >= config.part_time_flap_count


def router_kind(
    device: ZigbeeDevice, snapshot: NetworkSnapshot, config: AnalyzerConfig
) -> RouterKind | None:
    if device.type is not DeviceType.ROUTER:
        return None
    if is_part_time_router(device, snapshot, config):
        return RouterKind.PART_TIME
    latest = snapshot.latest_scan
    if latest is not None and latest.failed(device.ieee):
        return RouterKind.UNCLEAR
    return RouterKind.ALWAYS_ON
