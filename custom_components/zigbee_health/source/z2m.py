"""Zigbee2MQTT data source over the Home Assistant MQTT integration."""

from __future__ import annotations

import asyncio
import json
import logging
from dataclasses import dataclass, replace
from itertools import count
from typing import TYPE_CHECKING, Any, Protocol

from homeassistant.components import mqtt
from homeassistant.core import CALLBACK_TYPE, HomeAssistant, callback
from homeassistant.util import dt as dt_util

from ..analyzer.models import DeviceType, NetworkScan, ZigbeeDevice
from ..analyzer.z2m_payloads import (
    BridgeInfo,
    PayloadError,
    apply_device_state,
    parse_availability,
    parse_bridge_devices,
    parse_bridge_event,
    parse_bridge_health,
    parse_bridge_info,
    parse_networkmap,
)
from .base import ZigbeeSource

if TYPE_CHECKING:
    from collections.abc import Callable
    from datetime import datetime

    from homeassistant.components.mqtt import ReceiveMessage

    from ..analyzer.history import HealthSample

_LOGGER = logging.getLogger(__name__)

REQUEST_TIMEOUT = 30.0


class SourceListener(Protocol):
    """Receives everything the source collects (implemented by the coordinator)."""

    def source_changed(self) -> None: ...
    def scan_received(self, scan: NetworkScan) -> None: ...
    def state_received(self, device: ZigbeeDevice) -> None: ...
    def availability_changed(
        self, ieee: str, online: bool, at: datetime, initial: bool
    ) -> None: ...
    def health_received(self, sample: HealthSample) -> None: ...
    def event_received(self, event_type: str, ieee: str) -> None: ...


@dataclass(frozen=True, slots=True)
class RequestResult:
    ok: bool
    error: str | None = None
    data: dict[str, Any] | None = None


def _json(payload: str | bytes | bytearray) -> Any:
    try:
        return json.loads(payload)
    except ValueError:
        return payload if isinstance(payload, str) else None


