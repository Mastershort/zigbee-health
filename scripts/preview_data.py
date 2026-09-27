"""Build frontend/preview/report.json from the real fixtures (card preview / dev server).

The fixtures contain no areas; for the preview, rooms are guessed from device names.
Run:  python scripts/preview_data.py   (needs no Home Assistant)
"""

from __future__ import annotations

import json
import sys
from dataclasses import replace
from datetime import timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "custom_components" / "zigbee_health"))

from analyzer import AnalyzerConfig, FindingTracker, analyze  # noqa: E402
from analyzer.export import plans_to_dicts, report_to_dict  # noqa: E402
from analyzer.planner import plan_all  # noqa: E402
from analyzer.models import NetworkSnapshot  # noqa: E402
from analyzer.timeutil import parse_last_seen  # noqa: E402
from analyzer.z2m_payloads import (  # noqa: E402
    parse_bridge_devices,
    parse_bridge_info,
    parse_networkmap,
)

FIXTURES = ROOT / "tests" / "fixtures"

# Guessed rooms (preview only), first match wins.
ROOM_HINTS: list[tuple[str, tuple[str, ...]]] = [
    # The fixture device names end in their room ("Klima Küche", "Licht Bad RGB").
    (room, (room.lower(),))
    for room in (
        "Gäste-WC", "Hauswirtschaft", "Kinderzimmer", "Schlafzimmer", "Wohnzimmer",
        "Esszimmer", "Ankleide", "Dachboden", "Terrasse", "Garage", "Küche", "Büro",
        "Flur", "Bad",
    )
]


def guess_room(name: str) -> str | None:
    lowered = name.lower()
    for room, hints in ROOM_HINTS:
        if any(hint in lowered for hint in hints):
            return room
    return None


# Example two-storey house for the preview: floor -> (name, level, (w, h), rooms).
FLOORS: dict[str, tuple[str, int, tuple[int, int], dict[str, tuple[int, int, int, int]]]] = {
    "eg": ("Erdgeschoss", 0, (1600, 760), {
        "Gäste-WC": (40, 40, 200, 120),
        "Flur": (240, 40, 1320, 120),
        "Küche": (40, 160, 410, 440),
        "Esszimmer": (450, 160, 300, 440),
        "Wohnzimmer": (750, 160, 500, 440),
        "Hauswirtschaft": (1250, 160, 310, 220),
        "Garage": (1250, 380, 310, 220),
        "Terrasse": (750, 620, 500, 110),
    }),
    "og": ("Obergeschoss", 1, (1600, 560), {
        "Schlafzimmer": (40, 40, 360, 340),
        "Ankleide": (400, 40, 200, 340),
        "Bad": (600, 40, 250, 340),
        "Kinderzimmer": (850, 40, 350, 340),
        "Büro": (1200, 40, 360, 340),
        "Dachboden": (40, 400, 360, 120),
    }),
}
OUTSIDE = {"Terrasse", "Dachboden"}


def floor_of(room: str) -> str | None:
    return next((fid for fid, (_, _, _, rooms) in FLOORS.items() if room in rooms), None)


def floorplan_svg(floor_id: str) -> str:
    import base64

    _, _, (width, height), rooms = FLOORS[floor_id]
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">',
        f'<rect width="{width}" height="{height}" fill="#fbfaf7"/>',
    ]
    for room, (x, y, w, h) in rooms.items():
        dash = ' stroke-dasharray="14 10" stroke-width="4"' if room in OUTSIDE else ' stroke-width="7"'
        parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#ffffff" stroke="#55585c"{dash}/>')
        parts.append(
            f'<text x="{x + 16}" y="{y + 34}" font-family="Arial, sans-serif" font-size="24" '
            f'fill="#8a8f95">{room}</text>'
        )
    parts.append("</svg>")
    return "data:image/svg+xml;base64," + base64.b64encode("".join(parts).encode()).decode()


def demo_floorplans(devices, coordinator_ieee: str | None) -> list[dict]:
    import hashlib

    plans = []
    for floor_id, (name, level, (width, height), rooms) in FLOORS.items():
        positions: dict[str, list[float]] = {}
        if coordinator_ieee and floor_id == "eg":
            positions["coordinator"] = [800 / width, 100 / height]
        for ieee, device in devices.items():
            room = device.area_name
            if room not in rooms or device.friendly_name.startswith(("Fenster Dachboden", "Klima Büro", "Steckdose Flur")):
                continue  # a few stay unplaced to try drag & drop
            x, y, w, h = rooms[room]
            digest = hashlib.sha1(ieee.encode()).digest()
            fx = 0.18 + 0.64 * digest[0] / 255
            fy = 0.3 + 0.58 * digest[1] / 255
            positions[ieee] = [round((x + fx * w) / width, 4), round((y + fy * h) / height, 4)]
        plans.append({
            "plan_id": floor_id, "name": name, "floor_id": floor_id, "level": level,
            "image": floorplan_svg(floor_id), "positions": positions,
        })
    return plans


