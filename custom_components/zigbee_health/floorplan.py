"""Floor plans for the card: images and device positions, one store per config entry.

Kept apart from the analysis store so the (large) images are only written when a plan
changes. Positions are fractions (0..1) of the image size, keyed by IEEE address.

The drawn building (rooms in metres) has its own small store, and its background images a
third one: the editor saves the building often, and that must never rewrite images.
"""

from __future__ import annotations

import json
from typing import TYPE_CHECKING, Any

from homeassistant.helpers.storage import Store

from .const import DOMAIN

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant

STORAGE_VERSION = 1
MAX_IMAGE_CHARS = 6_000_000  # data URL, about 4.5 MB of image
MAX_PLANS = 8
MAX_BUILDING_CHARS = 1_000_000  # rooms and positions, no images
MAX_BUILDING_IMAGES = 10


class FloorplanError(ValueError):
    """Invalid floor plan request."""


class FloorplanStore:
    def __init__(self, hass: HomeAssistant, entry_id: str) -> None:
        self._store: Store[dict[str, Any]] = Store(
            hass, STORAGE_VERSION, f"{DOMAIN}.{entry_id}.floorplans"
        )
        self._building_store: Store[dict[str, Any]] = Store(
            hass, STORAGE_VERSION, f"{DOMAIN}.{entry_id}.building"
        )
        self._image_store: Store[dict[str, Any]] = Store(
            hass, STORAGE_VERSION, f"{DOMAIN}.{entry_id}.building_images"
        )
        self._plans: dict[str, dict[str, Any]] | None = None
        self._building: dict[str, Any] | None = None
        self._images: dict[str, str] | None = None
        self._legacy_building: dict[str, Any] | None = None

    async def _async_plans(self) -> dict[str, dict[str, Any]]:
        if self._plans is None:
            data = await self._store.async_load() or {}
            self._plans = dict(data.get("plans") or {})
            # 0.9.0 kept the building (with embedded images) next to the plans.
            self._legacy_building = data.get("building")
        return self._plans

    async def _async_write(self) -> None:
        await self._store.async_save({"plans": self._plans or {}})

    async def _async_building(self) -> tuple[dict[str, Any] | None, dict[str, str]]:
        if self._images is None:
            await self._async_plans()
            data = await self._building_store.async_load() or {}
            stored = await self._image_store.async_load() or {}
            self._building = data.get("building")
            self._images = dict(stored.get("images") or {})
            if self._building is None and self._legacy_building is not None:
                await self._async_migrate(self._legacy_building)
        assert self._images is not None
        # Always the stored dict itself (an empty one too), callers change it in place.
        return self._building, self._images

    async def _async_migrate(self, building: dict[str, Any]) -> None:
        images = self._images if self._images is not None else {}
        for floor in building.get("floors", []):
            background = floor.get("background") or {}
            image = background.pop("image", None)
            if image:
                images[floor["id"]] = image
        self._building, self._images = building, images
        await self._building_store.async_save({"building": building})
        await self._image_store.async_save({"images": images})
        self._legacy_building = None
        await self._async_write()

    async def async_get_building(self) -> tuple[dict[str, Any] | None, dict[str, str]]:
        """Building plus background images keyed by building floor id."""
        return await self._async_building()

    async def async_save_building(self, building: dict[str, Any]) -> None:
        """Drawn rooms per storey and device positions in metres (see websocket schema)."""
        if len(json.dumps(building)) > MAX_BUILDING_CHARS:
            raise FloorplanError("building data too large")
        _, images = await self._async_building()
        self._building = building
        await self._building_store.async_save({"building": building})
        # Images of deleted floors go with them.
        floors = {floor["id"] for floor in building.get("floors", [])}
        if stale := [floor_id for floor_id in images if floor_id not in floors]:
            for floor_id in stale:
                del images[floor_id]
            await self._image_store.async_save({"images": images})

    async def async_set_building_image(self, floor_id: str, image: str | None) -> None:
        """Background image of one drawn floor; None removes it."""
        _, images = await self._async_building()
        if image is None:
            if images.pop(floor_id, None) is None:
                return
        else:
            if not image.startswith("data:image/") or len(image) > MAX_IMAGE_CHARS:
                raise FloorplanError("image must be a data URL below the size limit")
            if floor_id not in images and len(images) >= MAX_BUILDING_IMAGES:
                raise FloorplanError("too many background images")
            images[floor_id] = image
        await self._image_store.async_save({"images": images})

    async def async_list(self) -> list[dict[str, Any]]:
        plans = await self._async_plans()
        return [{"plan_id": plan_id} | plan for plan_id, plan in plans.items()]

    async def async_save(
        self,
        plan_id: str,
        *,
        name: str | None = None,
        image: str | None = None,
        positions: dict[str, list[float]] | None = None,
        floor_id: str | None = None,
        level: int | None = None,
    ) -> dict[str, Any]:
        plans = await self._async_plans()
        plan = plans.get(plan_id)
        if plan is None:
            if len(plans) >= MAX_PLANS:
                raise FloorplanError("too many floor plans")
            if image is None:
                raise FloorplanError("a new floor plan needs an image")
            plan = {"name": name or plan_id, "image": "", "positions": {}}
        if name is not None:
            plan["name"] = name
        if floor_id is not None:
            # "" unlinks the plan from a Home Assistant floor.
            plan["floor_id"] = floor_id or None
        if level is not None:
            plan["level"] = level
        if image is not None:
            if not image.startswith("data:image/") or len(image) > MAX_IMAGE_CHARS:
                raise FloorplanError("image must be a data URL below the size limit")
            plan["image"] = image
        if positions is not None:
            plan["positions"] = {
                ieee: [min(1.0, max(0.0, float(x))), min(1.0, max(0.0, float(y)))]
                for ieee, (x, y) in positions.items()
            }
        plans[plan_id] = plan
        await self._async_write()
        return {"plan_id": plan_id} | plan

    async def async_delete(self, plan_id: str) -> None:
        plans = await self._async_plans()
        if plans.pop(plan_id, None) is not None:
            await self._async_write()

    async def async_remove(self) -> None:
        await self._store.async_remove()
        await self._building_store.async_remove()
        await self._image_store.async_remove()
