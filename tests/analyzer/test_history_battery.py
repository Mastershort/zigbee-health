"""History rollups, health deltas, battery knowledge and forecast."""

from __future__ import annotations

import json
from datetime import date, timedelta

import pytest

from analyzer.battery import battery_forecast, battery_type, empty_voltage, forecast, linear_fit
from analyzer.history import HealthCounters, HealthSample, NetworkHistory, day_key, hour_key
from analyzer.z2m_payloads import (
    PayloadError,
    parse_bridge_event,
    parse_bridge_health,
    parse_bridge_info,
)
from builders import NOW, load_fixture

STECKDOSE = "0xa4c138000000002a"


def _names() -> dict[str, str]:
    return {d["ieee_address"]: d["friendly_name"] for d in load_fixture("bridge_devices.json")}


def test_health_fixture_deltas() -> None:
    first = parse_bridge_health(load_fixture("bridge_health.json"), NOW)
    second = parse_bridge_health(load_fixture("bridge_health_2.json"), NOW)
    assert first.uptime == 105003
    assert len(first.devices) == 29
    assert second.timestamp - first.timestamp == timedelta(seconds=600) - timedelta(milliseconds=1)

    history = NetworkHistory()
    history.record_health(first)
    assert history.devices == {}  # first sample only sets the baseline
    history.record_health(second)
    names = _names()
    deltas = {names[ieee]: sum(h.messages.values()) for ieee, h in history.devices.items()}
    assert {k: v for k, v in deltas.items() if v} == {
        "Steckdosenleiste Büro": 47,
        "Klima Kinderzimmer": 10,
        "Klima Küche": 6,
        "Klima Büro": 5,
        "Fenster Hauswirtschaft": 1,
        "Tor Garage": 1,
        "Steckdose Küche": 2,
        "Fenster Büro Seite": 1,
    }
    assert history.messages_per_second == round(73 / 600, 2)
    assert all(not h.instability for h in history.devices.values())


def test_health_restart_and_per_interval_counters() -> None:
    history = NetworkHistory()
    t0 = NOW
    history.record_health(HealthSample(t0, 1000, {"a": HealthCounters(100, 0, 0)}))
    # Z2M restarted: uptime went down, no delta.
    history.record_health(
        HealthSample(t0 + timedelta(minutes=10), 5, {"a": HealthCounters(3, 0, 0)})
    )
    assert "a" not in history.devices
    history.record_health(
        HealthSample(t0 + timedelta(minutes=20), 605, {"a": HealthCounters(10, 2, 1)})
    )
    assert sum(history.devices["a"].messages.values()) == 7
    assert history.devices["a"].instability == [(t0 + timedelta(minutes=20), 3)]
    # reset_on_check: counters drop without restart → value itself is the delta.
    history.record_health(
        HealthSample(t0 + timedelta(minutes=30), 1205, {"a": HealthCounters(4, 2, 1)})
    )
    assert sum(history.devices["a"].messages.values()) == 11


def test_record_state_daily_values_and_battery_replacement() -> None:
    history = NetworkHistory()
    history.record_state("a", NOW, linkquality=100, battery=40, voltage=2800)
    history.record_state("a", NOW, linkquality=50, last_seen=NOW - timedelta(minutes=1))
    history.record_state("a", NOW, linkquality=0)  # not measured, ignored
    hist = history.devices["a"]
    assert hist.lqi_daily() == {day_key(NOW): 75.0}
    assert hist.last_seen == NOW - timedelta(minutes=1)

    history.record_state("a", NOW + timedelta(days=1), battery=38, voltage=2790)
    assert len(hist.battery) == 2
    history.record_state("a", NOW + timedelta(days=2), battery=100, voltage=3100)
    assert hist.battery == {day_key(NOW + timedelta(days=2)): 100}
    assert hist.battery_replaced_at == NOW + timedelta(days=2)


