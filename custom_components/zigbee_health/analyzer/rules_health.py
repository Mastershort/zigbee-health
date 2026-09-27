"""History based rules: F-03 battery low, F-04 battery forecast, F-09 degradation,
F-10 unstable device, F-11 message flood."""

from __future__ import annotations

from datetime import timedelta
from statistics import mean, median
from typing import TYPE_CHECKING

from .battery import Forecast, as_datetime, battery_forecast, battery_type, empty_voltage
from .context import base_data
from .history import DeviceHistory, day_key, hour_key
from .models import Finding, FindingType, Severity

if TYPE_CHECKING:
    from datetime import datetime

    from .context import AnalysisContext, DeviceContext

# Measuring devices (chatty) may send this many times more than the flood limit.
CHATTY_FLOOD_FACTOR = 5


def _latest(series: dict[str, float]) -> float | None:
    return series[max(series)] if series else None


def _complete_hours(now: datetime, count: int) -> list[str]:
    """Keys of the last ``count`` complete hours, newest first."""
    return [hour_key(now - timedelta(hours=h)) for h in range(1, count + 1)]


def battery_values(
    dev: DeviceContext, hist: DeviceHistory | None
) -> tuple[float | None, float | None]:
    battery = dev.device.battery
    voltage = dev.device.voltage
    if hist is not None:
        battery = battery if battery is not None else _latest(hist.battery)
        voltage = voltage if voltage is not None else _latest(hist.voltage)
    return battery, voltage


def rate_dropped(hist: DeviceHistory, now: datetime, ctx: AnalysisContext) -> bool:
    """Chatty device sends < 20 % of its own hourly baseline for the last 6 hours."""
    config = ctx.config
    recent_keys = _complete_hours(now, config.rate_drop_hours)
    if any(key not in hist.messages for key in recent_keys):
        return False
    current = hour_key(now)
    baseline_values = [
        count for key, count in hist.messages.items() if key not in recent_keys and key < current
    ]
    if len(baseline_values) < config.rate_baseline_min_hours:
        return False
    baseline = median(baseline_values)
    if baseline < config.rate_baseline_min_per_hour:
        return False
    recent = sum(hist.messages[key] for key in recent_keys)
    return recent < config.rate_drop_ratio * baseline * config.rate_drop_hours


def forecast_for(ctx: AnalysisContext, dev: DeviceContext) -> Forecast | None:
    hist = ctx.snapshot.history.devices.get(dev.device.ieee)
    if hist is None or not dev.device.is_battery_powered:
        return None
    config = ctx.config
    return battery_forecast(
        hist.voltage,
        hist.battery,
        dev.device.model,
        config.battery_low_percent,
        config.forecast_min_days,
        config.forecast_min_r2,
    )


def _battery_low(ctx: AnalysisContext, dev: DeviceContext) -> Finding | None:
    device = dev.device
    if not device.is_battery_powered:
        return None
    hist = ctx.snapshot.history.devices.get(device.ieee)
    battery, voltage = battery_values(dev, hist)
    limit = empty_voltage(device.model)
    config = ctx.config
    if battery is not None and battery <= config.battery_low_percent:
        reason = "percent"
    elif voltage is not None and limit is not None and voltage < limit:
        reason = "voltage"
    elif (
        dev.chatty
        and hist is not None
        and (dev.age is None or dev.age <= config.disappeared_chatty_after)
        and rate_dropped(hist, ctx.snapshot.now, ctx)
    ):
        reason = "rate"
    else:
        return None
    data = base_data(ctx, dev) | {
        "reason": reason,
        "battery_type": battery_type(device.model) or "",
    }
    if battery is not None:
        data["battery"] = round(battery)
    if voltage is not None:
        data["voltage"] = round(voltage)
    return Finding(
        id=f"{FindingType.BATTERY_LOW}:{device.ieee}",
        type=FindingType.BATTERY_LOW,
        severity=Severity.WARNING,
        ieee=device.ieee,
        area_id=device.area_id,
        data=data,
    )


