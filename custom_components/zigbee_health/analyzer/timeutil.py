"""Parsing of the different ``last_seen`` formats Zigbee2MQTT can emit.

``advanced.last_seen`` in Z2M can be ``ISO_8601`` (UTC with offset), ``ISO_8601_local``
(local time with offset) or ``epoch`` (milliseconds). The raw network map always uses
epoch milliseconds.
"""

from __future__ import annotations

from datetime import UTC, datetime, tzinfo

# Values above this are treated as milliseconds, below as seconds (year 2286 in seconds).
_EPOCH_MS_THRESHOLD = 10_000_000_000


def parse_last_seen(value: object, local_tz: tzinfo = UTC) -> datetime | None:
    """Parse a Z2M ``last_seen`` value to an aware UTC datetime. Returns None if unusable."""
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, int | float):
        if value <= 0:
            return None
        seconds = value / 1000 if value > _EPOCH_MS_THRESHOLD else float(value)
        return datetime.fromtimestamp(seconds, UTC)
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return None
        if text.isdigit():
            return parse_last_seen(int(text), local_tz)
        try:
            parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
        except ValueError:
            return None
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=local_tz)
        return parsed.astimezone(UTC)
    return None
