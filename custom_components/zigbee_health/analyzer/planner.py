"""Router planner: what would one more always-on router (e.g. a Zigbee plug) in an area do?

The simulation reuses the real rules: a virtual router is added to the area and every end
device of that area with a poor connection (no known parent, a part-time parent, a weak
link or a parent in another room) is assumed to re-join it with a good link. The network
is then analysed again and compared with the current state.

ASSUMPTION: without positions or radio measurements, "in the same area" is the proxy for
"in range", and a new plug is assumed to reach devices of its own room with LQI 180.
"""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass, replace
from typing import TYPE_CHECKING

from .context import build_context
from .findings import evaluate
from .models import (
    DeviceType,
    NetworkScan,
    Relationship,
    RouterKind,
    ScanLink,
    ScanNode,
    ZigbeeDevice,
)
from .report import build_report
from .score import network_score

if TYPE_CHECKING:
    from .config import AnalyzerConfig
    from .context import AnalysisContext
    from .models import NetworkReport, NetworkSnapshot

VIRTUAL_PREFIX = "virtual:"
PLANNED_LQI = 180


@dataclass(frozen=True, slots=True)
class Improvement:
    ieee: str
    name: str
    reason: str  # no_parent | part_time_parent | weak_link | far_parent
    before_parent: str | None
    before_lqi: int | None


@dataclass(frozen=True, slots=True)
class PlanResult:
    area_id: str
    area_name: str
    score_before: int
    score_after: int
    room_score_before: int
    room_score_after: int
    improved: tuple[Improvement, ...]
    resolved: dict[str, int]

    @property
    def gain(self) -> int:
        return self.score_after - self.score_before

    @property
    def impact(self) -> int:
        """Ranking value: devices that get a better connection weigh most."""
        return 3 * len(self.improved) + 2 * sum(self.resolved.values()) + self.gain


def _score_without(report: NetworkReport, ctx: AnalysisContext, skip: str) -> int:
    analysed = [
        r for ieee, r in report.devices.items() if ieee != skip and ctx.devices[ieee].analysed
    ]
    return network_score(
        ((r.score, r.type is DeviceType.ROUTER) for r in analysed), report.findings
    )


def _reason(ctx: AnalysisContext, ieee: str, area_id: str) -> str | None:
    dev = ctx.devices[ieee]
    if dev.parent is None:
        return "no_parent"
    parent = ctx.devices.get(dev.parent.parent)
    if parent is not None and parent.router_kind in (RouterKind.PART_TIME, RouterKind.UNCLEAR):
        return "part_time_parent"
    lqi = ctx.topology.parent_lqi_median(ieee, dev.parent.parent, ctx.config.weak_lqi_samples)
    if lqi is not None and lqi < ctx.config.weak_lqi:
        return "weak_link"
    if parent is not None and parent.device.area_id != area_id:
        return "far_parent"
    return None


def plan_router(
    snapshot: NetworkSnapshot,
    config: AnalyzerConfig,
    area_id: str,
    base: tuple[AnalysisContext, NetworkReport] | None = None,
) -> PlanResult | None:
    ctx, report = base or _analyse(snapshot, config)
    members = [
        dev
        for dev in ctx.devices.values()
        if dev.analysed and not dev.dead and dev.device.area_id == area_id
    ]
    if not any(dev.device.type is DeviceType.END_DEVICE for dev in members):
        return None
    area_name = next((d.device.area_name for d in members if d.device.area_name), area_id)
    virtual_id = f"{VIRTUAL_PREFIX}{area_id}"
    floor_id = next((d.device.floor_id for d in members if d.device.floor_id), None)
    virtual = ZigbeeDevice(
        ieee=virtual_id,
        friendly_name=area_name,
        type=DeviceType.ROUTER,
        power_source="Mains (single phase)",
        area_id=area_id,
        area_name=area_name,
        floor_id=floor_id,
        last_seen=snapshot.now,
        available=True,
    )

    latest = snapshot.latest_scan or NetworkScan(timestamp=snapshot.now, nodes={}, links=())
    improved: list[Improvement] = []
    moved: set[str] = set()
    for dev in members:
        if dev.device.type is not DeviceType.END_DEVICE:
            continue
        reason = _reason(ctx, dev.device.ieee, area_id)
        if reason is None:
            continue
        moved.add(dev.device.ieee)
        improved.append(
            Improvement(
                ieee=dev.device.ieee,
                name=dev.device.friendly_name,
                reason=reason,
                before_parent=dev.parent.parent if dev.parent else None,
                before_lqi=dev.parent.lqi if dev.parent else None,
            )
        )
    links = [
        link
        for link in latest.links
        if not (link.source in moved and link.relationship == Relationship.CHILD)
    ]
    links += [
        ScanLink(ieee, virtual_id, PLANNED_LQI, Relationship.CHILD, 2, 2) for ieee in sorted(moved)
    ]
    nodes = dict(latest.nodes)
    nodes[virtual_id] = ScanNode(virtual_id, area_name, DeviceType.ROUTER, failed=False)
    planned_scan = replace(latest, nodes=nodes, links=tuple(links))
    scans = (*snapshot.scans[:-1], planned_scan) if snapshot.scans else (planned_scan,)
    planned = replace(snapshot, devices=snapshot.devices | {virtual_id: virtual}, scans=scans)

    ctx_after, report_after = _analyse(planned, config)
    before_types = Counter(f.type for f in report.findings)
    after_types = Counter(f.type for f in report_after.findings)
    resolved = {t.value: n for t, n in (before_types - after_types).items()}
    room_before = next((r.score for r in report.rooms if r.area_id == area_id), 100)
    room_after = next((r.score for r in report_after.rooms if r.area_id == area_id), 100)
    return PlanResult(
        area_id=area_id,
        area_name=area_name,
        score_before=report.score or 0,
        # The planned plug itself must not lift the average: only its effect counts.
        score_after=_score_without(report_after, ctx_after, virtual_id),
        room_score_before=room_before,
        room_score_after=room_after,
        improved=tuple(sorted(improved, key=lambda i: i.name)),
        resolved=resolved,
    )


def _analyse(
    snapshot: NetworkSnapshot, config: AnalyzerConfig
) -> tuple[AnalysisContext, NetworkReport]:
    ctx = build_context(snapshot, config)
    return ctx, build_report(ctx, evaluate(ctx))


def plan_all(snapshot: NetworkSnapshot, config: AnalyzerConfig) -> list[PlanResult]:
    """One result per area with end devices, best first."""
    base = _analyse(snapshot, config)
    areas = sorted(
        {
            dev.device.area_id
            for dev in base[0].devices.values()
            if dev.analysed and dev.device.area_id
        }
    )
    results = [r for a in areas if (r := plan_router(snapshot, config, a, base)) is not None]
    return sorted(
        results,
        key=lambda r: (-r.impact, -r.gain, r.area_name),
    )
