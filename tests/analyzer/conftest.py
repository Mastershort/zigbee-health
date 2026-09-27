"""Analyzer tests import ``analyzer`` as a top-level package so no Home Assistant is needed."""

from __future__ import annotations

import sys
from pathlib import Path

INTEGRATION_DIR = Path(__file__).resolve().parents[2] / "custom_components" / "zigbee_health"
if str(INTEGRATION_DIR) not in sys.path:
    sys.path.insert(0, str(INTEGRATION_DIR))
