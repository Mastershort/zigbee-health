"""Scores, device states, rooms and the analyze() entry point."""

from __future__ import annotations

from datetime import timedelta

import pytest

from analyzer import AnalyzerConfig, FindingTracker, analyze
from analyzer.findings import build_context, evaluate
from analyzer.models import (
    DeviceState,
    Finding,
    FindingType,
    NetworkLevel,
    NetworkReport,
    NetworkSnapshot,
    RouterKind,
    Severity,
)
from analyzer.report import build_report
from analyzer.rooms import (
    RECOMMEND_ADD_ROUTER,
    RECOMMEND_ASSIGN_AREA,
    RECOMMEND_FIX_PART_TIME_ROUTER,
)
from analyzer.score import device_score, level, network_score, room_score
from builders import NOW, ago, child_link, end_device, in_area, router, scan, snapshot


def finding(severity: Severity, ftype: FindingType = FindingType.WEAK_LINK) -> Finding:
    return Finding(id=f"{ftype}:{severity}", type=ftype, severity=severity, ieee="x")


def test_device_score() -> None:
    assert device_score([]) == 100
    assert device_score([finding(Severity.CRITICAL)]) == 60
    assert device_score([finding(Severity.WARNING), finding(Severity.INFO)]) == 75
    assert device_score([finding(Severity.CRITICAL)] * 3) == 0


def test_room_score() -> None:
    room = Finding(id="r", type=FindingType.ROOM_WITHOUT_ROUTER, severity=Severity.WARNING)
    assert room_score([100, 60], []) == 80
    assert room_score([100, 60], [room]) == 60
    assert room_score([], []) == 100
    assert room_score([10], [room]) == 0


def test_network_score_weights_routers_and_clamps() -> None:
    assert network_score([(100, True), (40, False)], []) == 80  # (200 + 40) / 3
    assert network_score([], []) == 100
    assert network_score([(0, True)], []) == 5


@pytest.mark.parametrize(
    ("score", "expected"),
    [(80, NetworkLevel.STABLE), (79, NetworkLevel.DEGRADED), (55, NetworkLevel.DEGRADED),
     (54, NetworkLevel.FRAGILE)],
)  # fmt: skip
def test_level(score: int, expected: NetworkLevel) -> None:
    assert level(score) is expected


def _report(snap: NetworkSnapshot) -> NetworkReport:
    ctx = build_context(snap, AnalyzerConfig())
    return build_report(ctx, evaluate(ctx))


def test_device_states_and_topology_in_report() -> None:
    r1 = in_area(router("r1"), "kitchen")
    pt = in_area(router("pt"), "kitchen")
    dead = in_area(end_device("dead", last_seen=ago(days=40)), "kitchen")
    weak = in_area(end_device("weak"), "kitchen")
    gone = in_area(end_device("gone", last_seen=ago(days=5)), "kitchen")
    ignored = in_area(end_device("ign", last_seen=ago(days=40)), "kitchen")
    devices = [r1, pt, dead, weak, gone, ignored]
    links = [child_link("weak", "r1", 50)]
    scans = (scan(devices, failed={"pt"}, links=links), scan(devices, failed={"pt"}, links=links))
    report = _report(snapshot(devices, scans=scans, ignored_devices=frozenset({"ign"})))

    states = {ieee: d.state for ieee, d in report.devices.items()}
    assert states == {
        "r1": DeviceState.OK,
        "pt": DeviceState.PART_TIME_ROUTER,
        "dead": DeviceState.DEAD,
        "weak": DeviceState.WEAK,
        "gone": DeviceState.OFFLINE,
        "ign": DeviceState.IGNORED,
    }
    assert report.devices["weak"].parent == "r1"
    assert report.devices["weak"].parent_lqi == 50
    assert report.devices["r1"].children == ("weak",)
    assert report.devices["r1"].router_kind is RouterKind.ALWAYS_ON
    assert report.devices["dead"].score == 60
    assert report.counts["devices"] == 5  # ignored device excluded

    [room] = report.rooms
    assert room.area_id == "kitchen"
    assert room.end_devices == 2  # weak, gone (dead and ignored excluded)
    assert room.always_on_routers == 1
    assert room.part_time_routers == 1
    assert room.weakest_lqi == 50
    assert room.recommendation is None


def test_room_recommendations() -> None:
    e1, e2 = in_area(end_device("e1"), "bath"), in_area(end_device("e2"), "bath")
    loose = end_device("e3")
    report = _report(snapshot([e1, e2, loose]))
    rooms = {r.area_id: r for r in report.rooms}
    assert rooms["bath"].recommendation == RECOMMEND_ADD_ROUTER
    assert rooms["bath"].score == 80  # 100 - 20 for F-13
    assert rooms[None].recommendation == RECOMMEND_ASSIGN_AREA
    # Rooms are sorted, "without area" last.
    assert [r.area_id for r in report.rooms] == ["bath", None]

    pt = in_area(router("pt"), "hall")
    child = in_area(end_device("c"), "hall")
    scans = (
        scan([pt, child], links=[child_link("c", "pt", 200)]),
        scan([pt, child], failed={"pt"}),
        scan([pt, child], failed={"pt"}),
    )
    report = _report(snapshot([pt, child], scans=scans))
    [hall] = report.rooms
    assert hall.recommendation == RECOMMEND_FIX_PART_TIME_ROUTER


def test_unknown_parent_only_with_scan() -> None:
    e1 = end_device("e1")
    assert _report(snapshot([e1])).unknown_parent == ()
    assert _report(snapshot([e1], scans=(scan([e1]),))).unknown_parent == ("e1",)


def test_analyze_applies_hysteresis_and_pause() -> None:
    config = AnalyzerConfig(min_duration=timedelta(minutes=30))
    tracker = FindingTracker(config)
    dead = end_device("e1", last_seen=ago(days=40))

    # The report shows the raw findings at once; only announcing waits for hysteresis.
    report, update = analyze(snapshot([dead]), config, tracker)
    assert {f.type for f in report.findings} == {
        FindingType.DEAD_DEVICE,
        FindingType.DEVICES_WITHOUT_AREA,
    }
    assert report.score == 60
    assert report.level is NetworkLevel.DEGRADED
    assert update.raised == ()
    assert update.active == ()

    later = NOW + timedelta(minutes=30)
    report, update = analyze(snapshot([dead], now=later), config, tracker)
    assert {f.type for f in update.raised} == {
        FindingType.DEAD_DEVICE,
        FindingType.DEVICES_WITHOUT_AREA,
    }
    assert len(update.active) == 2

    # Z2M offline: paused, findings kept, nothing resolved even though the device is gone.
    paused, update = analyze(snapshot([], now=later, z2m_online=False), config, tracker)
    assert paused.paused and paused.level is NetworkLevel.PAUSED
    assert len(paused.findings) == 2
    assert update.raised == () and update.resolved == ()
