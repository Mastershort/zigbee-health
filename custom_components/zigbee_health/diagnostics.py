"""Diagnostics download (section 7.5)."""

from __future__ import annotations

from dataclasses import asdict
from typing import TYPE_CHECKING, Any

from .analyzer.serialize import scan_to_dict

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant

    from .coordinator import ZigbeeHealthConfigEntry


async def async_get_config_entry_diagnostics(
    hass: HomeAssistant, entry: ZigbeeHealthConfigEntry
) -> dict[str, Any]:
    coordinator = entry.runtime_data
    source = coordinator.source
    report = coordinator.data
    return {
        "entry": {"title": entry.title, "data": dict(entry.data)},
        "z2m": {
            "online": source.online,
            "online_since": source.online_since,
            "ready": source.ready,
            "info": asdict(source.info) if source.info else None,
        },
        "devices": {ieee: asdict(device) for ieee, device in source.devices.items()},
        "scans": {
            "count": len(coordinator.scans),
            "failures": coordinator.scan_failures,
            "latest": scan_to_dict(coordinator.scans[-1]) if coordinator.scans else None,
        },
        "report": asdict(report) if report else None,
        "tracker": coordinator.tracker.as_dict(),
        "history": {
            "devices": len(coordinator.history.devices),
            "last_health_at": coordinator.history.last_health_at,
            "messages_per_second": coordinator.history.messages_per_second,
        },
        "ignored": {k: v.isoformat() if v else None for k, v in coordinator.ignored.items()},
        "options": dict(entry.options),
    }
