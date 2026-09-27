"""Finding rules (section 5.2).

Rules return *raw* findings for the current snapshot. Hysteresis is applied afterwards by
``hysteresis.FindingTracker`` and only gates what is announced (repairs, events). Rules
based on scans smooth over several scans themselves (F-05: 2 of 3 scans, F-07/F-08: median
of 3 measurements).

This module holds the topology rules F-01, F-02, F-05, F-06, F-07, F-13, F-18; history
based rules live in ``rules_health``, network-wide and backend rules in ``rules_network``.
"""

from __future__ import annotations

from dataclasses import dataclass

from . import rules_health, rules_network
from .context import AnalysisContext, DeviceContext, base_data, build_context
from .models import DeviceType, Finding, FindingType, RouterKind, Severity

__all__ = ["AnalysisContext", "DeviceContext", "build_context", "evaluate"]


def _dead_device(ctx: AnalysisContext, dev: DeviceContext) -> Finding | None:
    if not dev.dead:
        return None
    return Finding(
        id=f"{FindingType.DEAD_DEVICE}:{dev.device.ieee}",
        type=FindingType.DEAD_DEVICE,
        severity=Severity.CRITICAL,
        ieee=dev.device.ieee,
        area_id=dev.device.area_id,
        data=base_data(ctx, dev),
    )


def _in_restart_grace(ctx: AnalysisContext) -> bool:
    since = ctx.snapshot.z2m_online_since
    return since is not None and ctx.snapshot.now - since < ctx.config.z2m_restart_grace


def _disappeared(ctx: AnalysisContext, dev: DeviceContext) -> Finding | None:
    if dev.dead or _in_restart_grace(ctx):
        return None
    config = ctx.config
    device = dev.device
    if device.type is DeviceType.END_DEVICE:
        # Older than dead_after is already F-01, so the tolerance is implicitly capped.
        tolerance = (
            config.disappeared_chatty_after if dev.chatty else config.disappeared_silent_after
        )
        if dev.age is None or dev.age <= tolerance:
            return None
    elif device.type is DeviceType.ROUTER:
        if dev.router_kind is RouterKind.PART_TIME:
            return None
        if device.available is False:
            since = device.available_since
            if since is not None and ctx.snapshot.now - since <= config.router_offline_after:
                return None
        elif device.available is None:
            # ASSUMPTION: without Z2M availability a router counts as offline when it failed
            # the latest network map and has not been seen for the offline tolerance.
            if not dev.failed_latest_scan:
                return None
            if dev.age is None or dev.age <= config.router_offline_after:
                return None
        else:
            return None
    else:
        return None
    return Finding(
        id=f"{FindingType.DISAPPEARED}:{device.ieee}",
        type=FindingType.DISAPPEARED,
        severity=Severity.WARNING,
        ieee=device.ieee,
        area_id=device.area_id,
        data=base_data(ctx, dev),
    )


def _part_time_router(ctx: AnalysisContext, dev: DeviceContext) -> list[Finding]:
    if dev.router_kind is not RouterKind.PART_TIME or dev.dead:
        return []
    device = dev.device
    children = ctx.children.get(device.ieee, ())
    data = base_data(ctx, dev)
    findings = [
        Finding(
            id=f"{FindingType.PART_TIME_ROUTER}:{device.ieee}",
            type=FindingType.PART_TIME_ROUTER,
            severity=Severity.CRITICAL if children else Severity.WARNING,
            ieee=device.ieee,
            area_id=device.area_id,
            data=data,
            related=children,
        )
    ]
    if children:
        findings.append(
            Finding(
                id=f"{FindingType.CHILDREN_ON_PART_TIME_ROUTER}:{device.ieee}",
                type=FindingType.CHILDREN_ON_PART_TIME_ROUTER,
                severity=Severity.CRITICAL,
                ieee=device.ieee,
                area_id=device.area_id,
                data={
                    **data,
                    "count": len(children),
                    "children": ", ".join(ctx.name(child) for child in children),
                },
                related=children,
            )
        )
    return findings


