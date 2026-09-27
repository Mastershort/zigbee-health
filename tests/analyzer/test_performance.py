"""Section 5: one run must take < 200 ms for 200 devices."""

from __future__ import annotations

import time

from analyzer import AnalyzerConfig, FindingTracker, analyze
from analyzer.models import ScanLink
from builders import ago, child_link, end_device, in_area, router, scan, snapshot


def test_200_devices_with_7_scans_under_200ms() -> None:
    routers = [in_area(router(f"r{i}"), f"area{i % 20}") for i in range(60)]
    ends = [
        in_area(
            end_device(f"e{i}", chatty=i % 2 == 0, last_seen=ago(hours=i % 90)), f"area{i % 25}"
        )
        for i in range(140)
    ]
    devices = routers + ends
    links: list[ScanLink] = [
        child_link(e.ieee, routers[i % 60].ieee, 40 + i) for i, e in enumerate(ends)
    ]
    links += [ScanLink(a.ieee, b.ieee, 100, 2, 1, 15) for a in routers[:30] for b in routers[30:]]
    scans = tuple(
        scan(devices, failed={f"r{i}" for i in range(k, 60, 7)}, links=links) for k in range(7)
    )
    snap = snapshot(devices, scans=scans)
    config = AnalyzerConfig()

    start = time.perf_counter()
    report, _ = analyze(snap, config, FindingTracker(config))
    elapsed = time.perf_counter() - start

    assert len(report.devices) == 200
    assert elapsed < 0.2, f"analysis took {elapsed * 1000:.0f} ms"
