"""Topology derived from raw network maps: parents, children, unknown neighbors.

Neighbor table semantics (verified against the fixtures): each link was reported by the
queried device ``target`` about its neighbor ``source``. ``relationship == CHILD`` means
``source`` is a child of ``target``, i.e. ``target`` is the parent of ``source``. Only
routers are queried, so children of a router are known only from scans in which that
router delivered its table.
"""

from __future__ import annotations

from dataclasses import dataclass
from statistics import median
from typing import TYPE_CHECKING

from .models import Relationship

if TYPE_CHECKING:
    from collections.abc import Iterable, Sequence

    from .models import NetworkScan


@dataclass(frozen=True, slots=True)
class ParentLink:
    parent: str
    lqi: int
    scan_index: int  # index into the scan sequence the link was taken from


def parent_index(scan: NetworkScan) -> dict[str, tuple[str, int]]:
    """``child -> (parent, lqi)`` for one scan, built in a single pass over the links."""
    index: dict[str, tuple[str, int]] = {}
    for link in scan.links:
        if link.relationship != Relationship.CHILD:
            continue
        best = index.get(link.source)
        # Several entries: take the one with the highest LQI (section 2).
        if best is None or link.lqi > best[1]:
            index[link.source] = (link.target, link.lqi)
    return index


class Topology:
    """Parent lookups over a sequence of scans (oldest first), indexed once per analysis."""

    def __init__(self, scans: Sequence[NetworkScan]) -> None:
        self._scans = list(scans)
        self._indexes = [parent_index(scan) for scan in scans]

    def parent_links(self, ieee: str, last: int = 0) -> list[ParentLink]:
        """Parent links of a device over the last ``last`` scans (0 = all), oldest first."""
        start = max(0, len(self._indexes) - last) if last > 0 else 0
        return [
            ParentLink(parent=found[0], lqi=found[1], scan_index=i)
            for i in range(start, len(self._indexes))
            if (found := self._indexes[i].get(ieee)) is not None
        ]

    def last_known_parent(self, ieee: str, max_age: int) -> ParentLink | None:
        """Parent from the newest of the last ``max_age`` scans that reported one."""
        links = self.parent_links(ieee, max_age)
        return links[-1] if links else None

    def parent_lqi_median(self, ieee: str, parent: str, samples: int) -> float | None:
        """Median LQI to ``parent`` over the last ``samples`` measurements (0 = not measured)."""
        values = [
            link.lqi for link in self.parent_links(ieee) if link.parent == parent and link.lqi > 0
        ][-samples:]
        return float(median(values)) if values else None

    def backbone_lqi(self, ieee: str, peers: set[str], samples: int) -> tuple[float, str] | None:
        """Median of the best link between a router and any peer over the last scans.

        Both directions count (the router's own table and the peers' tables). LQI 0 and 1
        mean "not measured" and are ignored. Returns (median LQI, best peer of newest scan).
        """
        best_per_scan: list[tuple[int, str]] = []
        for scan in self._scans[-samples:]:
            best: tuple[int, str] | None = None
            for link in scan.links:
                if link.lqi <= 1:
                    continue
                if link.source == ieee and link.target in peers:
                    peer = link.target
                elif link.target == ieee and link.source in peers:
                    peer = link.source
                else:
                    continue
                if best is None or link.lqi > best[0]:
                    best = (link.lqi, peer)
            if best is not None:
                best_per_scan.append(best)
        if not best_per_scan:
            return None
        return float(median(lqi for lqi, _ in best_per_scan)), best_per_scan[-1][1]


def children_by_parent(parents: dict[str, str]) -> dict[str, tuple[str, ...]]:
    """Invert ``child -> parent`` into ``parent -> children`` (sorted, deterministic)."""
    result: dict[str, list[str]] = {}
    for child, parent in parents.items():
        result.setdefault(parent, []).append(child)
    return {parent: tuple(sorted(children)) for parent, children in result.items()}


def unknown_neighbors(scan: NetworkScan, known: Iterable[str]) -> tuple[str, ...]:
    """IEEE addresses in neighbor tables that Z2M does not know (e.g. removed but still joined)."""
    known_set = set(known)
    seen = {link.source for link in scan.links} | {link.target for link in scan.links}
    return tuple(sorted(seen - known_set))