def _battery_forecast(ctx: AnalysisContext, dev: DeviceContext) -> Finding | None:
    result = forecast_for(ctx, dev)
    if result is None:
        return None
    empty_at = as_datetime(result.empty_on)
    if empty_at - ctx.snapshot.now >= ctx.config.forecast_horizon:
        return None
    return Finding(
        id=f"{FindingType.BATTERY_FORECAST}:{dev.device.ieee}",
        type=FindingType.BATTERY_FORECAST,
        severity=Severity.INFO,
        ieee=dev.device.ieee,
        area_id=dev.device.area_id,
        data=base_data(ctx, dev)
        | {
            "empty_on": result.empty_on.isoformat(),
            "battery_type": battery_type(dev.device.model) or "",
        },
    )


def _degradation(ctx: AnalysisContext, dev: DeviceContext, hist: DeviceHistory) -> Finding | None:
    config = ctx.config
    since = day_key(ctx.snapshot.now - timedelta(days=config.degradation_window_days))
    values = [v for day, v in hist.lqi_daily().items() if day >= since]
    if len(values) < config.degradation_min_days:
        return None
    before, after = mean(values[:3]), mean(values[-3:])
    if before <= 0 or (before - after) / before < config.degradation_drop:
        return None
    return Finding(
        id=f"{FindingType.DEGRADATION}:{dev.device.ieee}",
        type=FindingType.DEGRADATION,
        severity=Severity.INFO,
        ieee=dev.device.ieee,
        area_id=dev.device.area_id,
        data=base_data(ctx, dev)
        | {
            "before": round(before),
            "after": round(after),
            "percent": round((before - after) / before * 100),
        },
    )


def _unstable(ctx: AnalysisContext, dev: DeviceContext, hist: DeviceHistory) -> Finding | None:
    since = ctx.snapshot.now - ctx.config.unstable_window
    events = sum(count for ts, count in hist.instability if ts >= since)
    announces = sum(1 for ts in hist.announces if ts >= since)
    threshold = ctx.config.unstable_count
    if events < threshold and announces < threshold:
        return None
    return Finding(
        id=f"{FindingType.UNSTABLE_DEVICE}:{dev.device.ieee}",
        type=FindingType.UNSTABLE_DEVICE,
        severity=Severity.WARNING,
        ieee=dev.device.ieee,
        area_id=dev.device.area_id,
        data=base_data(ctx, dev) | {"events": events, "announces": announces},
    )


def _flood(ctx: AnalysisContext, dev: DeviceContext, hist: DeviceHistory) -> Finding | None:
    config = ctx.config
    keys = _complete_hours(ctx.snapshot.now, config.flood_hours)
    if any(key not in hist.messages for key in keys):
        return None
    # ASSUMPTION: measuring devices (energy meters, sensors) get a 5x higher limit.
    limit = config.flood_per_minute * (CHATTY_FLOOD_FACTOR if dev.chatty else 1)
    per_minute = [hist.messages[key] / 60 for key in keys]
    if min(per_minute) <= limit:
        return None
    return Finding(
        id=f"{FindingType.MESSAGE_FLOOD}:{dev.device.ieee}",
        type=FindingType.MESSAGE_FLOOD,
        severity=Severity.WARNING,
        ieee=dev.device.ieee,
        area_id=dev.device.area_id,
        data=base_data(ctx, dev) | {"per_minute": round(mean(per_minute), 1)},
    )


def device_findings(ctx: AnalysisContext, dev: DeviceContext) -> list[Finding]:
    if dev.dead:
        return []
    results: list[Finding | None] = []
    low = _battery_low(ctx, dev)
    results.append(low)
    if low is None:
        results.append(_battery_forecast(ctx, dev))
    hist = ctx.snapshot.history.devices.get(dev.device.ieee)
    if hist is not None:
        results += [_degradation(ctx, dev, hist), _unstable(ctx, dev, hist), _flood(ctx, dev, hist)]
    return [f for f in results if f is not None]


def network_findings(ctx: AnalysisContext) -> list[Finding]:
    """F-11 for the whole network: messages per second in the last complete hour."""
    key = _complete_hours(ctx.snapshot.now, 1)[0]
    counts = [h.messages[key] for h in ctx.snapshot.history.devices.values() if key in h.messages]
    if not counts:
        return []
    per_second = sum(counts) / 3600
    if per_second <= ctx.config.network_flood_per_second:
        return []
    return [
        Finding(
            id=FindingType.NETWORK_MESSAGE_FLOOD.value,
            type=FindingType.NETWORK_MESSAGE_FLOOD,
            severity=Severity.WARNING,
            data={"per_second": round(per_second, 1)},
        )
    ]
