"""Compact, JSON-serialisable form of network scans for persistence (section 4).

Only what the rules need is kept: node role, ``failed`` flag, ``last_seen``, the parent
links (``relationship == CHILD``) and links between routers/coordinator (backbone, F-08).
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from .models import DeviceType, NetworkScan, Relationship, ScanLink, ScanNode

# deviceType of the neighbor: 0 = coordinator, 1 = router.
_ROUTER_TYPES = (0, 1)


def scan_to_dict(scan: NetworkScan) -> dict[str, Any]:
    return {
        "ts": scan.timestamp.isoformat(),
        "nodes": [
            [
                node.ieee,
                node.friendly_name,
                node.type.value,
                node.failed,
                node.last_seen.isoformat() if node.last_seen else None,
            ]
            for node in scan.nodes.values()
        ],
        "links": [
            [link.source, link.target, link.lqi, link.relationship, link.device_type]
            for link in scan.links
            if link.relationship == Relationship.CHILD or link.device_type in _ROUTER_TYPES
        ],
    }


def scan_from_dict(data: dict[str, Any]) -> NetworkScan:
    nodes = {}
    for ieee, name, node_type, failed, last_seen in data["nodes"]:
        nodes[ieee] = ScanNode(
            ieee=ieee,
            friendly_name=name,
            type=DeviceType(node_type),
            failed=bool(failed),
            last_seen=datetime.fromisoformat(last_seen) if last_seen else None,
        )
    if "links" in data:
        raw_links = data["links"]
    else:  # storage written by 0.1.0: parent links only
        raw_links = [[s, t, lqi, Relationship.CHILD, 2] for s, t, lqi in data["parents"]]
    links = tuple(
        ScanLink(
            source=source,
            target=target,
            lqi=int(lqi),
            relationship=int(relationship),
            device_type=int(device_type),
            depth=255,
        )
        for source, target, lqi, relationship, device_type in raw_links
    )
    return NetworkScan(timestamp=datetime.fromisoformat(data["ts"]), nodes=nodes, links=links)
