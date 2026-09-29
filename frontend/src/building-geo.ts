/** Drawn building: rooms as polygons in metres per storey, device positions, geometry. */

import type { TopologyNode } from "./types";

export type Vec = [number, number];

export interface BRoom {
  id: string;
  name: string;
  area_id?: string | null;
  points: Vec[];
}

/** Placement of a floor's background image; the image itself is stored separately. */
export interface BBackground {
  x: number;
  y: number;
  width: number;
  opacity: number;
}

export interface BFloor {
  id: string;
  name: string;
  floor_id?: string | null;
  elevation: number;
  height: number;
  rooms: BRoom[];
  background?: BBackground | null;
}

export interface Building {
  floors: BFloor[];
  positions: Record<string, { floor: string; x: number; y: number }>;
}

export interface Placed {
  floor: string;
  x: number;
  y: number;
  auto: boolean;
}

export const COORDINATOR_KEY = "coordinator";
const SPREAD = 0.6; // metres between auto-placed devices in one room

export function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function round(value: number, step = 0.01): number {
  return Math.round(value / step) * step;
}

export function area(points: Vec[]): number {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    sum += x1 * y2 - x2 * y1;
  }
  return sum / 2;
}

/** Area-weighted centroid (falls back to the vertex mean for degenerate polygons). */
export function centroid(points: Vec[]): Vec {
  const a = area(points);
  if (Math.abs(a) < 1e-6) {
    const n = points.length || 1;
    return [points.reduce((s, p) => s + p[0], 0) / n, points.reduce((s, p) => s + p[1], 0) / n];
  }
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    const f = x1 * y2 - x2 * y1;
    cx += (x1 + x2) * f;
    cy += (y1 + y2) * f;
  }
  return [cx / (6 * a), cy / (6 * a)];
}

export function inside(point: Vec, polygon: Vec[]): boolean {
  let hit = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (yi > point[1] !== yj > point[1] && point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi) {
      hit = !hit;
    }
  }
  return hit;
}

export function distance(a: Vec, b: Vec): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

/** Axis-aligned rectangle? Then width/depth can be typed in. */
export function rectOf(points: Vec[]): { x: number; y: number; w: number; h: number } | null {
  if (points.length !== 4) return null;
  const xs = [...new Set(points.map((p) => round(p[0], 0.001)))];
  const ys = [...new Set(points.map((p) => round(p[1], 0.001)))];
  if (xs.length !== 2 || ys.length !== 2) return null;
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

export function bounds(floors: BFloor[]): { x: number; y: number; w: number; h: number } | null {
  const points = floors.flatMap((f) => f.rooms.flatMap((r) => r.points));
  if (!points.length) return null;
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x || 1, h: Math.max(...ys) - y || 1 };
}

/** Snap to nearby vertices of existing rooms first, then to the grid. */
export function snap(point: Vec, vertices: Vec[], radius: number, grid: number): Vec {
  let best: Vec | null = null;
  let bestDistance = radius;
  for (const v of vertices) {
    const d = distance(point, v);
    if (d < bestDistance) {
      best = v;
      bestDistance = d;
    }
  }
  if (best) return [best[0], best[1]];
  return [round(point[0], grid), round(point[1], grid)];
}

/** Grid points inside a room, nearest to its centre first. */
function slots(room: BRoom): Vec[] {
  const [cx, cy] = centroid(room.points);
  const xs = room.points.map((p) => p[0]);
  const ys = room.points.map((p) => p[1]);
  const result: Vec[] = [];
  for (let x = Math.min(...xs) + SPREAD / 2; x < Math.max(...xs); x += SPREAD) {
    for (let y = Math.min(...ys) + SPREAD / 2; y < Math.max(...ys); y += SPREAD) {
      if (inside([x, y], room.points)) result.push([x, y]);
    }
  }
  const origin: Vec = inside([cx, cy], room.points) ? [cx, cy] : (result[0] ?? [cx, cy]);
  result.sort((a, b) => distance(a, origin) - distance(b, origin));
  return result.length ? result : [[cx, cy]];
}

/**
 * Where every device stands: a manual position if set, otherwise automatically in the
 * room linked to its Home Assistant area (spread on a grid around the room centre).
 */
export function placeDevices(building: Building, nodes: TopologyNode[]): Map<string, Placed> {
  const placed = new Map<string, Placed>();
  for (const [key, pos] of Object.entries(building.positions)) {
    if (building.floors.some((f) => f.id === pos.floor)) {
      placed.set(key, { floor: pos.floor, x: pos.x, y: pos.y, auto: false });
    }
  }
  const roomOfArea = new Map<string, { floor: BFloor; room: BRoom }>();
  for (const floor of building.floors) {
    for (const room of floor.rooms) {
      if (room.area_id && !roomOfArea.has(room.area_id)) roomOfArea.set(room.area_id, { floor, room });
    }
  }
  const used = new Map<string, number>();
  const sorted = [...nodes].sort(
    (a, b) =>
      Number(b.type === "router") - Number(a.type === "router") ||
      a.name.localeCompare(b.name, undefined, { numeric: true }),
  );
  const free = new Map<string, Vec[]>();
  for (const node of sorted) {
    if (placed.has(node.ieee) || !node.area_id) continue;
    const target = roomOfArea.get(node.area_id);
    if (!target) continue;
    let spots = free.get(target.room.id);
    if (!spots) {
      spots = slots(target.room);
      free.set(target.room.id, spots);
    }
    const index = used.get(target.room.id) ?? 0;
    used.set(target.room.id, index + 1);
    const [x, y] = spots[index % spots.length];
    placed.set(node.ieee, { floor: target.floor.id, x, y, auto: true });
  }
  return placed;
}

const PALETTE = [206, 150, 32, 280, 0, 180, 110, 330, 55, 240];

export function roomHue(room: BRoom): number {
  let hash = 0;
  for (const ch of room.area_id ?? room.name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

/**
 * Stack storeys without gaps: each one starts where the one below ends (lowest at 0).
 * Keeps the order; fixes gaps after deleting a storey or changing a height.
 */
export function restack(floors: BFloor[]): BFloor[] {
  let elevation = 0;
  for (const floor of [...floors].sort((a, b) => a.elevation - b.elevation)) {
    floor.elevation = round(elevation);
    elevation += floor.height;
  }
  return floors;
}

export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
