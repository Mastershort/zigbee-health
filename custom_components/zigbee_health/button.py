"""Buttons: scan network now, analyse now (section 6.1)."""

from __future__ import annotations

from typing import TYPE_CHECKING

from homeassistant.components.button import ButtonEntity, ButtonEntityDescription
from homeassistant.const import EntityCategory

from .entity import ZigbeeHealthEntity

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant
    from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

    from .coordinator import ZigbeeHealthConfigEntry

PARALLEL_UPDATES = 1

SCAN = ButtonEntityDescription(key="scan_network", translation_key="scan_network")
ANALYZE = ButtonEntityDescription(
    key="analyze", translation_key="analyze", entity_category=EntityCategory.DIAGNOSTIC
)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ZigbeeHealthConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    coordinator = entry.runtime_data
    async_add_entities([ScanButton(coordinator, SCAN), AnalyzeButton(coordinator, ANALYZE)])


class ScanButton(ZigbeeHealthEntity, ButtonEntity):
    available_without_report = True

    async def async_press(self) -> None:
        # The scan can take minutes; do not block the service call.
        self.hass.async_create_background_task(self.coordinator.async_scan(), "zigbee_health_scan")


class AnalyzeButton(ZigbeeHealthEntity, ButtonEntity):
    available_without_report = True

    async def async_press(self) -> None:
        await self.coordinator.async_analyze_now()
