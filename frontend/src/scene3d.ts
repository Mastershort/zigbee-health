/**
 * Rotatable 3D building (three.js). Built as its own bundle (zigbee-health-3d.js) and only
 * loaded when the 3D view is opened. Plan coordinates: x → x, y → z, elevation → y.
 */

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import { type BFloor, type Building, type Placed, type Vec, bounds, centroid, roomHue } from "./building-geo";
import type { Alert, TopologyNode, Topology } from "./types";

export interface SceneData {
  building: Building;
  placed: Record<string, Placed>;
  coordinatorKey: string;
  topology: Topology;
  heat: Record<string, number>;
  alerts: Alert[];
  hidden: string[];
  showLinks: boolean;
  /** Marked devices and rooms; everything else fades. */
  focus: { ieees: string[]; areas: string[] } | null;
  colors: Record<string, string>;
  dark: boolean;
  coordinatorName: string;
}

export interface SceneCallbacks {
  hover: (ieee: string | null, x: number, y: number) => void;
  click: (ieee: string) => void;
}

export interface SceneHandle {
  update(data: SceneData): void;
  spark(route: string[]): void;
  reset(): void;
  dispose(): void;
}

const DEVICE_HEIGHT = 0.9;
const LQI_GOOD = 150;
const LQI_OK = 80;

function lqiColor(lqi: number | null, colors: Record<string, string>): string {
  if (lqi === null || lqi <= 1) return colors.muted;
  if (lqi >= LQI_GOOD) return colors.good;
  if (lqi >= LQI_OK) return colors.ok;
  return colors.bad;
}

function stateColor(node: TopologyNode, colors: Record<string, string>): string {
  if (node.kind === "unclear" && node.state === "ok") return colors.part;
  switch (node.state) {
    case "ok":
      return colors.good;
    case "weak":
      return colors.ok;
    case "battery":
      return "#f57c00";
    case "dead":
      return colors.bad;
    case "part_time_router":
      return colors.part;
    default:
      return colors.muted;
  }
}

