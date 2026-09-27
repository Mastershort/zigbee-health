"""Fixtures for tests against a real Home Assistant core with mocked MQTT."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest

FIXTURES = Path(__file__).resolve().parents[1] / "fixtures"
BASE = "zigbee2mqtt"
COORDINATOR_IEEE = "0x00124b0000000001"
# Newest lastSeen of networkmap_raw_2.json is 2026-09-23 12:04 UTC.
FROZEN_TIME = "2026-09-23T12:10:00+00:00"


def fixture_text(name: str) -> str:
    return (FIXTURES / name).read_text(encoding="utf-8")


def fixture_json(name: str) -> Any:
    return json.loads(fixture_text(name))


@pytest.fixture(autouse=True)
def auto_enable_custom_integrations(enable_custom_integrations: None) -> None:
    """Load integrations from custom_components/."""
