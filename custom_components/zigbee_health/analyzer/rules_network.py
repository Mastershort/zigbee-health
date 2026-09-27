"""Network-wide and backend rules: F-08 weak backbone, F-12 overloaded parent,
F-14 too few routers, F-15 prerequisites, F-16 outdated firmware, F-17 interview/support."""

from __future__ import annotations

import math
import re
from typing import TYPE_CHECKING

from .context import base_data
from .models import DeviceType, Finding, FindingType, RouterKind, Severity

if TYPE_CHECKING:
    from .context import AnalysisContext, DeviceContext

# Minimum coordinator firmware revision per adapter type (Z2M ``coordinator.type``,
# compared case-insensitively). Maintainable table (section 5.2, F-16).
MIN_COORDINATOR_REVISION: dict[str, int] = {
    "zstack3x0": 20230507,
    "zstack30x": 20230507,
    "zstack12": 20201127,
}


def _always_on_routers(ctx: AnalysisContext, disappeared: set[str]) -> list[DeviceContext]:
    return [
        dev
        for dev in ctx.devices.values()
        if dev.analysed
        and dev.router_kind is RouterKind.ALWAYS_ON
        and not dev.dead
        and dev.device.ieee not in disappeared
    ]


def _weak_backbone(ctx: AnalysisContext, disappeared: set[str]) -> list[Finding]:
    routers = _always_on_routers(ctx, disappeared)
    coordinators = {
        ieee for ieee, dev in ctx.devices.items() if dev.device.type is DeviceType.COORDINATOR
    }
    peers = coordinators | {dev.device.ieee for dev in routers}
    findings = []
    for dev in routers:
        result = ctx.topology.backbone_lqi(
            dev.device.ieee, peers - {dev.device.ieee}, ctx.config.weak_lqi_samples
        )
        if result is None or result[0] >= ctx.config.weak_lqi:
            continue
        lqi, peer = result
        findings.append(
            Finding(
                id=f"{FindingType.WEAK_BACKBONE}:{dev.device.ieee}",
                type=FindingType.WEAK_BACKBONE,
                severity=Severity.WARNING,
                ieee=dev.device.ieee,
                area_id=dev.device.area_id,
                data=base_data(ctx, dev) | {"lqi": round(lqi), "peer": ctx.name(peer)},
                related=(peer,),
            )
        )
    return findings


def _overloaded_parents(ctx: AnalysisContext) -> list[Finding]:
    findings = []
    for parent, children in sorted(ctx.children.items()):
        dev = ctx.devices.get(parent)
        if dev is None:
            continue
        coordinator = dev.device.type is DeviceType.COORDINATOR
        limit = (
            ctx.config.max_children_coordinator if coordinator else ctx.config.max_children_router
        )
        if len(children) < limit:
            continue
        findings.append(
            Finding(
                id=f"{FindingType.OVERLOADED_PARENT}:{parent}",
                type=FindingType.OVERLOADED_PARENT,
                severity=Severity.INFO,
                ieee=parent,
                area_id=dev.device.area_id,
                data=base_data(ctx, dev) | {"count": len(children), "limit": limit},
                related=children,
            )
        )
    return findings


def _too_few_routers(ctx: AnalysisContext, disappeared: set[str]) -> Finding | None:
    routers = _always_on_routers(ctx, disappeared)
    end_devices = [
        dev
        for dev in ctx.devices.values()
        if dev.analysed and not dev.dead and dev.device.type is DeviceType.END_DEVICE
    ]
    if not end_devices:
        return None
    per_router = ctx.config.end_devices_per_router
    too_many = not routers or len(end_devices) / len(routers) > per_router
    floors = {dev.device.floor_id for dev in end_devices if dev.device.floor_id}
    floors_without = floors - {dev.device.floor_id for dev in routers}
    if not too_many and not floors_without:
        return None
    recommended = max(math.ceil(len(end_devices) / per_router) - len(routers), len(floors_without))
    return Finding(
        id=FindingType.TOO_FEW_ROUTERS.value,
        type=FindingType.TOO_FEW_ROUTERS,
        severity=Severity.WARNING,
        data={
            "routers": len(routers),
            "end_devices": len(end_devices),
            "recommended": recommended,
            "floors_without": len(floors_without),
        },
    )


def _prerequisites(ctx: AnalysisContext) -> list[Finding]:
    info = ctx.snapshot.source_info
    if info is None:
        return []
    missing = {
        "last_seen": not info.last_seen_enabled,
        "availability": not info.availability_enabled,
        "health": not info.health_enabled,
    }
    return [
        Finding(
            id=f"{FindingType.PREREQUISITE_MISSING}:{option}",
            type=FindingType.PREREQUISITE_MISSING,
            severity=Severity.INFO,
            data={"option": option},
        )
        for option, is_missing in missing.items()
        if is_missing
    ]


def _outdated_firmware(ctx: AnalysisContext) -> Finding | None:
    info = ctx.snapshot.source_info
    if info is None or not info.coordinator_type or not info.coordinator_revision:
        return None
    minimum = MIN_COORDINATOR_REVISION.get(info.coordinator_type.lower())
    digits = re.sub(r"\D", "", info.coordinator_revision)
    if minimum is None or not digits or int(digits) >= minimum:
        return None
    return Finding(
        id=FindingType.OUTDATED_FIRMWARE.value,
        type=FindingType.OUTDATED_FIRMWARE,
        severity=Severity.INFO,
        data={
            "adapter": info.coordinator_type,
            "current": info.coordinator_revision,
            "minimum": str(minimum),
        },
    )


def _interview(ctx: AnalysisContext) -> list[Finding]:
    findings = []
    for dev in ctx.devices.values():
        if not dev.analysed:
            continue
        for condition, finding_type in (
            (not dev.device.interview_completed, FindingType.INTERVIEW_INCOMPLETE),
            (not dev.device.supported, FindingType.UNSUPPORTED_DEVICE),
        ):
            if condition:
                findings.append(
                    Finding(
                        id=f"{finding_type}:{dev.device.ieee}",
                        type=finding_type,
                        severity=Severity.INFO,
                        ieee=dev.device.ieee,
                        area_id=dev.device.area_id,
                        data=base_data(ctx, dev),
                    )
                )
    return findings


def findings(ctx: AnalysisContext, disappeared: set[str]) -> list[Finding]:
    results: list[Finding] = []
    results += _weak_backbone(ctx, disappeared)
    results += _overloaded_parents(ctx)
    if (too_few := _too_few_routers(ctx, disappeared)) is not None:
        results.append(too_few)
    results += _prerequisites(ctx)
    if (firmware := _outdated_firmware(ctx)) is not None:
        results.append(firmware)
    results += _interview(ctx)
    return results
