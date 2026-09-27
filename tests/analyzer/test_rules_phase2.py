"""Rules F-03, F-04, F-08 to F-12, F-14 to F-17 and the top-3 actions."""

from __future__ import annotations

from dataclasses import replace
from datetime import timedelta
from typing import Any

import pytest

from analyzer.config import AnalyzerConfig
from analyzer.findings import build_context, evaluate
from analyzer.history import DeviceHistory, NetworkHistory, hour_key
from analyzer.models import (
    DeviceState,
    Finding,
    FindingType,
    NetworkSnapshot,
    ScanLink,
    Severity,
    SourceInfo,
)
from analyzer.report import build_report
from builders import COORD, NOW, ago, child_link, end_device, router, scan, snapshot

CONFIG = AnalyzerConfig()


def run(snap: NetworkSnapshot, config: AnalyzerConfig = CONFIG) -> tuple[Finding, ...]:
    return evaluate(build_context(snap, config))


def of_type(findings: tuple[Finding, ...], finding_type: FindingType) -> list[Finding]:
    return [f for f in findings if f.type is finding_type]


def with_history(ieee: str, hist: DeviceHistory) -> NetworkHistory:
    return NetworkHistory(devices={ieee: hist})


def hours(counts: dict[int, int]) -> dict[str, int]:
    """Hourly message counts keyed by "hours ago"."""
    return {hour_key(NOW - timedelta(hours=h)): n for h, n in counts.items()}


# --- F-03 battery low -------------------------------------------------------------------


@pytest.mark.parametrize(
    ("kwargs", "reason"),
    [
        ({"battery": 15.0}, "percent"),
        ({"battery": 16.0}, None),
        ({"voltage": 2590.0, "model": "LYWSD03MMC"}, "voltage"),
        ({"voltage": 2600.0, "model": "LYWSD03MMC"}, None),
        ({"voltage": 2000.0, "model": "unknown"}, None),
    ],
)
def test_battery_low_by_value(kwargs: dict[str, Any], reason: str | None) -> None:
    device = end_device("e1", **kwargs)
    findings = of_type(run(snapshot([device])), FindingType.BATTERY_LOW)
    assert [f.data["reason"] for f in findings] == ([reason] if reason else [])


def test_battery_low_uses_history_when_no_live_value() -> None:
    hist = DeviceHistory(battery={"2026-09-22": 10.0})
    snap = snapshot([end_device("e1")], history=with_history("e1", hist))
    assert of_type(run(snap), FindingType.BATTERY_LOW)


def test_battery_low_by_message_rate() -> None:
    baseline = dict.fromkeys(range(7, 40), 12)
    dropped = hours(baseline | dict.fromkeys(range(1, 7), 1))
    device = end_device("e1", chatty=True)
    snap = snapshot([device], history=with_history("e1", DeviceHistory(messages=dropped)))
    [finding] = of_type(run(snap), FindingType.BATTERY_LOW)
    assert finding.data["reason"] == "rate"
    assert finding.severity is Severity.WARNING

    normal = hours(baseline | dict.fromkeys(range(1, 7), 10))
    snap = snapshot([device], history=with_history("e1", DeviceHistory(messages=normal)))
    assert not of_type(run(snap), FindingType.BATTERY_LOW)
    # Too little baseline, missing recent hour, silent device, tiny baseline: no finding.
    short = hours(dict.fromkeys(range(7, 20), 12) | dict.fromkeys(range(1, 7), 0))
    gap = hours(baseline | dict.fromkeys(range(2, 7), 0))
    tiny = hours(dict.fromkeys(range(7, 40), 0) | dict.fromkeys(range(1, 7), 0))
    for messages, dev in ((short, device), (gap, device), (dropped, end_device("e1")),
                          (tiny, device)):  # fmt: skip
        snap = snapshot([dev], history=with_history("e1", DeviceHistory(messages=messages)))
        assert not of_type(run(snap), FindingType.BATTERY_LOW)


# --- F-04 forecast ----------------------------------------------------------------------


def _voltage_series(days: int, start: float, step: float) -> dict[str, float]:
    return {
        (NOW - timedelta(days=days - 1 - i)).date().isoformat(): start + step * i
        for i in range(days)
    }


def test_battery_forecast_finding_and_report_date() -> None:
    device = end_device("e1", model="LYWSD03MMC")
    # 2600 mV reached 10 days from now.
    hist = DeviceHistory(voltage=_voltage_series(14, 2600 + 20 * 23, -20))
    snap = snapshot([device], history=with_history("e1", hist))
    [finding] = of_type(run(snap), FindingType.BATTERY_FORECAST)
    assert finding.severity is Severity.INFO
    assert finding.data["empty_on"] == (NOW + timedelta(days=10)).date().isoformat()
    report = build_report(build_context(snap, CONFIG), run(snap))
    assert report.devices["e1"].battery_empty is not None

    slow = DeviceHistory(voltage=_voltage_series(14, 3000, -5))
    snap = snapshot([device], history=with_history("e1", slow))
    assert not of_type(run(snap), FindingType.BATTERY_FORECAST)  # beyond 21 days
    report = build_report(build_context(snap, CONFIG), run(snap))
    assert report.devices["e1"].battery_empty is not None  # entity still shows the date


