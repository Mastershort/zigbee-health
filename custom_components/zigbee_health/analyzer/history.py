"""Rolling per-device history (section 4). Pure Python, serialisable for the Store.

Retention: LQI daily means 30 days, battery/voltage daily values 180 days, message counts
per hour 14 days (rate baseline), instability events and announces 7 days, availability
changes 30 days.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from typing import Any

from .models import AvailabilityChange

LQI_DAYS = 30
BATTERY_DAYS = 180
MESSAGE_HOURS = 14 * 24
EVENT_DAYS = 7
AVAILABILITY_DAYS = 30

# A jump upwards by at least this much means the battery was replaced.
BATTERY_REPLACED_PERCENT = 15.0
BATTERY_REPLACED_MV = 200.0


def day_key(ts: datetime) -> str:
    return ts.astimezone(UTC).date().isoformat()


def hour_key(ts: datetime) -> str:
    return ts.astimezone(UTC).strftime("%Y-%m-%dT%H")


@dataclass(frozen=True, slots=True)
class HealthCounters:
    """Per-device counters of one ``bridge/health`` message."""

    messages: int
    leave_count: int
    network_address_changes: int


@dataclass(frozen=True, slots=True)
class HealthSample:
    timestamp: datetime
    uptime: int | None
    devices: dict[str, HealthCounters]


@dataclass(slots=True)
class DeviceHistory:
    lqi: dict[str, tuple[float, int]] = field(default_factory=dict)  # day -> (sum, count)
    battery: dict[str, float] = field(default_factory=dict)  # day -> last percent
    voltage: dict[str, float] = field(default_factory=dict)  # day -> last mV
    messages: dict[str, int] = field(default_factory=dict)  # hour -> message count
    instability: list[tuple[datetime, int]] = field(default_factory=list)  # (ts, events)
    announces: list[datetime] = field(default_factory=list)
    availability: list[AvailabilityChange] = field(default_factory=list)
    last_seen: datetime | None = None
    battery_replaced_at: datetime | None = None

    def lqi_daily(self) -> dict[str, float]:
        return {day: total / count for day, (total, count) in sorted(self.lqi.items()) if count}


@dataclass(slots=True)
class NetworkHistory:
    devices: dict[str, DeviceHistory] = field(default_factory=dict)
    # Last counters per device and Z2M uptime, to build deltas between health messages.
    last_counters: dict[str, HealthCounters] = field(default_factory=dict)
    last_uptime: int | None = None
    last_health_at: datetime | None = None
    # Messages per second over the last health interval, all devices.
    messages_per_second: float | None = None

    def device(self, ieee: str) -> DeviceHistory:
        return self.devices.setdefault(ieee, DeviceHistory())

    # --- recording -------------------------------------------------------------------

    def record_state(
        self,
        ieee: str,
        now: datetime,
        *,
        linkquality: int | None = None,
        battery: float | None = None,
        voltage: float | None = None,
        last_seen: datetime | None = None,
    ) -> None:
        hist = self.device(ieee)
        day = day_key(now)
        if last_seen is not None and (hist.last_seen is None or last_seen > hist.last_seen):
            hist.last_seen = last_seen
        if linkquality is not None and linkquality > 0:
            total, count = hist.lqi.get(day, (0.0, 0))
            hist.lqi[day] = (total + linkquality, count + 1)
        replaced = _jumped(hist.battery, day, battery, BATTERY_REPLACED_PERCENT) or _jumped(
            hist.voltage, day, voltage, BATTERY_REPLACED_MV
        )
        if replaced:
            hist.battery.clear()
            hist.voltage.clear()
            hist.battery_replaced_at = now
        if battery is not None:
            hist.battery[day] = battery
        if voltage is not None:
            hist.voltage[day] = voltage

    def record_health(self, sample: HealthSample) -> None:
        """Build deltas against the previous health message.

        Counters are cumulative since the Z2M start (``reset_on_check: false``) or per
        interval (``true``); both work because a counter that went down, or an uptime that
        went down, starts a new baseline instead of producing a delta.
        """
        restarted = (
            sample.uptime is not None
            and self.last_uptime is not None
            and sample.uptime < self.last_uptime
        )
        hour = hour_key(sample.timestamp)
        total = 0
        for ieee, counters in sample.devices.items():
            previous = self.last_counters.get(ieee)
            if restarted or previous is None:
                continue
            messages = counters.messages - previous.messages
            if messages < 0:
                # Per-interval counters (reset_on_check) or a reset: take the value itself.
                messages = counters.messages
            hist = self.device(ieee)
            hist.messages[hour] = hist.messages.get(hour, 0) + messages
            total += messages
            events = max(0, counters.leave_count - previous.leave_count) + max(
                0, counters.network_address_changes - previous.network_address_changes
            )
            if events:
                hist.instability.append((sample.timestamp, events))
        # Devices missing in the sample have been silent since the Z2M start (keep them).
        self.last_counters |= sample.devices
        if not restarted and self.last_health_at is not None:
            seconds = (sample.timestamp - self.last_health_at).total_seconds()
            if seconds > 0:
                self.messages_per_second = round(total / seconds, 2)
        self.last_uptime = sample.uptime
        self.last_health_at = sample.timestamp

    def record_announce(self, ieee: str, now: datetime) -> None:
        self.device(ieee).announces.append(now)

    def record_availability(self, ieee: str, now: datetime, online: bool) -> None:
        changes = self.device(ieee).availability
        if not changes or changes[-1].online != online:
            changes.append(AvailabilityChange(now, online))

    def reset(self, ieee: str | None = None) -> None:
        """Forget the history of one device, or of all devices."""
        if ieee is None:
            self.devices.clear()
        else:
            self.devices.pop(ieee, None)

    def prune(self, now: datetime) -> None:
        lqi_from = day_key(now - timedelta(days=LQI_DAYS))
        battery_from = day_key(now - timedelta(days=BATTERY_DAYS))
        hour_from = hour_key(now - timedelta(hours=MESSAGE_HOURS))
        events_from = now - timedelta(days=EVENT_DAYS)
        availability_from = now - timedelta(days=AVAILABILITY_DAYS)
        for hist in self.devices.values():
            hist.lqi = {k: v for k, v in hist.lqi.items() if k >= lqi_from}
            hist.battery = {k: v for k, v in hist.battery.items() if k >= battery_from}
            hist.voltage = {k: v for k, v in hist.voltage.items() if k >= battery_from}
            hist.messages = {k: v for k, v in hist.messages.items() if k >= hour_from}
            hist.instability = [e for e in hist.instability if e[0] >= events_from]
            hist.announces = [t for t in hist.announces if t >= events_from]
            hist.availability = [c for c in hist.availability if c.timestamp >= availability_from]

    # --- persistence -----------------------------------------------------------------

    def as_dict(self) -> dict[str, Any]:
        return {
            "devices": {
                ieee: {
                    "lqi": {k: list(v) for k, v in h.lqi.items()},
                    "battery": h.battery,
                    "voltage": h.voltage,
                    "messages": h.messages,
                    "instability": [[t.isoformat(), n] for t, n in h.instability],
                    "announces": [t.isoformat() for t in h.announces],
                    "availability": [[c.timestamp.isoformat(), c.online] for c in h.availability],
                    "last_seen": h.last_seen.isoformat() if h.last_seen else None,
                    "battery_replaced_at": (
                        h.battery_replaced_at.isoformat() if h.battery_replaced_at else None
                    ),
                }
                for ieee, h in self.devices.items()
            },
            "last_counters": {
                ieee: [c.messages, c.leave_count, c.network_address_changes]
                for ieee, c in self.last_counters.items()
            },
            "last_uptime": self.last_uptime,
            "last_health_at": self.last_health_at.isoformat() if self.last_health_at else None,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> NetworkHistory:
        history = cls()
        for ieee, raw in (data.get("devices") or {}).items():
            try:
                history.devices[ieee] = DeviceHistory(
                    lqi={k: (float(v[0]), int(v[1])) for k, v in raw.get("lqi", {}).items()},
                    battery={k: float(v) for k, v in raw.get("battery", {}).items()},
                    voltage={k: float(v) for k, v in raw.get("voltage", {}).items()},
                    messages={k: int(v) for k, v in raw.get("messages", {}).items()},
                    instability=[
                        (datetime.fromisoformat(t), int(n)) for t, n in raw.get("instability", [])
                    ],
                    announces=[datetime.fromisoformat(t) for t in raw.get("announces", [])],
                    availability=[
                        AvailabilityChange(datetime.fromisoformat(t), bool(online))
                        for t, online in raw.get("availability", [])
                    ],
                    last_seen=_dt(raw.get("last_seen")),
                    battery_replaced_at=_dt(raw.get("battery_replaced_at")),
                )
            except (TypeError, ValueError, IndexError):
                continue
        for ieee, counters in (data.get("last_counters") or {}).items():
            try:
                history.last_counters[ieee] = HealthCounters(*(int(v) for v in counters))
            except (TypeError, ValueError):
                continue
        history.last_uptime = data.get("last_uptime")
        history.last_health_at = _dt(data.get("last_health_at"))
        return history


def _dt(value: object) -> datetime | None:
    return datetime.fromisoformat(value) if isinstance(value, str) else None


def _jumped(series: dict[str, float], day: str, value: float | None, threshold: float) -> bool:
    """True if ``value`` is clearly above the latest earlier value of the series."""
    if value is None:
        return False
    earlier = [v for k, v in sorted(series.items()) if k <= day]
    return bool(earlier) and value - earlier[-1] >= threshold
