/**
 * Floor plan view: the user's own floor plans with devices placed on them.
 *
 * - One plan per storey, optionally linked to a Home Assistant floor.
 * - Radio links, live traffic, glow, alerts and the router planner on the plan.
 * - Links to another storey end in a stair marker (↑/↓ with the peer's storey and name).
 * - Building view: all storeys as an exploded isometric stack, links between storeys run
 *   vertically through the ceilings and live traffic travels from storey to storey.
 */

import { LitElement, type PropertyValues, css, html, nothing, svg } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import { type Layout, lqiClass, routeToCoordinator } from "./layout";
import type { Translate } from "./i18n";
import { styles } from "./styles";
import type { Alert, Floor, HomeAssistant, Plan, Report, TopologyNode } from "./types";

export interface FloorPlan {
  plan_id: string;
  name: string;
  image: string;
  positions: Record<string, [number, number]>;
  floor_id?: string | null;
  level?: number | null;
}

interface Point {
  x: number;
  y: number;
}

interface EdgeData {
  from: string;
  to: string;
  lqi: number | null;
  kind: "parent" | "link";
}

const MAX_IMAGE_SIDE = 1800;
const SAVE_DELAY_MS = 500;
const COORDINATOR_KEY = "coordinator";
// Building view: every storey is scaled to this width, then projected isometrically.
const ISO_WIDTH = 1000;
const ISO_SPACING = 560;
const COS30 = Math.cos(Math.PI / 6);

function navigate(path: string): void {
  history.pushState(null, "", path);
  window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: false } }));
}

/** Downscale an image file to a JPEG data URL (keeps the stored plan small). */
async function fileToDataUrl(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("image"));
      image.src = url;
    });
    const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.86);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function imageSize(dataUrl: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve({ w: image.naturalWidth || 1600, h: image.naturalHeight || 1000 });
    image.onerror = () => resolve({ w: 1600, h: 1000 });
    image.src = dataUrl;
  });
}