def test_battery_low_suppresses_forecast() -> None:
    device = end_device("e1", model="LYWSD03MMC", voltage=2500.0)
    hist = DeviceHistory(voltage=_voltage_series(14, 2800, -20))
    findings = run(snapshot([device], history=with_history("e1", hist)))
    assert of_type(findings, FindingType.BATTERY_LOW)
    assert not of_type(findings, FindingType.BATTERY_FORECAST)


# --- F-09 degradation, F-10 unstable, F-11 flood ----------------------------------------


def _lqi_days(values: list[float]) -> dict[str, tuple[float, int]]:
    n = len(values)
    return {
        (NOW - timedelta(days=n - 1 - i)).date().isoformat(): (v, 1) for i, v in enumerate(values)
    }


def test_degradation() -> None:
    device = end_device("e1")
    falling = DeviceHistory(lqi=_lqi_days([150, 150, 150, 140, 130, 120, 100, 100, 100]))
    [finding] = of_type(
        run(snapshot([device], history=with_history("e1", falling))), FindingType.DEGRADATION
    )
    assert finding.data == finding.data | {"before": 150, "after": 100, "percent": 33}
    stable = DeviceHistory(lqi=_lqi_days([150, 150, 150, 140, 130, 120, 120, 120, 120]))
    short = DeviceHistory(lqi=_lqi_days([150, 150, 100, 100, 100]))
    for hist in (stable, short):
        snap = snapshot([device], history=with_history("e1", hist))
        assert not of_type(run(snap), FindingType.DEGRADATION)


def test_unstable_device() -> None:
    device = end_device("e1")
    events = DeviceHistory(instability=[(ago(hours=2), 2), (ago(hours=5), 1), (ago(days=2), 5)])
    announces = DeviceHistory(announces=[ago(hours=1), ago(hours=2), ago(hours=3)])
    calm = DeviceHistory(instability=[(ago(hours=2), 2)], announces=[ago(hours=1)])
    for hist, expected in ((events, True), (announces, True), (calm, False)):
        found = of_type(
            run(snapshot([device], history=with_history("e1", hist))),
            FindingType.UNSTABLE_DEVICE,
        )
        assert bool(found) is expected


def test_message_flood_device_and_network() -> None:
    plug = router("r1")
    loud = DeviceHistory(messages=hours({1: 400, 2: 500, 3: 450}))
    findings = run(snapshot([plug], history=with_history("r1", loud)))
    [flood] = of_type(findings, FindingType.MESSAGE_FLOOD)
    assert flood.data["per_minute"] == 7.5
    assert not of_type(findings, FindingType.NETWORK_MESSAGE_FLOOD)
    # A measuring device may send 5x as much.
    sensor = end_device("r1", chatty=True)
    assert not of_type(
        run(snapshot([sensor], history=with_history("r1", loud))), FindingType.MESSAGE_FLOOD
    )
    one_quiet_hour = DeviceHistory(messages=hours({1: 400, 2: 100, 3: 450}))
    assert not of_type(
        run(snapshot([plug], history=with_history("r1", one_quiet_hour))),
        FindingType.MESSAGE_FLOOD,
    )
    network = DeviceHistory(messages=hours({1: 40_000}))
    [net] = of_type(
        run(snapshot([plug], history=with_history("r1", network))),
        FindingType.NETWORK_MESSAGE_FLOOD,
    )
    assert net.ieee is None
    assert net.data["per_second"] == 11.1


# --- F-08, F-12, F-14 -------------------------------------------------------------------


def test_weak_backbone() -> None:
    r1, r2 = router("r1"), router("r2")
    weak = [ScanLink("r1", COORD, 60, 2, 1, 15), ScanLink(COORD, "r1", 1, 2, 0, 0)]
    findings = run(snapshot([r1, r2], scans=(scan([r1, r2], links=weak),)))
    [finding] = of_type(findings, FindingType.WEAK_BACKBONE)
    assert finding.ieee == "r1"
    assert finding.data["lqi"] == 60
    assert finding.data["peer"] == "Coordinator"
    # r2 has no links at all → no judgement.
    good = [*weak, ScanLink("r2", "r1", 120, 2, 1, 15)]
    findings = run(snapshot([r1, r2], scans=(scan([r1, r2], links=good),)))
    assert not of_type(findings, FindingType.WEAK_BACKBONE)