def demo_building(coordinator_ieee: str | None) -> dict:
    """Drawn demo building from FLOORS (100 px = 1 m); rooms linked to their areas."""
    floors = []
    for index, (floor_id, (name, _level, _size, rooms)) in enumerate(FLOORS.items()):
        drawn = []
        for room, (x, y, w, h) in rooms.items():
            x0, y0, x1, y1 = x / 100, y / 100, (x + w) / 100, (y + h) / 100
            drawn.append({
                "id": f"r_{floor_id}_{len(drawn)}", "name": room, "area_id": room.lower(),
                "points": [[x0, y0], [x1, y0], [x1, y1], [x0, y1]],
            })
        floors.append({
            "id": floor_id, "name": name, "floor_id": floor_id, "elevation": index * 2.7,
            "height": 2.6, "rooms": drawn, "background": None,
        })
    positions = {"coordinator": {"floor": "eg", "x": 7.0, "y": 1.0}} if coordinator_ieee else {}
    return {"floors": floors, "positions": positions}


def load(name: str) -> object:
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


def main() -> None:
    scans = []
    for name in ("networkmap_raw.json", "networkmap_raw_2.json"):
        payload = load(name)
        stamps = [parse_last_seen(n["lastSeen"]) for n in payload["data"]["value"]["nodes"]]  # type: ignore[index]
        scans.append(parse_networkmap(payload, max(s for s in stamps if s)))
    info = parse_bridge_info(load("bridge_info.json"))
    devices = parse_bridge_devices(load("bridge_devices.json"))
    area_names: dict[str, str] = {}
    for ieee, device in devices.items():
        room = guess_room(device.friendly_name)
        if room:
            area_id = room.lower()
            area_names[area_id] = room
            devices[ieee] = replace(device, area_id=area_id, area_name=room, floor_id=floor_of(room))

    now = scans[-1].timestamp + timedelta(minutes=16)
    config = AnalyzerConfig()
    snapshot = NetworkSnapshot(
        now=now,
        devices=devices,
        scans=tuple(scans),
        source_info=info.as_source_info(),
        z2m_online_since=now - timedelta(hours=29),
    )
    report, _ = analyze(snapshot, config, FindingTracker(config))
    data = report_to_dict(
        report,
        full=True,
        names=lambda ieee: devices[ieee].friendly_name if ieee in devices else ieee,
        scans=scans,
        coordinator_ieee=info.coordinator_ieee,
        area_names=area_names,
        last_seen={ieee: d.last_seen or scans[-1].nodes[ieee].last_seen for ieee, d in devices.items() if ieee in scans[-1].nodes},
        last_scan=scans[-1].timestamp,
        floors=[{"floor_id": fid, "name": f[0], "level": f[1]} for fid, f in FLOORS.items()],
        areas=[
            {"area_id": area_id, "name": name, "floor_id": floor_of(name)}
            for area_id, name in sorted(area_names.items())
        ],
        tz=ZoneInfo("Europe/Berlin"),
    )
    # Real send rates from the two health captures (10 min apart), for the live demo.
    first, second = load("bridge_health.json"), load("bridge_health_2.json")
    seconds = (second["response_time"] - first["response_time"]) / 1000  # type: ignore[index]
    data["_demo"] = {
        "rates": {
            ieee: (c["messages"] - first["devices"][ieee]["messages"]) / seconds  # type: ignore[index]
            for ieee, c in second["devices"].items()  # type: ignore[index]
            if ieee in first["devices"]  # type: ignore[index]
        },
        "alert_router": next(i for i, d in devices.items() if d.friendly_name == "Lampe Wohnzimmer"),
        "floorplans": demo_floorplans(devices, info.coordinator_ieee),
        "building": demo_building(info.coordinator_ieee),
        "plans": plans_to_dicts(
            plan_all(snapshot, config),
            lambda ieee: devices[ieee].friendly_name if ieee in devices else ieee,
        ),
    }
    out = ROOT / "frontend" / "preview" / "report.json"
    out.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{out}: score {data['score']}, {len(data['findings'])} findings, "
          f"{len(data['topology']['nodes'])} nodes, {len(data['topology']['links'])} links")


if __name__ == "__main__":
    main()
