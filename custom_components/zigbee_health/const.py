"""Constants for Zigbee Health."""

from __future__ import annotations

from datetime import timedelta
from typing import Final

DOMAIN: Final = "zigbee_health"

CONF_BASE_TOPIC: Final = "base_topic"
DEFAULT_BASE_TOPIC: Final = "zigbee2mqtt"
DEFAULT_NAME: Final = "Zigbee2MQTT"

# Minimum supported Zigbee2MQTT version (section 15, question 5).
MIN_Z2M_VERSION: Final = (2, 0, 0)

# Identifier prefix of Z2M devices created by MQTT discovery.
Z2M_IDENTIFIER_PREFIX: Final = "zigbee2mqtt_"

# Events (section 7.4).
EVENT_FINDING_RAISED: Final = "zigbee_health_finding_raised"
EVENT_FINDING_RESOLVED: Final = "zigbee_health_finding_resolved"
EVENT_SCAN_COMPLETED: Final = "zigbee_health_scan_completed"
EVENT_STATUS_CHANGED: Final = "zigbee_health_status_changed"
EVENT_ROUTER_OFFLINE: Final = "zigbee_health_router_offline"
EVENT_ROUTER_ONLINE: Final = "zigbee_health_router_online"

# Analysis cadence (section 5).
UPDATE_INTERVAL: Final = timedelta(minutes=5)
# Data collection time after start before the first analysis (section 9). Shorter when
# the stored history is recent (e.g. after a reload of the integration).
WARMUP: Final = timedelta(minutes=10)
WARMUP_WITH_RECENT_HISTORY: Final = timedelta(minutes=1)
RECENT_HISTORY: Final = timedelta(minutes=30)

# Network scan (section 2).
# Without any stored scan, one is requested this long after setup.
INITIAL_SCAN_DELAY: Final = timedelta(minutes=2)
MAX_STORED_SCANS: Final = 7
# A network check refreshes the map when the last scan is older than this.
SCAN_STALE: Final = timedelta(hours=6)

# Persistence (section 4).
STORAGE_VERSION: Final = 1
SAVE_DELAY: Final = 300


# Config flow.
DISCOVERY_WAIT: Final = 2.0
VALIDATION_TIMEOUT: Final = 10.0
