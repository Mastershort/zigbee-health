"""Fix flows (section 7.2). Nothing changes the network without explicit confirmation."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

import voluptuous as vol
from homeassistant.components.repairs import RepairsFlow
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers import issue_registry as ir
from homeassistant.helpers import selector

from .analyzer.models import FindingType
from .const import DOMAIN
from .issues import KIND_BUNDLE, KIND_PREREQUISITE

if TYPE_CHECKING:
    from homeassistant import data_entry_flow
    from homeassistant.core import HomeAssistant

    from .coordinator import ZigbeeHealthCoordinator

CONF_FORCE = "force"
CONF_DEVICES = "devices"
CONF_ACTION = "action"
ACTION_REMOVE = "remove"
ACTION_IGNORE_DEVICE = "ignore_device"
ACTION_IGNORE_FINDING = "ignore_finding"

# Z2M options set by the "enable prerequisite" fix flow (section 7.2, F-15).
PREREQUISITE_OPTIONS: dict[str, dict[str, Any]] = {
    "last_seen": {"advanced": {"last_seen": "ISO_8601"}},
    "availability": {"availability": {"enabled": True}},
    "health": {"health": {"interval": 10}},
}


def _coordinator(hass: HomeAssistant, entry_id: str) -> ZigbeeHealthCoordinator | None:
    entry = hass.config_entries.async_get_entry(entry_id)
    if entry is None or not hasattr(entry, "runtime_data"):
        return None
    coordinator: ZigbeeHealthCoordinator = entry.runtime_data
    return coordinator


class ZigbeeHealthRepairsFlow(RepairsFlow):
    """Base: the issue text is shown in the first step, so it needs the issue placeholders."""

    def __init__(
        self,
        coordinator: ZigbeeHealthCoordinator,
        data: dict[str, Any],
        issue_placeholders: dict[str, str],
    ) -> None:
        self._coordinator = coordinator
        self._data = data
        self._issue_placeholders = issue_placeholders


class FindingFixFlow(ZigbeeHealthRepairsFlow):
    """Single finding: remove (dead devices), ignore the device, or ignore this finding."""

    @property
    def _ieee(self) -> str:
        return str(self._data["ieee"])

    @property
    def _type(self) -> FindingType:
        return FindingType(self._data["finding_type"])

    def _placeholders(self) -> dict[str, str]:
        return self._issue_placeholders | {"name": self._coordinator.device_name(self._ieee)}

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> data_entry_flow.FlowResult:
        options = [ACTION_IGNORE_FINDING, ACTION_IGNORE_DEVICE]
        if self._type is FindingType.DEAD_DEVICE:
            options.insert(0, ACTION_REMOVE)
        return self.async_show_menu(
            step_id="init", menu_options=options, description_placeholders=self._placeholders()
        )

    async def async_step_remove(
        self, user_input: dict[str, Any] | None = None
    ) -> data_entry_flow.FlowResult:
        errors: dict[str, str] = {}
        placeholders = self._placeholders() | {"error": ""}
        if user_input is not None:
            result = await self._coordinator.source.async_remove_device(
                self._ieee, user_input[CONF_FORCE]
            )
            if result.ok:
                await self._coordinator.async_request_refresh()
                return self.async_create_entry(data={})
            errors["base"] = "remove_failed"
            placeholders["error"] = result.error or ""
        return self.async_show_form(
            step_id="remove",
            data_schema=vol.Schema({vol.Required(CONF_FORCE, default=False): bool}),
            description_placeholders=placeholders,
            errors=errors,
        )

    async def async_step_ignore_device(
        self, user_input: dict[str, Any] | None = None
    ) -> data_entry_flow.FlowResult:
        if user_input is not None:
            await self._coordinator.async_ignore(self._ieee)
            return self.async_create_entry(data={})
        return self.async_show_form(
            step_id="ignore_device", description_placeholders=self._placeholders()
        )

    async def async_step_ignore_finding(
        self, user_input: dict[str, Any] | None = None
    ) -> data_entry_flow.FlowResult:
        if user_input is not None:
            await self._coordinator.async_ignore(self._ieee, self._type)
            return self.async_create_entry(data={})
        return self.async_show_form(
            step_id="ignore_finding", description_placeholders=self._placeholders()
        )


class BundleFixFlow(ZigbeeHealthRepairsFlow):
    """Bundle of findings: pick devices, then remove (dead devices) or ignore them."""

    def __init__(
        self,
        coordinator: ZigbeeHealthCoordinator,
        data: dict[str, Any],
        issue_placeholders: dict[str, str],
    ) -> None:
        super().__init__(coordinator, data, issue_placeholders)
        self._ieees: list[str] = [i for i in str(data["ieees"]).split(",") if i]
        self._type = FindingType(data["finding_type"])
        self._selected: list[str] = []

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> data_entry_flow.FlowResult:
        actions = [ACTION_IGNORE_FINDING, ACTION_IGNORE_DEVICE]
        if self._type is FindingType.DEAD_DEVICE:
            actions.insert(0, ACTION_REMOVE)
        if user_input is not None:
            self._selected = user_input[CONF_DEVICES]
            if not self._selected:
                return self.async_abort(reason="nothing_selected")
            if user_input[CONF_ACTION] == ACTION_REMOVE:
                return await self.async_step_remove()
            finding_type = self._type if user_input[CONF_ACTION] == ACTION_IGNORE_FINDING else None
            for ieee in self._selected:
                await self._coordinator.async_ignore(ieee, finding_type)
            return self.async_create_entry(data={})
        names = {ieee: self._coordinator.device_name(ieee) for ieee in self._ieees}
        return self.async_show_form(
            step_id="init",
            data_schema=vol.Schema(
                {
                    vol.Required(CONF_DEVICES, default=list(names)): cv.multi_select(names),
                    vol.Required(CONF_ACTION, default=actions[0]): selector.SelectSelector(
                        selector.SelectSelectorConfig(
                            options=actions, translation_key="bundle_action"
                        )
                    ),
                }
            ),
            description_placeholders=self._issue_placeholders | {"count": str(len(names))},
        )

    async def async_step_remove(
        self, user_input: dict[str, Any] | None = None
    ) -> data_entry_flow.FlowResult:
        errors: dict[str, str] = {}
        placeholders = {"count": str(len(self._selected)), "error": ""}
        if user_input is not None:
            failed: list[str] = []
            for ieee in self._selected:
                result = await self._coordinator.source.async_remove_device(
                    ieee, user_input[CONF_FORCE]
                )
                if not result.ok:
                    failed.append(f"{self._coordinator.device_name(ieee)}: {result.error}")
            await self._coordinator.async_request_refresh()
            if not failed:
                return self.async_create_entry(data={})
            errors["base"] = "remove_failed"
            placeholders["error"] = "; ".join(failed)
        return self.async_show_form(
            step_id="remove",
            data_schema=vol.Schema({vol.Required(CONF_FORCE, default=False): bool}),
            description_placeholders=placeholders,
            errors=errors,
        )


class PrerequisiteFixFlow(ZigbeeHealthRepairsFlow):
    """Enable a missing Z2M option after showing exactly what will be changed."""

    @property
    def _option(self) -> str:
        return str(self._data["option"])

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> data_entry_flow.FlowResult:
        change = PREREQUISITE_OPTIONS[self._option]
        placeholders = self._issue_placeholders | {
            "option": self._option,
            "change": f"`{change}`",
            "error": "",
        }
        errors: dict[str, str] = {}
        if user_input is not None:
            result = await self._coordinator.source.async_set_options(change)
            if result.ok:
                if result.data and result.data.get("restart_required"):
                    return self.async_abort(reason="restart_required")
                return self.async_create_entry(data={})
            errors["base"] = "option_failed"
            placeholders["error"] = result.error or ""
        return self.async_show_form(
            step_id="init", description_placeholders=placeholders, errors=errors
        )


class UnavailableFlow(RepairsFlow):
    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> data_entry_flow.FlowResult:
        return self.async_abort(reason="not_available")


async def async_create_fix_flow(
    hass: HomeAssistant, issue_id: str, data: dict[str, str | int | float | None] | None
) -> RepairsFlow:
    if not data:
        return UnavailableFlow()
    coordinator = _coordinator(hass, str(data.get("entry_id")))
    if coordinator is None:
        return UnavailableFlow()
    issue = ir.async_get(hass).async_get_issue(DOMAIN, issue_id)
    placeholders = dict(issue.translation_placeholders or {}) if issue else {}
    kind = data.get("kind")
    if kind == KIND_BUNDLE:
        return BundleFixFlow(coordinator, dict(data), placeholders)
    if kind == KIND_PREREQUISITE and data.get("option") in PREREQUISITE_OPTIONS:
        return PrerequisiteFixFlow(coordinator, dict(data), placeholders)
    if data.get("ieee"):
        return FindingFixFlow(coordinator, dict(data), placeholders)
    return UnavailableFlow()
