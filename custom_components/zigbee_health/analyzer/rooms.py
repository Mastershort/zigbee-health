"""Per-area report (section 5.4)."""

from __future__ import annotations

from typing import TYPE_CHECKING

from .models import DeviceType, FindingType, RoomReport, RouterKind
from .score import room_score

if TYPE_CHECKING:
    from .context import AnalysisContext
    from .models import DeviceReport, Finding

# Recommendation translation keys, most important first.
RECOMMEND_FIX_PART_TIME_ROUTER = "fix_part_time_router"
RECOMMEND_ADD_ROUTER = "add_router"
RECOMMEND_ASSIGN_AREA = "assign_area"


def build_rooms(
    ctx: AnalysisContext,
    devices: dict[str, DeviceReport],
    findings: tuple[Finding, ...],
) -> tuple[RoomReport, ...]:
    members: dict[str | None, list[DeviceReport]] = {}
    names: dict[str | None, str | None] = {None: None}
    for ieee, report in devices.items():
        dev = ctx.devices[ieee]
        if not dev.analysed:
            continue
        members.setdefault(report.area_id, []).append(report)
        names.setdefault(report.area_id, dev.device.area_name)

    rooms: list[RoomReport] = []
    for area_id, reports in sorted(members.items(), key=lambda item: (item[0] is None, item[0])):
        ieees = {r.ieee for r in reports}
        room_findings = [
            f for f in findings if (f.ieee in ieees) or (f.ieee is None and f.area_id == area_id)
        ]
        alive = [r for r in reports if not ctx.devices[r.ieee].dead]
        end_devices = [r for r in alive if r.type is DeviceType.END_DEVICE]
        lqis = [r.parent_lqi for r in end_devices if r.parent_lqi]
        part_time_with_children = any(
            f.type is FindingType.CHILDREN_ON_PART_TIME_ROUTER for f in room_findings
        )
        without_router = any(f.type is FindingType.ROOM_WITHOUT_ROUTER for f in room_findings)
        if area_id is None:
            recommendation: str | None = RECOMMEND_ASSIGN_AREA
        elif part_time_with_children:
            recommendation = RECOMMEND_FIX_PART_TIME_ROUTER
        elif without_router:
            recommendation = RECOMMEND_ADD_ROUTER
        else:
            recommendation = None
        rooms.append(
            RoomReport(
                area_id=area_id,
                area_name=names.get(area_id),
                score=room_score(
                    (r.score for r in reports),
                    (f for f in room_findings if f.ieee is None),
                ),
                end_devices=len(end_devices),
                always_on_routers=sum(1 for r in alive if r.router_kind is RouterKind.ALWAYS_ON),
                part_time_routers=sum(1 for r in alive if r.router_kind is RouterKind.PART_TIME),
                weakest_lqi=min(lqis) if lqis else None,
                open_findings=len(room_findings),
                recommendation=recommendation,
            )
        )
    return tuple(rooms)
