"""Inline the built card, the 3D scene and the preview report into one standalone HTML page.

Run after `npm run build` (frontend/) and `scripts/preview_data.py`.
Output: frontend/preview/dist/zigbee-health-preview.html

An optional `frontend/preview/building.local.json` (gitignored) replaces the demo building,
so a personal floor plan can be previewed without ever being committed.
"""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BUILD = ROOT / "custom_components" / "zigbee_health" / "frontend"


def _script(name: str) -> str:
    return (BUILD / name).read_text(encoding="utf-8").replace("</script", "<\\/script")


def main() -> None:
    template = (ROOT / "frontend" / "preview" / "template.html").read_text(encoding="utf-8")
    data = json.loads((ROOT / "frontend" / "preview" / "report.json").read_text(encoding="utf-8"))
    local = ROOT / "frontend" / "preview" / "building.local.json"
    if local.exists():
        data["_demo"]["building"] = json.loads(local.read_text(encoding="utf-8"))
    report = json.dumps(data, ensure_ascii=False).replace("</", "<\\/")
    html = (
        template.replace("/*SCENE_JS*/", _script("zigbee-health-3d.js"))
        .replace("/*CARD_JS*/", _script("zigbee-health-card.js"))
        .replace("/*REPORT*/", report)
    )
    out = ROOT / "frontend" / "preview" / "dist" / "zigbee-health-preview.html"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html, encoding="utf-8")
    print(out, f"{len(html) // 1024} KB")


if __name__ == "__main__":
    main()
