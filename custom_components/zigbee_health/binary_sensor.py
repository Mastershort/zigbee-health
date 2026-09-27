"""Problems binary sensor (section 6.1)."""

from __future__ import annotations

from typing import TYPE_CHECKING

from homeassistant.components.binary_sensor import (
    BinarySensorDeviceClass,
    BinarySensorEntity,
    BinarySensorEntityDescription,
)

from .entity import ZigbeeHealthEntity

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant
    from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

    from .coordinator import ZigbeeHealthConfigEntry

PARALLEL_UPDATES = 0

PROBLEMS = BinarySensorEntityDescription(
    key="problems",
    translation_key="problems",
    device_class=BinarySensorDeviceClass.PROBLEM,
)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ZigbeeHealthConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    async_add_entities([ProblemsBinarySensor(entry.runtime_data, PROBLEMS)])


class ProblemsBinarySensor(ZigbeeHealthEntity, BinarySensorEntity):
    """On while at least one critical or warning finding is open."""

    @property
    def is_on(self) -> bool | None:
        report = self.coordinator.data
        if report is None:
            return None
        return report.counts["findings_critical"] + report.counts["findings_warning"] > 0