def _weak_link(ctx: AnalysisContext, dev: DeviceContext) -> Finding | None:
    if dev.device.type is not DeviceType.END_DEVICE or dev.dead or dev.parent is None:
        return None
    lqi = ctx.topology.parent_lqi_median(
        dev.device.ieee, dev.parent.parent, ctx.config.weak_lqi_samples
    )
    if lqi is None or lqi >= ctx.config.weak_lqi:
        return None
    return Finding(
        id=f"{FindingType.WEAK_LINK}:{dev.device.ieee}",
        type=FindingType.WEAK_LINK,
        severity=Severity.WARNING,
        ieee=dev.device.ieee,
        area_id=dev.device.area_id,
        data={
            **base_data(ctx, dev),
            "lqi": round(lqi),
            "parent": ctx.name(dev.parent.parent),
            "parent_ieee": dev.parent.parent,
        },
        related=(dev.parent.parent,),
    )


@dataclass(slots=True)
class _AreaTally:
    name: str
    end_devices: list[str]
    always_on_routers: int = 0


def _rooms_without_router(ctx: AnalysisContext, disappeared: set[str]) -> list[Finding]:
    areas: dict[str, _AreaTally] = {}
    for dev in ctx.devices.values():
        device = dev.device
        if not dev.analysed or dev.dead or device.area_id is None:
            continue
        tally = areas.setdefault(
            device.area_id, _AreaTally(name=device.area_name or device.area_id, end_devices=[])
        )
        if device.type is DeviceType.END_DEVICE:
            tally.end_devices.append(device.ieee)
        elif dev.router_kind is RouterKind.ALWAYS_ON and device.ieee not in disappeared:
            tally.always_on_routers += 1
    return [
        Finding(
            id=f"{FindingType.ROOM_WITHOUT_ROUTER}:{area_id}",
            type=FindingType.ROOM_WITHOUT_ROUTER,
            severity=Severity.WARNING,
            area_id=area_id,
            data={"room": tally.name, "count": len(tally.end_devices)},
            related=tuple(sorted(tally.end_devices)),
        )
        for area_id, tally in sorted(areas.items())
        if tally.always_on_routers == 0
        and len(tally.end_devices) >= ctx.config.room_min_end_devices
    ]


def _devices_without_area(ctx: AnalysisContext) -> Finding | None:
    without = sorted(
        ieee for ieee, dev in ctx.devices.items() if dev.analysed and dev.device.area_id is None
    )
    if not without:
        return None
    return Finding(
        id=FindingType.DEVICES_WITHOUT_AREA.value,
        type=FindingType.DEVICES_WITHOUT_AREA,
        severity=Severity.INFO,
        data={"count": len(without)},
        related=tuple(without),
    )


def evaluate(ctx: AnalysisContext) -> tuple[Finding, ...]:
    """Run all rules and return the raw findings, sorted by id."""
    findings: list[Finding] = []
    for dev in ctx.devices.values():
        if not dev.analysed:
            continue
        for single in (_dead_device(ctx, dev), _disappeared(ctx, dev), _weak_link(ctx, dev)):
            if single is not None:
                findings.append(single)
        findings.extend(_part_time_router(ctx, dev))
        findings.extend(rules_health.device_findings(ctx, dev))
    disappeared = {f.ieee for f in findings if f.type is FindingType.DISAPPEARED and f.ieee}
    findings.extend(_rooms_without_router(ctx, disappeared))
    if (without_area := _devices_without_area(ctx)) is not None:
        findings.append(without_area)
    findings.extend(rules_health.network_findings(ctx))
    findings.extend(rules_network.findings(ctx, disappeared))

    ignored = ctx.snapshot.ignored_findings
    return tuple(
        sorted(
            (f for f in findings if f.ieee is None or (f.ieee, f.type) not in ignored),
            key=lambda f: f.id,
        )
    )
