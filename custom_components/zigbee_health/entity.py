"""Base entity: hub entities live on the device "Zigbee Health (<instance>)"."""

from __future__ import annotations

from typing import TYPE_CHECKING

from homeassistant.helpers.device_registry import DeviceEntryType, DeviceInfo
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import DOMAIN
from .coordinator import ZigbeeHealthCoordinator

if TYPE_CHECKING:
    from homeassistant.helpers.entity import EntityDescription


class ZigbeeHealthEntity(CoordinatorEntity[ZigbeeHealthCoordinator]):
    _attr_has_entity_name = True
    # Entities that make sense before the first analysis (e.g. last scan).
    available_without_report = False

    def __init__(
        self, coordinator: ZigbeeHealthCoordinator, description: EntityDescription
    ) -> None:
        super().__init__(coordinator)
        self.entity_description = description
        self._attr_unique_id = f"{coordinator.config_entry.entry_id}_{description.key}"
        self._attr_device_info = self.hub_device_info(coordinator)

    @staticmethod
    def hub_device_info(coordinator: ZigbeeHealthCoordinator) -> DeviceInfo:
        entry = coordinator.config_entry
        return DeviceInfo(
            identifiers={(DOMAIN, entry.entry_id)},
            name=f"Zigbee Health ({entry.title})",
            manufacturer="Zigbee Health",
            model="Zigbee2MQTT",
            entry_type=DeviceEntryType.SERVICE,
        )

    @property
    def available(self) -> bool:
        if self.available_without_report:
            return True
        return super().available and self.coordinator.data is not None
