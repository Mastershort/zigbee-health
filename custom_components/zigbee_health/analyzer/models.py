"""Runtime data model of the analyzer.

Pure dataclasses without Home Assistant imports. All timestamps are timezone-aware
``datetime`` objects in UTC. Devices are always keyed by their IEEE address.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import IntEnum, StrEnum
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from datetime import datetime

    from .history import NetworkHistory


class DeviceType(StrEnum):
    """Zigbee role as reported by Zigbee2MQTT (``bridge/devices`` ``type``)."""

    COORDINATOR = "Coordinator"
    ROUTER = "Router"
    END_DEVICE = "EndDevice"
    UNKNOWN = "Unknown"


class Relationship(IntEnum):
    """Neighbor table relationship of ``source`` towards the queried ``target``."""

    PARENT = 0
    CHILD = 1
    SIBLING = 2
    NONE = 3
    PREVIOUS_CHILD = 4


class RouterKind(StrEnum):
    """Classification of routers (section 5.1)."""

    ALWAYS_ON = "always_on"
    PART_TIME = "part_time"
    # Did not answer the latest scan, but not (yet) often enough to be part-time.
    UNCLEAR = "unclear"


class Severity(StrEnum):
    """Severity of a finding, ordered from most to least severe."""

    CRITICAL = "critical"
    WARNING = "warning"
    INFO = "info"


class FindingType(StrEnum):
    """Finding types (section 5.2). Values are the translation keys."""

    DEAD_DEVICE = "dead_device"  # F-01
    DISAPPEARED = "disappeared"  # F-02
    BATTERY_LOW = "battery_low"  # F-03
    BATTERY_FORECAST = "battery_forecast"  # F-04
    PART_TIME_ROUTER = "part_time_router"  # F-05
    CHILDREN_ON_PART_TIME_ROUTER = "children_on_part_time_router"  # F-06
    WEAK_LINK = "weak_link"  # F-07
    WEAK_BACKBONE = "weak_backbone"  # F-08
    DEGRADATION = "degradation"  # F-09
    UNSTABLE_DEVICE = "unstable_device"  # F-10
    MESSAGE_FLOOD = "message_flood"  # F-11, one device
    NETWORK_MESSAGE_FLOOD = "network_message_flood"  # F-11, whole network
    OVERLOADED_PARENT = "overloaded_parent"  # F-12
    ROOM_WITHOUT_ROUTER = "room_without_router"  # F-13
    TOO_FEW_ROUTERS = "too_few_routers"  # F-14
    PREREQUISITE_MISSING = "prerequisite_missing"  # F-15
    OUTDATED_FIRMWARE = "outdated_firmware"  # F-16
    INTERVIEW_INCOMPLETE = "interview_incomplete"  # F-17
    UNSUPPORTED_DEVICE = "unsupported_device"  # F-17
    DEVICES_WITHOUT_AREA = "devices_without_area"  # F-18


class DeviceState(StrEnum):
    """Aggregated per-device state exposed as the "Zigbee state" entity (section 6.2)."""

    OK = "ok"
    WEAK = "weak"
    BATTERY = "battery"
    OFFLINE = "offline"
    DEAD = "dead"
    PART_TIME_ROUTER = "part_time_router"
    IGNORED = "ignored"


class NetworkLevel(StrEnum):
    """Network status level (section 5.3)."""

    STABLE = "stable"
    DEGRADED = "degraded"
    FRAGILE = "fragile"
    PAUSED = "paused"


@dataclass(frozen=True, slots=True)
class ZigbeeDevice:
    """Master data and latest live values of one Zigbee device."""

    ieee: str
    friendly_name: str
    type: DeviceType
    power_source: str | None = None
    manufacturer: str | None = None
    model_id: str | None = None
    vendor: str | None = None
    model: str | None = None
    exposes: frozenset[str] = frozenset()
    supported: bool = True
    disabled: bool = False
    interview_completed: bool = True
    network_address: int | None = None
    area_id: str | None = None
    area_name: str | None = None
    floor_id: str | None = None
    # Live values. ``last_seen`` is the best known time of the last message from the device.
    last_seen: datetime | None = None
    available: bool | None = None  # None = availability feature off / unknown
    available_since: datetime | None = None  # time of the last availability change
    linkquality: int | None = None
    battery: float | None = None
    voltage: float | None = None

    @property
    def is_battery_powered(self) -> bool:
        return (self.power_source or "").lower() == "battery"


@dataclass(frozen=True, slots=True)
class ScanNode:
    """A node of a raw network map."""

    ieee: str
    friendly_name: str
    type: DeviceType
    failed: bool  # router did not deliver its neighbor table (``failed: ["lqi"]``)
    last_seen: datetime | None = None


@dataclass(frozen=True, slots=True)
class ScanLink:
    """One neighbor table entry: ``target`` was queried and reported ``source``."""

    source: str
    target: str
    lqi: int
    relationship: int
    device_type: int
    depth: int


@dataclass(frozen=True, slots=True)
class NetworkScan:
    """Result of one raw network map request."""

    timestamp: datetime
    nodes: dict[str, ScanNode]
    links: tuple[ScanLink, ...]

    def responded(self, ieee: str) -> bool:
        """True if the node is part of the scan and delivered its neighbor table."""
        node = self.nodes.get(ieee)
        return node is not None and not node.failed

    def failed(self, ieee: str) -> bool:
        node = self.nodes.get(ieee)
        return node is not None and node.failed


@dataclass(frozen=True, slots=True)
class AvailabilityChange:
    """A change of the Z2M availability state of a device."""

    timestamp: datetime
    online: bool


def _empty_history() -> NetworkHistory:
    from .history import NetworkHistory  # noqa: PLC0415 - avoid import cycle

    return NetworkHistory()


@dataclass(frozen=True, slots=True)
class SourceInfo:
    """Facts about the Zigbee backend (Z2M ``bridge/info``)."""

    version: str | None = None
    coordinator_type: str | None = None
    coordinator_revision: str | None = None
    last_seen_enabled: bool = True
    availability_enabled: bool = True
    health_enabled: bool = True


@dataclass(frozen=True, slots=True)
class NetworkSnapshot:
    """Everything the analyzer needs for one run. Built by the coordinator."""

    now: datetime
    devices: dict[str, ZigbeeDevice]
    # Oldest first, newest last. Only successful scans.
    scans: tuple[NetworkScan, ...] = ()
    availability_changes: dict[str, tuple[AvailabilityChange, ...]] = field(default_factory=dict)
    # Times at which the HA light entity of a router became ``unavailable``.
    light_unavailable_events: dict[str, tuple[datetime, ...]] = field(default_factory=dict)
    ignored_devices: frozenset[str] = frozenset()
    # (ieee, finding type) pairs ignored by the user.
    ignored_findings: frozenset[tuple[str, FindingType]] = frozenset()
    z2m_online: bool = True
    z2m_online_since: datetime | None = None
    source_info: SourceInfo | None = None
    history: NetworkHistory = field(default_factory=_empty_history)

    @property
    def latest_scan(self) -> NetworkScan | None:
        return self.scans[-1] if self.scans else None


@dataclass(frozen=True, slots=True)
class Finding:
    """One detected problem. ``id`` is stable across runs."""

    id: str
    type: FindingType
    severity: Severity
    ieee: str | None = None
    area_id: str | None = None
    # Translation placeholders and measured values. Only JSON-serialisable scalars.
    data: dict[str, str | int | float] = field(default_factory=dict)
    # Other devices involved (e.g. children of a part-time router).
    related: tuple[str, ...] = ()


@dataclass(frozen=True, slots=True)
class DeviceReport:
    ieee: str
    friendly_name: str
    type: DeviceType
    router_kind: RouterKind | None
    chatty: bool
    state: DeviceState
    score: int
    parent: str | None
    parent_lqi: int | None
    children: tuple[str, ...]
    area_id: str | None
    battery: float | None = None
    floor_id: str | None = None
    battery_empty: datetime | None = None
    battery_powered: bool = False
    # Best known last message: live state, persisted history or the network map.
    last_seen: datetime | None = None


@dataclass(frozen=True, slots=True)
class RoomReport:
    area_id: str | None  # None = devices without area
    area_name: str | None
    score: int
    end_devices: int
    always_on_routers: int
    part_time_routers: int
    weakest_lqi: int | None
    open_findings: int
    recommendation: str | None  # translation key


@dataclass(frozen=True, slots=True)
class NetworkReport:
    generated_at: datetime
    paused: bool
    score: int | None
    level: NetworkLevel
    findings: tuple[Finding, ...]
    devices: dict[str, DeviceReport]
    rooms: tuple[RoomReport, ...]
    counts: dict[str, int]
    # IEEE addresses that appear in a neighbor table but are unknown to Z2M.
    unknown_neighbors: tuple[str, ...] = ()
    # Alive end devices whose parent could not be determined from any scan.
    unknown_parent: tuple[str, ...] = ()
    # Most effective measures, most important first (section 5.4).
    actions: tuple[Action, ...] = ()
    messages_per_second: float | None = None


@dataclass(frozen=True, slots=True)
class Action:
    """A recommended measure for the whole network (top-3 list)."""

    key: str  # translation key
    count: int
    items: tuple[str, ...]  # names of devices or rooms concerned
    finding_type: str = ""  # finding the measure answers (for the card)
    ieees: tuple[str, ...] = ()  # devices concerned, to mark them on the map
    area_ids: tuple[str, ...] = ()  # rooms concerned, to mark them on the floor plan
