"""Unit tests per rule with positive, negative and boundary cases."""

from __future__ import annotations

from dataclasses import replace
from datetime import timedelta

import pytest

from analyzer.config import AnalyzerConfig
from analyzer.findings import build_context, evaluate
from analyzer.models import (
    AvailabilityChange,
    Finding,
    FindingType,
    NetworkSnapshot,
    Severity,
)
from builders import (
    COORD,
    ago,
    child_link,
    end_device,
    in_area,
    router,
    scan,
    snapshot,
)

CONFIG = AnalyzerConfig()


def run(snap: NetworkSnapshot, config: AnalyzerConfig = CONFIG) -> tuple[Finding, ...]:
    return evaluate(build_context(snap, config))


def of_type(findings: tuple[Finding, ...], finding_type: FindingType) -> list[Finding]:
    return [f for f in findings if f.type is finding_type]


def ids(findings: tuple[Finding, ...], finding_type: FindingType) -> set[str | None]:
    return {f.ieee for f in of_type(findings, finding_type)}


# --- F-01 dead device ------------------------------------------------------------------


@pytest.mark.parametrize(
    ("age", "dead"),
    [(timedelta(days=30), True), (timedelta(days=29, hours=23), False)],
)
def test_dead_end_device_boundary(age: timedelta, dead: bool) -> None:
    device = end_device("e1", last_seen=ago(seconds=age.total_seconds()))
    findings = run(snapshot([device]))
    assert (ids(findings, FindingType.DEAD_DEVICE) == {"e1"}) is dead
    if dead:
        finding = of_type(findings, FindingType.DEAD_DEVICE)[0]
        assert finding.severity is Severity.CRITICAL
        assert finding.id == "dead_device:e1"
        assert finding.data["days"] == 30
        # Dead supersedes disappeared.
        assert not of_type(findings, FindingType.DISAPPEARED)


def test_dead_router_needs_failed_scan() -> None:
    old = router("r1", last_seen=ago(days=90))
    answered = run(snapshot([old], scans=(scan([old]),)))
    assert not of_type(answered, FindingType.DEAD_DEVICE)
    failed = run(snapshot([old], scans=(scan([old], failed={"r1"}),)))
    assert ids(failed, FindingType.DEAD_DEVICE) == {"r1"}


def test_dead_router_by_availability_without_scan() -> None:
    offline = router("r1", last_seen=ago(days=90), available=False)
    assert ids(run(snapshot([offline])), FindingType.DEAD_DEVICE) == {"r1"}
    online = replace(offline, available=True)
    assert not of_type(run(snapshot([online])), FindingType.DEAD_DEVICE)
    unknown = replace(offline, available=None)
    assert not of_type(run(snapshot([unknown])), FindingType.DEAD_DEVICE)


def test_device_without_last_seen_is_never_dead() -> None:
    device = end_device("e1", last_seen=None)
    types = {f.type for f in run(snapshot([device]))}
    assert FindingType.DEAD_DEVICE not in types
    assert FindingType.DISAPPEARED not in types


def test_coordinator_disabled_and_ignored_devices_produce_nothing() -> None:
    disabled = end_device("e1", last_seen=ago(days=100), disabled=True)
    ignored = end_device("e2", last_seen=ago(days=100))
    snap = snapshot([disabled, ignored], ignored_devices=frozenset({"e2"}))
    assert run(snap) == ()


def test_ignored_finding_type_per_device() -> None:
    device = end_device("e1", last_seen=ago(days=100))
    snap = snapshot([device], ignored_findings=frozenset({("e1", FindingType.DEAD_DEVICE)}))
    assert not of_type(run(snap), FindingType.DEAD_DEVICE)


# --- F-02 disappeared --------------------------------------------------------------------


@pytest.mark.parametrize(
    ("chatty", "age", "expected"),
    [
        (True, timedelta(hours=12, minutes=1), True),
        (True, timedelta(hours=12), False),
        (False, timedelta(days=3, minutes=1), True),
        (False, timedelta(days=2), False),
    ],
)
def test_disappeared_end_device_tolerance(chatty: bool, age: timedelta, expected: bool) -> None:
    device = end_device("e1", chatty=chatty, last_seen=ago(seconds=age.total_seconds()))
    assert (ids(run(snapshot([device])), FindingType.DISAPPEARED) == {"e1"}) is expected


def test_tolerance_longer_than_dead_after_yields_dead() -> None:
    config = AnalyzerConfig(dead_after=timedelta(days=2))
    device = end_device("e1", last_seen=ago(days=2, hours=12))
    findings = run(snapshot([device]), config)
    assert ids(findings, FindingType.DEAD_DEVICE) == {"e1"}
    assert not of_type(findings, FindingType.DISAPPEARED)


def test_no_disappeared_during_z2m_restart_grace() -> None:
    device = end_device("e1", chatty=True, last_seen=ago(days=1))
    snap = snapshot([device], z2m_online_since=ago(minutes=10))
    assert not of_type(run(snap), FindingType.DISAPPEARED)
    snap = snapshot([device], z2m_online_since=ago(minutes=16))
    assert ids(run(snap), FindingType.DISAPPEARED) == {"e1"}


