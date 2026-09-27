"""Zigbee Health analysis engine.

Pure Python without Home Assistant imports: deterministic, no I/O, no clock access
(the current time is part of the ``NetworkSnapshot``).
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from .config import AnalyzerConfig
from .findings import build_context, evaluate
from .hysteresis import FindingTracker, TrackerUpdate
from .report import build_report

if TYPE_CHECKING:
    from .models import NetworkReport, NetworkSnapshot

__all__ = ["AnalyzerConfig", "FindingTracker", "analyze"]


def analyze(
    snapshot: NetworkSnapshot, config: AnalyzerConfig, tracker: FindingTracker
) -> tuple[NetworkReport, TrackerUpdate]:
    """Run one analysis. Updates ``tracker`` unless Zigbee2MQTT is offline (paused).

    The report (entities, scores) reflects the current raw findings immediately. The
    hysteresis only gates what is *announced*: ``update.active`` feeds the repairs
    dashboard and ``update.raised``/``resolved`` the events, so those do not flap.
    """
    ctx = build_context(snapshot, config)
    if not snapshot.z2m_online:
        # Keep existing findings, raise and resolve nothing (section 9).
        update = TrackerUpdate(active=tracker.active, raised=(), resolved=())
        return build_report(ctx, update.active, paused=True), update
    raw = evaluate(ctx)
    update = tracker.update(raw, snapshot.now)
    return build_report(ctx, raw), update
