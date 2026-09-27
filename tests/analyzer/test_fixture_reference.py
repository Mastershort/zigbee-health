"""Reference analysis of the real 49-node network (section 11, recalculated for this data).

Time reference: newest ``lastSeen`` of the latest network map. ``dead_after`` = 60 days.
See docs/FINDINGS.md "Referenz-Auswertung" for the derivation of every expected value.
"""

from __future__ import annotations

from collections import Counter
from datetime import timedelta

import pytest

from analyzer.config import AnalyzerConfig
from analyzer.findings import build_context, evaluate
from analyzer.models import (
    DeviceState,
    FindingType,
    NetworkReport,
    NetworkScan,
    NetworkSnapshot,
    RouterKind,
    Severity,
)
from analyzer.report import build_report
from analyzer.timeutil import parse_last_seen
from analyzer.z2m_payloads import parse_bridge_devices, parse_networkmap
from builders import load_fixture


def _scan(name: str) -> NetworkScan:
    payload = load_fixture(name)
    stamps = [parse_last_seen(n["lastSeen"]) for n in payload["data"]["value"]["nodes"]]
    return parse_networkmap(payload, max(s for s in stamps if s is not None))


def _report(*names: str) -> NetworkReport:
    scans = tuple(_scan(name) for name in names)
    devices = parse_bridge_devices(load_fixture("bridge_devices.json"))
    snapshot = NetworkSnapshot(now=scans[-1].timestamp, devices=devices, scans=scans)
    ctx = build_context(snapshot, AnalyzerConfig(dead_after=timedelta(days=60)))
    return build_report(ctx, evaluate(ctx))


@pytest.fixture(scope="module")
def report() -> NetworkReport:
    return _report("networkmap_raw.json", "networkmap_raw_2.json")


def _names(report: NetworkReport, finding_type: FindingType) -> set[str]:
    return {
        report.devices[f.ieee].friendly_name
        for f in report.findings
        if f.type is finding_type and f.ieee
    }


def test_dead_devices(report: NetworkReport) -> None:
    assert _names(report, FindingType.DEAD_DEVICE) == {
        # end devices silent > 60 days
        "Klima Flur", "Klima Gäste-WC", "Bewegung Bad", "Sensor Schlafzimmer",
        "Fenster Büro Vorne", "Haustür Flur",
        # routers silent > 60 days that did not answer the network map
        "Licht Bad", "Stimmungslicht Wohnzimmer", "Stehlampe Wohnzimmer", "Steckdose Flur",
        "Steckdose Hauswirtschaft", "Deko Flur unten", "Licht Schlafzimmer",
    }  # fmt: skip


def test_sonoff_router_with_old_last_seen_is_alive(report: NetworkReport) -> None:
    # last_seen 247 days ago, but it delivered its neighbor table.
    sonoff = next(d for d in report.devices.values() if d.friendly_name == "Router Flur")
    assert sonoff.state is DeviceState.OK
    assert sonoff.router_kind is RouterKind.ALWAYS_ON


def test_disappeared(report: NetworkReport) -> None:
    # Fernbedienung Wohnzimmer: silent button, 18 days. Klima Wohnzimmer: chatty sensor, 7 days.
    assert _names(report, FindingType.DISAPPEARED) == {
        "Fernbedienung Wohnzimmer",
        "Klima Wohnzimmer",
    }


def test_part_time_routers(report: NetworkReport) -> None:
    assert _names(report, FindingType.PART_TIME_ROUTER) == {
        "Deckenlicht Küche", "Deckenlicht Esszimmer", "Licht Bad RGB", "Licht Ankleide",
        "Deko Flur oben", "Steckdose Wohnzimmer TV", "Steckdose Kinderzimmer TV",
    }  # fmt: skip
    # No end device has a part-time router as known parent → no F-06, all warnings.
    assert not _names(report, FindingType.CHILDREN_ON_PART_TIME_ROUTER)
    assert all(
        f.severity is Severity.WARNING
        for f in report.findings
        if f.type is FindingType.PART_TIME_ROUTER
    )


def test_always_on_routers(report: NetworkReport) -> None:
    always_on = {
        d.friendly_name
        for d in report.devices.values()
        if d.router_kind is RouterKind.ALWAYS_ON and d.state is not DeviceState.DEAD
    }
    assert always_on == {
        "Router Flur", "Lampe Wohnzimmer", "Licht Kinderzimmer", "Steckdosenleiste Büro",
        "Schranklicht Wohnzimmer", "Steckdose Küche", "Steckdose Wohnzimmer Fernseher",
    }  # fmt: skip


def test_weak_links(report: NetworkReport) -> None:
    weak = [f for f in report.findings if f.type is FindingType.WEAK_LINK]
    assert [
        (report.devices[f.ieee].friendly_name, f.data["parent"], f.data["lqi"])
        for f in weak
        if f.ieee
    ] == [("Klima Küche", "Coordinator", 60)]  # median(57, 62)


def test_devices_without_area(report: NetworkReport) -> None:
    finding = next(f for f in report.findings if f.type is FindingType.DEVICES_WITHOUT_AREA)
    assert finding.data["count"] == 48
    assert not [f for f in report.findings if f.type is FindingType.ROOM_WITHOUT_ROUTER]


def test_topology_extras(report: NetworkReport) -> None:
    # Philips router still in neighbor tables but unknown to Z2M.
    assert report.unknown_neighbors == ("0x001788010b25b9f6",)
    assert {report.devices[i].friendly_name for i in report.unknown_parent} == {
        "Tor Garage", "Fenster Küche", "Fenster Dachboden", "Tür Hauswirtschaft", "Klima Büro",
    }  # fmt: skip

    def name(ieee: str) -> str:
        return report.devices[ieee].friendly_name if ieee in report.devices else "Coordinator"

    parents = Counter(name(d.parent) for d in report.devices.values() if d.parent)
    assert parents == {
        "Coordinator": 5, "Router Flur": 1, "Lampe Wohnzimmer": 1, "Licht Kinderzimmer": 4,
        "Steckdosenleiste Büro": 2, "Schranklicht Wohnzimmer": 1,
    }  # fmt: skip


def test_counts_and_score(report: NetworkReport) -> None:
    assert report.counts == {
        "devices": 48,
        "routers": 21,
        "end_devices": 27,
        "routers_always_on": 7,
        "routers_part_time": 7,
        "offline": 2,
        "dead": 13,
        "battery_critical": 0,
        "weak_links": 1,
        "findings_critical": 13,
        "findings_warning": 10,
        "findings_info": 1,
        "findings_open": 24,
    }
    assert report.score == 83


def test_single_scan_after_first_install() -> None:
    """Only one scan: routers that did not answer are "unclear", not always-on."""
    report = _report("networkmap_raw.json")
    assert report.counts["routers_always_on"] == 7
    assert report.counts["routers_part_time"] == 0
    assert report.counts["dead"] == 13
    unclear = {
        d.friendly_name
        for d in report.devices.values()
        if d.router_kind is RouterKind.UNCLEAR and d.state is not DeviceState.DEAD
    }
    assert unclear == {
        "Deckenlicht Küche", "Deckenlicht Esszimmer", "Licht Bad RGB", "Licht Ankleide",
        "Deko Flur oben", "Steckdose Wohnzimmer TV", "Steckdose Kinderzimmer TV",
    }  # fmt: skip
    # Not reachable in the only scan and silent > 1 h → offline until a second scan decides.
    assert _names(report, FindingType.DISAPPEARED) == unclear | {
        "Fernbedienung Wohnzimmer",
        "Klima Wohnzimmer",
    }
