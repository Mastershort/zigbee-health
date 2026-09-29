# Changelog

## 0.10.2

- Fix: opening a bundled repair (e.g. "16 devices unreachable for a long time") failed with "500 Internal Server Error"
- Fix: opening the repair "enable Zigbee2MQTT option" changed the option right away instead of asking first

## 0.10.1

- Removing the integration now also deletes its stored history and ignore list (previously a file stayed in `.storage`)
- Test data: synthetic IEEE addresses use the usual 16 hex digits

## 0.10.0 – first public beta

- Network health analysis for Zigbee2MQTT with 18 finding types, network / room / device scores and top-3 measures
- Sidebar panel and dashboard card: live network map with traffic, wall switch alarm, network check, router planner
- Floor plan editor (rectangles and free shapes in metres, several storeys, background image) with automatic device placement by area
- Rotatable 3D view of the drawn home
- "Show" marks the devices and rooms of a measure on the map, the floor plan and in 3D
- Device panel: details, assign area, rename, ignore, remove from Zigbee2MQTT (one device at a time, with confirmation)
- Repairs with fix flows, entities, actions, events and device triggers