def test_overloaded_parent() -> None:
    r1 = router("r1")
    kids = [end_device(f"e{i}") for i in range(8)]
    s = scan([r1, *kids], links=[child_link(k.ieee, "r1", 200) for k in kids])
    [finding] = of_type(run(snapshot([r1, *kids], scans=(s,))), FindingType.OVERLOADED_PARENT)
    assert finding.data["count"] == 8
    assert finding.severity is Severity.INFO
    s = scan([r1, *kids[:7]], links=[child_link(k.ieee, "r1", 200) for k in kids[:7]])
    assert not of_type(run(snapshot([r1, *kids[:7]], scans=(s,))), FindingType.OVERLOADED_PARENT)
    coordinator_kids = [end_device(f"c{i}") for i in range(20)]
    s = scan(coordinator_kids, links=[child_link(k.ieee, COORD, 200) for k in coordinator_kids])
    findings = run(snapshot([r1, *coordinator_kids], scans=(s,)))
    assert of_type(findings, FindingType.OVERLOADED_PARENT)[0].data["limit"] == 20


def test_too_few_routers() -> None:
    r1 = router("r1")
    ends = [end_device(f"e{i}") for i in range(9)]
    [finding] = of_type(run(snapshot([r1, *ends])), FindingType.TOO_FEW_ROUTERS)
    assert finding.data == {
        "routers": 1,
        "end_devices": 9,
        "recommended": 1,
        "floors_without": 0,
    }
    assert not of_type(run(snapshot([r1, *ends[:8]])), FindingType.TOO_FEW_ROUTERS)
    # A floor with end devices but no always-on router.
    upstairs = [replace(e, floor_id="og") for e in ends[:2]]
    [finding] = of_type(run(snapshot([r1, *upstairs])), FindingType.TOO_FEW_ROUTERS)
    assert finding.data["floors_without"] == 1
    assert not of_type(run(snapshot([])), FindingType.TOO_FEW_ROUTERS)


# --- F-15, F-16, F-17 -------------------------------------------------------------------


def test_prerequisites_and_firmware() -> None:
    info = SourceInfo(
        version="2.14.1",
        coordinator_type="ZStack3x0",
        coordinator_revision="20230101",
        availability_enabled=False,
        health_enabled=False,
    )
    findings = run(snapshot([], source_info=info))
    assert {f.data["option"] for f in of_type(findings, FindingType.PREREQUISITE_MISSING)} == {
        "availability",
        "health",
    }
    [firmware] = of_type(findings, FindingType.OUTDATED_FIRMWARE)
    assert firmware.data == {"adapter": "ZStack3x0", "current": "20230101", "minimum": "20230507"}
    for revision, adapter in (("20260310", "ZStack3x0"), ("1", "ember"), ("", "ZStack3x0")):
        info = SourceInfo(coordinator_type=adapter, coordinator_revision=revision)
        assert not of_type(run(snapshot([], source_info=info)), FindingType.OUTDATED_FIRMWARE)


def test_interview_and_unsupported() -> None:
    findings = run(
        snapshot([end_device("e1", interview_completed=False), end_device("e2", supported=False)])
    )
    assert [f.ieee for f in of_type(findings, FindingType.INTERVIEW_INCOMPLETE)] == ["e1"]
    assert [f.ieee for f in of_type(findings, FindingType.UNSUPPORTED_DEVICE)] == ["e2"]


# --- report: states, counts, actions ----------------------------------------------------


def test_report_battery_state_actions_and_network_score() -> None:
    r1 = router("r1")
    dead = [end_device(f"d{i}", last_seen=ago(days=40)) for i in range(2)]
    empty = end_device("b1", battery=5.0)
    ends = [end_device(f"e{i}") for i in range(9)]
    snap = snapshot([r1, *dead, empty, *ends])
    report = build_report(build_context(snap, CONFIG), run(snap))
    assert report.devices["b1"].state is DeviceState.BATTERY
    assert report.devices["b1"].battery == 5.0
    assert report.counts["battery_critical"] == 1
    assert [(a.key, a.count) for a in report.actions] == [
        ("remove_dead", 2),
        ("replace_batteries", 1),
        ("add_routers", 1),
    ]
    assert report.actions[0].items == ("d0", "d1")
    # The card marks exactly these devices on the map.
    assert report.actions[0].finding_type == "dead_device"
    assert len(report.actions[0].ieees) == 2
    # F-14 costs 12 points on the network score.
    without_f14 = [f for f in report.findings if f.type is not FindingType.TOO_FEW_ROUTERS]
    report_without = build_report(build_context(snap, CONFIG), tuple(without_f14))
    assert report_without.score is not None and report.score is not None
    assert report_without.score - report.score == 12


def test_actions_group_rooms_and_skip_duplicates() -> None:
    from builders import in_area  # noqa: PLC0415

    pt = in_area(router("pt"), "hall")
    kids = [in_area(end_device(f"k{i}"), "bath") for i in range(2)]
    s_ok = scan([pt, *kids], links=[child_link("k0", "pt", 200)])
    s_fail = scan([pt, *kids], failed={"pt"})
    snap = snapshot([pt, *kids], scans=(s_ok, s_fail, s_fail))
    report = build_report(build_context(snap, CONFIG), run(snap))
    keys = [a.key for a in report.actions]
    assert keys[:2] == ["power_part_time_routers", "add_router_rooms"]
    assert keys.count("power_part_time_routers") == 1
    assert report.actions[1].items == ("Bath",)
    assert report.actions[1].area_ids == ("bath",)
