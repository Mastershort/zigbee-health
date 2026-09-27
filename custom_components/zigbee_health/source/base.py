"""Abstract data source, so ZHA can be added in phase 4 with the same analyzer."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from datetime import datetime

    from ..analyzer.models import NetworkScan, ZigbeeDevice


class ZigbeeSource(ABC):
    """Collects live data of one Zigbee network."""

    @property
    @abstractmethod
    def online(self) -> bool:
        """True while the Zigbee backend is running."""

    @property
    @abstractmethod
    def online_since(self) -> datetime | None:
        """Time the backend was (re)started, if known."""

    @property
    @abstractmethod
    def ready(self) -> bool:
        """True once the device list has been received."""

    @property
    @abstractmethod
    def devices(self) -> dict[str, ZigbeeDevice]:
        """Devices keyed by IEEE address, including live values."""

    @abstractmethod
    async def async_start(self) -> None:
        """Subscribe and start collecting."""

    @abstractmethod
    async def async_stop(self) -> None:
        """Unsubscribe everything."""

    @abstractmethod
    async def async_request_scan(self, timeout: float) -> NetworkScan:
        """Request a network map. Raises on failure or timeout."""
