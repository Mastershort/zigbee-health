/**
 * Drawn floor plan: rooms drawn right in the integration (rectangles and polygons in
 * metres), one drawing per storey, rooms linked to Home Assistant areas so devices place
 * themselves. View mode shows links, stair markers, live traffic, alerts and the planner.
 */

import { LitElement, type PropertyValues, css, html, nothing, svg } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import "./floor";
import {
  type BFloor,
  type BRoom,
  type Building,
  COORDINATOR_KEY,
  type Placed,
  type Vec,
  bounds,
  centroid,
  clone,
  restack,
  distance,
  placeDevices,
  rectOf,
  round,
  roomHue,
  snap,
  uid,
} from "./building-geo";
import { type Layout, lqiClass, routeToCoordinator } from "./layout";
import type { Translate } from "./i18n";
import { styles } from "./styles";
import { selectDevice } from "./util";
import type { Alert, Floor, Focus, HomeAssistant, Plan, Report, TopologyNode } from "./types";

type Tool = "select" | "rect" | "poly" | "devices";

const GRID = 0.05; // metres
const SNAP_PX = 12;
const SAVE_DELAY_MS = 700;
const MAX_UNDO = 60;
const DEFAULT_HEIGHT = 2.6;
const MAX_BG_SIDE = 2000;

