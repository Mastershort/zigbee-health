"""Hysteresis for findings (section 5.2) so the repairs dashboard does not flap.

A raw finding is *reported* once it has been present continuously for ``min_duration``.
A reported finding is *resolved* once it has been absent for ``resolve_after_runs``
consecutive runs. The tracker state is serialisable for ``helpers.storage.Store``.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import TYPE_CHECKING, Any

from .models import Finding, FindingType, Severity

if TYPE_CHECKING:
    from collections.abc import Iterable

    from .config import AnalyzerConfig


@dataclass(slots=True)
class TrackedFinding:
    finding: Finding
    first_seen: datetime
    last_seen: datetime
    reported: bool = False
    misses: int = 0


@dataclass(frozen=True, slots=True)
class TrackerUpdate:
    active: tuple[Finding, ...]
    raised: tuple[Finding, ...]
    resolved: tuple[Finding, ...]


@dataclass(slots=True)
class FindingTracker:
    config: AnalyzerConfig
    tracked: dict[str, TrackedFinding] = field(default_factory=dict)

    @property
    def active(self) -> tuple[Finding, ...]:
        return tuple(
            sorted((t.finding for t in self.tracked.values() if t.reported), key=lambda f: f.id)
        )

    def update(self, raw: Iterable[Finding], now: datetime) -> TrackerUpdate:
        raised: list[Finding] = []
        resolved: list[Finding] = []
        present: set[str] = set()
        for finding in raw:
            present.add(finding.id)
            tracked = self.tracked.get(finding.id)
            if tracked is None:
                tracked = TrackedFinding(finding=finding, first_seen=now, last_seen=now)
                self.tracked[finding.id] = tracked
            tracked.finding = finding
            tracked.last_seen = now
            tracked.misses = 0
            if not tracked.reported and now - tracked.first_seen >= self.config.min_duration:
                tracked.reported = True
                raised.append(finding)
        for finding_id in [fid for fid in self.tracked if fid not in present]:
            tracked = self.tracked[finding_id]
            if not tracked.reported:
                # Condition vanished before it was reported: start over next time.
                del self.tracked[finding_id]
                continue
            tracked.misses += 1
            if tracked.misses >= self.config.resolve_after_runs:
                resolved.append(tracked.finding)
                del self.tracked[finding_id]
        return TrackerUpdate(active=self.active, raised=tuple(raised), resolved=tuple(resolved))

    def forget_device(self, ieee: str) -> None:
        """Drop all tracked findings of a device (e.g. after it was ignored or removed)."""
        for finding_id in [fid for fid, t in self.tracked.items() if t.finding.ieee == ieee]:
            del self.tracked[finding_id]

    # --- persistence -------------------------------------------------------------------

    def as_dict(self) -> dict[str, Any]:
        return {
            finding_id: {
                "finding": finding_to_dict(t.finding),
                "first_seen": t.first_seen.isoformat(),
                "last_seen": t.last_seen.isoformat(),
                "reported": t.reported,
                "misses": t.misses,
            }
            for finding_id, t in self.tracked.items()
        }

    @classmethod
    def from_dict(cls, config: AnalyzerConfig, data: dict[str, Any]) -> FindingTracker:
        tracker = cls(config)
        for finding_id, raw in data.items():
            try:
                tracker.tracked[finding_id] = TrackedFinding(
                    finding=finding_from_dict(raw["finding"]),
                    first_seen=datetime.fromisoformat(raw["first_seen"]),
                    last_seen=datetime.fromisoformat(raw["last_seen"]),
                    reported=bool(raw["reported"]),
                    misses=int(raw["misses"]),
                )
            except (KeyError, TypeError, ValueError):
                # Unknown finding types from newer versions or corrupt entries are dropped.
                continue
        return tracker


def finding_to_dict(finding: Finding) -> dict[str, Any]:
    return {
        "id": finding.id,
        "type": finding.type.value,
        "severity": finding.severity.value,
        "ieee": finding.ieee,
        "area_id": finding.area_id,
        "data": dict(finding.data),
        "related": list(finding.related),
    }


def finding_from_dict(raw: dict[str, Any]) -> Finding:
    return Finding(
        id=raw["id"],
        type=FindingType(raw["type"]),
        severity=Severity(raw["severity"]),
        ieee=raw.get("ieee"),
        area_id=raw.get("area_id"),
        data=dict(raw.get("data") or {}),
        related=tuple(raw.get("related") or ()),
    )
