"""Topology helpers and link semantics."""

from __future__ import annotations

from analyzer.models import Relationship, ScanLink
from analyzer.topology import Topology, children_by_parent, unknown_neighbors
from builders import child_link, end_device, router, scan


def test_sibling_and_parent_relationships_are_not_parents() -> None:
    r1, e1 = router("r1"), end_device("e1")
    sibling = ScanLink("e1", "r1", 200, Relationship.SIBLING, 2, 1)
    parent = ScanLink("e1", "r1", 200, Relationship.PARENT, 1, 1)
    assert Topology([scan([r1, e1], links=[sibling, parent])]).parent_links("e1") == []


def test_last_known_parent_falls_back_to_older_scans_within_limit() -> None:
    r1, e1 = router("r1"), end_device("e1")
    scans = [scan([r1, e1], links=[child_link("e1", "r1", 90)]), scan([r1, e1]), scan([r1, e1])]
    found = Topology(scans).last_known_parent("e1", max_age=3)
    assert found is not None and found.parent == "r1" and found.scan_index == 0
    assert Topology(scans).last_known_parent("e1", max_age=2) is None


def test_parent_change_uses_newest() -> None:
    r1, r2, e1 = router("r1"), router("r2"), end_device("e1")
    scans = [
        scan([r1, e1], links=[child_link("e1", "r1", 90)]),
        scan([r2, e1], links=[child_link("e1", "r2", 150)]),
    ]
    found = Topology(scans).last_known_parent("e1", max_age=7)
    assert found is not None and found.parent == "r2"
    # Median only over measurements to the current parent.
    assert Topology(scans).parent_lqi_median("e1", "r2", 3) == 150
    assert Topology(scans).parent_lqi_median("e1", "r3", 3) is None


def test_children_by_parent_and_unknown_neighbors() -> None:
    assert children_by_parent({"b": "r", "a": "r", "c": "s"}) == {"r": ("a", "b"), "s": ("c",)}
    s = scan([router("r1")], links=[child_link("ghost", "r1", 10)])
    assert unknown_neighbors(s, ["r1"]) == ("ghost",)
