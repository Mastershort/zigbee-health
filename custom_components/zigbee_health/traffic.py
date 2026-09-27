"""Live traffic for the card: message counts per device and active alerts.

Counts are only collected while at least one card is subscribed and are pushed once per
second over the websocket API - never as Home Assistant events, which would fill the
recorder database.
"""

from __future__ import annotations

from collections import Counter
from datetime import timedelta
from typing import TYPE_CHECKING, Any

from homeassistant.core import CALLBACK_TYPE, HomeAssistant, callback
from homeassistant.helpers.event import async_track_time_interval

if TYPE_CHECKING:
    from collections.abc import Callable
    from datetime import datetime

FLUSH_INTERVAL = timedelta(seconds=1)

type TrafficListener = Callable[[dict[str, Any]], None]


class TrafficHub:
    def __init__(self, hass: HomeAssistant) -> None:
        self._hass = hass
        self._pending: Counter[str] = Counter()
        self._listeners: set[TrafficListener] = set()
        self._unsub_timer: CALLBACK_TYPE | None = None
        self._alerts: dict[str, dict[str, Any]] = {}
        self._alerts_changed = False

    @property
    def alerts(self) -> list[dict[str, Any]]:
        return list(self._alerts.values())

    @callback
    def hit(self, ieee: str) -> None:
        if self._listeners:
            self._pending[ieee] += 1

    @callback
    def set_alert(self, ieee: str, alert: dict[str, Any] | None) -> None:
        if alert is None:
            if self._alerts.pop(ieee, None) is None:
                return
        else:
            self._alerts[ieee] = alert
        self._alerts_changed = True

    @callback
    def subscribe(self, listener: TrafficListener) -> CALLBACK_TYPE:
        self._listeners.add(listener)
        if self._unsub_timer is None:
            self._unsub_timer = async_track_time_interval(
                self._hass, self._flush, FLUSH_INTERVAL, name="zigbee_health traffic"
            )

        @callback
        def unsubscribe() -> None:
            self._listeners.discard(listener)
            if not self._listeners:
                self.stop()

        return unsubscribe

    @callback
    def stop(self) -> None:
        if self._unsub_timer is not None:
            self._unsub_timer()
            self._unsub_timer = None
        self._pending.clear()

    @callback
    def _flush(self, _now: datetime) -> None:
        if not self._pending and not self._alerts_changed:
            return
        payload: dict[str, Any] = {"counts": dict(self._pending)}
        if self._alerts_changed:
            payload["alerts"] = self.alerts
        self._pending.clear()
        self._alerts_changed = False
        for listener in list(self._listeners):
            listener(payload)
