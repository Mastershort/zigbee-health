"""Options flow (section 8.2): menu with sections, every value has a default."""

from __future__ import annotations

from typing import Any

import voluptuous as vol
from homeassistant.config_entries import ConfigFlowResult, OptionsFlow
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers import selector

from .analyzer.models import DeviceType
from .options import (
    OPT_BATTERY_PERCENT,
    OPT_BUNDLE_THRESHOLD,
    OPT_DEAD_DAYS,
    OPT_DEVICE_ENTITIES,
    OPT_DISAPPEARED_DAYS,
    OPT_DISAPPEARED_HOURS,
    OPT_FLOOD_PER_MINUTE,
    OPT_FORECAST_DAYS,
    OPT_HYSTERESIS_MINUTES,
    OPT_LEARN_MORE_URL,
    OPT_MAX_CHILDREN,
    OPT_REPAIRS_INFO,
    OPT_ROOM_SENSORS,
    OPT_SCAN_AUTO,
    OPT_SCAN_ONLY_AWAY,
    OPT_SCAN_TIME,
    OPT_SCAN_TIMEOUT,
    OPT_SIDEBAR_PANEL,
    OPT_WALL_SWITCH_ALERT,
    OPT_WEAK_LQI,
    Options,
)

CONF_IGNORED = "ignored_devices"
INT_OPTIONS = frozenset(
    {
        OPT_DEAD_DAYS,
        OPT_DISAPPEARED_HOURS,
        OPT_DISAPPEARED_DAYS,
        OPT_WEAK_LQI,
        OPT_BATTERY_PERCENT,
        OPT_FORECAST_DAYS,
        OPT_MAX_CHILDREN,
        OPT_BUNDLE_THRESHOLD,
        OPT_HYSTERESIS_MINUTES,
        OPT_SCAN_TIMEOUT,
        OPT_SIDEBAR_PANEL,
    }
)


def _number(minimum: float, maximum: float, step: float = 1, unit: str | None = None) -> Any:
    config = selector.NumberSelectorConfig(
        min=minimum, max=maximum, step=step, mode=selector.NumberSelectorMode.BOX
    )
    if unit is not None:
        config["unit_of_measurement"] = unit
    return selector.NumberSelector(config)


class ZigbeeHealthOptionsFlow(OptionsFlow):
    async def async_step_init(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        return self.async_show_menu(
            step_id="init",
            menu_options=["scan", "thresholds", "notifications", "entities", "ignore", "help"],
        )

    @property
    def _current(self) -> Options:
        return Options.from_mapping(self.config_entry.options)

    def _save(self, user_input: dict[str, Any]) -> ConfigFlowResult:
        values = {
            key: int(value) if key in INT_OPTIONS else value for key, value in user_input.items()
        }
        return self.async_create_entry(data={**self.config_entry.options, **values})

    async def async_step_scan(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        if user_input is not None:
            return self._save(user_input)
        o = self._current
        schema = vol.Schema(
            {
                vol.Required(OPT_SCAN_AUTO, default=o.scan_auto): bool,
                vol.Required(OPT_SCAN_TIME, default=o.scan_time): selector.TimeSelector(),
                vol.Required(OPT_SCAN_TIMEOUT, default=o.scan_timeout): _number(1, 30, unit="min"),
                vol.Optional(OPT_SCAN_ONLY_AWAY, default=list(o.scan_only_away)): (
                    selector.EntitySelector(
                        selector.EntitySelectorConfig(domain="person", multiple=True)
                    )
                ),
            }
        )
        return self.async_show_form(step_id="scan", data_schema=schema)

    async def async_step_thresholds(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        if user_input is not None:
            return self._save(user_input)
        o = self._current
        schema = vol.Schema(
            {
                vol.Required(OPT_DEAD_DAYS, default=o.dead_days): _number(1, 365, unit="d"),
                vol.Required(OPT_DISAPPEARED_HOURS, default=o.disappeared_chatty_hours): (
                    _number(1, 168, unit="h")
                ),
                vol.Required(OPT_DISAPPEARED_DAYS, default=o.disappeared_silent_days): (
                    _number(1, 60, unit="d")
                ),
                vol.Required(OPT_WEAK_LQI, default=o.weak_lqi): _number(1, 254),
                vol.Required(OPT_BATTERY_PERCENT, default=o.battery_percent): (
                    _number(1, 50, unit="%")
                ),
                vol.Required(OPT_FORECAST_DAYS, default=o.forecast_days): (
                    _number(1, 180, unit="d")
                ),
                vol.Required(OPT_FLOOD_PER_MINUTE, default=o.flood_per_minute): (
                    _number(1, 120, 0.5, "/min")
                ),
                vol.Required(OPT_MAX_CHILDREN, default=o.max_children): _number(2, 50),
            }
        )
        return self.async_show_form(step_id="thresholds", data_schema=schema)

    async def async_step_notifications(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        if user_input is not None:
            return self._save(user_input)
        o = self._current
        schema = vol.Schema(
            {
                vol.Required(OPT_WALL_SWITCH_ALERT, default=o.wall_switch_alert): bool,
                vol.Required(OPT_REPAIRS_INFO, default=o.repairs_include_info): bool,
                vol.Required(OPT_BUNDLE_THRESHOLD, default=o.bundle_threshold): _number(2, 50),
                vol.Required(OPT_HYSTERESIS_MINUTES, default=o.hysteresis_minutes): (
                    _number(0, 1440, unit="min")
                ),
            }
        )
        return self.async_show_form(step_id="notifications", data_schema=schema)

    async def async_step_entities(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        if user_input is not None:
            return self._save(user_input)
        o = self._current
        schema = vol.Schema(
            {
                vol.Required(OPT_DEVICE_ENTITIES, default=o.device_entities): bool,
                vol.Required(OPT_ROOM_SENSORS, default=o.room_sensors): bool,
                vol.Required(OPT_SIDEBAR_PANEL, default=o.sidebar_panel): bool,
            }
        )
        return self.async_show_form(step_id="entities", data_schema=schema)

    async def async_step_ignore(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        coordinator = getattr(self.config_entry, "runtime_data", None)
        if coordinator is None:
            return self.async_abort(reason="not_loaded")
        if user_input is not None:
            await coordinator.async_set_ignored_devices(set(user_input[CONF_IGNORED]))
            # Unchanged options → no reload; the ignore list lives in the coordinator store.
            return self.async_create_entry(data=dict(self.config_entry.options))
        names = {
            ieee: device.friendly_name
            for ieee, device in sorted(
                coordinator.source.devices.items(), key=lambda item: item[1].friendly_name
            )
            if device.type is not DeviceType.COORDINATOR
        }
        current = [ieee for ieee in coordinator.ignored_devices if ieee in names]
        schema = vol.Schema({vol.Optional(CONF_IGNORED, default=current): cv.multi_select(names)})
        return self.async_show_form(step_id="ignore", data_schema=schema)

    async def async_step_help(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        if user_input is not None:
            return self._save({OPT_LEARN_MORE_URL: user_input.get(OPT_LEARN_MORE_URL, "")})
        schema = vol.Schema(
            {vol.Optional(OPT_LEARN_MORE_URL, default=self._current.learn_more_url): str}
        )
        return self.async_show_form(step_id="help", data_schema=schema)
