"""Router planner: simulate one more always-on router per area."""

from __future__ import annotations

from analyzer.config import AnalyzerConfig
from analyzer.planner import plan_all, plan_router
from builders import COORD, child_link, end_device, in_area, router, scan, snapshot

CONFIG = AnalyzerConfig()


def test_plan_room_without_router_and_part_time_parent() -> None:
    hall_router = in_area(router("r1"), "hall")
    lamp = in_area(router("lamp"), "kitchen")  # part-time
    k1 = in_area(end_device("k1"), "kitchen")  # child of the lamp
    k2 = in_area(end_device("k2"), "kitchen")  # weak link to the coordinator
    k3 = in_area(end_device("k3"), "kitchen")  # parent unknown
    h1 = in_area(end_device("h1"), "hall")  # fine
    devices = [hall_router, lamp, k1, k2, k3, h1]
    answered = scan(
        devices,
        links=[
            child_link("k1", "lamp", 200),
            child_link("k2", COORD, 50),
            child_link("h1", "r1", 200),
        ],
    )
    failed = scan(
        devices,
        failed={"lamp"},
        links=[child_link("k2", COORD, 50), child_link("h1", "r1", 200)],
    )
    snap = snapshot(devices, scans=(answered, failed, failed))

    result = plan_router(snap, CONFIG, "kitchen")
    assert result is not None
    assert result.area_name == "Kitchen"
    assert {(i.name, i.reason) for i in result.improved} == {
        ("k1", "part_time_parent"),
        ("k2", "weak_link"),
        ("k3", "no_parent"),
    }
    assert result.resolved["room_without_router"] == 1
    assert result.resolved["weak_link"] == 1
    assert result.resolved["children_on_part_time_router"] == 1
    assert result.gain >= 0
    assert result.room_score_after > result.room_score_before

    ranking = plan_all(snap, CONFIG)
    assert [r.area_id for r in ranking] == ["kitchen", "hall"]
    assert ranking[1].improved == ()
    assert ranking[1].gain == 0  # a plug where everything is fine brings nothing
    assert ranking[1].impact == 0


def test_plan_needs_end_devices_in_area() -> None:
    r1 = in_area(router("r1"), "garage")
    assert plan_router(snapshot([r1]), CONFIG, "garage") is None
    assert plan_all(snapshot([end_device("e1")]), CONFIG) == []
