"""Hysteresis: report after the minimum duration, resolve after M missing runs."""

from __future__ import annotations

from dataclasses import replace
from datetime import datetime, timedelta

from analyzer.config import AnalyzerConfig
from analyzer.hysteresis import FindingTracker
from analyzer.models import Finding, FindingType, Severity
from builders import NOW

CONFIG = AnalyzerConfig(min_duration=timedelta(minutes=30), resolve_after_runs=3)
DEAD = Finding(
    id="dead_device:e1",
    type=FindingType.DEAD_DEVICE,
    severity=Severity.CRITICAL,
    ieee="e1",
    data={"name": "FS", "days": 31},
    related=("x",),
)


def at(minutes: int) -> datetime:
    return NOW + timedelta(minutes=minutes)


def test_reported_only_after_min_duration() -> None:
    tracker = FindingTracker(CONFIG)
    first = tracker.update([DEAD], at(0))
    assert first.active == () and first.raised == ()
    assert tracker.update([DEAD], at(29)).active == ()
    reported = tracker.update([DEAD], at(30))
    assert reported.raised == (DEAD,)
    assert reported.active == (DEAD,)
    # Raised only once.
    assert tracker.update([DEAD], at(35)).raised == ()


def test_missing_z2m_option_is_reported_right_away() -> None:
    """A setting does not flap: the repairs hint appears with the first analysis."""
    option = Finding(
        id="prerequisite_missing:health",
        type=FindingType.PREREQUISITE_MISSING,
        severity=Severity.INFO,
        data={"option": "health"},
    )
    first = FindingTracker(CONFIG).update([option], at(0))
    assert first.raised == (option,)
    assert first.active == (option,)


def test_pending_finding_restarts_when_condition_vanishes() -> None:
    tracker = FindingTracker(CONFIG)
    tracker.update([DEAD], at(0))
    tracker.update([], at(5))
    tracker.update([DEAD], at(10))
    assert tracker.update([DEAD], at(35)).active == ()
    assert tracker.update([DEAD], at(40)).raised == (DEAD,)


def test_resolved_after_m_missing_runs_and_no_flapping() -> None:
    tracker = FindingTracker(CONFIG)
    tracker.update([DEAD], at(0))
    tracker.update([DEAD], at(30))
    assert tracker.update([], at(35)).active == (DEAD,)
    assert tracker.update([], at(40)).active == (DEAD,)
    # Back again before M misses: counter resets, nothing raised twice.
    back = tracker.update([DEAD], at(45))
    assert back.raised == () and back.active == (DEAD,)
    tracker.update([], at(50))
    tracker.update([], at(55))
    resolved = tracker.update([], at(60))
    assert resolved.resolved == (DEAD,)
    assert resolved.active == ()


def test_active_finding_data_is_refreshed() -> None:
    tracker = FindingTracker(replace_min(0))
    tracker.update([DEAD], at(0))
    newer = replace(DEAD, data={"name": "FS", "days": 32})
    assert tracker.update([newer], at(5)).active[0].data["days"] == 32


def test_forget_device() -> None:
    tracker = FindingTracker(replace_min(0))
    tracker.update([DEAD], at(0))
    tracker.forget_device("e1")
    assert tracker.active == ()


def test_roundtrip_persistence() -> None:
    tracker = FindingTracker(CONFIG)
    tracker.update([DEAD], at(0))
    tracker.update([DEAD], at(30))
    restored = FindingTracker.from_dict(CONFIG, tracker.as_dict())
    assert restored.active == (DEAD,)
    assert restored.tracked["dead_device:e1"].first_seen == at(0)


def test_from_dict_drops_corrupt_entries() -> None:
    tracker = FindingTracker(CONFIG)
    tracker.update([DEAD], at(0))
    data = tracker.as_dict()
    data["broken"] = {"finding": {"id": "x", "type": "unknown_type", "severity": "info"}}
    data["partial"] = {"first_seen": "2026-01-01T00:00:00+00:00"}
    restored = FindingTracker.from_dict(CONFIG, data)
    assert list(restored.tracked) == ["dead_device:e1"]


def replace_min(minutes: int) -> AnalyzerConfig:
    return AnalyzerConfig(min_duration=timedelta(minutes=minutes))