/** Text sprite with a constant on-screen size (fraction of the view height). */
function label(text: string, color: string, size = 0.032): THREE.Sprite {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  const px = 48;
  ctx.font = `600 ${px}px system-ui, sans-serif`;
  const width = Math.ceil(ctx.measureText(text).width) + 24;
  canvas.width = width;
  canvas.height = px + 20;
  ctx.font = `600 ${px}px system-ui, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.lineWidth = 8;
  ctx.strokeStyle = "rgba(0,0,0,0.55)";
  ctx.strokeText(text, 12, canvas.height / 2);
  ctx.fillStyle = color;
  ctx.fillText(text, 12, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true, sizeAttenuation: false }),
  );
  sprite.scale.set((size * width) / canvas.height, size, 1);
  sprite.renderOrder = 10;
  return sprite;
}

function disposeTree(object: THREE.Object3D): void {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    mesh.geometry?.dispose();
    const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
    for (const m of Array.isArray(material) ? material : material ? [material] : []) {
      (m as THREE.SpriteMaterial).map?.dispose();
      m.dispose();
    }
  });
}

export function mount(host: HTMLElement, first: SceneData, callbacks: SceneCallbacks): SceneHandle {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.domElement.style.display = "block";
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 500);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.minDistance = 2;
  controls.maxDistance = 120;

  scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.4);
  sun.position.set(8, 20, 10);
  scene.add(sun);

  let data = first;
  let world = new THREE.Group();
  scene.add(world);
  const devices = new Map<string, { mesh: THREE.Mesh; base: THREE.Color; pos: THREE.Vector3 }>();
  const pulses: { mesh: THREE.Mesh; born: number }[] = [];
  const sparks: { mesh: THREE.Mesh; points: THREE.Vector3[]; lengths: number[]; total: number; born: number }[] =
    [];
  let center = new THREE.Vector3();
  let radius = 10;
  let frame = 0;
  let disposed = false;
  let hovered: string | null = null;

  const positionOf = (key: string): THREE.Vector3 | null => devices.get(key)?.pos ?? null;

  function build(): void {
    scene.remove(world);
    disposeTree(world);
    world = new THREE.Group();
    devices.clear();
    scene.add(world);
    const floors = [...data.building.floors].sort((a, b) => a.elevation - b.elevation);
    const box = bounds(floors);
    const cx = box ? box.x + box.w / 2 : 0;
    const cz = box ? box.y + box.h / 2 : 0;
    const top = floors.length ? floors[floors.length - 1].elevation + floors[floors.length - 1].height : 3;
    center = new THREE.Vector3(cx, top / 2, cz);
    radius = Math.max(box?.w ?? 8, box?.h ?? 8, top) * 0.75 + 2;

    const grid = new THREE.GridHelper(
      Math.ceil(radius * 3),
      Math.ceil(radius * 3),
      data.dark ? 0x3a4450 : 0xc6ccd4,
      data.dark ? 0x262d36 : 0xe2e6ea,
    );
    grid.position.set(cx, (floors[0]?.elevation ?? 0) - 0.02, cz);
    world.add(grid);

    for (const floor of floors) {
      if (data.hidden.includes(floor.id)) continue;
      world.add(buildFloor(floor));
    }
    buildDevices(floors);
    if (data.showLinks) buildLinks();
  }

  function buildFloor(floor: BFloor): THREE.Group {
    const group = new THREE.Group();
    const y = floor.elevation;
    const wallTop = floor.height;
    const edgeColor = data.dark ? 0x9fb3c8 : 0x4f5d6b;
    for (const room of floor.rooms) {
      if (room.points.length < 3) continue;
      const hue = roomHue(room);
      const focused = !!room.area_id && !!data.focus?.areas.includes(room.area_id);
      const color = focused
        ? new THREE.Color(data.colors.info)
        : new THREE.Color().setHSL(hue / 360, 0.6, data.dark ? 0.45 : 0.62);
      const shape = new THREE.Shape(room.points.map(([x, z]) => new THREE.Vector2(x, z)));
      const slabGeometry = new THREE.ShapeGeometry(shape);
      slabGeometry.rotateX(Math.PI / 2);
      const slab = new THREE.Mesh(
        slabGeometry,
        new THREE.MeshStandardMaterial({
          color,
          transparent: true,
          opacity: focused ? 0.85 : data.focus ? 0.3 : 0.55,
          side: THREE.DoubleSide,
          roughness: 0.9,
          depthWrite: false,
        }),
      );
      slab.position.y = y + 0.01;
      group.add(slab);

      // Translucent walls plus crisp outline edges.
      const wallPositions: number[] = [];
      const edgePositions: number[] = [];
      const pts = room.points;
      for (let i = 0; i < pts.length; i++) {
        const [x1, z1] = pts[i];
        const [x2, z2] = pts[(i + 1) % pts.length];
        wallPositions.push(
          x1, y, z1, x2, y, z2, x2, y + wallTop, z2,
          x1, y, z1, x2, y + wallTop, z2, x1, y + wallTop, z1,
        );
        edgePositions.push(x1, y, z1, x2, y, z2, x1, y + wallTop, z1, x2, y + wallTop, z2, x1, y, z1, x1, y + wallTop, z1);
      }
      const wallGeometry = new THREE.BufferGeometry();
      wallGeometry.setAttribute("position", new THREE.Float32BufferAttribute(wallPositions, 3));
      wallGeometry.computeVertexNormals();
      group.add(
        new THREE.Mesh(
          wallGeometry,
          new THREE.MeshStandardMaterial({
            color,
            transparent: true,
            opacity: 0.1,
            side: THREE.DoubleSide,
            depthWrite: false,
          }),
        ),
      );
      const edgeGeometry = new THREE.BufferGeometry();
      edgeGeometry.setAttribute("position", new THREE.Float32BufferAttribute(edgePositions, 3));
      group.add(
        new THREE.LineSegments(
          edgeGeometry,
          new THREE.LineBasicMaterial({ color: edgeColor, transparent: true, opacity: 0.55 }),
        ),
      );
      const [lx, lz] = centroid(pts);
      const text = label(room.name, "#ffffff", 0.028);
      text.position.set(lx, y + 0.12, lz);
      text.center.set(0.5, 0);
      group.add(text);
    }
    return group;
  }

  function addDevice(key: string, at: Placed, node: TopologyNode | null): void {
    const floor = data.building.floors.find((f) => f.id === at.floor);
    if (!floor || data.hidden.includes(floor.id)) return;
    const c = data.colors;
    const pos = new THREE.Vector3(at.x, floor.elevation + DEVICE_HEIGHT, at.y);
    let geometry: THREE.BufferGeometry;
    let color: string;
    if (!node) {
      geometry = new THREE.OctahedronGeometry(0.26);
      color = c.info;
    } else if (node.type === "router") {
      geometry = new THREE.BoxGeometry(0.28, 0.28, 0.28);
      color = stateColor(node, c);
    } else {
      geometry = new THREE.SphereGeometry(0.13, 20, 14);
      color = stateColor(node, c);
    }
    const base = new THREE.Color(color);
    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        color: base,
        emissive: base,
        emissiveIntensity: 0.25,
        roughness: 0.4,
        transparent: true,
        opacity: data.focus && !data.focus.ieees.includes(key) ? 0.15 : 1,
      }),
    );
    mesh.position.copy(pos);
    mesh.userData.key = key;
    world.add(mesh);
    // Thin stem down to the floor so the height reads correctly.
    const stem = new THREE.BufferGeometry().setFromPoints([pos, new THREE.Vector3(pos.x, floor.elevation, pos.z)]);
    world.add(new THREE.Line(stem, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.35 })));
    if (!node || node.type === "router" || data.alerts.some((a) => a.ieee === node.ieee)) {
      const text = label(node?.name ?? data.coordinatorName, "#ffffff", 0.019);
      text.position.set(pos.x, pos.y + 0.2, pos.z);
      text.center.set(0.5, 0);
      world.add(text);
    }
    devices.set(key, { mesh, base, pos });
  }

  function buildDevices(_floors: BFloor[]): void {
    const topology = data.topology;
    const coordinator = topology.coordinator?.ieee;
    const coordinatorAt = data.placed[data.coordinatorKey];
    if (coordinator && coordinatorAt) addDevice(coordinator, coordinatorAt, null);
    for (const node of topology.nodes) {
      const at = data.placed[node.ieee];
      if (at) addDevice(node.ieee, at, node);
    }
  }

  function buildLinks(): void {
    const c = data.colors;
    const segments = new Map<string, number[]>();
    const push = (a: string, b: string, lqi: number | null) => {
      const pa = positionOf(a);
      const pb = positionOf(b);
      if (!pa || !pb) return;
      const color = lqiColor(lqi, c);
      const list = segments.get(color) ?? [];
      list.push(pa.x, pa.y, pa.z, pb.x, pb.y, pb.z);
      segments.set(color, list);
    };
    for (const node of data.topology.nodes) {
      if (node.parent && node.state !== "dead") push(node.ieee, node.parent, node.parent_lqi);
    }
    for (const link of data.topology.links) push(link.a, link.b, link.lqi);
    for (const [color, positions] of segments) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      world.add(
        new THREE.LineSegments(
          geometry,
          new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.6, depthWrite: false }),
        ),
      );
    }
  }

  function reset(): void {
    const distance = radius * 1.25;
    camera.position.set(center.x + distance * 0.55, center.y + distance * 0.75, center.z + distance * 0.95);
    controls.target.copy(center);
    controls.update();
  }

  function resize(): void {
    const width = host.clientWidth || 300;
    const height = host.clientHeight || 300;
    renderer.setSize(width, height, false);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  // --- interaction --------------------------------------------------------------------
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let downAt: [number, number] | null = null;

  function pick(ev: PointerEvent): string | null {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set(((ev.clientX - rect.left) / rect.width) * 2 - 1, -((ev.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects([...devices.values()].map((d) => d.mesh), false);
    return (hits[0]?.object.userData.key as string | undefined) ?? null;
  }

  const onMove = (ev: PointerEvent) => {
    const key = pick(ev);
    const rect = host.getBoundingClientRect();
    renderer.domElement.style.cursor = key ? "pointer" : "grab";
    if (key !== hovered || key) {
      hovered = key;
      callbacks.hover(key, ev.clientX - rect.left, ev.clientY - rect.top);
    }
  };
  const onDown = (ev: PointerEvent) => {
    downAt = [ev.clientX, ev.clientY];
  };
  const onUp = (ev: PointerEvent) => {
    if (!downAt || Math.hypot(ev.clientX - downAt[0], ev.clientY - downAt[1]) > 5) return;
    downAt = null;
    const key = pick(ev);
    if (key) callbacks.click(key);
  };
  const onLeave = () => {
    hovered = null;
    callbacks.hover(null, 0, 0);
  };
  renderer.domElement.addEventListener("pointermove", onMove);
  renderer.domElement.addEventListener("pointerdown", onDown);
  renderer.domElement.addEventListener("pointerup", onUp);
  renderer.domElement.addEventListener("pointerleave", onLeave);
  const observer = new ResizeObserver(resize);
  observer.observe(host);

  // --- animation ----------------------------------------------------------------------
  const clock = new THREE.Clock();
  const sparkGeometry = new THREE.SphereGeometry(0.07, 12, 8);
  const sparkMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const pulseGeometry = new THREE.RingGeometry(0.2, 0.26, 40);
  pulseGeometry.rotateX(-Math.PI / 2);

  function syncAlerts(): void {
    for (const p of pulses) {
      world.remove(p.mesh);
      (p.mesh.material as THREE.Material).dispose();
    }
    pulses.length = 0;
    for (const alert of data.alerts) {
      const pos = positionOf(alert.ieee);
      if (!pos) continue;
      const mesh = new THREE.Mesh(
        pulseGeometry,
        new THREE.MeshBasicMaterial({ color: data.colors.bad, transparent: true, side: THREE.DoubleSide }),
      );
      mesh.position.set(pos.x, pos.y, pos.z);
      world.add(mesh);
      pulses.push({ mesh, born: clock.getElapsedTime() });
    }
  }

  function tick(): void {
    if (disposed) return;
    frame = requestAnimationFrame(tick);
    const now = clock.getElapsedTime();
    controls.update();
    for (const [key, device] of devices) {
      const heat = data.heat[key] ?? 0;
      const material = device.mesh.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = 0.25 + heat * 1.4 + (key === hovered ? 0.6 : 0);
      const scale = 1 + heat * 0.35 + (key === hovered ? 0.25 : 0);
      device.mesh.scale.setScalar(scale);
    }
    for (const p of pulses) {
      const phase = ((now - p.born) % 1.4) / 1.4;
      p.mesh.scale.setScalar(1 + phase * 3.5);
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = 1 - phase;
    }
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      const travelled = (now - s.born) * 4.5; // metres per second
      if (travelled >= s.total) {
        world.remove(s.mesh);
        sparks.splice(i, 1);
        continue;
      }
      let rest = travelled;
      let seg = 0;
      while (seg < s.lengths.length - 1 && rest > s.lengths[seg]) rest -= s.lengths[seg++];
      const a = s.points[seg];
      const b = s.points[seg + 1];
      s.mesh.position.lerpVectors(a, b, s.lengths[seg] ? rest / s.lengths[seg] : 1);
    }
    renderer.render(scene, camera);
  }

  function update(next: SceneData): void {
    const structural =
      next.building !== data.building ||
      next.topology !== data.topology ||
      next.placed !== data.placed ||
      next.hidden.join() !== data.hidden.join() ||
      next.showLinks !== data.showLinks ||
      next.dark !== data.dark ||
      next.alerts !== data.alerts ||
      JSON.stringify(next.focus) !== JSON.stringify(data.focus);
    data = next;
    if (structural) {
      for (const s of sparks) world.remove(s.mesh);
      sparks.length = 0;
      build();
      syncAlerts();
    }
  }

  function spark(route: string[]): void {
    const points = route.map(positionOf).filter((p): p is THREE.Vector3 => !!p);
    if (points.length < 2 || sparks.length > 60) return;
    const lengths = points.slice(1).map((p, i) => p.distanceTo(points[i]));
    const mesh = new THREE.Mesh(sparkGeometry, sparkMaterial);
    mesh.position.copy(points[0]);
    world.add(mesh);
    sparks.push({ mesh, points, lengths, total: lengths.reduce((s, l) => s + l, 0), born: clock.getElapsedTime() });
  }

  build();
  syncAlerts();
  resize();
  reset();
  tick();

  return {
    update,
    spark,
    reset,
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      disposeTree(world);
      sparkGeometry.dispose();
      sparkMaterial.dispose();
      pulseGeometry.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

export type { Vec };

declare global {
  interface Window {
    zigbeeHealth3d?: { mount: typeof mount };
  }
}

window.zigbeeHealth3d = { mount };
