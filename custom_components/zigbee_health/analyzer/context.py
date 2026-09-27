"""Analysis context: per-device facts derived once per run and shared by all rules."""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING

from .classify import is_analysed, is_chatty, router_kind
from .models import DeviceType, NetworkSnapshot, RouterKind, ZigbeeDevice
from .topology import ParentLink, Topology, children_by_parent

if TYPE_CHECKING:
    from datetime import datetime, timedelta

    from .config import AnalyzerConfig


@dataclass(frozen=True, slots=True)
class DeviceContext:
    """Derived per-device facts shared by all rules and the report."""

    device: ZigbeeDevice
    analysed: bool
    chatty: bool
    router_kind: RouterKind | None
    last_seen: datetime | None
    age: timedelta | None
    responded_latest_scan: bool
    failed_latest_scan: bool
    parent: ParentLink | None
    dead: bool


@dataclass(frozen=True, slots=True)
class AnalysisContext:
    snapshot: NetworkSnapshot
    config: AnalyzerConfig
    devices: dict[str, DeviceContext]
    children: dict[str, tuple[str, ...]]
    topology: Topology

    def name(self, ieee: str) -> str:
        device = self.snapshot.devices.get(ieee)
        return device.friendly_name if device else ieee


def _effective_last_seen(device: ZigbeeDevice, snapshot: NetworkSnapshot) -> datetime | None:
    candidates = [device.last_seen] if device.last_seen else []
    # Persisted last_seen survives HA restarts (state topics are not retained).
    hist = snapshot.history.devices.get(device.ieee)
    if hist is not None and hist.last_seen is not None:
        candidates.append(hist.last_seen)
    scan = snapshot.latest_scan
    if scan is not None and (node := scan.nodes.get(device.ieee)) and node.last_seen:
        candidates.append(node.last_seen)
    return max(candidates) if candidates else None


def _is_dead(
    device: ZigbeeDevice,
    age: timedelta | None,
    responded: bool,
    failed: bool,
    config: AnalyzerConfig,
) -> bool:
    """F-01 condition. The coordinator is never dead."""
    if age is None or age < config.dead_after:
        return False
    if device.type is DeviceType.END_DEVICE:
        return True
    if device.type is DeviceType.ROUTER:
        # A router that still answers the network map or is online is alive, even if its
        # last_seen is old (routers without periodic reporting rarely send messages).
        reachable = responded or device.available is True
        unreachable = failed or device.available is False
        return unreachable and not reachable
    return False


def build_context(snapshot: NetworkSnapshot, config: AnalyzerConfig) -> AnalysisContext:
    scan = snapshot.latest_scan
    topology = Topology(snapshot.scans)
    devices: dict[str, DeviceContext] = {}
    for ieee, device in snapshot.devices.items():
        last_seen = _effective_last_seen(device, snapshot)
        age = snapshot.now - last_seen if last_seen else None
        responded = scan.responded(ieee) if scan else False
        failed = scan.failed(ieee) if scan else False
        parent = (
            topology.last_known_parent(ieee, config.parent_history_scans)
            if device.type is DeviceType.END_DEVICE
            else None
        )
        devices[ieee] = DeviceContext(
            device=device,
            analysed=is_analysed(device, snapshot),
            chatty=is_chatty(device),
            router_kind=router_kind(device, snapshot, config),
            last_seen=last_seen,
            age=age,
            responded_latest_scan=responded,
            failed_latest_scan=failed,
            parent=parent,
            dead=_is_dead(device, age, responded, failed, config),
        )
    parents = {
        ieee: ctx.parent.parent
        for ieee, ctx in devices.items()
        if ctx.parent is not None and ctx.analysed and not ctx.dead
    }
    return AnalysisContext(snapshot, config, devices, children_by_parent(parents), topology)


def base_data(ctx: AnalysisContext, dev: DeviceContext) -> dict[str, str | int | float]:
    data: dict[str, str | int | float] = {
        "name": dev.device.friendly_name,
        "room": dev.device.area_name or "",
    }
    if dev.last_seen is not None:
        data["last_seen"] = dev.last_seen.isoformat()
    if dev.age is not None:
        data["days"] = dev.age.days
        data["hours"] = int(dev.age.total_seconds() // 3600)
    return data
