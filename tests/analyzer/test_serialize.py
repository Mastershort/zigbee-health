"""Round trip of the compact scan storage format."""

from __future__ import annotations

import json

from analyzer.models import Relationship
from analyzer.serialize import scan_from_dict, scan_to_dict
from analyzer.topology import Topology
from analyzer.z2m_payloads import parse_networkmap
from builders import NOW, load_fixture


def test_roundtrip_keeps_what_rules_need() -> None:
    scan = parse_networkmap(load_fixture("networkmap_raw.json"), NOW)
    restored = scan_from_dict(json.loads(json.dumps(scan_to_dict(scan))))

    assert restored.timestamp == scan.timestamp
    assert restored.nodes == scan.nodes
    parent_links = [link for link in restored.links if link.relationship == Relationship.CHILD]
    assert len(parent_links) == 14
    # Router/coordinator links survive for the backbone rule; end device siblings do not.
    assert all(
        link.relationship == Relationship.CHILD or link.device_type in (0, 1)
        for link in restored.links
    )
    assert len(restored.links) == 81
    before, after = Topology([scan]), Topology([restored])
    for ieee in scan.nodes:
        assert before.parent_links(ieee) == after.parent_links(ieee)
