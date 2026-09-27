"""Plain-dict export of a report: ``get_report`` response and data source of the card.

Pure Python. Dates in placeholders are formatted in the given local time zone.
"""

from __future__ import annotations

from dataclasses import asdict
from datetime import UTC, date, datetime, tzinfo
from typing import TYPE_CHECKING, Any

from .models import DeviceType, Finding, FindingType, Relationship

if TYPE_CHECKING:
    from collections.abc import Callable, Sequence

    from .models import NetworkReport, NetworkScan
    from .planner import PlanResult

NO_VALUE = "-"
ROUTER_DEVICE_TYPES = (0, 1)  # neighbor deviceType: coordinator, router


def _date(value: str | int | float | None, tz: tzinfo) -> str:
    if not isinstance(value, str):
        return "?"
    return datetime.fromisoformat(value).astimezone(tz).strftime("%d.%m.%Y %H:%M")


def _day(value: str | int | float | None) -> str:
    if not isinstance(value, str):
        return "?"
    return date.fromisoformat(value).strftime("%d.%m.%Y")


def _battery_value(data: dict[str, str | int | float]) -> str:
    if "battery" in data:
        return f"{data['battery']} %"
    if "voltage" in data:
        return f"{float(data['voltage']) / 1000:.2f} V"
    return NO_VALUE


def placeholders(finding: Finding, tz: tzinfo = UTC) -> dict[str, str]:
    """Translation placeholders for a finding. Every key used by any issue text is set."""
    data = finding.data
    values = {
        "name": str(data.get("name", "")),
        "room": str(data.get("room") or NO_VALUE),
        "days": str(data.get("days", "?")),
        "date": _date(data.get("last_seen"), tz),
    }
    values |= {key: str(value) for key, value in data.items() if key not in values}
    if finding.type is FindingType.BATTERY_LOW:
        values["value"] = _battery_value(data)
        values["battery_type"] = str(data.get("battery_type") or NO_VALUE)
    elif finding.type is FindingType.BATTERY_FORECAST:
        values["date"] = _day(data.get("empty_on"))
        values["battery_type"] = str(data.get("battery_type") or NO_VALUE)
    return values


def backbone_links(scan: NetworkScan | None) -> list[dict[str, Any]]:
    """Best LQI per pair of routers/coordinator in the latest scan (both directions)."""
    if scan is None:
        return []
    best: dict[tuple[str, str], int] = {}
    for link in scan.links:
        if link.relationship == Relationship.CHILD or link.lqi <= 1:
            continue
        if link.device_type not in ROUTER_DEVICE_TYPES:
            continue
        node = scan.nodes.get(link.target)
        if node is None or node.type is DeviceType.END_DEVICE:
            continue
        key = (min(link.source, link.target), max(link.source, link.target))
        best[key] = max(best.get(key, 0), link.lqi)
    return [{"a": a, "b": b, "lqi": lqi} for (a, b), lqi in sorted(best.items())]


def report_to_dict(
    report: NetworkReport,
    *,
    full: bool,
    names: Callable[[str], str],
    scans: Sequence[NetworkScan] = (),
    coordinator_ieee: str | None = None,
    area_names: dict[str, str] | None = None,
    ha_device_ids: dict[str, str] | None = None,
    last_seen: dict[str, datetime | None] | None = None,
    last_scan: datetime | None = None,
    floors: list[dict[str, Any]] | None = None,
    areas: list[dict[str, Any]] | None = None,
    tz: tzinfo = UTC,
) -> dict[str, Any]:
    area_names = area_names or {}
    ha_device_ids = ha_device_ids or {}
    last_seen = last_seen or {}
    result: dict[str, Any] = {
        "ready": True,
        "generated_at": report.generated_at.isoformat(),
        "last_scan": last_scan.isoformat() if last_scan else None,
        "score": report.score,
        "level": report.level.value,
        "counts": report.counts,
        "actions": [asdict(a) for a in report.actions],
        "findings": [
            {
                "id": f.id,
                "type": f.type.value,
                "severity": f.severity.value,
                "ieee": f.ieee,
                "device": names(f.ieee) if f.ieee else None,
                "area_id": f.area_id,
                "placeholders": placeholders(f, tz),
                "related": list(f.related),
            }
            for f in report.findings
        ],
    }
    if not full:
        return result
    result["rooms"] = [
        asdict(r) | {"area_name": r.area_name or (area_names.get(r.area_id or "") or None)}
        for r in report.rooms
    ]
    result["devices"] = {
        d.friendly_name: {
            "state": d.state.value,
            "score": d.score,
            "parent": names(d.parent) if d.parent else None,
            "parent_lqi": d.parent_lqi,
            "battery": d.battery,
            "battery_empty": d.battery_empty.isoformat() if d.battery_empty else None,
        }
        for d in report.devices.values()
    }
    result["topology"] = {
        "coordinator": (
            {"ieee": coordinator_ieee, "name": names(coordinator_ieee)}
            if coordinator_ieee
            else None
        ),
        "nodes": [
            {
                "ieee": d.ieee,
                "name": d.friendly_name,
                "type": "router" if d.type is DeviceType.ROUTER else "end_device",
                "kind": d.router_kind.value if d.router_kind else None,
                "state": d.state.value,
                "score": d.score,
                "parent": d.parent,
                "parent_lqi": d.parent_lqi,
                "children": list(d.children),
                "area": area_names.get(d.area_id or "") if d.area_id else None,
                "area_id": d.area_id,
                "floor_id": d.floor_id,
                "battery": d.battery,
                "battery_empty": d.battery_empty.isoformat() if d.battery_empty else None,
                "last_seen": (
                    ls.isoformat() if (ls := last_seen.get(d.ieee) or d.last_seen) else None
                ),
                "device_id": ha_device_ids.get(d.ieee),
            }
            for d in report.devices.values()
        ],
        "links": backbone_links(scans[-1] if scans else None),
        "unknown_parent": list(report.unknown_parent),
        "unknown_neighbors": list(report.unknown_neighbors),
        "floors": floors or [],
        "areas": areas or [],
    }
    return result


def plans_to_dicts(
    plans: Sequence[PlanResult], names: Callable[[str], str]
) -> list[dict[str, Any]]:
    """Router planner results for the websocket API and the card."""
    return [
        {
            "area_id": r.area_id,
            "area_name": r.area_name,
            "score_before": r.score_before,
            "score_after": r.score_after,
            "gain": r.gain,
            "room_score_before": r.room_score_before,
            "room_score_after": r.room_score_after,
            "impact": r.impact,
            "improved": [
                {
                    "ieee": i.ieee,
                    "name": i.name,
                    "reason": i.reason,
                    "before_parent": names(i.before_parent) if i.before_parent else None,
                    "before_lqi": i.before_lqi,
                }
                for i in r.improved
            ],
            "resolved": r.resolved,
        }
        for r in plans
    ]
