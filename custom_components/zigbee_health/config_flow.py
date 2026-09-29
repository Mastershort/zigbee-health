"""Config flow (section 8.1): discovery, validation, prerequisites hint, reconfigure."""

from __future__ import annotations

import asyncio
import json
import re
from dataclasses import dataclass
from typing import TYPE_CHECKING, Any

import voluptuous as vol
from homeassistant.components import mqtt
from homeassistant.config_entries import ConfigEntry, ConfigFlow, ConfigFlowResult
from homeassistant.const import CONF_NAME
from homeassistant.core import HomeAssistant, callback

from .analyzer.z2m_payloads import BridgeInfo, PayloadError, parse_availability, parse_bridge_info
from .const import (
    CONF_BASE_TOPIC,
    DEFAULT_BASE_TOPIC,
    DEFAULT_NAME,
    DISCOVERY_WAIT,
    DOMAIN,
    MIN_Z2M_VERSION,
    VALIDATION_TIMEOUT,
)
from .options_flow import ZigbeeHealthOptionsFlow

if TYPE_CHECKING:
    from homeassistant.components.mqtt import ReceiveMessage


@dataclass(slots=True)
class ProbeResult:
    info: BridgeInfo | None = None
    error: str | None = None


def _version(text: str | None) -> tuple[int, ...]:
    return tuple(int(part) for part in re.findall(r"\d+", text or "")[:3])


def _loads(payload: str | bytes | bytearray) -> Any:
    try:
        return json.loads(payload)
    except ValueError:
        return payload if isinstance(payload, str) else None


async def async_probe(hass: HomeAssistant, base: str) -> ProbeResult:
    """Wait for the retained ``bridge/state`` and ``bridge/info`` of an instance."""
    state: asyncio.Future[bool | None] = hass.loop.create_future()
    info: asyncio.Future[Any] = hass.loop.create_future()

    @callback
    def on_state(msg: ReceiveMessage) -> None:
        if not state.done():
            state.set_result(parse_availability(_loads(msg.payload)))

    @callback
    def on_info(msg: ReceiveMessage) -> None:
        if not info.done():
            info.set_result(_loads(msg.payload))

    unsubs = [
        await mqtt.async_subscribe(hass, f"{base}/bridge/state", on_state),
        await mqtt.async_subscribe(hass, f"{base}/bridge/info", on_info),
    ]
    try:
        async with asyncio.timeout(VALIDATION_TIMEOUT):
            online = await state
            raw_info = await info
    except TimeoutError:
        return ProbeResult(error="no_response")
    finally:
        for unsub in unsubs:
            unsub()
    if online is not True:
        return ProbeResult(error="z2m_offline")
    try:
        parsed = parse_bridge_info(raw_info)
    except PayloadError:
        return ProbeResult(error="no_response")
    if not parsed.coordinator_ieee:
        return ProbeResult(error="no_response")
    if _version(parsed.version) < MIN_Z2M_VERSION:
        return ProbeResult(info=parsed, error="version_too_old")
    return ProbeResult(info=parsed)


async def async_discover(hass: HomeAssistant) -> list[str]:
    """Base topics of Z2M instances announcing ``+/bridge/info`` (single-level topics)."""
    found: set[str] = set()

    @callback
    def on_info(msg: ReceiveMessage) -> None:
        found.add(msg.topic.split("/", 1)[0])

    unsub = await mqtt.async_subscribe(hass, "+/bridge/info", on_info)
    try:
        await asyncio.sleep(DISCOVERY_WAIT)
    finally:
        unsub()
    return sorted(found)


class ZigbeeHealthConfigFlow(ConfigFlow, domain=DOMAIN):
    VERSION = 1

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> ZigbeeHealthOptionsFlow:
        return ZigbeeHealthOptionsFlow()

    def __init__(self) -> None:
        self._data: dict[str, Any] = {}
        self._title = DEFAULT_NAME
        self._info: BridgeInfo | None = None

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        if not await mqtt.async_wait_for_mqtt_client(self.hass):
            return self.async_abort(reason="mqtt_not_connected")
        errors: dict[str, str] = {}
        if user_input is not None:
            base = user_input[CONF_BASE_TOPIC].strip().strip("/")
            result = await async_probe(self.hass, base)
            if result.error:
                errors["base"] = result.error
            else:
                assert result.info is not None
                await self.async_set_unique_id(result.info.coordinator_ieee)
                self._abort_if_unique_id_configured()
                self._data = {CONF_BASE_TOPIC: base}
                self._title = user_input[CONF_NAME].strip() or DEFAULT_NAME
                self._info = result.info
                if (
                    not result.info.last_seen_enabled
                    or not result.info.availability_enabled
                    or result.info.health_interval is None
                ):
                    return await self.async_step_prerequisites()
                return self.async_create_entry(title=self._title, data=self._data)
            default_base = base
        else:
            discovered = await async_discover(self.hass)
            default_base = discovered[0] if discovered else DEFAULT_BASE_TOPIC

        schema = vol.Schema(
            {
                vol.Required(CONF_BASE_TOPIC, default=default_base): str,
                vol.Required(CONF_NAME, default=DEFAULT_NAME): str,
            }
        )
        return self.async_show_form(step_id="user", data_schema=schema, errors=errors)

    async def async_step_prerequisites(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Hint about Z2M options that improve the analysis (section 8.1, step 5)."""
        if user_input is not None:
            return self.async_create_entry(title=self._title, data=self._data)
        assert self._info is not None
        missing = []
        if not self._info.last_seen_enabled:
            missing.append("advanced.last_seen")
        if not self._info.availability_enabled:
            missing.append("availability")
        if self._info.health_interval is None:
            missing.append("health")
        return self.async_show_form(
            step_id="prerequisites",
            description_placeholders={"missing": ", ".join(missing)},
        )

    async def async_step_reconfigure(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        entry = self._get_reconfigure_entry()
        errors: dict[str, str] = {}
        if user_input is not None:
            base = user_input[CONF_BASE_TOPIC].strip().strip("/")
            result = await async_probe(self.hass, base)
            if result.error:
                errors["base"] = result.error
            else:
                assert result.info is not None
                await self.async_set_unique_id(result.info.coordinator_ieee)
                self._abort_if_unique_id_mismatch(reason="wrong_network")
                return self.async_update_reload_and_abort(
                    entry, data_updates={CONF_BASE_TOPIC: base}
                )
        schema = vol.Schema(
            {vol.Required(CONF_BASE_TOPIC, default=entry.data[CONF_BASE_TOPIC]): str}
        )
        return self.async_show_form(step_id="reconfigure", data_schema=schema, errors=errors)