def test_prune_reset_and_persistence() -> None:
    history = NetworkHistory()
    old = NOW - timedelta(days=40)
    history.record_state("a", old, linkquality=90, battery=50)
    history.record_state("a", NOW, linkquality=80, battery=48)
    history.record_announce("a", old)
    history.record_announce("a", NOW)
    history.record_availability("a", NOW, False)
    history.record_availability("a", NOW, False)  # no change → ignored
    history.record_health(HealthSample(NOW, 10, {"a": HealthCounters(1, 0, 0)}))
    history.prune(NOW)
    hist = history.devices["a"]
    assert list(hist.lqi) == [day_key(NOW)]
    assert len(hist.battery) == 2  # 180 days retention
    assert hist.announces == [NOW]
    assert len(hist.availability) == 1

    restored = NetworkHistory.from_dict(json.loads(json.dumps(history.as_dict())))
    assert restored.devices["a"].lqi == hist.lqi
    assert restored.devices["a"].availability == hist.availability
    assert restored.last_counters == history.last_counters
    assert restored.last_uptime == 10

    broken = history.as_dict()
    broken["devices"]["b"] = {"lqi": {"x": ["no", "number"]}}
    broken["last_counters"]["c"] = ["x"]
    assert set(NetworkHistory.from_dict(broken).devices) == {"a"}

    history.reset("a")
    assert history.devices == {}
    history.record_state("b", NOW, battery=1)
    history.reset()
    assert history.devices == {}


def test_battery_table() -> None:
    assert battery_type("MCCGQ01LM") == "CR1632"
    assert empty_voltage("LYWSD03MMC") == 2600
    assert empty_voltage("E2001/E2002") == 2300
    assert empty_voltage("unknown") is None
    assert battery_type(None) is None


def test_linear_fit() -> None:
    assert linear_fit([(0, 1)]) is None
    assert linear_fit([(1, 1), (1, 2)]) is None
    intercept, slope, r2 = linear_fit([(0, 10), (1, 8), (2, 6)]) or (0, 0, 0)
    assert (intercept, slope, r2) == (10, -2, 1)
    assert linear_fit([(0, 5), (1, 5)]) == (5, 0, 1.0)


def _series(start: float, step: float, days: int) -> dict[str, float]:
    origin = date(2026, 9, 1)
    return {(origin + timedelta(days=i)).isoformat(): start + step * i for i in range(days)}


def test_forecast() -> None:
    falling = _series(3000, -20, 14)  # 2600 mV reached after 20 days
    result = forecast(falling, 2600, 14, 0.5, "voltage")
    assert result is not None
    assert result.empty_on == date(2026, 9, 21)
    assert forecast(falling, 2600, 15, 0.5, "voltage") is None  # too few days
    assert forecast(_series(3000, 5, 14), 2600, 14, 0.5, "voltage") is None  # rising
    noisy = {k: v + (300 if i % 2 else -300) for i, (k, v) in enumerate(falling.items())}
    assert forecast(noisy, 2600, 14, 0.5, "voltage") is None  # r² too low


def test_battery_forecast_prefers_voltage() -> None:
    voltage = _series(3000, -20, 14)
    percent = _series(80, -1, 14)
    result = battery_forecast(voltage, percent, "LYWSD03MMC", 15, 14, 0.5)
    assert result is not None and result.series == "voltage"
    # Unknown battery type → percentage series.
    result = battery_forecast(voltage, percent, "unknown", 15, 14, 0.5)
    assert result is not None and result.series == "percent"
    assert result.empty_on == date(2026, 9, 1) + timedelta(days=65)


def test_parse_bridge_event_and_health_errors() -> None:
    assert parse_bridge_event(
        {"type": "device_announce", "data": {"ieee_address": "0x1", "friendly_name": "x"}}
    ) == ("device_announce", "0x1")
    assert parse_bridge_event({"type": "device_leave", "data": {}}) is None
    assert parse_bridge_event("junk") is None
    with pytest.raises(PayloadError):
        parse_bridge_health([], NOW)
    sample = parse_bridge_health({"devices": {"a": {"messages": "x"}, "b": 1}}, NOW)
    assert sample.devices == {}
    assert sample.timestamp == NOW
    assert sample.uptime is None


def test_source_info_from_bridge_info() -> None:
    info = parse_bridge_info(load_fixture("bridge_info.json")).as_source_info()
    assert info.version == "2.14.1"
    assert info.last_seen_enabled
    assert not info.availability_enabled
    assert info.health_enabled


def test_hour_key_is_utc() -> None:
    assert hour_key(NOW) == "2026-09-23T12"