class Z2MSource(ZigbeeSource):
    """Subscribes to ``<base>/bridge/...`` topics and the topics of every known device.

    ``<base>/#`` is deliberately not subscribed (load on large networks); friendly names
    may contain ``/``, so every device topic is subscribed explicitly (section 2).
    """

    def __init__(self, hass: HomeAssistant, base_topic: str, listener: SourceListener) -> None:
        self._hass = hass
        self._base = base_topic
        self._listener = listener
        self._bridge_unsubs: list[CALLBACK_TYPE] = []
        self._device_unsubs: list[CALLBACK_TYPE] = []
        self._subscribed_names: frozenset[str] = frozenset()
        self._devices: dict[str, ZigbeeDevice] = {}
        self._ieee_by_name: dict[str, str] = {}
        self._online: bool | None = None
        self._online_since: datetime | None = None
        self._ready = False
        self._scan_lock = asyncio.Lock()
        self._scan_future: asyncio.Future[NetworkScan] | None = None
        self._requests: dict[str, asyncio.Future[dict[str, Any]]] = {}
        self._transaction = count(1)
        self._resubscribe_task: asyncio.Task[None] | None = None
        self.info: BridgeInfo | None = None
        self.last_scan_duration: float | None = None

    # --- ZigbeeSource ----------------------------------------------------------------

    @property
    def online(self) -> bool:
        return self._online is True and mqtt.is_connected(self._hass)

    @property
    def online_since(self) -> datetime | None:
        return self._online_since

    @property
    def ready(self) -> bool:
        return self._ready

    @property
    def devices(self) -> dict[str, ZigbeeDevice]:
        return self._devices

    async def async_start(self) -> None:
        base = self._base
        handlers: dict[str, Callable[[ReceiveMessage], None]] = {
            f"{base}/bridge/state": self._handle_state,
            f"{base}/bridge/info": self._handle_info,
            f"{base}/bridge/devices": self._handle_devices,
            f"{base}/bridge/health": self._handle_health,
            f"{base}/bridge/event": self._handle_event,
            f"{base}/bridge/response/#": self._handle_response,
        }
        for topic, handler in handlers.items():
            self._bridge_unsubs.append(await mqtt.async_subscribe(self._hass, topic, handler))

    async def async_stop(self) -> None:
        if self._resubscribe_task is not None:
            self._resubscribe_task.cancel()
        for unsub in (*self._bridge_unsubs, *self._device_unsubs):
            unsub()
        self._bridge_unsubs.clear()
        self._device_unsubs.clear()
        for future in self._requests.values():
            if not future.done():
                future.cancel()
        if self._scan_future is not None and not self._scan_future.done():
            self._scan_future.cancel()

    async def async_request_scan(self, timeout: float) -> NetworkScan:
        """Request a raw network map. Never runs two scans in parallel."""
        async with self._scan_lock:
            loop = asyncio.get_running_loop()
            self._scan_future = loop.create_future()
            started = loop.time()
            await mqtt.async_publish(
                self._hass,
                f"{self._base}/bridge/request/networkmap",
                json.dumps({"type": "raw", "routes": False}),
            )
            try:
                async with asyncio.timeout(timeout):
                    scan = await self._scan_future
            finally:
                self._scan_future = None
            self.last_scan_duration = round(loop.time() - started, 1)
            return scan

    @property
    def scanning(self) -> bool:
        return self._scan_lock.locked()

    # --- requests that change the network (only from confirmed fix flows) -------------

    async def _async_request(self, name: str, payload: dict[str, Any]) -> RequestResult:
        transaction = f"zh-{next(self._transaction)}"
        future: asyncio.Future[dict[str, Any]] = asyncio.get_running_loop().create_future()
        self._requests[transaction] = future
        try:
            await mqtt.async_publish(
                self._hass,
                f"{self._base}/bridge/request/{name}",
                json.dumps(payload | {"transaction": transaction}),
            )
            async with asyncio.timeout(REQUEST_TIMEOUT):
                response = await future
        except TimeoutError:
            return RequestResult(ok=False, error="timeout")
        finally:
            self._requests.pop(transaction, None)
        if response.get("status") != "ok":
            return RequestResult(ok=False, error=str(response.get("error") or "unknown error"))
        data = response.get("data")
        return RequestResult(ok=True, data=data if isinstance(data, dict) else None)

    async def async_remove_device(self, ieee: str, force: bool) -> RequestResult:
        return await self._async_request("device/remove", {"id": ieee, "force": force})

    async def async_rename_device(self, ieee: str, name: str) -> RequestResult:
        # Also renames the Home Assistant entities, like the Zigbee2MQTT frontend does.
        return await self._async_request(
            "device/rename", {"from": ieee, "to": name, "homeassistant_rename": True}
        )

    async def async_set_options(self, options: dict[str, Any]) -> RequestResult:
        return await self._async_request("options", {"options": options})

    # --- bridge topics ---------------------------------------------------------------

    @callback
    def _handle_state(self, msg: ReceiveMessage) -> None:
        state = parse_availability(_json(msg.payload))
        if state is None:
            return
        if state and self._online is not True:
            self._online_since = dt_util.utcnow()
        self._online = state
        self._listener.source_changed()

    @callback
    def _handle_info(self, msg: ReceiveMessage) -> None:
        try:
            self.info = parse_bridge_info(_json(msg.payload))
        except PayloadError as err:
            _LOGGER.warning("Invalid bridge/info payload: %s", err)

    @callback
    def _handle_devices(self, msg: ReceiveMessage) -> None:
        try:
            parsed = parse_bridge_devices(_json(msg.payload))
        except PayloadError as err:
            _LOGGER.warning("Invalid bridge/devices payload: %s", err)
            return
        # Keep live values across device list updates (key is the IEEE address).
        merged: dict[str, ZigbeeDevice] = {}
        for ieee, fresh in parsed.items():
            old = self._devices.get(ieee)
            merged[ieee] = fresh
            if old is not None:
                merged[ieee] = replace(
                    fresh,
                    last_seen=old.last_seen,
                    available=old.available,
                    available_since=old.available_since,
                    linkquality=old.linkquality,
                    battery=old.battery,
                    voltage=old.voltage,
                )
        self._devices = merged
        self._ieee_by_name = {d.friendly_name: ieee for ieee, d in merged.items()}
        self._ready = True
        names = frozenset(
            d.friendly_name
            for d in merged.values()
            if d.type in (DeviceType.ROUTER, DeviceType.END_DEVICE)
        )
        if names != self._subscribed_names:
            if self._resubscribe_task is not None:
                self._resubscribe_task.cancel()
            self._resubscribe_task = self._hass.async_create_background_task(
                self._async_subscribe_devices(names), "zigbee_health_subscribe_devices"
            )
        self._listener.source_changed()

    @callback
    def _handle_health(self, msg: ReceiveMessage) -> None:
        try:
            sample = parse_bridge_health(_json(msg.payload), dt_util.utcnow())
        except PayloadError as err:
            _LOGGER.debug("Invalid bridge/health payload: %s", err)
            return
        self._listener.health_received(sample)

    @callback
    def _handle_event(self, msg: ReceiveMessage) -> None:
        event = parse_bridge_event(_json(msg.payload))
        if event is not None:
            self._listener.event_received(*event)

    @callback
    def _handle_response(self, msg: ReceiveMessage) -> None:
        payload = _json(msg.payload)
        if msg.topic.endswith("/networkmap"):
            self._handle_networkmap(payload)
            return
        if not isinstance(payload, dict):
            return
        future = self._requests.get(str(payload.get("transaction")))
        if future is not None and not future.done():
            future.set_result(payload)

    def _handle_networkmap(self, payload: Any) -> None:
        try:
            scan = parse_networkmap(payload, dt_util.utcnow())
        except PayloadError as err:
            _LOGGER.warning("Network map failed: %s", err)
            if self._scan_future is not None and not self._scan_future.done():
                self._scan_future.set_exception(err)
            return
        if self._scan_future is not None and not self._scan_future.done():
            self._scan_future.set_result(scan)
        else:
            # Late answer after a timeout, or a map requested by the Z2M frontend.
            self._listener.scan_received(scan)

    # --- device topics ---------------------------------------------------------------

    async def _async_subscribe_devices(self, names: frozenset[str]) -> None:
        for unsub in self._device_unsubs:
            unsub()
        self._device_unsubs.clear()
        for name in sorted(names):
            topic = f"{self._base}/{name}"
            self._device_unsubs.append(
                await mqtt.async_subscribe(self._hass, topic, self._handle_device_state)
            )
            self._device_unsubs.append(
                await mqtt.async_subscribe(
                    self._hass, f"{topic}/availability", self._handle_availability
                )
            )
        self._subscribed_names = names
        _LOGGER.debug("Subscribed to %d Zigbee devices", len(names))

    def _ieee_for_topic(self, topic: str, suffix: str = "") -> str | None:
        return self._ieee_by_name.get(topic[len(self._base) + 1 : len(topic) - len(suffix)])

    @callback
    def _handle_device_state(self, msg: ReceiveMessage) -> None:
        ieee = self._ieee_for_topic(msg.topic)
        payload = _json(msg.payload)
        if ieee is None or not isinstance(payload, dict):
            return
        device = apply_device_state(
            self._devices[ieee], payload, dt_util.utcnow(), dt_util.get_default_time_zone()
        )
        self._devices[ieee] = device
        self._listener.state_received(device)

    @callback
    def _handle_availability(self, msg: ReceiveMessage) -> None:
        ieee = self._ieee_for_topic(msg.topic, "/availability")
        state = parse_availability(_json(msg.payload))
        if ieee is None or state is None:
            return
        device = self._devices[ieee]
        if device.available == state:
            return
        now = dt_util.utcnow()
        self._devices[ieee] = replace(device, available=state, available_since=now)
        # The first (retained) message after a start is a state, not a change.
        self._listener.availability_changed(ieee, state, now, device.available is None)