@customElement("zigbee-health-floor")
export class ZigbeeHealthFloor extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @property({ attribute: false }) report?: Report;
  @property({ attribute: false }) layout?: Layout;
  @property({ attribute: false }) heat: Record<string, number> = {};
  @property({ attribute: false }) alerts: Alert[] = [];
  @property({ attribute: false }) plan?: Plan;
  @property({ attribute: false }) t: Translate = (key) => key;
  @property({ attribute: false }) configEntryId?: string;
  @property({ attribute: false }) live = true;

  @state() private _plans?: FloorPlan[];
  @state() private _active?: string;
  @state() private _building = false;
  @state() private _edit = false;
  @state() private _placing?: string;
  @state() private _selected?: string;
  @state() private _drag?: string;
  @state() private _hover?: string;
  @state() private _busy = false;
  @state() private _error?: string;
  @state() private _confirmDelete = false;
  @state() private _allFloors = false;
  private _sizes: Record<string, { w: number; h: number }> = {};
  private _tip = { x: 0, y: 0 };
  private _saveTimer?: number;

  static styles = [
    styles,
    css`
      :host {
        display: flex;
        flex-direction: column;
        gap: 10px;
        min-height: 0;
        flex: 1;
      }
      .fbar {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 6px;
      }
      .fbar .spacer {
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
      }
      .ftab.on {
        background: var(--primary-color, #03a9f4);
        border-color: transparent;
        color: var(--text-primary-color, #fff);
      }
      .ftab.edit.on {
        background: var(--zh-ok);
      }
      .ftab.building {
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .ftab.building svg {
        width: 16px;
        height: 16px;
      }
      .nameinput,
      .floorselect {
        font: inherit;
        font-size: 13px;
        padding: 5px 10px;
        border-radius: 999px;
        border: 1px solid var(--zh-line);
        background: var(--zh-surface);
        color: var(--zh-text);
      }
      .nameinput {
        width: 130px;
      }
      .floorbox {
        position: relative;
        flex: 1;
        min-height: 260px;
        border-radius: 10px;
        overflow: hidden;
        background: var(--zh-surface);
      }
      .floorbox svg {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        touch-action: none;
      }
      .floorbox.placing svg {
        cursor: crosshair;
      }
      .plan-img {
        opacity: 0.92;
      }
      .iso .plan-img {
        opacity: 0.62;
      }
      .plane {
        fill: none;
        stroke: var(--zh-muted);
        stroke-width: 2;
        vector-effect: non-scaling-stroke;
        opacity: 0.6;
      }
      .plane-label {
        font-size: 30px;
        font-weight: 600;
        fill: var(--zh-text);
        paint-order: stroke;
        stroke: var(--zh-card);
        stroke-width: 6px;
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
      .edge.cross {
        stroke-width: 3;
        stroke-dasharray: 6 5;
        opacity: 0.95;
      }
      .planned-edge {
        vector-effect: non-scaling-stroke;
      }
      .portal {
        cursor: pointer;
      }
      .portal circle {
        fill: var(--zh-card);
        stroke: var(--zh-part);
        stroke-width: 2.5;
      }
      .portal path.arrow {
        fill: none;
        stroke: var(--zh-part);
        stroke-width: 3;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      .portal-stub {
        fill: none;
        stroke-width: 2.4;
        stroke-dasharray: 5 5;
        vector-effect: non-scaling-stroke;
      }
      .portal .label {
        fill: var(--zh-part);
        font-weight: 600;
      }
      .node.edit {
        cursor: grab;
      }
      .node.drag {
        cursor: grabbing;
      }
      .node.selected .shape {
        stroke: var(--primary-color, #03a9f4);
        stroke-width: 3.5;
      }
      .upload {
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
      .upload h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 500;
      }
      .upload p {
        margin: 0;
        color: var(--zh-muted);
        max-width: 50ch;
        font-size: 13.5px;
      }
      .filebtn input {
        display: none;
      }
      .filebtn {
        display: inline-block;
        cursor: pointer;
      }
      .unplaced h4 {
        margin: 0 0 6px;
        font-size: 13px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .unplaced h4 label {
        font-weight: 400;
        color: var(--zh-muted);
        display: inline-flex;
        gap: 5px;
        align-items: center;
      }
      .unplaced .chip.on {
        border-color: var(--primary-color, #03a9f4);
        background: color-mix(in srgb, var(--primary-color, #03a9f4) 14%, transparent);
      }
      .unplaced .chip.other {
        opacity: 0.6;
      }
      .unplaced .chips {
        max-height: 96px;
        overflow-y: auto;
      }
      .hint {
        font-size: 12.5px;
        color: var(--zh-muted);
      }
      .selbar {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
      }
      .selbar .btn {
        margin-left: 0;
      }
      .err {
        color: var(--zh-bad);
        font-size: 13px;
      }
    `,
  ];

  protected firstUpdated(): void {
    void this._load();
  }

  protected updated(changed: PropertyValues): void {
    if (changed.has("configEntryId") && changed.get("configEntryId") !== undefined) {
      void this._load();
    }
  }

  private get _admin(): boolean {
    return this.hass?.user?.is_admin ?? true;
  }

  private get _floors(): Floor[] {
    return this.report?.topology?.floors ?? [];
  }

  private _message(type: string, extra: Record<string, unknown> = {}): Record<string, unknown> {
    const message: Record<string, unknown> = { type: `zigbee_health/floorplan/${type}`, ...extra };
    if (this.configEntryId) message.config_entry_id = this.configEntryId;
    return message;
  }

  private async _load(): Promise<void> {
    if (!this.hass) return;
    try {
      const result = await this.hass.callWS<{ plans: FloorPlan[] }>(this._message("list"));
      for (const plan of result.plans) this._sizes[plan.plan_id] = await imageSize(plan.image);
      this._plans = result.plans;
      if (!this._active || !result.plans.some((p) => p.plan_id === this._active)) {
        this._active = this._sorted[0]?.plan_id;
      }
    } catch (err) {
      this._plans = [];
      this._error = String((err as { message?: string })?.message ?? err);
    }
  }

  // --- storeys ------------------------------------------------------------------------

  /** Storey order: explicit level, else the HA floor's level, else upload order. */
  private _level(plan: FloorPlan): number {
    if (typeof plan.level === "number") return plan.level;
    const floor = this._floors.find((f) => f.floor_id === plan.floor_id);
    if (floor && typeof floor.level === "number") return floor.level;
    return (this._plans ?? []).indexOf(plan);
  }

  private get _sorted(): FloorPlan[] {
    return [...(this._plans ?? [])].sort((a, b) => this._level(a) - this._level(b));
  }

  private get _current(): FloorPlan | undefined {
    return this._plans?.find((p) => p.plan_id === this._active);
  }

  private _key(ieee: string): string {
    return ieee === this.report?.topology?.coordinator?.ieee ? COORDINATOR_KEY : ieee;
  }

  private _planOf(ieee: string): FloorPlan | undefined {
    const key = this._key(ieee);
    return this._plans?.find((p) => key in p.positions);
  }

  private _posOn(plan: FloorPlan, ieee: string): Point | null {
    const size = this._sizes[plan.plan_id];
    const pos = plan.positions[this._key(ieee)];
    if (!size || !pos) return null;
    return { x: pos[0] * size.w, y: pos[1] * size.h };
  }

  private _pos(ieee: string): Point | null {
    const plan = this._current;
    return plan ? this._posOn(plan, ieee) : null;
  }

  /** Building view: isometric projection of a device on its storey. */
  private _iso(ieee: string): Point | null {
    const plan = this._planOf(ieee);
    if (!plan) return null;
    const size = this._sizes[plan.plan_id];
    const pos = plan.positions[this._key(ieee)];
    if (!size || !pos) return null;
    const height = (ISO_WIDTH * size.h) / size.w;
    const x = pos[0] * ISO_WIDTH - ISO_WIDTH / 2;
    const y = pos[1] * height - height / 2;
    const index = this._sorted.indexOf(plan);
    return { x: (x - y) * COS30, y: (x + y) * 0.5 - index * ISO_SPACING };
  }

  private _nextFreeFloor(): Floor | undefined {
    const used = new Set((this._plans ?? []).map((p) => p.floor_id));
    return [...this._floors]
      .sort((a, b) => (a.level ?? 0) - (b.level ?? 0))
      .find((f) => !used.has(f.floor_id));
  }

  // --- editing ------------------------------------------------------------------------

  private async _upload(ev: Event, replaceId?: string): Promise<void> {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (!file || !this.hass) return;
    this._busy = true;
    this._error = undefined;
    try {
      const image = await fileToDataUrl(file);
      const planId = replaceId ?? `plan_${Date.now().toString(36)}`;
      const extra: Record<string, unknown> = {};
      if (!replaceId) {
        const floor = this._nextFreeFloor();
        extra.name = floor?.name ?? this.t("floor.default_name", { n: (this._plans?.length ?? 0) + 1 });
        if (floor) {
          extra.floor_id = floor.floor_id;
          if (typeof floor.level === "number") extra.level = floor.level;
        }
      }
      const result = await this.hass.callWS<{ plan: FloorPlan }>(
        this._message("save", { plan_id: planId, image, ...extra }),
      );
      this._sizes[planId] = await imageSize(result.plan.image);
      const others = (this._plans ?? []).filter((p) => p.plan_id !== planId);
      this._plans = [...others, result.plan];
      this._active = planId;
      this._building = false;
      this._edit = true;
    } catch (err) {
      this._error = String((err as { message?: string })?.message ?? err);
    } finally {
      this._busy = false;
    }
  }

  private _update(plan: FloorPlan, changes: Partial<FloorPlan>, save: Record<string, unknown>): void {
    const updated = { ...plan, ...changes };
    this._plans = (this._plans ?? []).map((p) => (p.plan_id === plan.plan_id ? updated : p));
    void this.hass?.callWS(this._message("save", { plan_id: plan.plan_id, ...save }));
  }

  private _setPosition(id: string, pos: [number, number] | null): void {
    const plan = this._current;
    if (!plan) return;
    const positions = { ...plan.positions };
    if (pos) positions[id] = pos;
    else delete positions[id];
    const updated = { ...plan, positions };
    this._plans = (this._plans ?? []).map((p) => (p.plan_id === plan.plan_id ? updated : p));
    window.clearTimeout(this._saveTimer);
    this._saveTimer = window.setTimeout(() => {
      void this.hass?.callWS(
        this._message("save", { plan_id: plan.plan_id, positions: updated.positions }),
      );
    }, SAVE_DELAY_MS);
  }

  private _linkFloor(plan: FloorPlan, floorId: string): void {
    const floor = this._floors.find((f) => f.floor_id === floorId);
    const changes: Partial<FloorPlan> = { floor_id: floorId || null };
    const save: Record<string, unknown> = { floor_id: floorId };
    if (floor) {
      changes.name = floor.name;
      save.name = floor.name;
      if (typeof floor.level === "number") {
        changes.level = floor.level;
        save.level = floor.level;
      }
    }
    this._update(plan, changes, save);
  }

  private async _delete(): Promise<void> {
    const plan = this._current;
    if (!plan || !this.hass) return;
    if (!this._confirmDelete) {
      this._confirmDelete = true;
      return;
    }
    this._confirmDelete = false;
    await this.hass.callWS(this._message("delete", { plan_id: plan.plan_id }));
    this._plans = (this._plans ?? []).filter((p) => p.plan_id !== plan.plan_id);
    this._active = this._sorted[0]?.plan_id;
    this._edit = false;
  }

  /** SVG user coordinates → fractions of the image. */
  private _point(ev: MouseEvent | PointerEvent | DragEvent): [number, number] | null {
    const svgEl = this.renderRoot.querySelector<SVGSVGElement>(".floorbox svg");
    const plan = this._current;
    if (!svgEl || !plan) return null;
    const size = this._sizes[plan.plan_id];
    const matrix = svgEl.getScreenCTM();
    if (!matrix || !size) return null;
    const p = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(matrix.inverse());
    if (p.x < 0 || p.y < 0 || p.x > size.w || p.y > size.h) return null;
    return [p.x / size.w, p.y / size.h];
  }

  // --- data ---------------------------------------------------------------------------

  private get _nodes(): Map<string, TopologyNode> {
    return new Map((this.report?.topology?.nodes ?? []).map((n) => [n.ieee, n]));
  }

  private get _edges(): EdgeData[] {
    const topology = this.report?.topology;
    const edges: EdgeData[] = (topology?.links ?? []).map((l) => ({
      from: l.a,
      to: l.b,
      lqi: l.lqi,
      kind: "link" as const,
    }));
    for (const node of topology?.nodes ?? []) {
      if (node.type === "end_device" && node.parent && node.state !== "dead") {
        edges.push({ from: node.ieee, to: node.parent, lqi: node.parent_lqi, kind: "parent" });
      }
    }
    return edges;
  }

  private _name(ieee: string): string {
    if (ieee === this.report?.topology?.coordinator?.ieee) return this.t("coordinator");
    return this._nodes.get(ieee)?.name ?? ieee;
  }

  /** Glowing dot along the message route; in the building view it changes storeys. */
  spark(ieee: string, delay: number): void {
    const layer = this.renderRoot.querySelector<SVGGElement>("g.traffic");
    if (!layer || !this.layout) return;
    const route = routeToCoordinator(this.layout, ieee);
    const points: Point[] = [];
    let k: number;
    if (this._building) {
      for (const id of route) {
        const p = this._iso(id);
        if (p) points.push(p);
      }
      k = 1.5;
    } else {
      const plan = this._current;
      if (!plan) return;
      for (const id of route) {
        const p = this._posOn(plan, id);
        if (p) {
          points.push(p);
          continue;
        }
        // Leaves this storey: end at the stair marker of the last device.
        const other = this._planOf(id);
        const last = points[points.length - 1];
        if (other && last) points.push(this._portalPoint(plan, other, last));
        break;
      }
      const size = this._sizes[plan.plan_id];
      k = Math.max(size.w, size.h) / 900;
    }
    if (points.length < 2) return;
    let length = 0;
    for (let i = 1; i < points.length; i++) {
      length += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    }
    const duration = Math.max(0.7, length / (240 * k));
    const ns = "http://www.w3.org/2000/svg";
    const dot = document.createElementNS(ns, "circle");
    dot.setAttribute("r", String(5 * k));
    dot.setAttribute("class", "spark");
    const motion = document.createElementNS(ns, "animateMotion");
    motion.setAttribute("dur", `${duration}s`);
    motion.setAttribute("fill", "freeze");
    motion.setAttribute("begin", "indefinite");
    motion.setAttribute("path", `M${points.map((p) => `${p.x},${p.y}`).join(" L")}`);
    dot.appendChild(motion);
    window.setTimeout(() => {
      layer.appendChild(dot);
      (motion as SVGAnimationElement).beginElement();
      window.setTimeout(() => dot.remove(), duration * 1000 + 60);
    }, delay);
  }

  private _portalPoint(plan: FloorPlan, other: FloorPlan, from: Point): Point {
    const size = this._sizes[plan.plan_id];
    const k = Math.max(size.w, size.h) / 900;
    const up = this._level(other) > this._level(plan);
    return { x: from.x + 26 * k, y: from.y + (up ? -58 : 58) * k };
  }

  // --- render -------------------------------------------------------------------------

  protected render() {
    const t = this.t;
    if (!this._plans) return html`<div class="empty">${t("loading")}</div>`;
    const plan = this._current;
    if (!plan) return this._renderUpload();
    return html`${this._renderBar(plan)}
      ${this._building ? this._renderBuilding() : this._renderPlan(plan)}
      ${this._building ? nothing : this._renderBelow(plan)}
      ${this._error ? html`<div class="err">${this._error}</div>` : nothing}`;
  }

  private _renderUpload() {
    const t = this.t;
    return html`<div class="upload">
      <h3>${t("floor.empty_title")}</h3>
      <p>${t("floor.empty_text")}</p>
      ${this._admin
        ? html`<label class="filebtn btn"
            >${this._busy ? t("floor.uploading") : t("floor.upload")}
            <input type="file" accept="image/*" @change=${(ev: Event) => this._upload(ev)}
          /></label>`
        : html`<p>${t("floor.admin_only")}</p>`}
      ${this._error ? html`<div class="err">${this._error}</div>` : nothing}
    </div>`;
  }

  private _renderBar(plan: FloorPlan) {
    const t = this.t;
    const sorted = [...this._sorted].reverse(); // top storey first, like a building
    return html`<div class="fbar">
      ${sorted.length > 1
        ? html`<button
            class="ftab building ${this._building ? "on" : ""}"
            @click=${() => {
              this._building = !this._building;
              this._edit = false;
            }}
          >
            ${svg`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3 21 8 12 13 3 8z"/><path d="M3 12l9 5 9-5"/><path d="M3 16l9 5 9-5"/></svg>`}${t("floor.building")}
          </button>`
        : nothing}
      ${sorted.map(
        (p) => html`<button
          class="ftab ${!this._building && p.plan_id === plan.plan_id ? "on" : ""}"
          @click=${() => {
            this._active = p.plan_id;
            this._building = false;
            this._selected = undefined;
            this._confirmDelete = false;
          }}
        >
          ${p.name}
        </button>`,
      )}
      ${this._admin && this._edit
        ? html`<label class="ftab filebtn"
            >+ ${t("floor.add")}
            <input type="file" accept="image/*" @change=${(ev: Event) => this._upload(ev)}
          /></label>`
        : nothing}
      <span class="spacer"></span>
      ${this._admin && !this._building
        ? html`<button
            class="ftab edit ${this._edit ? "on" : ""}"
            @click=${() => {
              this._edit = !this._edit;
              this._placing = undefined;
              this._selected = undefined;
              this._confirmDelete = false;
            }}
          >
            ${this._edit ? t("floor.done") : t("floor.edit")}
          </button>`
        : nothing}
    </div>`;
  }

  private _renderPlan(plan: FloorPlan) {
    const size = this._sizes[plan.plan_id] ?? { w: 1600, h: 1000 };
    const k = Math.max(size.w, size.h) / 900;
    const coordinatorId = this.report?.topology?.coordinator?.ieee;
    const placedIds = Object.keys(plan.positions).map((key) =>
      key === COORDINATOR_KEY ? (coordinatorId ?? key) : key,
    );
    const hl = this.plan ? new Set(this.plan.improved.map((i) => i.ieee)) : undefined;

    const local: { a: Point; b: Point; lqi: number | null; kind: string }[] = [];
    const portals: { from: Point; at: Point; peer: string; other: FloorPlan; lqi: number | null }[] = [];
    for (const edge of this._edges) {
      const a = this._posOn(plan, edge.from);
      const b = this._posOn(plan, edge.to);
      if (a && b) {
        local.push({ a, b, lqi: edge.lqi, kind: edge.kind });
        continue;
      }
      // One end here, the other on another storey → stair marker.
      const here = a ?? b;
      const peer = a ? edge.to : edge.from;
      const other = this._planOf(peer);
      if (!here || !other || other.plan_id === plan.plan_id) continue;
      if (edge.kind === "link" && !portals.every((p) => p.peer !== peer)) continue;
      portals.push({ from: here, at: this._portalPoint(plan, other, here), peer, other, lqi: edge.lqi });
    }

    return html`<div class="floorbox ${this._placing ? "placing" : ""}">
      <svg
        viewBox="0 0 ${size.w} ${size.h}"
        class=${hl ? "dim" : ""}
        @dragover=${(ev: DragEvent) => ev.preventDefault()}
        @drop=${(ev: DragEvent) => {
          ev.preventDefault();
          const id = ev.dataTransfer?.getData("text/plain");
          const pos = this._point(ev);
          if (id && pos) this._setPosition(id, pos);
          this._placing = undefined;
        }}
        @click=${(ev: MouseEvent) => {
          if (!this._edit || !this._placing) return;
          const pos = this._point(ev);
          if (pos) this._setPosition(this._placing, pos);
          this._placing = undefined;
        }}
        @pointermove=${(ev: PointerEvent) => {
          if (!this._drag) return;
          const pos = this._point(ev);
          if (pos) this._setPosition(this._drag, pos);
        }}
        @pointerup=${() => (this._drag = undefined)}
        @pointerleave=${() => {
          this._drag = undefined;
          this._hover = undefined;
        }}
      >
        <image class="plan-img" href=${plan.image} x="0" y="0" width=${size.w} height=${size.h}></image>
        ${local.map(
          (e) => svg`<path class="edge ${e.kind} lqi-${lqiClass(e.lqi)}" d="M${e.a.x},${e.a.y} L${e.b.x},${e.b.y}"></path>`,
        )}
        ${portals.map((p) => this._renderPortal(plan, p, k))}
        ${this._renderPlanOverlay(k)}
        ${placedIds.map((id) => this._renderDevice(id, this._pos(id), k, hl, this._edit))}
        <g class="traffic"></g>
      </svg>
      ${this._renderTip()}
    </div>`;
  }

  private _renderPortal(
    plan: FloorPlan,
    p: { from: Point; at: Point; peer: string; other: FloorPlan; lqi: number | null },
    k: number,
  ) {
    const up = this._level(p.other) > this._level(plan);
    const arrow = up ? "M-6,3 L0,-4 L6,3" : "M-6,-3 L0,4 L6,-3";
    const label = `${p.other.name} · ${this._name(p.peer)}${p.lqi ? ` · ${p.lqi}` : ""}`;
    return svg`<path class="portal-stub lqi-${lqiClass(p.lqi)}" d="M${p.from.x},${p.from.y} L${p.at.x},${p.at.y}"></path>
      <g
        class="portal"
        transform="translate(${p.at.x} ${p.at.y}) scale(${k})"
        @click=${(ev: MouseEvent) => {
          ev.stopPropagation();
          this._active = p.other.plan_id;
          this._hover = undefined;
        }}
      >
        <circle r="11"></circle>
        <path class="arrow" d=${arrow}></path>
        <text class="label small" x="16" y="4">${label}</text>
      </g>`;
  }

  private _startDrag(ev: PointerEvent, key: string): void {
    if (!this._edit) return;
    ev.stopPropagation();
    this._drag = key;
    this._selected = key;
    this._confirmDelete = false;
  }

  /** A device (or the coordinator) at a given point; used by plan and building view. */
  private _renderDevice(
    id: string,
    p: Point | null,
    k: number,
    hl: Set<string> | undefined,
    editable: boolean,
  ) {
    if (!p) return nothing;
    const coordinatorId = this.report?.topology?.coordinator?.ieee;
    if (id === coordinatorId || id === COORDINATOR_KEY) {
      return svg`<g
        class="node coord ${editable ? "edit" : ""} ${this._selected === COORDINATOR_KEY ? "selected" : ""}"
        transform="translate(${p.x} ${p.y}) scale(${k})"
        @pointerdown=${(ev: PointerEvent) => editable && this._startDrag(ev, COORDINATOR_KEY)}
      >
        <circle class="shape" r="18"></circle>
        <path class="glyph" d="M-7,-6 h14 l-14,12 h14"></path>
      </g>`;
    }
    const node = this._nodes.get(id);
    if (!node) return nothing;
    const router = node.type === "router";
    const size = router ? 20 : 14;
    const heat = this.live ? (this.heat[node.ieee] ?? 0) : 0;
    const alerted = this.alerts.some((a) => a.ieee === node.ieee);
    const kind = node.kind === "part_time" ? "part" : node.kind === "unclear" ? "unclear" : "";
    const stateClass = node.kind === "unclear" && node.state === "ok" ? "unclear" : node.state;
    const on = !hl || hl.has(node.ieee);
    const name = node.name.length > 20 ? `${node.name.slice(0, 19)}…` : node.name;
    return svg`<g
      class="node ${kind} ${node.state} ${on && hl ? "hl" : ""} ${editable ? "edit" : ""} ${this._drag === node.ieee ? "drag" : ""} ${this._selected === node.ieee ? "selected" : ""}"
      transform="translate(${p.x} ${p.y}) scale(${k})"
      @pointerdown=${(ev: PointerEvent) => editable && this._startDrag(ev, node.ieee)}
      @mouseenter=${(ev: MouseEvent) => {
        if (this._edit) return;
        const box = (this.renderRoot.querySelector(".floorbox") as HTMLElement).getBoundingClientRect();
        this._tip = { x: ev.clientX - box.left, y: ev.clientY - box.top };
        this._hover = node.ieee;
      }}
      @mouseleave=${() => (this._hover = undefined)}
      @click=${(ev: MouseEvent) => {
        if (this._edit) {
          ev.stopPropagation();
          return;
        }
        if (node.device_id) navigate(`/config/devices/device/${node.device_id}`);
      }}
    >
      ${heat > 0.05 ? svg`<circle class="heat" r=${size / 2 + 3 + heat * 6} style="opacity:${0.12 + heat * 0.33}"></circle>` : nothing}
      ${alerted ? svg`<circle class="pulse alarm" r=${size / 2}></circle>` : nothing}
      ${router
        ? svg`<rect class="shape st-${stateClass}" x=${-size / 2} y=${-size / 2} width=${size} height=${size} rx="5"></rect>`
        : svg`<circle class="shape st-${stateClass}" r=${size / 2}></circle>`}
      <text class="label small" y=${size / 2 + 13} text-anchor="middle">${name}</text>
    </g>`;
  }

  private _renderBuilding() {
    const sorted = this._sorted;
    const k = 1.5;
    const hl = this.plan ? new Set(this.plan.improved.map((i) => i.ieee)) : undefined;
    // Bounds of all projected storeys (corners) for the viewBox.
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    const planes = sorted.map((plan, index) => {
      const size = this._sizes[plan.plan_id] ?? { w: 1600, h: 1000 };
      const height = (ISO_WIDTH * size.h) / size.w;
      const oy = -index * ISO_SPACING;
      const corners = [
        [-ISO_WIDTH / 2, -height / 2],
        [ISO_WIDTH / 2, -height / 2],
        [ISO_WIDTH / 2, height / 2],
        [-ISO_WIDTH / 2, height / 2],
      ].map(([x, y]) => ({ x: (x - y) * COS30, y: (x + y) * 0.5 + oy }));
      for (const c of corners) {
        minX = Math.min(minX, c.x);
        minY = Math.min(minY, c.y);
        maxX = Math.max(maxX, c.x);
        maxY = Math.max(maxY, c.y);
      }
      return { plan, height, oy, corners };
    });
    const pad = 70;
    const viewBox = `${minX - pad} ${minY - pad} ${maxX - minX + 2 * pad} ${maxY - minY + 2 * pad}`;

    const edges = this._edges
      .map((e) => ({ e, a: this._iso(e.from), b: this._iso(e.to) }))
      .filter((x): x is { e: EdgeData; a: Point; b: Point } => !!x.a && !!x.b);
    const placed = [
      ...new Set(sorted.flatMap((p) => Object.keys(p.positions))),
    ].map((key) => (key === COORDINATOR_KEY ? (this.report?.topology?.coordinator?.ieee ?? key) : key));

    return html`<div class="floorbox iso">
      <svg viewBox=${viewBox} class=${hl ? "dim" : ""} @pointerleave=${() => (this._hover = undefined)}>
        ${planes.map(
          ({ plan, height, oy, corners }) => svg`
            <g transform="matrix(${COS30} 0.5 ${-COS30} 0.5 0 ${oy})">
              <image class="plan-img" href=${plan.image} x=${-ISO_WIDTH / 2} y=${-height / 2} width=${ISO_WIDTH} height=${height} preserveAspectRatio="none"></image>
            </g>
            <polygon class="plane" points=${corners.map((c) => `${c.x},${c.y}`).join(" ")}></polygon>
            <text class="plane-label" x=${corners[3].x - 20} y=${corners[3].y} text-anchor="end">${plan.name}</text>`,
        )}
        ${edges.map(({ e, a, b }) => {
          const cross = this._planOf(e.from)?.plan_id !== this._planOf(e.to)?.plan_id;
          return svg`<path class="edge ${e.kind} ${cross ? "cross" : ""} lqi-${lqiClass(e.lqi)}" d="M${a.x},${a.y} L${b.x},${b.y}"></path>`;
        })}
        ${placed.map((id) => this._renderDevice(id, this._iso(id), k, hl, false))}
        <g class="traffic"></g>
      </svg>
      ${this._renderTip()}
    </div>`;
  }

  private _renderPlanOverlay(k: number) {
    const plan = this.plan;
    if (!plan) return nothing;
    const points = plan.improved
      .map((i) => this._pos(i.ieee))
      .filter((p): p is Point => !!p);
    if (!points.length) return nothing;
    const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
    const cy = points.reduce((s, p) => s + p.y, 0) / points.length;
    return svg`<g class="plan-layer">
      ${points.map((p) => svg`<path class="planned-edge" d="M${p.x},${p.y} L${cx},${cy}"></path>`)}
      <g transform="translate(${cx} ${cy}) scale(${k})">
        <circle class="pulse plan-pulse" r="13"></circle>
        <rect class="virtual" x="-14" y="-14" width="28" height="28" rx="7"></rect>
        <path class="virtual-plus" d="M-6,0 h12 M0,-6 v12"></path>
        <text class="label plan-label" y="32" text-anchor="middle">${this.t("plan.virtual", { room: plan.area_name })}</text>
      </g>
    </g>`;
  }

  private _renderTip() {
    if (!this._hover || this._edit) return nothing;
    const node = this._nodes.get(this._hover);
    if (!node) return nothing;
    const t = this.t;
    const parent = node.parent ? this._name(node.parent) : undefined;
    const parentFloor = node.parent ? this._planOf(node.parent) : undefined;
    const ownFloor = this._planOf(node.ieee);
    const across = parentFloor && ownFloor && parentFloor.plan_id !== ownFloor.plan_id;
    return html`<div class="tip" style="left:${this._tip.x}px;top:${this._tip.y}px">
      <b>${node.name}</b>
      <div class="k">${node.type === "router" ? t(`kind.${node.kind ?? "always_on"}`) : t("end_device")}${node.area ? ` · ${node.area}` : ""}</div>
      <span class="pill">${t(`state.${node.state}`)}</span>
      ${parent
        ? html`<div class="row"><span class="k">${t("parent")}</span><span>${parent}${across ? ` (${parentFloor.name})` : ""}${node.parent_lqi ? ` · LQI ${node.parent_lqi}` : ""}</span></div>`
        : nothing}
    </div>`;
  }

  private _renderBelow(plan: FloorPlan) {
    const t = this.t;
    const topology = this.report?.topology;
    const placedAnywhere = new Set((this._plans ?? []).flatMap((p) => Object.keys(p.positions)));
    const floorId = plan.floor_id;
    const candidates = (topology?.nodes ?? []).filter((n) => !placedAnywhere.has(n.ieee));
    const here = (n: TopologyNode): boolean => !floorId || !n.floor_id || n.floor_id === floorId;
    const shown = this._allFloors || !floorId ? candidates : candidates.filter(here);
    const hidden = candidates.length - shown.length;
    const unplaced = [
      ...(topology?.coordinator && !placedAnywhere.has(COORDINATOR_KEY)
        ? [{ id: COORDINATOR_KEY, name: t("coordinator"), other: false }]
        : []),
      ...shown
        .sort(
          (a, b) =>
            Number(!here(a)) - Number(!here(b)) ||
            a.name.localeCompare(b.name, undefined, { numeric: true }),
        )
        .map((n) => ({ id: n.ieee, name: n.name, other: !here(n) })),
    ];
    if (!this._edit) {
      const open = candidates.length + (placedAnywhere.has(COORDINATOR_KEY) ? 0 : 1);
      return open && this._admin
        ? html`<div class="hint">${t("floor.unplaced_hint", { n: open })}</div>`
        : nothing;
    }
    const selectedName =
      this._selected === COORDINATOR_KEY
        ? t("coordinator")
        : this._nodes.get(this._selected ?? "")?.name;
    return html`
      ${this._selected && selectedName
        ? html`<div class="selbar">
            <b>${selectedName}</b>
            <button class="btn ghost" @click=${() => {
              this._setPosition(this._selected as string, null);
              this._selected = undefined;
            }}>${t("floor.remove")}</button>
          </div>`
        : nothing}
      <div class="unplaced">
        <h4>
          ${t("floor.unplaced", { n: unplaced.length })}
          ${floorId
            ? html`<label
                ><input
                  type="checkbox"
                  .checked=${this._allFloors}
                  @change=${(ev: Event) => (this._allFloors = (ev.target as HTMLInputElement).checked)}
                />${t("floor.all_floors", { n: hidden })}</label
              >`
            : nothing}
        </h4>
        <div class="hint">${t("floor.place_hint")}</div>
        <div class="chips">
          ${unplaced.map(
            (u) => html`<button
              class="chip ${this._placing === u.id ? "on" : ""} ${u.other ? "other" : ""}"
              draggable="true"
              @dragstart=${(ev: DragEvent) => {
                ev.dataTransfer?.setData("text/plain", u.id);
                this._placing = u.id;
              }}
              @click=${() => (this._placing = this._placing === u.id ? undefined : u.id)}
            >
              ${u.name}
            </button>`,
          )}
        </div>
      </div>
      <div class="fbar">
        <input
          id="zh-floor-name"
          class="nameinput"
          .value=${plan.name}
          @change=${(ev: Event) => {
            const name = (ev.target as HTMLInputElement).value.trim();
            if (name) this._update(plan, { name }, { name });
          }}
        />
        ${this._floors.length
          ? html`<select
              id="zh-floor-link"
              class="floorselect"
              @change=${(ev: Event) => this._linkFloor(plan, (ev.target as HTMLSelectElement).value)}
            >
              <option value="" ?selected=${!plan.floor_id}>${t("floor.no_link")}</option>
              ${this._floors.map(
                (f) => html`<option value=${f.floor_id} ?selected=${plan.floor_id === f.floor_id}>
                  ${t("floor.linked", { name: f.name })}
                </option>`,
              )}
            </select>`
          : nothing}
        <label class="ftab filebtn"
          >${t("floor.replace")}
          <input type="file" accept="image/*" @change=${(ev: Event) => this._upload(ev, plan.plan_id)}
        /></label>
        <button class="ftab" @click=${() => this._delete()}>
          ${this._confirmDelete ? t("floor.confirm_delete") : t("floor.delete")}
        </button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zigbee-health-floor": ZigbeeHealthFloor;
  }
}
