"""Sensors: hub (6.1), per Zigbee device (6.2), per room (6.3)."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import datetime
from typing import TYPE_CHECKING, Any

from homeassistant.components.sensor import (
    SensorDeviceClass,
    SensorEntity,
    SensorEntityDescription,
    SensorStateClass,
)
from homeassistant.const import PERCENTAGE, EntityCategory, UnitOfTime
from homeassistant.core import callback
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .analyzer.models import (
    DeviceReport,
    DeviceState,
    DeviceType,
    NetworkLevel,
    NetworkReport,
    RoomReport,
)
from .const import Z2M_IDENTIFIER_PREFIX
from .entity import ZigbeeHealthEntity

if TYPE_CHECKING:
    from collections.abc import Callable

    from homeassistant.core import HomeAssistant
    from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

    from .coordinator import ZigbeeHealthConfigEntry, ZigbeeHealthCoordinator

PARALLEL_UPDATES = 0

type SensorValue = int | float | str | datetime | None


# --- hub sensors ---------------------------------------------------------------------


@dataclass(frozen=True, kw_only=True)
class ReportSensorDescription(SensorEntityDescription):
    value_fn: Callable[[NetworkReport], SensorValue]
    attrs_fn: Callable[[NetworkReport], dict[str, Any]] | None = None


@dataclass(frozen=True, kw_only=True)
class CoordinatorSensorDescription(SensorEntityDescription):
    """Sensors derived from coordinator state, available before the first analysis."""

    value_fn: Callable[[ZigbeeHealthCoordinator], SensorValue]


def _count(key: str) -> Callable[[NetworkReport], SensorValue]:
    return lambda report: report.counts.get(key)


def _count_sensor(key: str) -> ReportSensorDescription:
    return ReportSensorDescription(
        key=key,
        translation_key=key,
        state_class=SensorStateClass.MEASUREMENT,
        value_fn=_count(key),
    )


def _status_attributes(report: NetworkReport) -> dict[str, Any]:
    # Compact: at most 3 measures, at most 5 names each (recorder friendly).
    return {
        "actions": [
            {"key": a.key, "count": a.count, "items": list(a.items[:5])} for a in report.actions
        ]
    }


HUB_SENSORS: tuple[ReportSensorDescription, ...] = (
    ReportSensorDescription(
        key="network_health",
        translation_key="network_health",
        native_unit_of_measurement=PERCENTAGE,
        state_class=SensorStateClass.MEASUREMENT,
        value_fn=lambda report: report.score,
    ),
    ReportSensorDescription(
        key="status",
        translation_key="status",
        device_class=SensorDeviceClass.ENUM,
        options=[level.value for level in NetworkLevel],
        value_fn=lambda report: report.level.value,
        attrs_fn=_status_attributes,
    ),
    _count_sensor("devices"),
    _count_sensor("routers"),
    _count_sensor("end_devices"),
    _count_sensor("routers_always_on"),
    _count_sensor("routers_part_time"),
    _count_sensor("offline"),
    _count_sensor("dead"),
    _count_sensor("battery_critical"),
    _count_sensor("weak_links"),
    ReportSensorDescription(
        key="open_findings",
        translation_key="open_findings",
        state_class=SensorStateClass.MEASUREMENT,
        value_fn=_count("findings_open"),
        attrs_fn=lambda report: {
            "critical": report.counts["findings_critical"],
            "warning": report.counts["findings_warning"],
            "info": report.counts["findings_info"],
        },
    ),
    ReportSensorDescription(
        key="messages_per_second",
        translation_key="messages_per_second",
        state_class=SensorStateClass.MEASUREMENT,
        entity_category=EntityCategory.DIAGNOSTIC,
        value_fn=lambda report: report.messages_per_second,
    ),
)

COORDINATOR_SENSORS: tuple[CoordinatorSensorDescription, ...] = (
    CoordinatorSensorDescription(
        key="last_scan",
        translation_key="last_scan",
        device_class=SensorDeviceClass.TIMESTAMP,
        value_fn=lambda coordinator: coordinator.last_scan_at,
    ),
    CoordinatorSensorDescription(
        key="scan_duration",
        translation_key="scan_duration",
        device_class=SensorDeviceClass.DURATION,
        native_unit_of_measurement=UnitOfTime.SECONDS,
        entity_category=EntityCategory.DIAGNOSTIC,
        value_fn=lambda coordinator: coordinator.source.last_scan_duration,
    ),
)


class ReportSensor(ZigbeeHealthEntity, SensorEntity):
    entity_description: ReportSensorDescription
    _unrecorded_attributes = frozenset({"actions"})

    @property
    def native_value(self) -> SensorValue:
        report = self.coordinator.data
        return self.entity_description.value_fn(report) if report else None

    @property
    def extra_state_attributes(self) -> dict[str, Any] | None:
        report = self.coordinator.data
        if report is None or self.entity_description.attrs_fn is None:
            return None
        return self.entity_description.attrs_fn(report)


class CoordinatorSensor(ZigbeeHealthEntity, SensorEntity):
    entity_description: CoordinatorSensorDescription
    available_without_report = True

    @property
    def native_value(self) -> SensorValue:
        return self.entity_description.value_fn(self.coordinator)


# --- per Zigbee device (attached to the existing Z2M device) ---------------------------


@dataclass(frozen=True, kw_only=True)
class DeviceSensorDescription(SensorEntityDescription):
    value_fn: Callable[[DeviceReport, ZigbeeHealthCoordinator], SensorValue]
    applies_fn: Callable[[DeviceReport], bool] = lambda _: True


DEVICE_SENSORS: tuple[DeviceSensorDescription, ...] = (
    DeviceSensorDescription(
        key="zigbee_state",
        translation_key="zigbee_state",
        device_class=SensorDeviceClass.ENUM,
        options=[state.value for state in DeviceState],
        value_fn=lambda d, _: d.state.value,
    ),
    DeviceSensorDescription(
        key="device_health",
        translation_key="device_health",
        native_unit_of_measurement=PERCENTAGE,
        state_class=SensorStateClass.MEASUREMENT,
        entity_registry_enabled_default=False,
        value_fn=lambda d, _: d.score,
    ),
    DeviceSensorDescription(
        key="parent",
        translation_key="parent",
        entity_registry_enabled_default=False,
        applies_fn=lambda d: d.type is DeviceType.END_DEVICE,
        value_fn=lambda d, c: c.device_name(d.parent) if d.parent else None,
    ),
    DeviceSensorDescription(
        key="parent_lqi",
        translation_key="parent_lqi",
        state_class=SensorStateClass.MEASUREMENT,
        entity_registry_enabled_default=False,
        applies_fn=lambda d: d.type is DeviceType.END_DEVICE,
        value_fn=lambda d, _: d.parent_lqi,
    ),
    DeviceSensorDescription(
        key="battery_empty",
        translation_key="battery_empty",
        device_class=SensorDeviceClass.TIMESTAMP,
        entity_registry_enabled_default=False,
        applies_fn=lambda d: d.battery_powered,
        value_fn=lambda d, _: d.battery_empty,
    ),
    DeviceSensorDescription(
        key="children",
        translation_key="children",
        state_class=SensorStateClass.MEASUREMENT,
        entity_registry_enabled_default=False,
        applies_fn=lambda d: d.type is DeviceType.ROUTER,
        value_fn=lambda d, _: len(d.children),
    ),
)


class ZigbeeDeviceSensor(CoordinatorEntity["ZigbeeHealthCoordinator"], SensorEntity):
    _attr_has_entity_name = True
    entity_description: DeviceSensorDescription

    def __init__(
        self,
        coordinator: ZigbeeHealthCoordinator,
        description: DeviceSensorDescription,
        ieee: str,
    ) -> None:
        super().__init__(coordinator)
        self.entity_description = description
        self._ieee = ieee
        self._attr_unique_id = f"{coordinator.config_entry.entry_id}_{ieee}_{description.key}"
        # Same identifier as the Z2M device → no duplicate device (section 3).
        self._attr_device_info = DeviceInfo(
            identifiers={("mqtt", f"{Z2M_IDENTIFIER_PREFIX}{ieee}")}
        )

    @property
    def _device(self) -> DeviceReport | None:
        report = self.coordinator.data
        return report.devices.get(self._ieee) if report else None

    @property
    def available(self) -> bool:
        return super().available and self._device is not None

    @property
    def native_value(self) -> SensorValue:
        device = self._device
        return self.entity_description.value_fn(device, self.coordinator) if device else None


# --- per room ------------------------------------------------------------------------


class RoomSensor(CoordinatorEntity["ZigbeeHealthCoordinator"], SensorEntity):
    """Zigbee health of one area, assigned to that area (section 6.3)."""

    _attr_has_entity_name = True
    _attr_translation_key = "room_health"
    _attr_native_unit_of_measurement = PERCENTAGE
    _attr_state_class = SensorStateClass.MEASUREMENT

    def __init__(self, coordinator: ZigbeeHealthCoordinator, room: RoomReport) -> None:
        super().__init__(coordinator)
        entry = coordinator.config_entry
        assert room.area_id is not None
        self._area_id = room.area_id
        self._attr_unique_id = f"{entry.entry_id}_room_{room.area_id}"
        self._attr_translation_placeholders = {"room": room.area_name or room.area_id}
        self._attr_device_info = ZigbeeHealthEntity.hub_device_info(coordinator)

    @property
    def _room(self) -> RoomReport | None:
        report = self.coordinator.data
        if report is None:
            return None
        return next((r for r in report.rooms if r.area_id == self._area_id), None)

    @property
    def available(self) -> bool:
        return super().available and self._room is not None

    @property
    def native_value(self) -> int | None:
        room = self._room
        return room.score if room else None

    @property
    def extra_state_attributes(self) -> dict[str, Any] | None:
        room = self._room
        if room is None:
            return None
        data = asdict(room)
        return {k: data[k] for k in (
            "end_devices", "always_on_routers", "part_time_routers", "weakest_lqi",
            "open_findings", "recommendation",
        )}  # fmt: skip

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        registry = er.async_get(self.hass)
        entry = registry.async_get(self.entity_id)
        if entry is not None and entry.area_id is None:
            registry.async_update_entity(self.entity_id, area_id=self._area_id)


# --- setup ---------------------------------------------------------------------------


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ZigbeeHealthConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    coordinator = entry.runtime_data
    hub: list[SensorEntity] = [ReportSensor(coordinator, d) for d in HUB_SENSORS]
    hub += [CoordinatorSensor(coordinator, d) for d in COORDINATOR_SENSORS]
    async_add_entities(hub)

    known_devices: set[str] = set()
    known_rooms: set[str] = set()

    @callback
    def add_dynamic_entities() -> None:
        """Devices and rooms appear with the first report and when they are added later."""
        report = coordinator.data
        if report is None:
            return
        new: list[SensorEntity] = []
        if coordinator.options.device_entities:
            for ieee, device in report.devices.items():
                if ieee in known_devices or coordinator.ha_device_id(ieee) is None:
                    continue
                known_devices.add(ieee)
                new += [
                    ZigbeeDeviceSensor(coordinator, description, ieee)
                    for description in DEVICE_SENSORS
                    if description.applies_fn(device)
                ]
        if coordinator.options.room_sensors:
            for room in report.rooms:
                if room.area_id is None or room.area_id in known_rooms:
                    continue
                known_rooms.add(room.area_id)
                new.append(RoomSensor(coordinator, room))
        if new:
            async_add_entities(new)

    add_dynamic_entities()
    entry.async_on_unload(coordinator.async_add_listener(add_dynamic_entities))
