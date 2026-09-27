"""Export of the report for get_report and the card."""

from __future__ import annotations

import json
from datetime import UTC, timedelta, timezone

from analyzer import AnalyzerConfig, FindingTracker, analyze
from analyzer.export import backbone_links, placeholders, report_to_dict
from analyzer.models import (
    Finding,
    FindingType,
    NetworkReport,
    NetworkScan,
    NetworkSnapshot,
    Severity,
    ZigbeeDevice,
)
from analyzer.timeutil import parse_last_seen
from analyzer.z2m_payloads import parse_bridge_devices, parse_networkmap
from builders import NOW, load_fixture

COORDINATOR = "0x00124b0000000001"


def _real_report() -> tuple[NetworkReport, list[NetworkScan], dict[str, ZigbeeDevice]]:
    scans: list[NetworkScan] = []
    for name in ("networkmap_raw.json", "networkmap_raw_2.json"):
        payload = load_fixture(name)
        stamps = [parse_last_seen(n["lastSeen"]) for n in payload["data"]["value"]["nodes"]]
        scans.append(parse_networkmap(payload, max(s for s in stamps if s)))
    devices = parse_bridge_devices(load_fixture("bridge_devices.json"))
    now = scans[-1].timestamp + timedelta(minutes=16)
    config = AnalyzerConfig()
    report, _ = analyze(
        NetworkSnapshot(now=now, devices=devices, scans=tuple(scans)),
        config,
        FindingTracker(config),
    )
    return report, scans, devices


def test_full_export_is_json_and_has_topology() -> None:
    report, scans, devices = _real_report()
    data = report_to_dict(
        report,
        full=True,
        names=lambda ieee: devices[ieee].friendly_name if ieee in devices else ieee,
        scans=scans,
        coordinator_ieee=COORDINATOR,
        ha_device_ids={"0x00158d0000000002": "abc"},
        last_scan=scans[-1].timestamp,
    )
    json.dumps(data)  # serialisable
    topology = data["topology"]
    assert topology["coordinator"] == {"ieee": COORDINATOR, "name": "Coordinator"}
    assert len(topology["nodes"]) == 48
    bm_bad = next(n for n in topology["nodes"] if n["name"] == "Bewegung Bad")
    assert bm_bad["state"] == "dead"
    assert bm_bad["device_id"] == "abc"
    th = next(n for n in topology["nodes"] if n["name"] == "Klima Küche")
    assert th["parent"] == COORDINATOR
    assert th["parent_lqi"] == 62
    assert "0x001788010b25b9f6" in topology["unknown_neighbors"]
    # Backbone: one entry per pair, best LQI of both directions, never 0/1.
    pairs = {(link["a"], link["b"]) for link in topology["links"]}
    assert len(pairs) == len(topology["links"])
    assert all(link["lqi"] > 1 for link in topology["links"])
    assert data["findings"][0]["placeholders"]["name"]
    assert data["actions"][0]["key"] == "remove_dead"


def test_summary_export_has_no_details() -> None:
    report, _, devices = _real_report()
    data = report_to_dict(report, full=False, names=lambda i: devices[i].friendly_name)
    assert "topology" not in data
    assert data["counts"]["dead"] == 16


def test_backbone_links_and_placeholders() -> None:
    assert backbone_links(None) == []
    scan = parse_networkmap(load_fixture("networkmap_raw.json"), NOW)
    links = {(li["a"], li["b"]): li["lqi"] for li in backbone_links(scan)}
    killian = next(i for i, n in scan.nodes.items() if n.friendly_name == "Licht Kinderzimmer")
    # Licht Kinderzimmer ↔ Coordinator: 1 in the coordinator table (not measured), 91 in its own.
    a, b = sorted((COORDINATOR, killian))
    assert links[(a, b)] == 91

    finding = Finding(
        id="battery_low:x",
        type=FindingType.BATTERY_LOW,
        severity=Severity.WARNING,
        ieee="x",
        data={"name": "S", "voltage": 2550, "last_seen": "2026-09-23T10:00:00+00:00"},
    )
    values = placeholders(finding, timezone(timedelta(hours=2)))
    assert values["value"] == "2.55 V"
    assert values["battery_type"] == "-"
    assert values["room"] == "-"
    assert values["date"] == "23.09.2026 12:00"
    forecast = Finding(
        id="f", type=FindingType.BATTERY_FORECAST, severity=Severity.INFO,
        data={"empty_on": "2026-10-01"},
    )  # fmt: skip
    assert placeholders(forecast, UTC)["date"] == "01.10.2026"
    percent = Finding(id="p", type=FindingType.BATTERY_LOW, severity=Severity.WARNING,
                      data={"battery": 9})  # fmt: skip
    assert placeholders(percent)["value"] == "9 %"
    assert placeholders(percent)["date"] == "?"