def test_router_offline_by_availability() -> None:
    fresh = router("r1", available=False, available_since=ago(minutes=59))
    assert not of_type(run(snapshot([fresh])), FindingType.DISAPPEARED)
    long = replace(fresh, available_since=ago(minutes=61))
    assert ids(run(snapshot([long])), FindingType.DISAPPEARED) == {"r1"}
    unknown_since = replace(fresh, available_since=None)
    assert ids(run(snapshot([unknown_since])), FindingType.DISAPPEARED) == {"r1"}
    online = replace(fresh, available=True)
    assert not of_type(run(snapshot([online])), FindingType.DISAPPEARED)


def test_router_offline_without_availability_uses_scan() -> None:
    r1 = router("r1", last_seen=ago(hours=2))
    one_failure = snapshot([r1], scans=(scan([r1]), scan([r1], failed={"r1"})))
    assert ids(run(one_failure), FindingType.DISAPPEARED) == {"r1"}
    recently_seen = replace(r1, last_seen=ago(minutes=30))
    snap = snapshot([recently_seen], scans=(scan([recently_seen], failed={"r1"}),))
    assert not of_type(run(snap), FindingType.DISAPPEARED)
    answered = snapshot([r1], scans=(scan([r1]),))
    assert not of_type(run(answered), FindingType.DISAPPEARED)


# --- F-05 / F-06 part-time routers -------------------------------------------------------


def test_part_time_router_two_of_three_scans() -> None:
    r1 = router("r1")
    two = (scan([r1], failed={"r1"}), scan([r1]), scan([r1], failed={"r1"}))
    findings = run(snapshot([r1], scans=two))
    assert ids(findings, FindingType.PART_TIME_ROUTER) == {"r1"}
    assert of_type(findings, FindingType.PART_TIME_ROUTER)[0].severity is Severity.WARNING
    # A part-time router is not additionally "disappeared".
    assert not of_type(findings, FindingType.DISAPPEARED)

    one = (scan([r1], failed={"r1"}), scan([r1]), scan([r1]))
    assert not of_type(run(snapshot([r1], scans=one)), FindingType.PART_TIME_ROUTER)
    # Only the last three scans count.
    old = (scan([r1], failed={"r1"}), scan([r1], failed={"r1"}), scan([r1]), scan([r1]), scan([r1]))
    assert not of_type(run(snapshot([r1], scans=old)), FindingType.PART_TIME_ROUTER)


def test_part_time_router_by_availability_flaps() -> None:
    changes = tuple(
        AvailabilityChange(ago(days=d, hours=h), online)
        for d in (6, 4, 2)
        for h, online in ((1, False), (0, True))
    )
    r1 = router("r1", available=True)
    findings = run(snapshot([r1], availability_changes={"r1": changes}))
    assert ids(findings, FindingType.PART_TIME_ROUTER) == {"r1"}
    # Two reconnects in the window plus one older one are not enough.
    shifted = (AvailabilityChange(ago(days=9), False), AvailabilityChange(ago(days=8), True))
    few = shifted + changes[2:]
    assert not of_type(
        run(snapshot([r1], availability_changes={"r1": few})), FindingType.PART_TIME_ROUTER
    )


def test_part_time_router_by_light_unavailable_events() -> None:
    r1 = router("r1")
    events = {"r1": (ago(days=1), ago(days=2), ago(days=3))}
    assert ids(
        run(snapshot([r1], light_unavailable_events=events)), FindingType.PART_TIME_ROUTER
    ) == {"r1"}


def test_children_on_part_time_router_is_critical_and_grouped() -> None:
    r1 = router("r1", friendly_name="Kueche Licht")
    e1 = end_device("e1", friendly_name="FS_A")
    e2 = end_device("e2", friendly_name="FS_B")
    answered = scan([r1, e1, e2], links=[child_link("e1", "r1", 150), child_link("e2", "r1", 140)])
    scans = (answered, scan([r1, e1, e2], failed={"r1"}), scan([r1, e1, e2], failed={"r1"}))
    findings = run(snapshot([r1, e1, e2], scans=scans))

    [f06] = of_type(findings, FindingType.CHILDREN_ON_PART_TIME_ROUTER)
    assert f06.id == "children_on_part_time_router:r1"
    assert f06.severity is Severity.CRITICAL
    assert f06.related == ("e1", "e2")
    assert f06.data["children"] == "FS_A, FS_B"
    assert f06.data["count"] == 2
    [f05] = of_type(findings, FindingType.PART_TIME_ROUTER)
    assert f05.severity is Severity.CRITICAL


def test_dead_router_is_not_part_time() -> None:
    r1 = router("r1", last_seen=ago(days=40))
    scans = (scan([r1], failed={"r1"}), scan([r1], failed={"r1"}))
    findings = run(snapshot([r1], scans=scans))
    assert ids(findings, FindingType.DEAD_DEVICE) == {"r1"}
    assert not of_type(findings, FindingType.PART_TIME_ROUTER)


# --- F-07 weak link ----------------------------------------------------------------------


