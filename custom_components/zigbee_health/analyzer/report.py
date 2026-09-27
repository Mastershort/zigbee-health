"""Assembly of the ``NetworkReport`` from context and findings."""

from __future__ import annotations

from typing import TYPE_CHECKING

from .battery import as_datetime
from .models import (
    Action,
    DeviceReport,
    DeviceState,
    DeviceType,
    FindingType,
    NetworkLevel,
    NetworkReport,
    RouterKind,
    Severity,
)
from .rooms import build_rooms
from .rules_health import battery_values, forecast_for
from .score import device_score, level, network_score
from .topology import unknown_neighbors

if TYPE_CHECKING:
    from .context import AnalysisContext
    from .models import Finding

# Highest priority first (section 6.2).
_STATE_BY_FINDING: tuple[tuple[FindingType, DeviceState], ...] = (
    (FindingType.DEAD_DEVICE, DeviceState.DEAD),
    (FindingType.DISAPPEARED, DeviceState.OFFLINE),
    (FindingType.PART_TIME_ROUTER, DeviceState.PART_TIME_ROUTER),
    (FindingType.BATTERY_LOW, DeviceState.BATTERY),
    (FindingType.WEAK_LINK, DeviceState.WEAK),
    (FindingType.WEAK_BACKBONE, DeviceState.WEAK),
)

# Top-3 measures, ordered by effect (section 5.4): remove dead devices → batteries →
# routers in rooms → backbone, then the remaining warnings.
_ACTIONS: tuple[tuple[str, FindingType], ...] = (
    ("remove_dead", FindingType.DEAD_DEVICE),
    ("replace_batteries", FindingType.BATTERY_LOW),
    ("power_part_time_routers", FindingType.CHILDREN_ON_PART_TIME_ROUTER),
    ("add_router_rooms", FindingType.ROOM_WITHOUT_ROUTER),
    ("add_routers", FindingType.TOO_FEW_ROUTERS),
    ("improve_backbone", FindingType.WEAK_BACKBONE),
    ("power_part_time_routers", FindingType.PART_TIME_ROUTER),
    ("check_disappeared", FindingType.DISAPPEARED),
    ("improve_weak_links", FindingType.WEAK_LINK),
    ("reduce_reporting", FindingType.MESSAGE_FLOOD),
    ("check_unstable", FindingType.UNSTABLE_DEVICE),
)
MAX_ACTIONS = 3


def _device_state(ignored: bool, types: set[FindingType]) -> DeviceState:
    if ignored:
        return DeviceState.IGNORED
    for finding_type, state in _STATE_BY_FINDING:
        if finding_type in types:
            return state
    return DeviceState.OK


def build_actions(ctx: AnalysisContext, findings: tuple[Finding, ...]) -> tuple[Action, ...]:
    actions: list[Action] = []
    used: set[str] = set()
    for key, finding_type in _ACTIONS:
        if key in used:
            continue
        matching = [f for f in findings if f.type is finding_type]
        if not matching:
            continue
        used.add(key)
        if finding_type is FindingType.ROOM_WITHOUT_ROUTER:
            items = tuple(str(f.data.get("room", "")) for f in matching)
            count = len(matching)
        elif finding_type is FindingType.TOO_FEW_ROUTERS:
            items = ()
            count = int(matching[0].data.get("recommended", 1))
        else:
            items = tuple(ctx.name(f.ieee) for f in matching if f.ieee)
            count = len(matching)
        actions.append(
            Action(
                key=key,
                count=count,
                items=items,
                finding_type=finding_type.value,
                ieees=tuple(f.ieee for f in matching if f.ieee),
                # Rooms only for room findings; device findings mark just the device.
                area_ids=tuple(f.area_id for f in matching if f.area_id and not f.ieee),
            )
        )
        if len(actions) == MAX_ACTIONS:
            break
    return tuple(actions)


def build_report(
    ctx: AnalysisContext, findings: tuple[Finding, ...], *, paused: bool = False
) -> NetworkReport:
    snapshot = ctx.snapshot
    by_device: dict[str, list[Finding]] = {}
    for finding in findings:
        if finding.ieee is not None:
            by_device.setdefault(finding.ieee, []).append(finding)

    devices: dict[str, DeviceReport] = {}
    for ieee, dev in sorted(ctx.devices.items()):
        device = dev.device
        if device.type not in (DeviceType.ROUTER, DeviceType.END_DEVICE) or device.disabled:
            continue
        own = by_device.get(ieee, [])
        hist = snapshot.history.devices.get(ieee)
        battery, _ = battery_values(dev, hist)
        forecast = forecast_for(ctx, dev)
        devices[ieee] = DeviceReport(
            ieee=ieee,
            friendly_name=device.friendly_name,
            type=device.type,
            router_kind=dev.router_kind,
            chatty=dev.chatty,
            state=_device_state(ieee in snapshot.ignored_devices, {f.type for f in own}),
            score=device_score(own),
            parent=dev.parent.parent if dev.parent else None,
            parent_lqi=dev.parent.lqi if dev.parent else None,
            children=ctx.children.get(ieee, ()),
            area_id=device.area_id,
            floor_id=device.floor_id,
            battery=battery if device.is_battery_powered else None,
            battery_empty=as_datetime(forecast.empty_on) if forecast else None,
            battery_powered=device.is_battery_powered,
            last_seen=dev.last_seen,
        )

    analysed = [r for r in devices.values() if ctx.devices[r.ieee].analysed]
    score = network_score(((r.score, r.type is DeviceType.ROUTER) for r in analysed), findings)
    types = [f.type for f in findings]
    scan = snapshot.latest_scan
    counts = {
        "devices": len(analysed),
        "routers": sum(1 for r in analysed if r.type is DeviceType.ROUTER),
        "end_devices": sum(1 for r in analysed if r.type is DeviceType.END_DEVICE),
        "routers_always_on": sum(
            1
            for r in analysed
            if r.router_kind is RouterKind.ALWAYS_ON and r.state is not DeviceState.DEAD
        ),
        "routers_part_time": types.count(FindingType.PART_TIME_ROUTER),
        "offline": types.count(FindingType.DISAPPEARED),
        "dead": types.count(FindingType.DEAD_DEVICE),
        "battery_critical": types.count(FindingType.BATTERY_LOW),
        "weak_links": types.count(FindingType.WEAK_LINK),
        "findings_critical": sum(1 for f in findings if f.severity is Severity.CRITICAL),
        "findings_warning": sum(1 for f in findings if f.severity is Severity.WARNING),
        "findings_info": sum(1 for f in findings if f.severity is Severity.INFO),
        "findings_open": len(findings),
    }
    unknown_parent = (
        tuple(
            sorted(
                ieee
                for ieee, dev in ctx.devices.items()
                if dev.analysed
                and dev.device.type is DeviceType.END_DEVICE
                and dev.parent is None
                and not dev.dead
                and devices[ieee].state is not DeviceState.OFFLINE
            )
        )
        if scan is not None
        else ()
    )

    return NetworkReport(
        generated_at=snapshot.now,
        paused=paused,
        score=score,
        level=NetworkLevel.PAUSED if paused else level(score),
        findings=findings,
        devices=devices,
        rooms=build_rooms(ctx, devices, findings),
        counts=counts,
        unknown_neighbors=unknown_neighbors(scan, snapshot.devices) if scan else (),
        unknown_parent=unknown_parent,
        actions=build_actions(ctx, findings),
        messages_per_second=snapshot.history.messages_per_second,
    )
