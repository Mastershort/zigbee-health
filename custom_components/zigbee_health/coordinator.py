"""Coordinator: collects a snapshot, runs the analyzer, distributes the report."""

from __future__ import annotations

import logging
from dataclasses import replace
from datetime import datetime, timedelta
from typing import TYPE_CHECKING, Any

from homeassistant.components import persistent_notification
from homeassistant.const import STATE_HOME
from homeassistant.core import CALLBACK_TYPE, HomeAssistant, callback
from homeassistant.helpers import area_registry as ar
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers import floor_registry as fr
from homeassistant.helpers.event import async_call_later, async_track_time_change
from homeassistant.helpers.storage import Store
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator
from homeassistant.util import dt as dt_util

from .analyzer import FindingTracker, analyze
from .analyzer.export import plans_to_dicts, report_to_dict
from .analyzer.history import NetworkHistory
from .analyzer.models import (
    DeviceType,
    Finding,
    FindingType,
    NetworkLevel,
    NetworkReport,
    NetworkScan,
    NetworkSnapshot,
    RouterKind,
    ZigbeeDevice,
)
from .analyzer.planner import plan_all
from .analyzer.serialize import scan_from_dict, scan_to_dict
from .const import (
    CONF_BASE_TOPIC,
    DOMAIN,
    EVENT_FINDING_RAISED,
    EVENT_FINDING_RESOLVED,
    EVENT_ROUTER_OFFLINE,
    EVENT_ROUTER_ONLINE,
    EVENT_SCAN_COMPLETED,
    EVENT_STATUS_CHANGED,
    INITIAL_SCAN_DELAY,
    MAX_STORED_SCANS,
    RECENT_HISTORY,
    SAVE_DELAY,
    SCAN_STALE,
    STORAGE_VERSION,
    UPDATE_INTERVAL,
    WARMUP,
    WARMUP_WITH_RECENT_HISTORY,
    Z2M_IDENTIFIER_PREFIX,
)
from .floorplan import FloorplanStore
from .issues import async_sync_issues
from .options import Options
from .source.z2m import Z2MSource
from .traffic import TrafficHub

if TYPE_CHECKING:
    from homeassistant.config_entries import ConfigEntry

    from .analyzer.history import HealthSample

_LOGGER = logging.getLogger(__name__)

type ZigbeeHealthConfigEntry = ConfigEntry[ZigbeeHealthCoordinator]


def ignore_key(ieee: str, finding_type: FindingType | None) -> str:
    return f"{ieee}|{finding_type.value if finding_type else '*'}"


