"""Battery knowledge: types, voltage limits, linear forecast (F-03, F-04)."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta

# Voltage (mV) below which a battery is considered empty (section 5.2, F-03).
EMPTY_MV = {
    "CR2032": 2600.0,
    "CR2450": 2600.0,
    "CR1632": 2600.0,
    "2xCR2032": 2600.0,
    "2xAAA": 2300.0,
    "2xAA": 2300.0,
}

# Battery type per Z2M definition model. Maintainable table; unknown models are only
# judged by percentage and message rate.
BATTERY_TYPES = {
    # Aqara / Xiaomi
    "MCCGQ01LM": "CR1632",
    "MCCGQ11LM": "CR1632",
    "RTCGQ01LM": "CR2450",
    "RTCGQ11LM": "CR2450",
    "WSDCGQ01LM": "CR2032",
    "WSDCGQ11LM": "CR2032",
    "WXKG01LM": "CR2032",
    "WXKG11LM": "CR2032",
    "SJCGQ11LM": "CR2032",
    "LYWSD03MMC": "CR2032",
    # IKEA
    "E1743": "CR2032",
    "E1524/E1810": "CR2032",
    "E1525/E1745": "2xCR2032",
    "E2001/E2002/E2313": "2xAAA",
    "E2001/E2002": "2xAAA",
    # Philips
    "324131092621": "CR2450",
    "9290012607": "2xAAA",
    # SONOFF
    "SNZB-02": "CR2450",
    "SNZB-02D": "CR2450",
    "SNZB-03": "CR2450",
    "SNZB-04": "CR2032",
}


def battery_type(model: str | None) -> str | None:
    return BATTERY_TYPES.get(model or "")


def empty_voltage(model: str | None) -> float | None:
    kind = battery_type(model)
    return EMPTY_MV.get(kind) if kind else None


@dataclass(frozen=True, slots=True)
class Forecast:
    empty_on: date
    slope_per_day: float
    r2: float
    series: str  # "voltage" or "percent"


def linear_fit(points: list[tuple[float, float]]) -> tuple[float, float, float] | None:
    """Least squares fit ``y = a + b*x``; returns (a, b, r²) or None."""
    n = len(points)
    if n < 2:
        return None
    mean_x = sum(x for x, _ in points) / n
    mean_y = sum(y for _, y in points) / n
    sxx = sum((x - mean_x) ** 2 for x, _ in points)
    syy = sum((y - mean_y) ** 2 for _, y in points)
    if sxx == 0:
        return None
    sxy = sum((x - mean_x) * (y - mean_y) for x, y in points)
    slope = sxy / sxx
    intercept = mean_y - slope * mean_x
    r2 = 1.0 if syy == 0 else (sxy * sxy) / (sxx * syy)
    return intercept, slope, r2


def forecast(
    daily: dict[str, float], empty_level: float, min_days: int, min_r2: float, series: str
) -> Forecast | None:
    """Day on which the regression line of the daily values reaches ``empty_level``."""
    if len(daily) < min_days:
        return None
    days = sorted(daily)
    origin = date.fromisoformat(days[0])
    points = [(float((date.fromisoformat(d) - origin).days), daily[d]) for d in days]
    fit = linear_fit(points)
    if fit is None:
        return None
    intercept, slope, r2 = fit
    if slope >= 0 or r2 < min_r2:
        return None
    empty_x = (empty_level - intercept) / slope
    return Forecast(
        empty_on=origin + timedelta(days=round(empty_x)),
        slope_per_day=slope,
        r2=r2,
        series=series,
    )


def battery_forecast(
    voltage: dict[str, float],
    percent: dict[str, float],
    model: str | None,
    empty_percent: float,
    min_days: int,
    min_r2: float,
) -> Forecast | None:
    """Prefer the voltage series (more linear), fall back to the percentage."""
    limit = empty_voltage(model)
    if limit is not None and len(voltage) >= min_days:
        result = forecast(voltage, limit, min_days, min_r2, "voltage")
        if result is not None:
            return result
    return forecast(percent, empty_percent, min_days, min_r2, "percent")


def as_datetime(day: date) -> datetime:
    return datetime(day.year, day.month, day.day, 12, tzinfo=UTC)
