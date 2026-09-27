"""Repairs: create, bundle and delete issues for active findings (section 7.1)."""

from __future__ import annotations

from collections import defaultdict
from typing import TYPE_CHECKING

from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import issue_registry as ir
from homeassistant.util import dt as dt_util

from .analyzer import export
from .analyzer.models import Finding, FindingType, Severity
from .const import DOMAIN

if TYPE_CHECKING:
    from homeassistant.config_entries import ConfigEntry

    from .options import Options

_SEVERITY = {
    Severity.CRITICAL: ir.IssueSeverity.CRITICAL,
    Severity.WARNING: ir.IssueSeverity.WARNING,
    Severity.INFO: ir.IssueSeverity.WARNING,
}
# Info findings with a fix flow are always shown (enable the Z2M option in one click).
ALWAYS_SHOWN = frozenset({FindingType.PREREQUISITE_MISSING})
# Findings without a device cannot be ignored per device and have no fix flow.
NOT_FIXABLE = frozenset(
    {
        FindingType.ROOM_WITHOUT_ROUTER,
        FindingType.TOO_FEW_ROUTERS,
        FindingType.NETWORK_MESSAGE_FLOOD,
        FindingType.OUTDATED_FIRMWARE,
        FindingType.DEVICES_WITHOUT_AREA,
    }
)

KIND_FINDING = "finding"
KIND_BUNDLE = "bundle"
KIND_PREREQUISITE = "prerequisite"


def placeholders(finding: Finding) -> dict[str, str]:
    return export.placeholders(finding, dt_util.get_default_time_zone())


def bundle_line(finding: Finding) -> str:
    p = placeholders(finding)
    match finding.type:
        case FindingType.WEAK_LINK:
            return f"- {p['name']} ({p['room']}): LQI {p['lqi']} → {p['parent']}"
        case FindingType.WEAK_BACKBONE:
            return f"- {p['name']} ({p['room']}): LQI {p['lqi']} → {p['peer']}"
        case FindingType.DEAD_DEVICE | FindingType.DISAPPEARED:
            return f"- {p['name']} ({p['room']}): {p['date']}"
        case FindingType.BATTERY_LOW:
            return f"- {p['name']} ({p['room']}): {p['value']}, {p['battery_type']}"
        case FindingType.BATTERY_FORECAST:
            return f"- {p['name']} ({p['room']}): {p['date']}, {p['battery_type']}"
        case FindingType.ROOM_WITHOUT_ROUTER:
            return f"- {p['room']} ({p['count']})"
        case _:
            return f"- {p['name']} ({p['room']})"


def _shown(finding: Finding, options: Options) -> bool:
    if finding.type in ALWAYS_SHOWN:
        return True
    return finding.severity is not Severity.INFO or options.repairs_include_info


@callback
def async_sync_issues(
    hass: HomeAssistant,
    entry: ConfigEntry,
    findings: tuple[Finding, ...],
    previous: set[str],
    options: Options,
) -> set[str]:
    """Create issues for active findings and delete issues that are no longer active.

    Findings of the same type are bundled into one issue from ``bundle_threshold`` on, so
    the repairs dashboard does not overflow. Returns the ids of the issues that now exist.
    """
    by_type: dict[FindingType, list[Finding]] = defaultdict(list)
    for finding in findings:
        if _shown(finding, options):
            by_type[finding.type].append(finding)

    learn_more = options.learn_more_url or None
    current: set[str] = set()
    for finding_type, group in by_type.items():
        with_device = [f for f in group if f.ieee]
        if len(with_device) >= options.bundle_threshold:
            issue_id = f"{entry.entry_id}_{finding_type.value}_bundle"
            severity = min(group, key=lambda f: list(Severity).index(f.severity)).severity
            ir.async_create_issue(
                hass,
                DOMAIN,
                issue_id,
                is_fixable=finding_type not in NOT_FIXABLE,
                is_persistent=False,
                severity=_SEVERITY[severity],
                learn_more_url=learn_more,
                translation_key=f"{finding_type.value}_bundle",
                translation_placeholders={
                    "count": str(len(with_device)),
                    "devices": "\n".join(bundle_line(f) for f in with_device),
                },
                data={
                    "entry_id": entry.entry_id,
                    "kind": KIND_BUNDLE,
                    "finding_type": finding_type.value,
                    "ieees": ",".join(f.ieee for f in with_device if f.ieee),
                },
            )
            current.add(issue_id)
            continue
        for finding in group:
            issue_id = f"{entry.entry_id}_{finding.id}"
            kind = (
                KIND_PREREQUISITE
                if finding.type is FindingType.PREREQUISITE_MISSING
                else KIND_FINDING
            )
            ir.async_create_issue(
                hass,
                DOMAIN,
                issue_id,
                is_fixable=finding.type not in NOT_FIXABLE,
                is_persistent=False,
                severity=_SEVERITY[finding.severity],
                learn_more_url=learn_more,
                translation_key=finding.type.value,
                translation_placeholders=placeholders(finding),
                data={
                    "entry_id": entry.entry_id,
                    "kind": kind,
                    "finding_type": finding.type.value,
                    "ieee": finding.ieee,
                    "option": str(finding.data.get("option", "")),
                },
            )
            current.add(issue_id)

    # Also catch issues left over from before a reload of the config entry.
    existing = {
        issue_id
        for (domain, issue_id) in ir.async_get(hass).issues
        if domain == DOMAIN and issue_id.startswith(f"{entry.entry_id}_")
    }
    for issue_id in (previous | existing) - current:
        ir.async_delete_issue(hass, DOMAIN, issue_id)
    return current


@callback
def async_delete_all_issues(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Remove every issue of a config entry (on removal of the entry)."""
    for domain, issue_id in list(ir.async_get(hass).issues):
        if domain == DOMAIN and issue_id.startswith(f"{entry.entry_id}_"):
            ir.async_delete_issue(hass, DOMAIN, issue_id)