async function fileToDataUrl(file: File): Promise<{ url: string; aspect: number }> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("image"));
      image.src = objectUrl;
    });
    const scale = Math.min(1, MAX_BG_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return { url: canvas.toDataURL("image/jpeg", 0.85), aspect: canvas.height / canvas.width };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function fmt(m: number): string {
  return `${m.toFixed(2).replace(".", ",")} m`;
}

@customElement("zigbee-health-building")
export class ZigbeeHealthBuilding extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @property({ attribute: false }) report?: Report;
  @property({ attribute: false }) layout?: Layout;
  @property({ attribute: false }) heat: Record<string, number> = {};
  @property({ attribute: false }) alerts: Alert[] = [];
  @property({ attribute: false }) plan?: Plan;
  @property({ attribute: false }) marked?: Focus;
  @property({ attribute: false }) t: Translate = (key) => key;
  @property({ attribute: false }) configEntryId?: string;
  @property({ attribute: false }) live = true;

  @state() private _b?: Building | null;
  @state() private _floor?: string;
  @state() private _edit = false;
  @state() private _tool: Tool = "select";
  @state() private _room?: string;
  @state() private _vertex?: number;
  @state() private _device?: string;
  @state() private _draft: Vec[] = [];
  @state() private _cursor?: Vec;
  @state() private _rectStart?: Vec;
  @state() private _vb = { x: -1, y: -1, w: 14, h: 10 };
  @state() private _hover?: string;
  @state() private _legacy = false;
  @state() private _confirmDelete = false;
  @state() private _error?: string;
  private _drag?:
    | { kind: "vertex"; start: Vec }
    | { kind: "room"; start: Vec; points: Vec[] }
    | { kind: "device"; key: string }
    | { kind: "pan"; start: Vec; vb: { x: number; y: number; w: number; h: number } };
  private _undo: Building[] = [];
  private _saveTimer?: number;
  private _tip = { x: 0, y: 0 };
  private _bgAspect: Record<string, number> = {};
  /** Background images by floor id: kept out of the building so undo and saves stay small. */
  @state() private _images: Record<string, string> = {};
  private _pointers = new Map<number, Vec>();
  private _pinch?: { distance: number; mid: Vec };
  private _fitted = false;
  private _placedCache?: { key: unknown[]; value: Map<string, Placed> };

  static styles = [
    styles,
    css`
      :host {
        display: flex;
        flex-direction: column;
        gap: 10px;
        flex: 1;
        min-height: 0;
      }
      .toolbar,
      .panel,
      .hint,
      .start,
      .err {
        flex-shrink: 0;
      }
      .pulse,
      .spark,
      .virtual,
      .glyph {
        vector-effect: non-scaling-stroke;
      }
      .pulse.alarm {
        stroke-width: 3;
      }
      .toolbar {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 6px;
      }
      .toolbar .spacer {
        flex: 1;
      }
      .ftab {
        border: 1px solid var(--zh-line);
        background: none;
        color: var(--zh-text);
        font: inherit;
        font-size: 13px;
        padding: 5px 12px;
        border-radius: 999px;
        cursor: pointer;
        white-space: nowrap;
      }
      .ftab.on {
        background: var(--primary-color, #03a9f4);
        border-color: transparent;
        color: var(--text-primary-color, #fff);
      }
      .ftab.edit.on {
        background: var(--zh-ok);
      }
      .ftab:disabled {
        opacity: 0.4;
        cursor: default;
      }
      .tools {
        display: inline-flex;
        padding: 3px;
        gap: 2px;
        border-radius: 999px;
        background: var(--zh-surface);
      }
      .tools button {
        border: none;
        background: none;
        color: var(--zh-muted);
        font: inherit;
        font-size: 13px;
        padding: 5px 11px;
        border-radius: 999px;
        cursor: pointer;
      }
      .tools button.on {
        background: var(--zh-card);
        color: var(--zh-text);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
      }
      .canvas {
        position: relative;
        flex: 1;
        min-height: 300px;
        border-radius: 10px;
        overflow: hidden;
        background: var(--zh-surface);
      }
      .canvas svg {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        touch-action: none;
        user-select: none;
      }
      .canvas.drawing svg {
        cursor: crosshair;
      }
      .grid-minor {
        stroke: var(--zh-line);
        stroke-width: 0.6;
        vector-effect: non-scaling-stroke;
        opacity: 0.5;
      }
      .grid-major {
        stroke: var(--zh-line);
        stroke-width: 1;
        vector-effect: non-scaling-stroke;
      }
      .zroom {
        stroke-width: 2;
        vector-effect: non-scaling-stroke;
        cursor: default;
      }
      .editing .zroom {
        cursor: move;
      }
      .zroom.focus {
        stroke: var(--primary-color, #03a9f4) !important;
        stroke-width: 4;
        animation: room-focus 1.6s ease-in-out infinite;
      }
      @keyframes room-focus {
        50% {
          stroke-opacity: 0.35;
        }
      }
      .zroom.sel {
        stroke: var(--primary-color, #03a9f4) !important;
        stroke-width: 3;
      }
      .ghost {
        fill: none;
        stroke: var(--zh-muted);
        stroke-dasharray: 4 4;
        stroke-width: 1.2;
        vector-effect: non-scaling-stroke;
        opacity: 0.6;
      }
      .room-name {
        font-size: 0.3px;
        font-weight: 600;
        fill: var(--zh-text);
        pointer-events: none;
        paint-order: stroke;
        stroke: var(--zh-card);
        stroke-width: 0.06px;
      }
      .room-area {
        font-size: 0.2px;
        fill: var(--zh-muted);
        pointer-events: none;
      }
      .dim-label {
        font-size: 0.22px;
        font-weight: 600;
        fill: var(--primary-color, #03a9f4);
        pointer-events: none;
        paint-order: stroke;
        stroke: var(--zh-card);
        stroke-width: 0.06px;
      }
      .handle {
        fill: var(--zh-card);
        stroke: var(--primary-color, #03a9f4);
        stroke-width: 2;
        vector-effect: non-scaling-stroke;
        cursor: grab;
      }
      .handle.on {
        fill: var(--primary-color, #03a9f4);
      }
      .mid {
        fill: var(--primary-color, #03a9f4);
        opacity: 0.5;
        cursor: copy;
      }
      .draft {
        fill: color-mix(in srgb, var(--primary-color, #03a9f4) 12%, transparent);
        stroke: var(--primary-color, #03a9f4);
        stroke-width: 2;
        stroke-dasharray: 6 4;
        vector-effect: non-scaling-stroke;
      }
      .edge {
        vector-effect: non-scaling-stroke;
        animation: none;
      }
      .edge.link {
        stroke-width: 1.4;
        opacity: 0.35;
      }
      .edge.parent {
        stroke-width: 2.2;
      }
      .planned-edge {
        vector-effect: non-scaling-stroke;
      }
      .portal-stub {
        fill: none;
        stroke-width: 2.4;
        stroke-dasharray: 5 5;
        vector-effect: non-scaling-stroke;
      }
      .portal {
        cursor: pointer;
      }
      .portal circle {
        fill: var(--zh-card);
        stroke: var(--zh-part);
        stroke-width: 2.5;
        vector-effect: non-scaling-stroke;
      }
      .portal path {
        fill: none;
        stroke: var(--zh-part);
        stroke-width: 2.5;
        vector-effect: non-scaling-stroke;
        stroke-linecap: round;
      }
      .portal text,
      .dev-label {
        font-size: 0.2px;
        fill: var(--zh-text);
        paint-order: stroke;
        stroke: var(--zh-card);
        stroke-width: 0.05px;
        pointer-events: none;
      }
      .portal text {
        fill: var(--zh-part);
        font-weight: 600;
      }
      .node .shape {
        stroke-width: 2;
        vector-effect: non-scaling-stroke;
      }
      .node.auto-place .shape {
        stroke-dasharray: none;
      }
      .node.dsel .shape {
        stroke: var(--primary-color, #03a9f4);
        stroke-width: 3.5;
      }
      .devices-mode .node {
        cursor: grab;
      }
      .panel {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
        padding: 10px 12px;
        border-radius: 10px;
        background: var(--zh-surface);
        font-size: 13px;
      }
      .panel b {
        margin-right: 4px;
      }
      .panel label {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        color: var(--zh-muted);
      }
      .panel input[type="text"],
      .panel input[type="number"],
      .panel select {
        font: inherit;
        font-size: 13px;
        padding: 5px 8px;
        border-radius: 8px;
        border: 1px solid var(--zh-line);
        background: var(--zh-card);
        color: var(--zh-text);
      }
      .panel input[type="number"] {
        width: 76px;
      }
      .panel input[type="text"] {
        width: 150px;
      }
      .panel .btn {
        margin-left: 0;
      }
      .hint {
        font-size: 12.5px;
        color: var(--zh-muted);
      }
      .start {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        gap: 10px;
        padding: 30px 20px;
        border: 2px dashed var(--zh-line);
        border-radius: 14px;
      }
      .start h3 {
        margin: 0;
        font-size: 19px;
        font-weight: 500;
      }
      .start p {
        margin: 0;
        color: var(--zh-muted);
        max-width: 52ch;
        font-size: 13.5px;
      }
      .start .row {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        justify-content: center;
      }
      .start .btn {
        margin-left: 0;
      }
      .linkbtn {
        border: none;
        background: none;
        color: var(--primary-color, #03a9f4);
        font: inherit;
        font-size: 13px;
        cursor: pointer;
        padding: 0;
      }
      .chips {
        max-height: 90px;
        overflow-y: auto;
      }
      .filebtn input {
        display: none;
      }
      .filebtn {
        cursor: pointer;
      }
      .err {
        color: var(--zh-bad);
        font-size: 13px;
      }
    `,
  ];

  connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener("keydown", this._onKey);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener("keydown", this._onKey);
  }

  protected firstUpdated(): void {
    void this._load();
  }

  protected updated(changed: PropertyValues): void {
    if (changed.has("_b") && this._b && !this._fitted) {
      this._fit();
      this._fitted = true;
    }
  }

  private get _admin(): boolean {
    return this.hass?.user?.is_admin ?? true;
  }

  private _msg(type: string, extra: Record<string, unknown> = {}): Record<string, unknown> {
    const message: Record<string, unknown> = { type: `zigbee_health/building/${type}`, ...extra };
    if (this.configEntryId) message.config_entry_id = this.configEntryId;
    return message;
  }

  private async _load(): Promise<void> {
    if (!this.hass) return;
    try {
      const result = await this.hass.callWS<{
        building: Building | null;
        images?: Record<string, string>;
      }>(this._msg("get"));
      const building = result.building;
      if (building) restack(building.floors);
      this._images = result.images ?? {};
      for (const floor of building?.floors ?? []) await this._measureBackground(floor);
      this._b = building;
      this._floor = this._sortedFloors[0]?.id;
    } catch (err) {
      this._b = null;
      this._error = String((err as { message?: string })?.message ?? err);
    }
  }

  private async _measureBackground(floor: BFloor): Promise<void> {
    const image = this._images[floor.id];
    if (!image || this._bgAspect[floor.id]) return;
    await new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => {
        this._bgAspect[floor.id] = img.naturalHeight / (img.naturalWidth || 1);
        resolve();
      };
      img.onerror = () => resolve();
      img.src = image;
    });
  }

  // --- state helpers ------------------------------------------------------------------

  private get _sortedFloors(): BFloor[] {
    return [...(this._b?.floors ?? [])].sort((a, b) => a.elevation - b.elevation);
  }

  private get _current(): BFloor | undefined {
    return this._b?.floors.find((f) => f.id === this._floor);
  }

  private get _haFloors(): Floor[] {
    return this.report?.topology?.floors ?? [];
  }

  private get _areas(): { area_id: string; name: string; floor_id: string | null }[] {
    return this.report?.topology?.areas ?? [];
  }

  private get _nodes(): Map<string, TopologyNode> {
    return new Map((this.report?.topology?.nodes ?? []).map((n) => [n.ieee, n]));
  }

  private get _placed(): Map<string, Placed> {
    const key = [this._b, this.report?.topology];
    if (this._placedCache && this._placedCache.key[0] === key[0] && this._placedCache.key[1] === key[1]) {
      return this._placedCache.value;
    }
    const value = this._b
      ? placeDevices(this._b, this.report?.topology?.nodes ?? [])
      : new Map<string, Placed>();
    this._placedCache = { key, value };
    return value;
  }

  private _keyOf(ieee: string): string {
    return ieee === this.report?.topology?.coordinator?.ieee ? COORDINATOR_KEY : ieee;
  }

  private _at(ieee: string): Placed | undefined {
    return this._placed.get(this._keyOf(ieee));
  }

  /** Apply a change with undo and delayed save. */
  private _change(mutate: (b: Building) => void): void {
    if (!this._b) return;
    this._undo.push(clone(this._b));
    if (this._undo.length > MAX_UNDO) this._undo.shift();
    const next = clone(this._b);
    mutate(next);
    restack(next.floors);
    this._b = next;
    this._scheduleSave();
  }

  /** Change during a drag: no undo entry per mouse move. */
  private _live(mutate: (b: Building) => void): void {
    if (!this._b) return;
    const next = clone(this._b);
    mutate(next);
    this._b = next;
    this._scheduleSave();
  }

  private _scheduleSave(): void {
    window.clearTimeout(this._saveTimer);
    this._saveTimer = window.setTimeout(() => {
      if (!this._b || !this.hass) return;
      this.hass.callWS(this._msg("save", { building: this._b })).catch((err: unknown) => {
        this._error = String((err as { message?: string })?.message ?? err);
      });
    }, SAVE_DELAY_MS);
  }

  private _undoLast(): void {
    const previous = this._undo.pop();
    if (!previous) return;
    this._b = previous;
    this._room = undefined;
    this._vertex = undefined;
    this._scheduleSave();
  }

  private _onKey = (ev: KeyboardEvent): void => {
    if (!this._edit) return;
    const target = ev.composedPath()[0] as HTMLElement | undefined;
    if (target && ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName)) return;
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "z") {
      ev.preventDefault();
      this._undoLast();
    } else if (ev.key === "Escape") {
      this._draft = [];
      this._rectStart = undefined;
      this._room = undefined;
      this._vertex = undefined;
    } else if (ev.key === "Enter" && this._tool === "poly") {
      this._closePolygon();
    } else if ((ev.key === "Delete" || ev.key === "Backspace") && this._room) {
      this._deleteRoom();
    }
  };

  // --- geometry of the view -----------------------------------------------------------

  private _fit(): void {
    const box = bounds(this._b?.floors ?? []);
    if (!box) {
      this._vb = { x: -1, y: -1, w: 14, h: 10 };
      return;
    }
    const pad = Math.max(1, Math.max(box.w, box.h) * 0.08);
    this._vb = { x: box.x - pad, y: box.y - pad, w: box.w + 2 * pad, h: box.h + 2 * pad };
  }

  private _svg(): SVGSVGElement | null {
    return this.renderRoot.querySelector(".canvas svg");
  }

  private _toM(ev: MouseEvent): Vec | null {
    const el = this._svg();
    const matrix = el?.getScreenCTM();
    if (!matrix) return null;
    const p = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(matrix.inverse());
    return [p.x, p.y];
  }

  private _pxToM(): number {
    const matrix = this._svg()?.getScreenCTM();
    return matrix ? 1 / matrix.a : 0.02;
  }

  private _snap(point: Vec, exclude?: { room: string; vertex?: number }): Vec {
    const vertices: Vec[] = [];
    for (const floor of this._b?.floors ?? []) {
      if (floor.id !== this._floor && floor.id !== this._below?.id) continue;
      for (const room of floor.rooms) {
        room.points.forEach((p, i) => {
          if (exclude && room.id === exclude.room && (exclude.vertex === undefined || exclude.vertex === i)) return;
          vertices.push(p);
        });
      }
    }
    vertices.push(...this._draft);
    return snap(point, vertices, SNAP_PX * this._pxToM(), GRID);
  }

  private get _below(): BFloor | undefined {
    const floors = this._sortedFloors;
    const index = floors.findIndex((f) => f.id === this._floor);
    return index > 0 ? floors[index - 1] : undefined;
  }

  // --- editing actions ----------------------------------------------------------------

  private _startBuilding(): void {
    const ha = [...this._haFloors].sort((a, b) => (a.level ?? 0) - (b.level ?? 0))[0];
    const floor: BFloor = {
      id: uid("floor"),
      name: ha?.name ?? this.t("draw.floor_name", { n: 1 }),
      floor_id: ha?.floor_id ?? null,
      elevation: 0,
      height: DEFAULT_HEIGHT,
      rooms: [],
      background: null,
    };
    this._b = { floors: [floor], positions: {} };
    this._undo = [];
    this._floor = floor.id;
    this._edit = true;
    this._tool = "rect";
    this._fit();
    this._scheduleSave();
  }

  private _addFloor(): void {
    const floors = this._sortedFloors;
    const top = floors[floors.length - 1];
    const used = new Set(floors.map((f) => f.floor_id));
    const ha = [...this._haFloors]
      .sort((a, b) => (a.level ?? 0) - (b.level ?? 0))
      .find((f) => !used.has(f.floor_id));
    const floor: BFloor = {
      id: uid("floor"),
      name: ha?.name ?? this.t("draw.floor_name", { n: floors.length + 1 }),
      floor_id: ha?.floor_id ?? null,
      elevation: top ? top.elevation + top.height : 0,
      height: DEFAULT_HEIGHT,
      rooms: [],
      background: null,
    };
    this._change((b) => b.floors.push(floor));
    this._floor = floor.id;
    this._tool = "rect";
    this._room = undefined;
  }

  private _addRoom(points: Vec[]): void {
    const floorId = this._floor;
    if (!floorId) return;
    const n = (this._current?.rooms.length ?? 0) + 1;
    const room: BRoom = { id: uid("room"), name: this.t("draw.room_name", { n }), area_id: null, points };
    this._change((b) => b.floors.find((f) => f.id === floorId)?.rooms.push(room));
    this._room = room.id;
    this._vertex = undefined;
    this._tool = "select";
  }

  private _closePolygon(): void {
    if (this._draft.length >= 3) this._addRoom(this._draft);
    this._draft = [];
  }

  private _updateRoom(roomId: string, mutate: (room: BRoom) => void, live = false): void {
    const apply = (b: Building) => {
      const room = b.floors.flatMap((f) => f.rooms).find((r) => r.id === roomId);
      if (room) mutate(room);
    };
    if (live) this._live(apply);
    else this._change(apply);
  }

  private _deleteRoom(): void {
    const id = this._room;
    if (!id) return;
    this._change((b) => {
      for (const f of b.floors) f.rooms = f.rooms.filter((r) => r.id !== id);
    });
    this._room = undefined;
    this._vertex = undefined;
  }

  private _duplicateRoom(): void {
    const room = this._current?.rooms.find((r) => r.id === this._room);
    if (!room) return;
    this._addRoom(room.points.map(([x, y]) => [round(x + 0.5), round(y + 0.5)] as Vec));
  }

  private _setDevice(key: string, pos: Vec | null): void {
    const floorId = this._floor;
    const apply = (b: Building) => {
      if (pos && floorId) b.positions[key] = { floor: floorId, x: round(pos[0]), y: round(pos[1]) };
      else delete b.positions[key];
    };
    this._live(apply);
  }

  private async _uploadBackground(ev: Event): Promise<void> {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    const floorId = this._floor;
    if (!file || !floorId) return;
    const { url, aspect } = await fileToDataUrl(file);
    try {
      await this.hass?.callWS(this._msg("image", { floor: floorId, image: url }));
    } catch (err) {
      this._error = String((err as { message?: string })?.message ?? err);
      return;
    }
    this._bgAspect[floorId] = aspect;
    this._images = { ...this._images, [floorId]: url };
    const box = bounds(this._b?.floors ?? []);
    this._change((b) => {
      const floor = b.floors.find((f) => f.id === floorId);
      if (floor && !floor.background) {
        floor.background = { x: box?.x ?? 0, y: box?.y ?? 0, width: box ? Math.max(box.w, 8) : 12, opacity: 0.5 };
      }
    });
  }

  private _removeBackground(floorId: string): void {
    const { [floorId]: _removed, ...rest } = this._images;
    this._images = rest;
    this.hass?.callWS(this._msg("image", { floor: floorId, image: null })).catch(() => undefined);
    this._change((b) => {
      const floor = b.floors.find((f) => f.id === floorId);
      if (floor) floor.background = null;
    });
  }

  // --- pointer handling ---------------------------------------------------------------

  private _down(ev: PointerEvent): void {
    this._pointers.set(ev.pointerId, [ev.clientX, ev.clientY]);
    if (this._pointers.size === 2) {
      this._startPinch();
      return;
    }
    if (this._pointers.size > 2 || this._pinch) return;
    const p = this._toM(ev);
    if (!p) return;
    const target = ev.target as Element;
    const roomId = target.getAttribute("data-room");
    const vertex = target.getAttribute("data-vertex");
    const mid = target.getAttribute("data-mid");
    const deviceKey = target.closest("[data-device]")?.getAttribute("data-device") ?? null;

    if (this._edit && this._tool === "rect") {
      this._rectStart = this._snap(p);
      this._cursor = this._rectStart;
      return;
    }
    if (this._edit && this._tool === "poly") return; // handled on click
    if (this._edit && this._tool === "devices" && deviceKey) {
      this._device = deviceKey;
      this._drag = { kind: "device", key: deviceKey };
      (ev.target as Element).setPointerCapture?.(ev.pointerId);
      return;
    }
    if (this._edit && this._tool === "select") {
      if (vertex !== null && this._room) {
        this._vertex = Number(vertex);
        this._undo.push(clone(this._b as Building));
        this._drag = { kind: "vertex", start: p };
        return;
      }
      if (mid !== null && this._room) {
        const index = Number(mid);
        const point = this._snap(p);
        this._updateRoom(this._room, (room) => room.points.splice(index + 1, 0, point));
        this._vertex = index + 1;
        this._drag = { kind: "vertex", start: p };
        return;
      }
      if (roomId) {
        this._room = roomId;
        this._vertex = undefined;
        const room = this._current?.rooms.find((r) => r.id === roomId);
        if (room) {
          this._undo.push(clone(this._b as Building));
          this._drag = { kind: "room", start: p, points: room.points.map((q) => [...q] as Vec) };
        }
        return;
      }
      this._room = undefined;
      this._vertex = undefined;
    }
    this._drag = { kind: "pan", start: [ev.clientX, ev.clientY], vb: { ...this._vb } };
  }

  /** Second finger down: drop whatever the first one started and zoom/pan instead. */
  private _startPinch(): void {
    if (this._drag && (this._drag.kind === "vertex" || this._drag.kind === "room")) {
      const before = this._undo.pop();
      if (before) this._b = before;
    }
    this._drag = undefined;
    this._rectStart = undefined;
    const [a, b] = [...this._pointers.values()];
    this._pinch = { distance: distance(a, b) || 1, mid: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] };
  }

  private _pinchMove(): void {
    const pinch = this._pinch;
    const svgEl = this._svg();
    const matrix = svgEl?.getScreenCTM();
    if (!pinch || !matrix) return;
    const [a, b] = [...this._pointers.values()];
    const dist = distance(a, b) || 1;
    const mid: Vec = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const factor = Math.min(4, Math.max(0.25, pinch.distance / dist));
    const scale = 1 / matrix.a;
    const anchor = new DOMPoint(mid[0], mid[1]).matrixTransform(matrix.inverse());
    const vb = this._vb;
    this._vb = {
      x: anchor.x - (anchor.x - vb.x) * factor - (mid[0] - pinch.mid[0]) * scale,
      y: anchor.y - (anchor.y - vb.y) * factor - (mid[1] - pinch.mid[1]) * scale,
      w: vb.w * factor,
      h: vb.h * factor,
    };
    this._pinch = { distance: dist, mid };
  }

  private _release(ev: PointerEvent): void {
    this._pointers.delete(ev.pointerId);
    if (this._pinch) {
      if (this._pointers.size < 2) this._pinch = undefined;
      this._drag = undefined;
      return;
    }
    this._up();
  }

  private _move(ev: PointerEvent): void {
    if (this._pointers.has(ev.pointerId)) this._pointers.set(ev.pointerId, [ev.clientX, ev.clientY]);
    if (this._pinch) {
      if (this._pointers.size >= 2) this._pinchMove();
      return;
    }
    const p = this._toM(ev);
    if (!p) return;
    if (this._edit && (this._tool === "rect" || this._tool === "poly")) {
      this._cursor = this._snap(p);
    }
    const drag = this._drag;
    if (!drag) return;
    if (drag.kind === "pan") {
      const scale = this._pxToM();
      this._vb = {
        ...drag.vb,
        x: drag.vb.x - (ev.clientX - drag.start[0]) * scale,
        y: drag.vb.y - (ev.clientY - drag.start[1]) * scale,
      };
    } else if (drag.kind === "vertex" && this._room && this._vertex !== undefined) {
      const point = this._snap(p, { room: this._room, vertex: this._vertex });
      const index = this._vertex;
      this._updateRoom(this._room, (room) => (room.points[index] = point), true);
    } else if (drag.kind === "room" && this._room) {
      const dx = round(p[0] - drag.start[0], GRID);
      const dy = round(p[1] - drag.start[1], GRID);
      this._updateRoom(
        this._room,
        (room) => (room.points = drag.points.map(([x, y]) => [round(x + dx), round(y + dy)] as Vec)),
        true,
      );
    } else if (drag.kind === "device") {
      this._setDevice(drag.key, [round(p[0], GRID), round(p[1], GRID)]);
    }
  }

  private _up(): void {
    if (this._rectStart && this._cursor) {
      const [x0, y0] = this._rectStart;
      const [x1, y1] = this._cursor;
      if (Math.abs(x1 - x0) >= 0.3 && Math.abs(y1 - y0) >= 0.3) {
        const [ax, bx] = [Math.min(x0, x1), Math.max(x0, x1)];
        const [ay, by] = [Math.min(y0, y1), Math.max(y0, y1)];
        this._addRoom([
          [ax, ay],
          [bx, ay],
          [bx, by],
          [ax, by],
        ]);
      }
      this._rectStart = undefined;
    }
    this._drag = undefined;
  }

  private _click(ev: MouseEvent): void {
    if (!this._edit) return;
    const p = this._toM(ev);
    if (!p) return;
    if (this._tool === "poly") {
      const point = this._snap(p);
      if (this._draft.length >= 3 && distance(point, this._draft[0]) < SNAP_PX * this._pxToM()) {
        this._closePolygon();
      } else {
        this._draft = [...this._draft, point];
      }
    } else if (this._tool === "devices") {
      const target = ev.target as Element;
      if (!target.closest("[data-device]") && this._device && !this._at(this._device)) {
        this._setDevice(this._device, p);
      }
    }
  }

  private _wheel(ev: WheelEvent): void {
    ev.preventDefault();
    const p = this._toM(ev);
    if (!p) return;
    const factor = ev.deltaY > 0 ? 1.12 : 1 / 1.12;
    const vb = this._vb;
    this._vb = {
      x: p[0] - (p[0] - vb.x) * factor,
      y: p[1] - (p[1] - vb.y) * factor,
      w: vb.w * factor,
      h: vb.h * factor,
    };
  }

  // --- live traffic -------------------------------------------------------------------

  spark(ieee: string, delay: number): void {
    const layer = this.renderRoot.querySelector<SVGGElement>("g.traffic");
    if (!layer || !this.layout || !this._floor || this._legacy) return;
    const points: Vec[] = [];
    for (const id of routeToCoordinator(this.layout, ieee)) {
      const at = this._at(id);
      if (at && at.floor === this._floor) {
        points.push([at.x, at.y]);
        continue;
      }
      const last = points[points.length - 1];
      if (at && last) points.push(this._portalPoint(at.floor, last));
      break;
    }
    if (points.length < 2) return;
    let length = 0;
    for (let i = 1; i < points.length; i++) length += distance(points[i], points[i - 1]);
    const duration = Math.max(0.6, length / 5); // metres per second
    const ns = "http://www.w3.org/2000/svg";
    const dot = document.createElementNS(ns, "circle");
    dot.setAttribute("r", String(Math.max(0.09, this._vb.w / 160)));
    dot.setAttribute("class", "spark");
    const motion = document.createElementNS(ns, "animateMotion");
    motion.setAttribute("dur", `${duration}s`);
    motion.setAttribute("fill", "freeze");
    motion.setAttribute("begin", "indefinite");
    motion.setAttribute("path", `M${points.map((p) => `${p[0]},${p[1]}`).join(" L")}`);
    dot.appendChild(motion);
    window.setTimeout(() => {
      layer.appendChild(dot);
      (motion as SVGAnimationElement).beginElement();
      window.setTimeout(() => dot.remove(), duration * 1000 + 60);
    }, delay);
  }

  private _portalPoint(otherFloorId: string, from: Vec): Vec {
    const other = this._b?.floors.find((f) => f.id === otherFloorId);
    const up = (other?.elevation ?? 0) > (this._current?.elevation ?? 0);
    return [from[0] + 0.35, from[1] + (up ? -0.8 : 0.8)];
  }

  // --- render -------------------------------------------------------------------------

  protected render() {
    const t = this.t;
    if (this._legacy) {
      return html`<button class="linkbtn" @click=${() => (this._legacy = false)}>← ${t("draw.back")}</button>
        <zigbee-health-floor
          .hass=${this.hass}
          .report=${this.report}
          .layout=${this.layout}
          .heat=${this.heat}
          .alerts=${this.alerts}
          .plan=${this.plan}
          .t=${t}
          .live=${this.live}
          .configEntryId=${this.configEntryId}
        ></zigbee-health-floor>`;
    }
    if (this._b === undefined) return html`<div class="empty">${t("loading")}</div>`;
    if (!this._b || !this._b.floors.length) return this._renderStart();
    const floor = this._current ?? this._sortedFloors[0];
    return html`${this._renderBar(floor)} ${this._renderCanvas(floor)} ${this._renderPanels(floor)}
      ${this._error ? html`<div class="err">${this._error}</div>` : nothing}`;
  }

  private _renderStart() {
    const t = this.t;
    return html`<div class="start">
      <h3>${t("draw.start_title")}</h3>
      <p>${t("draw.start_text")}</p>
      <div class="row">
        ${this._admin
          ? html`<button class="btn" @click=${() => this._startBuilding()}>${t("draw.start")}</button>`
          : html`<p>${t("floor.admin_only")}</p>`}
      </div>
      <button class="linkbtn" @click=${() => (this._legacy = true)}>${t("draw.use_image")}</button>
    </div>`;
  }

  private _renderBar(floor: BFloor) {
    const t = this.t;
    const floors = [...this._sortedFloors].reverse();
    const tool = (id: Tool, label: string) =>
      html`<button
        class=${this._tool === id ? "on" : ""}
        @click=${() => {
          this._tool = id;
          this._draft = [];
          this._rectStart = undefined;
          if (id !== "select") this._vertex = undefined;
        }}
      >
        ${label}
      </button>`;
    return html`<div class="toolbar">
        ${floors.map(
          (f) => html`<button
            class="ftab ${f.id === floor.id ? "on" : ""}"
            @click=${() => {
              this._floor = f.id;
              this._room = undefined;
              this._vertex = undefined;
              this._draft = [];
              this._confirmDelete = false;
            }}
          >
            ${f.name}
          </button>`,
        )}
        ${this._edit ? html`<button class="ftab" @click=${() => this._addFloor()}>+ ${t("floor.add")}</button>` : nothing}
        <span class="spacer"></span>
        ${this._admin
          ? html`<button
              class="ftab edit ${this._edit ? "on" : ""}"
              @click=${() => {
                this._edit = !this._edit;
                this._tool = "select";
                this._draft = [];
                this._room = undefined;
                this._device = undefined;
              }}
            >
              ${this._edit ? t("floor.done") : t("floor.edit")}
            </button>`
          : nothing}
      </div>
      ${this._edit
        ? html`<div class="toolbar">
            <div class="tools">
              ${tool("select", t("draw.tool_select"))} ${tool("rect", t("draw.tool_rect"))}
              ${tool("poly", t("draw.tool_poly"))} ${tool("devices", t("draw.tool_devices"))}
            </div>
            <button class="ftab" ?disabled=${!this._undo.length} @click=${() => this._undoLast()}>
              ↶ ${t("draw.undo")}
            </button>
            <button class="ftab" @click=${() => this._fit()}>${t("draw.fit")}</button>
            <span class="hint">${t(`draw.help_${this._tool}`)}</span>
          </div>`
        : nothing}`;
  }

  private _renderCanvas(floor: BFloor) {
    const vb = this._vb;
    const drawing = this._edit && (this._tool === "rect" || this._tool === "poly");
    return html`<div class="canvas ${drawing ? "drawing" : ""}">
      <svg
        viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}"
        class="${this._edit ? "editing" : ""} ${this._tool === "devices" && this._edit ? "devices-mode" : ""} ${this.plan || this.marked ? "dim" : ""}"
        @pointerdown=${(ev: PointerEvent) => this._down(ev)}
        @pointermove=${(ev: PointerEvent) => this._move(ev)}
        @pointerup=${(ev: PointerEvent) => this._release(ev)}
        @pointercancel=${(ev: PointerEvent) => this._release(ev)}
        @pointerleave=${(ev: PointerEvent) => {
          this._release(ev);
          this._hover = undefined;
        }}
        @click=${(ev: MouseEvent) => this._click(ev)}
        @dblclick=${() => this._tool === "poly" && this._closePolygon()}
        @wheel=${(ev: WheelEvent) => this._wheel(ev)}
        @dragover=${(ev: DragEvent) => ev.preventDefault()}
        @drop=${(ev: DragEvent) => {
          ev.preventDefault();
          const key = ev.dataTransfer?.getData("text/plain");
          const p = this._toM(ev);
          if (key && p) this._setDevice(key, p);
        }}
      >
        ${this._edit ? this._renderGrid() : nothing}
        ${this._renderBackground(floor)}
        ${this._edit && this._below
          ? this._below.rooms.map(
              (r) => svg`<polygon class="ghost" points=${r.points.map((p) => p.join(",")).join(" ")}></polygon>`,
            )
          : nothing}
        ${floor.rooms.map((room) => this._renderRoom(room))}
        ${this._renderLinks(floor)}
        ${this._renderPlanOverlay(floor)}
        ${this._renderDevices(floor)}
        ${this._edit ? this._renderEditing(floor) : nothing}
        <g class="traffic"></g>
      </svg>
      ${this._renderTip()}
    </div>`;
  }

  private _renderGrid() {
    const v = this._vb;
    const vb = { x: v.x - v.w, y: v.y - v.h, w: v.w * 3, h: v.h * 3 };
    const minor: number[] = [];
    const major: number[] = [];
    const step = vb.w > 40 ? 1 : 0.5;
    for (let x = Math.floor(vb.x); x <= vb.x + vb.w; x += step) (x % 1 === 0 ? major : minor).push(x);
    const rows: number[] = [];
    const rowsMajor: number[] = [];
    for (let y = Math.floor(vb.y); y <= vb.y + vb.h; y += step) (y % 1 === 0 ? rowsMajor : rows).push(y);
    return svg`<g>
      ${minor.map((x) => svg`<line class="grid-minor" x1=${x} y1=${vb.y} x2=${x} y2=${vb.y + vb.h}></line>`)}
      ${rows.map((y) => svg`<line class="grid-minor" x1=${vb.x} y1=${y} x2=${vb.x + vb.w} y2=${y}></line>`)}
      ${major.map((x) => svg`<line class="grid-major" x1=${x} y1=${vb.y} x2=${x} y2=${vb.y + vb.h}></line>`)}
      ${rowsMajor.map((y) => svg`<line class="grid-major" x1=${vb.x} y1=${y} x2=${vb.x + vb.w} y2=${y}></line>`)}
    </g>`;
  }

  private _renderBackground(floor: BFloor) {
    const bg = floor.background;
    const image = this._images[floor.id];
    if (!bg || !image) return nothing;
    const aspect = this._bgAspect[floor.id] ?? 0.7;
    return svg`<image href=${image} x=${bg.x} y=${bg.y} width=${bg.width} height=${bg.width * aspect} opacity=${bg.opacity} preserveAspectRatio="none" style="pointer-events:none"></image>`;
  }

  private _renderRoom(room: BRoom) {
    const hue = roomHue(room);
    const [cx, cy] = centroid(room.points);
    const px = this._pxToM();
    const nameSize = Math.max(0.3, 13 * px);
    const subSize = Math.max(0.2, 10.5 * px);
    const areaName = this._areas.find((a) => a.area_id === room.area_id)?.name;
    const selected = this._edit && this._room === room.id;
    return svg`<g>
      <polygon
        class="zroom ${selected ? "sel" : ""} ${room.area_id && this.marked?.areas.includes(room.area_id) ? "focus" : ""}"
        data-room=${room.id}
        points=${room.points.map((p) => p.join(",")).join(" ")}
        style="fill:hsla(${hue},70%,60%,0.16);stroke:hsla(${hue},45%,45%,0.9)"
      ></polygon>
      <text class="room-name" x=${cx} y=${cy} text-anchor="middle" style="font-size:${nameSize}px;stroke-width:${nameSize / 5}px">${room.name}</text>
      ${this._edit && !room.area_id
        ? svg`<text class="room-area" x=${cx} y=${cy + nameSize} text-anchor="middle" style="font-size:${subSize}px">${this.t("draw.no_area")}</text>`
        : areaName && areaName !== room.name
          ? svg`<text class="room-area" x=${cx} y=${cy + nameSize} text-anchor="middle" style="font-size:${subSize}px">${areaName}</text>`
          : nothing}
    </g>`;
  }

  private _renderEditing(floor: BFloor) {
    const parts: unknown[] = [];
    const room = floor.rooms.find((r) => r.id === this._room);
    const px = this._pxToM();
    const r = px * 6;
    const dim = `font-size:${Math.max(0.22, 11 * px)}px;stroke-width:${Math.max(0.05, 3 * px)}px`;
    if (room && this._tool === "select") {
      const pts = room.points;
      pts.forEach((p, i) => {
        const q = pts[(i + 1) % pts.length];
        const mx = (p[0] + q[0]) / 2;
        const my = (p[1] + q[1]) / 2;
        const len = distance(p, q);
        // Label outside the room: push away from the centroid.
        const [cx, cy] = centroid(pts);
        const dx = mx - cx;
        const dy = my - cy;
        const n = Math.hypot(dx, dy) || 1;
        parts.push(
          svg`<text class="dim-label" style=${dim} x=${mx + (dx / n) * 0.28} y=${my + (dy / n) * 0.28 + 0.08} text-anchor="middle">${fmt(len)}</text>`,
          svg`<circle class="mid" data-mid=${i} cx=${mx} cy=${my} r=${r * 0.7}></circle>`,
        );
      });
      pts.forEach((p, i) =>
        parts.push(
          svg`<circle class="handle ${this._vertex === i ? "on" : ""}" data-vertex=${i} cx=${p[0]} cy=${p[1]} r=${r}></circle>`,
        ),
      );
    }
    if (this._rectStart && this._cursor) {
      const [x0, y0] = this._rectStart;
      const [x1, y1] = this._cursor;
      const x = Math.min(x0, x1);
      const y = Math.min(y0, y1);
      const w = Math.abs(x1 - x0);
      const h = Math.abs(y1 - y0);
      parts.push(
        svg`<rect class="draft" x=${x} y=${y} width=${w} height=${h}></rect>`,
        svg`<text class="dim-label" style=${dim} x=${x + w / 2} y=${y - 0.15} text-anchor="middle">${fmt(w)}</text>`,
        svg`<text class="dim-label" style=${dim} x=${x + w + 0.15} y=${y + h / 2} text-anchor="start">${fmt(h)}</text>`,
      );
    }
    if (this._tool === "poly" && this._draft.length) {
      const pts = this._cursor ? [...this._draft, this._cursor] : this._draft;
      parts.push(svg`<polyline class="draft" points=${pts.map((p) => p.join(",")).join(" ")}></polyline>`);
      if (this._cursor) {
        const last = this._draft[this._draft.length - 1];
        const len = distance(last, this._cursor);
        parts.push(
          svg`<text class="dim-label" style=${dim} x=${(last[0] + this._cursor[0]) / 2} y=${(last[1] + this._cursor[1]) / 2 - 0.12} text-anchor="middle">${fmt(len)}</text>`,
        );
      }
      this._draft.forEach((p) => parts.push(svg`<circle class="handle" cx=${p[0]} cy=${p[1]} r=${r * 0.8}></circle>`));
    }
    return parts;
  }

  private _renderLinks(floor: BFloor) {
    const topology = this.report?.topology;
    if (!topology) return nothing;
    const here = (id: string): Vec | null => {
      const at = this._at(id);
      return at && at.floor === floor.id ? [at.x, at.y] : null;
    };
    const lines: unknown[] = [];
    const portals = new Set<string>();
    const add = (a: string, b: string, lqi: number | null, kind: string) => {
      const pa = here(a);
      const pb = here(b);
      if (pa && pb) {
        lines.push(svg`<path class="edge ${kind} lqi-${lqiClass(lqi)}" d="M${pa[0]},${pa[1]} L${pb[0]},${pb[1]}"></path>`);
        return;
      }
      const from = pa ?? pb;
      const peer = pa ? b : a;
      const other = this._at(peer);
      if (!from || !other || other.floor === floor.id || portals.has(`${from}|${peer}`)) return;
      portals.add(`${from}|${peer}`);
      const at = this._portalPoint(other.floor, from);
      const otherFloor = this._b?.floors.find((f) => f.id === other.floor);
      const up = (otherFloor?.elevation ?? 0) > floor.elevation;
      const name = peer === topology.coordinator?.ieee ? this.t("coordinator") : (this._nodes.get(peer)?.name ?? peer);
      const s = Math.max(0.12, this._vb.w / 110);
      lines.push(
        svg`<path class="portal-stub lqi-${lqiClass(lqi)}" d="M${from[0]},${from[1]} L${at[0]},${at[1]}"></path>`,
        svg`<g class="portal" @click=${(ev: MouseEvent) => {
          ev.stopPropagation();
          this._floor = other.floor;
        }}>
          <circle cx=${at[0]} cy=${at[1]} r=${s}></circle>
          <path d=${up
            ? `M${at[0] - s * 0.5},${at[1] + s * 0.25} L${at[0]},${at[1] - s * 0.35} L${at[0] + s * 0.5},${at[1] + s * 0.25}`
            : `M${at[0] - s * 0.5},${at[1] - s * 0.25} L${at[0]},${at[1] + s * 0.35} L${at[0] + s * 0.5},${at[1] - s * 0.25}`}></path>
          <title>${otherFloor?.name ?? ""} · ${name}${lqi ? ` · LQI ${lqi}` : ""}</title>
        </g>`,
      );
    };
    for (const link of topology.links) add(link.a, link.b, link.lqi, "link");
    for (const node of topology.nodes) {
      if (node.type === "end_device" && node.parent && node.state !== "dead") {
        add(node.ieee, node.parent, node.parent_lqi, "parent");
      }
    }
    return lines;
  }

  private _renderDevices(floor: BFloor) {
    const topology = this.report?.topology;
    if (!topology) return nothing;
    const px = this._pxToM();
    const s = Math.max(0.16, Math.min(0.32, this._vb.w / 55), 9 * px);
    const labelSize = Math.max(s * 0.62, 10.5 * px);
    const hl = this.plan
      ? new Set(this.plan.improved.map((i) => i.ieee))
      : this.marked
        ? new Set(this.marked.ieees)
        : undefined;
    const out: unknown[] = [];
    const coordinator = topology.coordinator?.ieee;
    if (coordinator) {
      const at = this._at(coordinator);
      if (at && at.floor === floor.id) {
        out.push(svg`<g class="node coord ${this._device === COORDINATOR_KEY ? "dsel" : ""}" data-device=${COORDINATOR_KEY}>
          <circle class="shape" cx=${at.x} cy=${at.y} r=${s * 0.95}></circle>
          <path class="glyph" style="stroke-width:${s * 0.16}" d="M${at.x - s * 0.4},${at.y - s * 0.35} h${s * 0.8} l${-s * 0.8},${s * 0.7} h${s * 0.8}"></path>
        </g>`);
      }
    }
    for (const node of topology.nodes) {
      const at = this._at(node.ieee);
      if (!at || at.floor !== floor.id) continue;
      const router = node.type === "router";
      const size = router ? s * 1.25 : s * 0.9;
      const heat = this.live ? (this.heat[node.ieee] ?? 0) : 0;
      const alerted = this.alerts.some((a) => a.ieee === node.ieee);
      const kind = node.kind === "part_time" ? "part" : node.kind === "unclear" ? "unclear" : "";
      const stateClass = node.kind === "unclear" && node.state === "ok" ? "unclear" : node.state;
      const on = !hl || hl.has(node.ieee);
      out.push(svg`<g
        class="node ${kind} ${node.state} ${on && hl ? "hl" : ""} ${this._device === node.ieee ? "dsel" : ""}"
        data-device=${node.ieee}
        @mouseenter=${(ev: MouseEvent) => {
          if (this._edit) return;
          const box = (this.renderRoot.querySelector(".canvas") as HTMLElement).getBoundingClientRect();
          this._tip = { x: ev.clientX - box.left, y: ev.clientY - box.top };
          this._hover = node.ieee;
        }}
        @mouseleave=${() => (this._hover = undefined)}
        @click=${() => {
          if (this._edit) {
            this._device = node.ieee;
            return;
          }
          selectDevice(this, node.ieee);
        }}
      >
        ${heat > 0.05 ? svg`<circle class="heat" cx=${at.x} cy=${at.y} r=${size / 2 + s * (0.2 + heat * 0.4)} style="opacity:${0.12 + heat * 0.33}"></circle>` : nothing}
        ${alerted ? svg`<circle class="pulse alarm" cx=${at.x} cy=${at.y} r=${size / 2}></circle>` : nothing}
        ${router
          ? svg`<rect class="shape st-${stateClass}" x=${at.x - size / 2} y=${at.y - size / 2} width=${size} height=${size} rx=${size * 0.22}></rect>`
          : svg`<circle class="shape st-${stateClass}" cx=${at.x} cy=${at.y} r=${size / 2}></circle>`}
        ${router || px < 0.02
          ? svg`<text class="dev-label" x=${at.x} y=${at.y + size / 2 + labelSize * 1.1} text-anchor="middle" style="font-size:${labelSize}px">${node.name}</text>`
          : nothing}
      </g>`);
    }
    return out;
  }

  private _renderPlanOverlay(floor: BFloor) {
    const plan = this.plan;
    if (!plan) return nothing;
    const points = plan.improved
      .map((i) => this._at(i.ieee))
      .filter((p): p is Placed => !!p && p.floor === floor.id);
    if (!points.length) return nothing;
    const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
    const cy = points.reduce((s, p) => s + p.y, 0) / points.length;
    const s = Math.max(0.2, this._vb.w / 45);
    return svg`<g class="plan-layer">
      ${points.map((p) => svg`<path class="planned-edge" d="M${p.x},${p.y} L${cx},${cy}"></path>`)}
      <rect class="virtual" x=${cx - s / 2} y=${cy - s / 2} width=${s} height=${s} rx=${s * 0.25} style="stroke-width:${s * 0.1}"></rect>
      <path class="virtual-plus" style="stroke-width:${s * 0.12}" d="M${cx - s * 0.22},${cy} h${s * 0.44} M${cx},${cy - s * 0.22} v${s * 0.44}"></path>
      <text class="dev-label plan-label" x=${cx} y=${cy + s * 1.1} text-anchor="middle" style="font-size:${s * 0.45}px">${this.t("plan.virtual", { room: plan.area_name })}</text>
    </g>`;
  }

  private _renderTip() {
    if (!this._hover || this._edit) return nothing;
    const node = this._nodes.get(this._hover);
    if (!node) return nothing;
    const t = this.t;
    const coordinator = this.report?.topology?.coordinator?.ieee;
    const parent = node.parent === coordinator ? t("coordinator") : this._nodes.get(node.parent ?? "")?.name;
    return html`<div class="tip" style="left:${this._tip.x}px;top:${this._tip.y}px">
      <b>${node.name}</b>
      <div class="k">${node.type === "router" ? t(`kind.${node.kind ?? "always_on"}`) : t("end_device")}${node.area ? ` · ${node.area}` : ""}</div>
      <span class="pill">${t(`state.${node.state}`)}</span>
      ${parent
        ? html`<div class="row"><span class="k">${t("parent")}</span><span>${parent}${node.parent_lqi ? ` · LQI ${node.parent_lqi}` : ""}</span></div>`
        : nothing}
    </div>`;
  }

  // --- panels below the canvas --------------------------------------------------------

  private _renderPanels(floor: BFloor) {
    const t = this.t;
    if (!this._edit) {
      const unplaced = this._unplaced().length;
      const noArea = this._b?.floors.flatMap((f) => f.rooms).filter((r) => !r.area_id).length ?? 0;
      return html`<div class="hint">
        ${noArea ? t("draw.hint_link", { n: noArea }) : nothing}
        ${unplaced && this._admin ? t("draw.hint_unplaced", { n: unplaced }) : nothing}
      </div>`;
    }
    const room = floor.rooms.find((r) => r.id === this._room);
    return html`${this._tool === "devices" ? this._renderDevicePanel() : nothing}
      ${room && this._tool === "select" ? this._renderRoomPanel(room) : nothing}
      ${this._renderFloorPanel(floor)}`;
  }

  private _renderRoomPanel(room: BRoom) {
    const t = this.t;
    const rect = rectOf(room.points);
    const used = new Set(
      (this._b?.floors ?? []).flatMap((f) => f.rooms).filter((r) => r.id !== room.id).map((r) => r.area_id),
    );
    const setRect = (w: number, h: number) => {
      if (!rect || !(w > 0.2) || !(h > 0.2)) return;
      this._updateRoom(room.id, (r) => {
        r.points = [
          [rect.x, rect.y],
          [round(rect.x + w), rect.y],
          [round(rect.x + w), round(rect.y + h)],
          [rect.x, round(rect.y + h)],
        ];
      });
    };
    return html`<div class="panel">
      <b>${t("draw.room")}</b>
      <label
        >${t("draw.name")}
        <input
          id="zh-room-name"
          type="text"
          .value=${room.name}
          @change=${(ev: Event) => {
            const name = (ev.target as HTMLInputElement).value.trim();
            if (name) this._updateRoom(room.id, (r) => (r.name = name));
          }}
      /></label>
      <label
        >${t("draw.area")}
        <select
          id="zh-room-area"
          @change=${(ev: Event) => {
            const id = (ev.target as HTMLSelectElement).value || null;
            const areaName = this._areas.find((a) => a.area_id === id)?.name;
            this._updateRoom(room.id, (r) => {
              const generic = /^(Raum|Room) \d+$/.test(r.name);
              r.area_id = id;
              if (areaName && generic) r.name = areaName;
            });
          }}
        >
          <option value="" ?selected=${!room.area_id}>${t("draw.no_area_option")}</option>
          ${this._areas.map(
            (a) => html`<option value=${a.area_id} ?selected=${room.area_id === a.area_id}>
              ${a.name}${used.has(a.area_id) ? " ✓" : ""}
            </option>`,
          )}
        </select></label
      >
      ${rect
        ? html`<label
              >${t("draw.width")}
              <input
                id="zh-room-w"
                type="number"
                step="0.01"
                min="0.3"
                .value=${rect.w.toFixed(2)}
                @change=${(ev: Event) => setRect(Number((ev.target as HTMLInputElement).value), rect.h)}
              />m</label
            >
            <label
              >${t("draw.depth")}
              <input
                id="zh-room-h"
                type="number"
                step="0.01"
                min="0.3"
                .value=${rect.h.toFixed(2)}
                @change=${(ev: Event) => setRect(rect.w, Number((ev.target as HTMLInputElement).value))}
              />m</label
            >`
        : html`<span class="hint">${t("draw.area_size", { m: Math.abs(this._area(room)).toFixed(1).replace(".", ",") })}</span>`}
      ${this._vertex !== undefined && room.points.length > 3
        ? html`<button
            class="btn ghost"
            @click=${() => {
              const index = this._vertex as number;
              this._updateRoom(room.id, (r) => r.points.splice(index, 1));
              this._vertex = undefined;
            }}
          >
            ${t("draw.delete_point")}
          </button>`
        : nothing}
      <button class="btn ghost" @click=${() => this._duplicateRoom()}>${t("draw.duplicate")}</button>
      <button class="btn ghost" @click=${() => this._deleteRoom()}>${t("draw.delete_room")}</button>
    </div>`;
  }

  private _area(room: BRoom): number {
    let sum = 0;
    const p = room.points;
    for (let i = 0; i < p.length; i++) {
      const q = p[(i + 1) % p.length];
      sum += p[i][0] * q[1] - q[0] * p[i][1];
    }
    return sum / 2;
  }

  private _unplaced(): { key: string; name: string }[] {
    const topology = this.report?.topology;
    if (!topology) return [];
    const placed = this._placed;
    const list = topology.nodes
      .filter((n) => !placed.has(n.ieee))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
      .map((n) => ({ key: n.ieee, name: n.name }));
    if (topology.coordinator && !placed.has(COORDINATOR_KEY)) {
      list.unshift({ key: COORDINATOR_KEY, name: this.t("coordinator") });
    }
    return list;
  }

  private _renderDevicePanel() {
    const t = this.t;
    const unplaced = this._unplaced();
    const key = this._device;
    const at = key ? this._placed.get(key) : undefined;
    const name =
      key === COORDINATOR_KEY ? t("coordinator") : key ? this._nodes.get(key)?.name : undefined;
    return html`<div class="panel">
      ${key && name
        ? html`<b>${name}</b>
            ${at
              ? html`<span class="hint">${at.auto ? t("draw.auto_placed") : t("draw.manual_placed")}</span>
                  ${!at.auto
                    ? html`<button class="btn ghost" @click=${() => this._setDevice(key, null)}>
                        ${t("draw.auto_again")}
                      </button>`
                    : nothing}`
              : html`<span class="hint">${t("draw.click_to_place")}</span>`}`
        : html`<span class="hint">${t("draw.devices_help")}</span>`}
      ${unplaced.length
        ? html`<div style="flex-basis:100%">
            <div class="hint">${t("floor.unplaced", { n: unplaced.length })}</div>
            <div class="chips">
              ${unplaced.map(
                (u) => html`<button
                  class="chip ${this._device === u.key ? "on" : ""}"
                  draggable="true"
                  @dragstart=${(ev: DragEvent) => ev.dataTransfer?.setData("text/plain", u.key)}
                  @click=${() => (this._device = u.key)}
                >
                  ${u.name}
                </button>`,
              )}
            </div>
          </div>`
        : nothing}
    </div>`;
  }

  private _renderFloorPanel(floor: BFloor) {
    const t = this.t;
    const setFloor = (mutate: (f: BFloor) => void) =>
      this._change((b) => {
        const f = b.floors.find((x) => x.id === floor.id);
        if (f) mutate(f);
      });
    return html`<div class="panel">
      <b>${t("draw.floor")}</b>
      <label
        >${t("draw.name")}
        <input
          id="zh-floor-name"
          type="text"
          .value=${floor.name}
          @change=${(ev: Event) => {
            const name = (ev.target as HTMLInputElement).value.trim();
            if (name) setFloor((f) => (f.name = name));
          }}
      /></label>
      ${this._haFloors.length
        ? html`<label
            >${t("draw.ha_floor")}
            <select
              id="zh-floor-ha"
              @change=${(ev: Event) => {
                const id = (ev.target as HTMLSelectElement).value || null;
                const ha = this._haFloors.find((f) => f.floor_id === id);
                setFloor((f) => {
                  f.floor_id = id;
                  if (ha) f.name = ha.name;
                });
              }}
            >
              <option value="" ?selected=${!floor.floor_id}>–</option>
              ${this._haFloors.map(
                (f) => html`<option value=${f.floor_id} ?selected=${floor.floor_id === f.floor_id}>${f.name}</option>`,
              )}
            </select></label
          >`
        : nothing}
      <label
        >${t("draw.height")}
        <input
          id="zh-floor-height"
          type="number"
          step="0.05"
          min="1"
          max="10"
          .value=${floor.height.toFixed(2)}
          @change=${(ev: Event) => {
            const height = Number((ev.target as HTMLInputElement).value);
            if (height >= 1 && height <= 10) setFloor((f) => (f.height = height));
          }}
        />m</label
      >
      <label class="ftab filebtn"
        >${this._images[floor.id] ? t("draw.bg_replace") : t("draw.bg_add")}
        <input type="file" accept="image/*" @change=${(ev: Event) => this._uploadBackground(ev)}
      /></label>
      ${floor.background && this._images[floor.id]
        ? html`<label
              >${t("draw.bg_width")}
              <input
                id="zh-bg-width"
                type="number"
                step="0.1"
                min="0.5"
                .value=${floor.background.width.toFixed(1)}
                @change=${(ev: Event) => {
                  const width = Number((ev.target as HTMLInputElement).value);
                  if (width >= 0.5) setFloor((f) => f.background && (f.background.width = width));
                }}
              />m</label
            >
            <label
              >${t("draw.bg_opacity")}
              <input
                id="zh-bg-opacity"
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                .value=${String(floor.background.opacity)}
                @change=${(ev: Event) => {
                  const opacity = Number((ev.target as HTMLInputElement).value);
                  setFloor((f) => f.background && (f.background.opacity = opacity));
                }}
            /></label>
            <button class="btn ghost" @click=${() => this._removeBackground(floor.id)}>
              ${t("draw.bg_remove")}
            </button>`
        : nothing}
      <button
        class="btn ghost"
        @click=${() => {
          if (!this._confirmDelete) {
            this._confirmDelete = true;
            return;
          }
          this._confirmDelete = false;
          // The server drops the floor's background image with the next save.
          const { [floor.id]: _removed, ...images } = this._images;
          this._images = images;
          this._change((b) => {
            b.floors = b.floors.filter((f) => f.id !== floor.id);
            for (const [key, pos] of Object.entries(b.positions)) {
              if (pos.floor === floor.id) delete b.positions[key];
            }
          });
          this._floor = this._sortedFloors[0]?.id;
        }}
      >
        ${this._confirmDelete ? t("floor.confirm_delete") : t("floor.delete")}
      </button>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zigbee-health-building": ZigbeeHealthBuilding;
  }
}
