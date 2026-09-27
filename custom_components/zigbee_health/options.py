"""Options of a config entry (section 8.2) with defaults, mapped to the analyzer config."""

from __future__ import annotations

from dataclasses import dataclass, fields
from datetime import time, timedelta
from typing import TYPE_CHECKING, Any

from .analyzer.config import AnalyzerConfig

if TYPE_CHECKING:
    from collections.abc import Mapping

# Network scan
OPT_SCAN_AUTO = "scan_auto"
OPT_SCAN_TIME = "scan_time"
OPT_SCAN_TIMEOUT = "scan_timeout"
OPT_SCAN_ONLY_AWAY = "scan_only_away"
# Thresholds
OPT_DEAD_DAYS = "dead_days"
OPT_DISAPPEARED_HOURS = "disappeared_chatty_hours"
OPT_DISAPPEARED_DAYS = "disappeared_silent_days"
OPT_WEAK_LQI = "weak_lqi"
OPT_BATTERY_PERCENT = "battery_percent"
OPT_FORECAST_DAYS = "forecast_days"
OPT_FLOOD_PER_MINUTE = "flood_per_minute"
OPT_MAX_CHILDREN = "max_children"
# Notifications
OPT_REPAIRS_INFO = "repairs_include_info"
OPT_BUNDLE_THRESHOLD = "bundle_threshold"
OPT_HYSTERESIS_MINUTES = "hysteresis_minutes"
OPT_WALL_SWITCH_ALERT = "wall_switch_alert"
# Entities
OPT_DEVICE_ENTITIES = "device_entities"
OPT_ROOM_SENSORS = "room_sensors"
OPT_SIDEBAR_PANEL = "sidebar_panel"
# Help
OPT_LEARN_MORE_URL = "learn_more_url"


@dataclass(frozen=True, slots=True)
class Options:
    scan_auto: bool = True
    scan_time: str = "03:30:00"
    scan_timeout: int = 10  # minutes
    scan_only_away: tuple[str, ...] = ()  # person entity ids
    dead_days: int = 30
    disappeared_chatty_hours: int = 12
    disappeared_silent_days: int = 3
    weak_lqi: int = 80
    battery_percent: int = 15
    forecast_days: int = 21
    flood_per_minute: float = 6.0
    max_children: int = 8
    repairs_include_info: bool = False
    bundle_threshold: int = 3
    hysteresis_minutes: int = 30
    wall_switch_alert: bool = True
    device_entities: bool = True
    room_sensors: bool = False
    sidebar_panel: bool = True
    learn_more_url: str = ""

    @classmethod
    def from_mapping(cls, data: Mapping[str, Any]) -> Options:
        values: dict[str, Any] = {}
        for item in fields(cls):
            if item.name not in data:
                continue
            value = data[item.name]
            values[item.name] = tuple(value) if item.name == OPT_SCAN_ONLY_AWAY else value
        return cls(**values)

    @property
    def scan_at(self) -> time:
        try:
            return time.fromisoformat(self.scan_time)
        except ValueError:
            return time(3, 30)

    def analyzer_config(self) -> AnalyzerConfig:
        return AnalyzerConfig(
            dead_after=timedelta(days=self.dead_days),
            disappeared_chatty_after=timedelta(hours=self.disappeared_chatty_hours),
            disappeared_silent_after=timedelta(days=self.disappeared_silent_days),
            weak_lqi=self.weak_lqi,
            battery_low_percent=float(self.battery_percent),
            forecast_horizon=timedelta(days=self.forecast_days),
            flood_per_minute=float(self.flood_per_minute),
            max_children_router=self.max_children,
            end_devices_per_router=self.max_children,
            min_duration=timedelta(minutes=self.hysteresis_minutes),
        )