def _weak_snapshot(*lqis: int) -> NetworkSnapshot:
    r1 = router("r1")
    e1 = end_device("e1")
    scans = tuple(scan([r1, e1], links=[child_link("e1", "r1", lqi)]) for lqi in lqis)
    return snapshot([r1, e1], scans=scans)


@pytest.mark.parametrize(
    ("lqis", "weak"),
    [
        ((79,), True),
        ((80,), False),
        ((200, 60, 70), True),  # median 70
        ((60, 200, 200), False),  # median 200
        ((30, 30, 100, 100, 90), False),  # only last three count: median 100
        ((0,), False),  # 0 = not measured
    ],
)
def test_weak_link_median(lqis: tuple[int, ...], weak: bool) -> None:
    findings = run(_weak_snapshot(*lqis))
    assert (ids(findings, FindingType.WEAK_LINK) == {"e1"}) is weak


def test_weak_link_uses_best_of_multiple_parent_entries() -> None:
    r1, r2, e1 = router("r1"), router("r2"), end_device("e1")
    s = scan([r1, r2, e1], links=[child_link("e1", "r1", 40), child_link("e1", "r2", 120)])
    findings = run(snapshot([r1, r2, e1], scans=(s,)))
    assert not of_type(findings, FindingType.WEAK_LINK)


def test_weak_link_to_coordinator_names_parent() -> None:
    e1 = end_device("e1")
    s = scan([e1], links=[child_link("e1", COORD, 57)])
    [finding] = of_type(run(snapshot([e1], scans=(s,))), FindingType.WEAK_LINK)
    assert finding.data["parent"] == "Coordinator"
    assert finding.data["lqi"] == 57


def test_weak_link_ignores_dead_device() -> None:
    e1 = end_device("e1", last_seen=ago(days=40))
    s = scan([e1], links=[child_link("e1", COORD, 20)])
    assert not of_type(run(snapshot([e1], scans=(s,))), FindingType.WEAK_LINK)


# --- F-13 room without router, F-18 devices without area ---------------------------------


def test_room_without_always_on_router() -> None:
    e1, e2 = in_area(end_device("e1"), "kitchen"), in_area(end_device("e2"), "kitchen")
    findings = run(snapshot([e1, e2]))
    [finding] = of_type(findings, FindingType.ROOM_WITHOUT_ROUTER)
    assert finding.id == "room_without_router:kitchen"
    assert finding.area_id == "kitchen"
    assert finding.data == {"room": "Kitchen", "count": 2}
    assert finding.ieee is None


def test_room_with_router_or_single_device_is_fine() -> None:
    e1, e2 = in_area(end_device("e1"), "kitchen"), in_area(end_device("e2"), "kitchen")
    r1 = in_area(router("r1"), "kitchen")
    assert not of_type(run(snapshot([e1, e2, r1])), FindingType.ROOM_WITHOUT_ROUTER)
    assert not of_type(run(snapshot([e1])), FindingType.ROOM_WITHOUT_ROUTER)


def test_room_part_time_or_offline_router_does_not_count() -> None:
    e1, e2 = in_area(end_device("e1"), "kitchen"), in_area(end_device("e2"), "kitchen")
    part_time = in_area(router("r1"), "kitchen")
    scans = (scan([part_time], failed={"r1"}), scan([part_time], failed={"r1"}))
    findings = run(snapshot([e1, e2, part_time], scans=scans))
    assert of_type(findings, FindingType.ROOM_WITHOUT_ROUTER)

    offline = in_area(router("r2", available=False, available_since=ago(hours=3)), "kitchen")
    assert of_type(run(snapshot([e1, e2, offline])), FindingType.ROOM_WITHOUT_ROUTER)


def test_room_dead_end_devices_do_not_count() -> None:
    e1 = in_area(end_device("e1"), "kitchen")
    e2 = in_area(end_device("e2", last_seen=ago(days=40)), "kitchen")
    assert not of_type(run(snapshot([e1, e2])), FindingType.ROOM_WITHOUT_ROUTER)


def test_devices_without_area() -> None:
    e1, e2 = in_area(end_device("e1"), "kitchen"), end_device("e2")
    [finding] = of_type(run(snapshot([e1, e2])), FindingType.DEVICES_WITHOUT_AREA)
    assert finding.data["count"] == 1
    assert finding.related == ("e2",)
    assert finding.severity is Severity.INFO
    assert not of_type(run(snapshot([e1])), FindingType.DEVICES_WITHOUT_AREA)


def test_part_time_router_by_announces_without_availability() -> None:
    from analyzer.history import DeviceHistory, NetworkHistory  # noqa: PLC0415

    r1 = router("r1")
    history = NetworkHistory(
        devices={"r1": DeviceHistory(announces=[ago(days=1), ago(days=3), ago(days=5)])}
    )
    assert ids(run(snapshot([r1], history=history)), FindingType.PART_TIME_ROUTER) == {"r1"}
    old = NetworkHistory(devices={"r1": DeviceHistory(announces=[ago(days=8), ago(days=1)])})
    assert not of_type(run(snapshot([r1], history=old)), FindingType.PART_TIME_ROUTER)
