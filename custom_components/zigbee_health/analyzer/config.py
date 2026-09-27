"""Analyzer thresholds. Defaults follow section 5.2 of the specification."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import timedelta


@dataclass(frozen=True, slots=True)
class AnalyzerConfig:
    # F-01
    dead_after: timedelta = timedelta(days=30)
    # F-02
    disappeared_chatty_after: timedelta = timedelta(hours=12)
    disappeared_silent_after: timedelta = timedelta(days=3)
    router_offline_after: timedelta = timedelta(hours=1)
    z2m_restart_grace: timedelta = timedelta(minutes=15)
    # F-03
    battery_low_percent: float = 15.0
    rate_drop_ratio: float = 0.2
    rate_drop_hours: int = 6
    rate_baseline_min_hours: int = 24
    rate_baseline_min_per_hour: float = 1.0
    # F-04
    forecast_min_days: int = 14
    forecast_min_r2: float = 0.5
    forecast_horizon: timedelta = timedelta(days=21)
    # F-05
    part_time_scan_window: int = 3
    part_time_scan_failures: int = 2
    part_time_flap_window: timedelta = timedelta(days=7)
    part_time_flap_count: int = 3
    # F-07 / F-08
    weak_lqi: int = 80
    weak_lqi_samples: int = 3
    # F-09
    degradation_window_days: int = 14
    degradation_min_days: int = 7
    degradation_drop: float = 0.3
    # F-10
    unstable_window: timedelta = timedelta(hours=24)
    unstable_count: int = 3
    # F-11
    flood_per_minute: float = 6.0
    flood_hours: int = 3
    network_flood_per_second: float = 10.0
    # F-12
    max_children_router: int = 8
    max_children_coordinator: int = 20
    # F-13
    room_min_end_devices: int = 2
    # F-14
    end_devices_per_router: int = 8
    # Hysteresis
    min_duration: timedelta = timedelta(minutes=30)
    resolve_after_runs: int = 3
    # Parent lookup: how many scans back a known parent is still trusted.
    parent_history_scans: int = 7