class ZigbeeHealthCoordinator(DataUpdateCoordinator[NetworkReport | None]):
    """Runs the analysis every 5 minutes and after relevant events (debounced)."""

    config_entry: ZigbeeHealthConfigEntry

    def __init__(self, hass: HomeAssistant, entry: ZigbeeHealthConfigEntry) -> None:
        super().__init__(
            hass,
            _LOGGER,
            config_entry=entry,
            name=f"{DOMAIN} {entry.title}",
            update_interval=UPDATE_INTERVAL,
        )
        self.options = Options.from_mapping(entry.options)
        self.analyzer_config = self.options.analyzer_config()
        self.tracker = FindingTracker(self.analyzer_config)
        self.history = NetworkHistory()
        self.scans: list[NetworkScan] = []
        self.last_scan_at: datetime | None = None
        self.scan_failures = 0
        # ignore_key(...) -> until (None = forever)
        self.ignored: dict[str, datetime | None] = {}
        self.source = Z2MSource(hass, entry.data[CONF_BASE_TOPIC], self)
        self._store: Store[dict[str, Any]] = Store(
            hass, STORAGE_VERSION, f"{DOMAIN}.{entry.entry_id}"
        )
        self._started_at = dt_util.utcnow()
        self._warmup = WARMUP
        self._skip_warmup = False
        self._issue_ids: set[str] = set()
        self._unsubs: list[CALLBACK_TYPE] = []
        self._last_level: NetworkLevel | None = None
        self._area_names: dict[str, str] = {}
        self.traffic = TrafficHub(hass)
        self.floorplans = FloorplanStore(hass, entry.entry_id)
        self.last_snapshot: NetworkSnapshot | None = None
        # ieee -> (router kind, children) from the latest analysis, for live alerts.
        self._router_info: dict[str, tuple[RouterKind | None, tuple[str, ...]]] = {}

    # --- lifecycle -------------------------------------------------------------------

    async def async_setup(self) -> None:
        stored = await self._store.async_load() or {}
        self.tracker = FindingTracker.from_dict(self.analyzer_config, stored.get("tracker", {}))
        self.history = NetworkHistory.from_dict(stored.get("history", {}))
        for raw in stored.get("scans", []):
            try:
                self.scans.append(scan_from_dict(raw))
            except (KeyError, TypeError, ValueError):
                continue
        for key, until in (stored.get("ignored") or {}).items():
            self.ignored[key] = datetime.fromisoformat(until) if until else None
        if self.scans:
            self.last_scan_at = self.scans[-1].timestamp
        saved_at = stored.get("saved_at")
        if saved_at and dt_util.utcnow() - datetime.fromisoformat(saved_at) < RECENT_HISTORY:
            self._warmup = WARMUP_WITH_RECENT_HISTORY

        await self.source.async_start()
        if self.options.scan_auto:
            at = self.options.scan_at
            self._unsubs.append(
                async_track_time_change(
                    self.hass,
                    self._async_scheduled_scan,
                    hour=at.hour,
                    minute=at.minute,
                    second=at.second,
                )
            )
        self._unsubs.append(async_call_later(self.hass, self._warmup, self._async_warmup_done))
        if not self.scans:
            self._unsubs.append(
                async_call_later(self.hass, INITIAL_SCAN_DELAY, self._async_initial_scan)
            )

    async def _async_warmup_done(self, _now: datetime) -> None:
        await self.async_refresh()

    async def async_shutdown(self) -> None:
        self.traffic.stop()
        for unsub in self._unsubs:
            unsub()
        self._unsubs.clear()
        await self.source.async_stop()
        await self._store.async_save(self._data_to_store())
        await super().async_shutdown()

    def _data_to_store(self) -> dict[str, Any]:
        return {
            "saved_at": dt_util.utcnow().isoformat(),
            "tracker": self.tracker.as_dict(),
            "history": self.history.as_dict(),
            "scans": [scan_to_dict(scan) for scan in self.scans],
            "ignored": {k: v.isoformat() if v else None for k, v in self.ignored.items()},
        }

    @callback
    def _schedule_save(self) -> None:
        self._store.async_delay_save(self._data_to_store, SAVE_DELAY)

    # --- SourceListener --------------------------------------------------------------

    @callback
    def source_changed(self) -> None:
        if self.data is not None or self._is_ready():
            self.hass.async_create_task(self.async_request_refresh())

    @callback
    def scan_received(self, scan: NetworkScan) -> None:
        self.scans = [*self.scans, scan][-MAX_STORED_SCANS:]
        self.last_scan_at = scan.timestamp
        self.scan_failures = 0
        self._schedule_save()
        self.hass.async_create_task(self.async_request_refresh())

    @callback
    def state_received(self, device: ZigbeeDevice) -> None:
        self.traffic.hit(device.ieee)
        self.history.record_state(
            device.ieee,
            dt_util.utcnow(),
            linkquality=device.linkquality,
            battery=device.battery,
            voltage=device.voltage,
            last_seen=device.last_seen,
        )
        self._schedule_save()

    @callback
    def availability_changed(self, ieee: str, online: bool, at: datetime, initial: bool) -> None:
        self.history.record_availability(ieee, at, online)
        self._schedule_save()
        if not initial:
            self._router_alert(ieee, online, at)
        self.source_changed()

    # --- wall switch alert -----------------------------------------------------------

    def _router_alert(self, ieee: str, online: bool, at: datetime) -> None:
        """Warn right away when a router that others depend on loses power."""
        device = self.source.devices.get(ieee)
        if device is None or device.type is not DeviceType.ROUTER or not self.source.online:
            return
        notification_id = f"{DOMAIN}_{self.config_entry.entry_id}_{ieee}"
        data: dict[str, Any] = {
            "config_entry_id": self.config_entry.entry_id,
            "ieee": ieee,
            "device_id": self.ha_device_id(ieee),
            "name": device.friendly_name,
        }
        if online:
            if ieee in {a["ieee"] for a in self.traffic.alerts}:
                self.traffic.set_alert(ieee, None)
                persistent_notification.async_dismiss(self.hass, notification_id)
                self.hass.bus.async_fire(EVENT_ROUTER_ONLINE, data)
            return
        kind, children = self._router_info.get(ieee, (None, ()))
        # Lamps switched off every evening without dependants are no news; an always-on
        # router going away or a router with children is.
        if not children and kind is not RouterKind.ALWAYS_ON:
            return
        names = [self.device_name(child) for child in children]
        self.traffic.set_alert(
            ieee,
            {
                "ieee": ieee,
                "name": device.friendly_name,
                "children": names,
                "since": at.isoformat(),
            },
        )
        self.hass.bus.async_fire(EVENT_ROUTER_OFFLINE, data | {"children": names})
        if self.options.wall_switch_alert:
            title, message = self._alert_text(device.friendly_name, names)
            persistent_notification.async_create(
                self.hass, message, title=title, notification_id=notification_id
            )

    def _alert_text(self, name: str, children: list[str]) -> tuple[str, str]:
        if self.hass.config.language.startswith("de"):
            title = f"Zigbee: {name} ist ausgeschaltet"
            if children:
                return title, (
                    f"**{name}** hat keinen Strom mehr. Darüber sind {len(children)} Geräte "
                    f"verbunden, die jetzt ihre Verbindung verlieren: {', '.join(children)}.\n\n"
                    "Bitte wieder einschalten - am besten dauerhaft (Wandschalter nicht nutzen)."
                )
            return title, (
                f"Der Router **{name}** ist nicht mehr erreichbar. Geräte in der Nähe verlieren "
                "womöglich ihre Verbindung. Stromversorgung prüfen."
            )
        title = f"Zigbee: {name} was switched off"
        if children:
            return title, (
                f"**{name}** lost power. {len(children)} devices connected through it are "
                f"losing their connection now: {', '.join(children)}.\n\n"
                "Please switch it back on - ideally permanently (do not use the wall switch)."
            )
        return title, (
            f"Router **{name}** is unreachable. Devices nearby may lose their connection. "
            "Check its power supply."
        )

    @callback
    def health_received(self, sample: HealthSample) -> None:
        self.history.record_health(sample)
        self._schedule_save()

    @callback
    def event_received(self, event_type: str, ieee: str) -> None:
        if event_type == "device_announce":
            self.history.record_announce(ieee, dt_util.utcnow())
            self._schedule_save()

    # --- network scan ----------------------------------------------------------------

    async def _async_initial_scan(self, _now: datetime) -> None:
        # A map may have arrived meanwhile (e.g. requested in the Z2M frontend).
        if not self.scans:
            await self.async_scan()

    async def _async_scheduled_scan(self, _now: datetime) -> None:
        away_only = self.options.scan_only_away
        if away_only and any(
            (state := self.hass.states.get(person)) is not None and state.state == STATE_HOME
            for person in away_only
        ):
            _LOGGER.info("Scheduled network scan skipped: somebody is at home")
            return
        await self.async_scan()

    @property
    def scanning(self) -> bool:
        return self.source.scanning

    async def async_scan(self) -> None:
        """Request a network map (never in parallel) and store the result."""
        if self.source.scanning:
            _LOGGER.info("Network scan requested while another scan is running; ignored")
            return
        if not self.source.online:
            _LOGGER.warning("Network scan skipped: Zigbee2MQTT is offline")
            return
        timeout = timedelta(minutes=self.options.scan_timeout)
        _LOGGER.info("Requesting Zigbee network map")
        try:
            scan = await self.source.async_request_scan(timeout.total_seconds())
        except TimeoutError:
            self.scan_failures += 1
            _LOGGER.warning(
                "Zigbee network scan got no response within %d s (failure %d). "
                "A late response is still used when it arrives",
                timeout.total_seconds(),
                self.scan_failures,
            )
            self._fire_scan_completed(success=False)
            self.async_update_listeners()
            return
        except ValueError as err:
            self.scan_failures += 1
            _LOGGER.warning("Zigbee network scan failed (failure %d): %s", self.scan_failures, err)
            self._fire_scan_completed(success=False)
            self.async_update_listeners()
            return
        _LOGGER.info(
            "Zigbee network map received after %s s: %d nodes, %d links",
            self.source.last_scan_duration,
            len(scan.nodes),
            len(scan.links),
        )
        self._fire_scan_completed(success=True, devices=len(scan.nodes))
        self.scan_received(scan)

    def _fire_scan_completed(self, *, success: bool, devices: int = 0) -> None:
        self.hass.bus.async_fire(
            EVENT_SCAN_COMPLETED,
            {
                "config_entry_id": self.config_entry.entry_id,
                "success": success,
                "duration": self.source.last_scan_duration if success else None,
                "devices": devices,
            },
        )

    # --- ignore list and history -----------------------------------------------------

    def _active_ignores(
        self, now: datetime
    ) -> tuple[frozenset[str], frozenset[tuple[str, FindingType]]]:
        devices: set[str] = set()
        findings: set[tuple[str, FindingType]] = set()
        for key, until in list(self.ignored.items()):
            if until is not None and until <= now:
                del self.ignored[key]
                continue
            ieee, _, kind = key.partition("|")
            if kind == "*":
                devices.add(ieee)
            else:
                try:
                    findings.add((ieee, FindingType(kind)))
                except ValueError:
                    continue
        return frozenset(devices), frozenset(findings)

    async def async_ignore(
        self, ieee: str, finding_type: FindingType | None = None, until: datetime | None = None
    ) -> None:
        self.ignored[ignore_key(ieee, finding_type)] = until
        if finding_type is None:
            self.tracker.forget_device(ieee)
        self._schedule_save()
        await self.async_refresh()

    async def async_unignore(self, ieee: str, finding_type: FindingType | None = None) -> None:
        if finding_type is None:
            for key in [k for k in self.ignored if k.startswith(f"{ieee}|")]:
                del self.ignored[key]
        else:
            self.ignored.pop(ignore_key(ieee, finding_type), None)
        self._schedule_save()
        await self.async_refresh()

    async def async_set_ignored_devices(self, ieees: set[str]) -> None:
        """Replace the device ignore list (options flow); finding ignores are kept."""
        for key in [k for k in self.ignored if k.endswith("|*")]:
            del self.ignored[key]
        for ieee in ieees:
            self.ignored[ignore_key(ieee, None)] = None
            self.tracker.forget_device(ieee)
        self._schedule_save()
        await self.async_refresh()

    @property
    def ignored_devices(self) -> set[str]:
        return {k.partition("|")[0] for k in self.ignored if k.endswith("|*")}

    async def async_reset_history(self, ieee: str | None = None) -> None:
        self.history.reset(ieee)
        self._schedule_save()
        await self.async_refresh()

    # --- device actions from the card (admin only, each one confirmed in the UI) ---------

    async def async_remove_device(self, ieee: str, force: bool) -> str | None:
        """Remove a device from Zigbee2MQTT; returns an error text or None."""
        result = await self.source.async_remove_device(ieee, force)
        if not result.ok:
            return result.error or "unknown error"
        self.tracker.forget_device(ieee)
        await self.async_request_refresh()
        return None

    async def async_rename_device(self, ieee: str, name: str) -> str | None:
        result = await self.source.async_rename_device(ieee, name)
        if not result.ok:
            return result.error or "unknown error"
        await self.async_request_refresh()
        return None

    async def async_set_device_area(self, ieee: str, area_id: str | None) -> str | None:
        """Put the Home Assistant device of a Zigbee device into an area (None: no area)."""
        device_id = self.ha_device_id(ieee)
        if device_id is None:
            return "no Home Assistant device"
        if area_id is not None and ar.async_get(self.hass).async_get_area(area_id) is None:
            return "unknown area"
        dr.async_get(self.hass).async_update_device(device_id, area_id=area_id)
        await self.async_refresh()
        return None

    # --- device registry helpers -----------------------------------------------------

    def ha_device_id(self, ieee: str) -> str | None:
        device = dr.async_get(self.hass).async_get_device(
            identifiers={("mqtt", f"{Z2M_IDENTIFIER_PREFIX}{ieee}")}
        )
        return device.id if device else None

    def ieee_for_ha_device(self, device_id: str) -> str | None:
        device = dr.async_get(self.hass).async_get(device_id)
        if device is None:
            return None
        for domain, identifier in device.identifiers:
            if domain == "mqtt" and identifier.startswith(Z2M_IDENTIFIER_PREFIX):
                ieee = identifier.removeprefix(Z2M_IDENTIFIER_PREFIX)
                if ieee in self.source.devices:
                    return ieee
        return None

    def device_name(self, ieee: str) -> str:
        device = self.source.devices.get(ieee)
        return device.friendly_name if device else ieee

    # --- analysis --------------------------------------------------------------------

    def _is_ready(self) -> bool:
        if not self.source.ready:
            return False
        return self._skip_warmup or dt_util.utcnow() - self._started_at >= self._warmup

    async def async_analyze_now(self) -> None:
        """Run an analysis immediately, skipping the start-up data collection time."""
        self._skip_warmup = True
        await self.async_refresh()

    async def _async_update_data(self) -> NetworkReport | None:
        if not self._is_ready():
            return None
        now = dt_util.utcnow()
        self.history.prune(now)
        ignored_devices, ignored_findings = self._active_ignores(now)
        info = self.source.info
        snapshot = NetworkSnapshot(
            now=now,
            devices=self._devices_with_areas(),
            scans=tuple(self.scans),
            availability_changes={
                ieee: tuple(hist.availability) for ieee, hist in self.history.devices.items()
            },
            ignored_devices=ignored_devices,
            ignored_findings=ignored_findings,
            z2m_online=self.source.online,
            z2m_online_since=self.source.online_since,
            source_info=info.as_source_info() if info else None,
            history=self.history,
        )
        report, update = analyze(snapshot, self.analyzer_config, self.tracker)
        self.last_snapshot = snapshot
        self._router_info = {
            ieee: (d.router_kind, d.children)
            for ieee, d in report.devices.items()
            if d.router_kind is not None
        }
        if not report.paused:
            # Repairs only show findings that passed the hysteresis.
            self._issue_ids = async_sync_issues(
                self.hass, self.config_entry, update.active, self._issue_ids, self.options
            )
        for finding in update.raised:
            self._fire_finding(EVENT_FINDING_RAISED, finding)
        for finding in update.resolved:
            self._fire_finding(EVENT_FINDING_RESOLVED, finding)
        if update.raised or update.resolved:
            self._schedule_save()
        if self._last_level is not None and report.level is not self._last_level:
            self.hass.bus.async_fire(
                EVENT_STATUS_CHANGED,
                {
                    "config_entry_id": self.config_entry.entry_id,
                    "from": self._last_level.value,
                    "to": report.level.value,
                    "score": report.score,
                },
            )
        self._last_level = report.level
        return report

    def _fire_finding(self, event_type: str, finding: Finding) -> None:
        self.hass.bus.async_fire(
            event_type,
            {
                "config_entry_id": self.config_entry.entry_id,
                "finding_id": finding.id,
                "type": finding.type.value,
                "severity": finding.severity.value,
                "ieee": finding.ieee,
                "device_id": self.ha_device_id(finding.ieee) if finding.ieee else None,
                "area_id": finding.area_id,
                "data": dict(finding.data),
            },
        )

    def _devices_with_areas(self) -> dict[str, ZigbeeDevice]:
        """Attach HA area and floor to every Zigbee device (section 3)."""
        dev_reg = dr.async_get(self.hass)
        ent_reg = er.async_get(self.hass)
        area_reg = ar.async_get(self.hass)
        result: dict[str, ZigbeeDevice] = {}
        for ieee, device in self.source.devices.items():
            ha_device = dev_reg.async_get_device(
                identifiers={("mqtt", f"{Z2M_IDENTIFIER_PREFIX}{ieee}")}
            )
            area_id = None
            if ha_device is not None:
                area_id = ha_device.area_id
                if area_id is None:
                    # Fallback: area of the device's entities.
                    area_id = next(
                        (
                            entry.area_id
                            for entry in er.async_entries_for_device(ent_reg, ha_device.id)
                            if entry.area_id
                        ),
                        None,
                    )
            area = area_reg.async_get_area(area_id) if area_id else None
            if area is not None:
                self._area_names[area.id] = area.name
            result[ieee] = replace(
                device,
                area_id=area.id if area else None,
                area_name=area.name if area else None,
                floor_id=area.floor_id if area else None,
            )
        return result

    # --- network check and router planner (websocket API) ------------------------------

    async def async_check(self) -> dict[str, Any]:
        """Analyse right now; refresh the network map in the background when it is old."""
        await self.async_analyze_now()
        scan_started = False
        stale = self.last_scan_at is None or dt_util.utcnow() - self.last_scan_at > SCAN_STALE
        if stale and not self.source.scanning and self.source.online:
            self.hass.async_create_background_task(self.async_scan(), "zigbee_health_scan")
            scan_started = True
        return self.report_dict(full=True) | {"scan_started": scan_started}

    async def async_plan(self) -> list[dict[str, Any]]:
        """Where would one more always-on router help most? (best area first)"""
        snapshot = self.last_snapshot
        if snapshot is None:
            return []
        results = await self.hass.async_add_executor_job(plan_all, snapshot, self.analyzer_config)
        return plans_to_dicts(results, self.device_name)

    # --- report for services and diagnostics -----------------------------------------

    def report_dict(self, full: bool) -> dict[str, Any]:
        """Report as plain dict for ``get_report`` and the card (section 7.3)."""
        report = self.data
        if report is None:
            # Still collecting data after the start: progress for the card's radar.
            left = self._warmup - (dt_util.utcnow() - self._started_at)
            return {
                "ready": False,
                "devices_found": len(self.source.devices),
                "scanning": self.source.scanning,
                "warmup_left": max(0, int(left.total_seconds())),
                "last_scan": self.last_scan_at.isoformat() if self.last_scan_at else None,
            }
        info = self.source.info
        return report_to_dict(
            report,
            full=full,
            names=self.device_name,
            scans=self.scans,
            coordinator_ieee=info.coordinator_ieee if info else None,
            area_names=self._area_names,
            ha_device_ids={
                ieee: device_id
                for ieee in report.devices
                if (device_id := self.ha_device_id(ieee)) is not None
            },
            last_seen={ieee: hist.last_seen for ieee, hist in self.history.devices.items()},
            last_scan=self.last_scan_at,
            floors=[
                {"floor_id": f.floor_id, "name": f.name, "level": f.level}
                for f in fr.async_get(self.hass).async_list_floors()
            ],
            areas=[
                {"area_id": a.id, "name": a.name, "floor_id": a.floor_id}
                for a in ar.async_get(self.hass).async_list_areas()
            ],
            tz=dt_util.get_default_time_zone(),
        )
