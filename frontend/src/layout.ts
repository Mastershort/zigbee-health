/**
 * Radial layout of the mesh.
 *
 * Coordinator in the centre, always-on routers on the inner ring, part-time / unclear
 * routers on the middle ring, battery devices on the outer ring next to their parent.
 * Every always-on router owns a sector sized by the devices that hang on it, so lines
 * stay short and do not cross the whole map.
 */

import type { Link, Topology, TopologyNode } from "./types";

export const SIZE = 800;
export const CENTER = SIZE / 2;
const RING = { router: 150, other: 240, end: 330, endOuter: 362 };
const COORDINATOR_GROUP = "__coordinator__";
const UNKNOWN_GROUP = "__unknown__";
const MIN_END_SPACING = 30; // px on the outer ring before a second ring is used

export type EdgeKind = "parent" | "backbone" | "anchor" | "mesh";

export interface PlacedNode {
  id: string;
  node: TopologyNode | null; // null = coordinator
  x: number;
  y: number;
  angle: number;
  ring: 0 | 1 | 2 | 3;
}

export interface Edge {
  from: string;
  to: string;
  lqi: number | null;
  kind: EdgeKind;
}

export interface Layout {
  coordinatorId: string;
  /** Centre angle of the sector with devices whose parent is unknown. */
  unknownAngle: number | null;
  placed: Map<string, PlacedNode>;
  edges: Edge[];
  dead: TopologyNode[];
  unknownParent: Set<string>;
}

interface Group {
  key: string;
  anchor: TopologyNode | null;
  routers: TopologyNode[];
  ends: TopologyNode[];
  weight: number;
}

const byName = (a: TopologyNode, b: TopologyNode): number =>
  a.name.localeCompare(b.name, undefined, { numeric: true });

function polar(angle: number, radius: number): { x: number; y: number } {
  return { x: CENTER + radius * Math.cos(angle), y: CENTER + radius * Math.sin(angle) };
}

function bestLink(links: Link[], id: string, peers: Set<string>): Link | null {
  let best: Link | null = null;
  for (const link of links) {
    const other = link.a === id ? link.b : link.b === id ? link.a : null;
    if (other === null || !peers.has(other)) continue;
    if (best === null || link.lqi > best.lqi) best = link;
  }
  return best;
}

function spread(count: number, center: number, span: number, padding = 0.12): number[] {
  if (count === 0) return [];
  if (count === 1) return [center];
  const usable = span * (1 - padding);
  const step = usable / count;
  const start = center - usable / 2 + step / 2;
  return Array.from({ length: count }, (_, i) => start + i * step);
}

