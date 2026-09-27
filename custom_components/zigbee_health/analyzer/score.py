"""Health scores (section 5.3).

Device score:  100 - sum of deductions of the device's active findings
               (critical 40, warning 20, info 5), floored at 0.
Room score:    mean of the device scores in the room - room findings (F-13: 20),
               clamped to 0..100. A room without devices starts at 100.
Network score: weighted mean of all device scores (routers count twice)
               - network-wide findings (F-14: 12, F-11 network-wide: 8), clamped to 5..100.
Level:         >= 80 stable, 55..79 degraded, < 55 fragile.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from .models import FindingType, NetworkLevel, Severity

if TYPE_CHECKING:
    from collections.abc import Iterable

    from .models import Finding

DEVICE_DEDUCTION = {Severity.CRITICAL: 40, Severity.WARNING: 20, Severity.INFO: 5}
ROOM_DEDUCTION: dict[FindingType, int] = {FindingType.ROOM_WITHOUT_ROUTER: 20}
# Other network-wide findings (F-15, F-16, F-18) carry no deduction.
NETWORK_DEDUCTION: dict[FindingType, int] = {
    FindingType.TOO_FEW_ROUTERS: 12,
    FindingType.NETWORK_MESSAGE_FLOOD: 8,
}
ROUTER_WEIGHT = 2
NETWORK_MIN_SCORE = 5
LEVEL_STABLE = 80
LEVEL_DEGRADED = 55


def device_score(findings: Iterable[Finding]) -> int:
    return max(0, 100 - sum(DEVICE_DEDUCTION[f.severity] for f in findings))


def room_score(device_scores: Iterable[int], room_findings: Iterable[Finding]) -> int:
    scores = list(device_scores)
    base = sum(scores) / len(scores) if scores else 100.0
    deduction = sum(ROOM_DEDUCTION.get(f.type, 0) for f in room_findings)
    return max(0, min(100, round(base - deduction)))


def network_score(weighted_scores: Iterable[tuple[int, bool]], findings: Iterable[Finding]) -> int:
    """``weighted_scores`` are (score, is_router) pairs."""
    total = 0
    weight = 0
    for score, is_router in weighted_scores:
        w = ROUTER_WEIGHT if is_router else 1
        total += score * w
        weight += w
    base = total / weight if weight else 100.0
    deduction = sum(NETWORK_DEDUCTION.get(f.type, 0) for f in findings if f.ieee is None)
    return max(NETWORK_MIN_SCORE, min(100, round(base - deduction)))


def level(score: int) -> NetworkLevel:
    if score >= LEVEL_STABLE:
        return NetworkLevel.STABLE
    if score >= LEVEL_DEGRADED:
        return NetworkLevel.DEGRADED
    return NetworkLevel.FRAGILE