export function computeLayout(topology: Topology): Layout {
  const coordinatorId = topology.coordinator?.ieee ?? "coordinator";
  const nodes = topology.nodes;
  const alive = nodes.filter((n) => n.state !== "dead");
  const dead = nodes.filter((n) => n.state === "dead").sort(byName);
  const byId = new Map(alive.map((n) => [n.ieee, n]));

  const alwaysOn = alive.filter((n) => n.type === "router" && n.kind === "always_on").sort(byName);
  const otherRouters = alive.filter((n) => n.type === "router" && n.kind !== "always_on");
  const anchorIds = new Set([coordinatorId, ...alwaysOn.map((n) => n.ieee)]);

  // Part-time / unclear routers hang on the peer with their best link.
  const routerAnchor = new Map<string, string>();
  for (const router of otherRouters) {
    const link = bestLink(topology.links, router.ieee, anchorIds);
    routerAnchor.set(
      router.ieee,
      link ? (link.a === router.ieee ? link.b : link.a) : coordinatorId,
    );
  }

  const groups = new Map<string, Group>();
  const group = (key: string): Group => {
    let g = groups.get(key);
    if (!g) {
      const anchor = byId.get(key) ?? null;
      g = { key, anchor, routers: [], ends: [], weight: 0 };
      groups.set(key, g);
    }
    return g;
  };
  for (const router of alwaysOn) group(router.ieee);
  for (const router of otherRouters) {
    const anchor = routerAnchor.get(router.ieee) ?? coordinatorId;
    group(anchor === coordinatorId ? COORDINATOR_GROUP : anchor).routers.push(router);
  }

  const unknownParent = new Set(topology.unknown_parent);
  for (const end of alive.filter((n) => n.type === "end_device")) {
    const parent = end.parent;
    let key = UNKNOWN_GROUP;
    if (parent === coordinatorId) key = COORDINATOR_GROUP;
    else if (parent && anchorIds.has(parent)) key = parent;
    else if (parent && routerAnchor.has(parent)) {
      const anchor = routerAnchor.get(parent) as string;
      key = anchor === coordinatorId ? COORDINATOR_GROUP : anchor;
    } else unknownParent.add(end.ieee);
    group(key).ends.push(end);
  }

  const ordered = [
    ...alwaysOn.map((n) => groups.get(n.ieee) as Group),
    ...[COORDINATOR_GROUP, UNKNOWN_GROUP].map((k) => groups.get(k)).filter((g): g is Group => !!g),
  ].filter((g) => g.anchor || g.routers.length || g.ends.length);
  for (const g of ordered) {
    g.weight = (g.anchor ? 1 : 0) + g.ends.length + 0.8 * g.routers.length + 0.3;
    // Routers need room for their label on the inner ring.
    if (g.anchor) g.weight = Math.max(g.weight, 2.4);
  }
  const total = ordered.reduce((sum, g) => sum + g.weight, 0) || 1;

  const placed = new Map<string, PlacedNode>();
  placed.set(coordinatorId, { id: coordinatorId, node: null, x: CENTER, y: CENTER, angle: 0, ring: 0 });

  const endCount = ordered.reduce((sum, g) => sum + g.ends.length, 0);
  const twoRings = endCount * MIN_END_SPACING > 2 * Math.PI * RING.end;

  let unknownAngle: number | null = null;
  let angle = -Math.PI / 2;
  for (const g of ordered) {
    const span = (g.weight / total) * 2 * Math.PI;
    const center = angle + span / 2;
    angle += span;
    if (g.key === UNKNOWN_GROUP) unknownAngle = center;

    if (g.anchor) {
      const p = polar(center, RING.router);
      placed.set(g.anchor.ieee, { id: g.anchor.ieee, node: g.anchor, ...p, angle: center, ring: 1 });
    }
    const routers = [...g.routers].sort(byName);
    spread(routers.length, center, span, 0.3).forEach((a, i) => {
      const r = routers[i];
      placed.set(r.ieee, { id: r.ieee, node: r, ...polar(a, RING.other), angle: a, ring: 2 });
    });
    // Children of a part-time router sit next to it: order by the parent's angle.
    const parentAngle = (n: TopologyNode): number =>
      (n.parent ? placed.get(n.parent)?.angle : undefined) ?? center;
    const ends = [...g.ends].sort((a, b) => parentAngle(a) - parentAngle(b) || byName(a, b));
    spread(ends.length, center, span).forEach((a, i) => {
      const e = ends[i];
      const radius = twoRings && i % 2 === 1 ? RING.endOuter : RING.end;
      placed.set(e.ieee, { id: e.ieee, node: e, ...polar(a, radius), angle: a, ring: 3 });
    });
  }

  const edges: Edge[] = [];
  const placedRouters = new Set(
    [...placed.values()].filter((p) => p.ring <= 2).map((p) => p.id),
  );
  // Faint mesh of all router links, then the strong structure on top.
  for (const link of topology.links) {
    if (placedRouters.has(link.a) && placedRouters.has(link.b)) {
      edges.push({ from: link.a, to: link.b, lqi: link.lqi, kind: "mesh" });
    }
  }
  const alwaysPeers = new Set([coordinatorId, ...alwaysOn.map((n) => n.ieee)]);
  for (const router of alwaysOn) {
    const peers = new Set(alwaysPeers);
    peers.delete(router.ieee);
    const link = bestLink(topology.links, router.ieee, peers);
    edges.push(
      link
        ? { from: router.ieee, to: link.a === router.ieee ? link.b : link.a, lqi: link.lqi, kind: "backbone" }
        : { from: router.ieee, to: coordinatorId, lqi: null, kind: "anchor" },
    );
  }
  for (const router of otherRouters) {
    const anchor = routerAnchor.get(router.ieee) ?? coordinatorId;
    const link = bestLink(topology.links, router.ieee, new Set([anchor]));
    edges.push({ from: router.ieee, to: anchor, lqi: link?.lqi ?? null, kind: link ? "backbone" : "anchor" });
  }
  for (const end of alive) {
    if (end.type === "end_device" && end.parent && placed.has(end.parent)) {
      edges.push({ from: end.ieee, to: end.parent, lqi: end.parent_lqi, kind: "parent" });
    }
  }
  return { coordinatorId, unknownAngle, placed, edges, dead, unknownParent };
}

/** Ordered route from a node to the coordinator along the drawn structure. */
export function routeToCoordinator(layout: Layout, id: string): string[] {
  const next = new Map<string, string>();
  for (const edge of layout.edges) {
    if (edge.kind !== "mesh" && !next.has(edge.from)) next.set(edge.from, edge.to);
  }
  const route = [id];
  let current = id;
  for (let i = 0; i < 10 && next.has(current); i++) {
    current = next.get(current) as string;
    if (route.includes(current)) break;
    route.push(current);
  }
  return route;
}

export function pathToCoordinator(layout: Layout, id: string): Set<string> {
  return new Set(routeToCoordinator(layout, id));
}

export function lqiClass(lqi: number | null): "good" | "ok" | "bad" | "none" {
  if (lqi === null || lqi <= 0) return "none";
  if (lqi >= 150) return "good";
  if (lqi >= 80) return "ok";
  return "bad";
}
