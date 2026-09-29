/**
 * 3D view wrapper: loads the drawn building and the three.js bundle on demand, floor
 * toggles, tooltip and click-through to the device page.
 */

import { LitElement, type PropertyValues, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import { type Building, COORDINATOR_KEY, type Placed, placeDevices, restack } from "./building-geo";
import { type Layout, routeToCoordinator } from "./layout";
import type { Translate } from "./i18n";
import type { SceneData, SceneHandle } from "./scene3d";
import { styles } from "./styles";
import { selectDevice } from "./util";
import type { Alert, Focus, HomeAssistant, Report } from "./types";

type Mount = (host: HTMLElement, data: SceneData, callbacks: {
  hover: (ieee: string | null, x: number, y: number) => void;
  click: (ieee: string) => void;
}) => SceneHandle;

let loader: Promise<Mount> | undefined;

function loadScene(): Promise<Mount> {
  if (window.zigbeeHealth3d) return Promise.resolve(window.zigbeeHealth3d.mount);
  if (!loader) {
    const own = new URL(import.meta.url);
    const url = new URL("./zigbee-health-3d.js", own);
    url.search = own.search;
    loader = import(/* @vite-ignore */ url.href).then(() => {
      if (!window.zigbeeHealth3d) throw new Error("3d bundle");
      return window.zigbeeHealth3d.mount;
    });
    loader.catch(() => (loader = undefined));
  }
  return loader;
}

@customElement("zigbee-health-3d")
export class ZigbeeHealth3d extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @property({ attribute: false }) report?: Report;
  @property({ attribute: false }) layout?: Layout;
  @property({ attribute: false }) heat: Record<string, number> = {};
  @property({ attribute: false }) alerts: Alert[] = [];
  @property({ attribute: false }) t: Translate = (key) => key;
  @property({ attribute: false }) configEntryId?: string;
  @property({ attribute: false }) live = true;
  @property({ attribute: false }) marked?: Focus;

  @state() private _building?: Building | null;
  @state() private _status: "loading" | "ready" | "failed" = "loading";
  @state() private _hidden: string[] = [];
  @state() private _links = true;
  @state() private _hover?: { ieee: string; x: number; y: number };
  private _scene?: SceneHandle;
  private _placed?: { key: unknown[]; value: Record<string, Placed> };

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
      }
      .ftab.on {
        background: var(--primary-color, #03a9f4);
        border-color: transparent;
        color: var(--text-primary-color, #fff);
      }
      .stage {
        position: relative;
        flex: 1;
        min-height: 320px;
        border-radius: 10px;
        overflow: hidden;
        background: radial-gradient(ellipse at 50% 30%, var(--zh-card), var(--zh-surface));
      }
      .scene {
        position: absolute;
        inset: 0;
      }
      .hint {
        position: absolute;
        left: 12px;
        bottom: 10px;
        font-size: 12px;
        color: var(--zh-muted);
        pointer-events: none;
      }
      .msg {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--zh-muted);
        text-align: center;
        padding: 20px;
      }
    `,
  ];

  protected firstUpdated(): void {
    void this._init();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._scene?.dispose();
    this._scene = undefined;
  }

  connectedCallback(): void {
    super.connectedCallback();
    if (this.hasUpdated && !this._scene && this._building) void this._mount();
  }

  private async _init(): Promise<void> {
    if (!this.hass) return;
    try {
      const message: Record<string, unknown> = { type: "zigbee_health/building/get" };
      if (this.configEntryId) message.config_entry_id = this.configEntryId;
      const result = await this.hass.callWS<{ building: Building | null }>(message);
      this._building = result.building;
      // older saves may have gaps between storeys (e.g. after deleting one)
      if (this._building) restack(this._building.floors);
    } catch {
      this._building = null;
    }
    if (!this._building?.floors.some((f) => f.rooms.length)) {
      this._status = "ready";
      return;
    }
    await this._mount();
  }

  private async _mount(): Promise<void> {
    try {
      const mount = await loadScene();
      await this.updateComplete;
      const host = this.renderRoot.querySelector<HTMLElement>(".scene");
      if (!host || this._scene) return;
      this._scene = mount(host, this._data(), {
        hover: (ieee, x, y) => (this._hover = ieee ? { ieee, x, y } : undefined),
        click: (ieee) => selectDevice(this, ieee),
      });
      this._status = "ready";
    } catch {
      this._status = "failed";
    }
  }

  private _placedRecord() {
    const key = [this._building, this.report?.topology];
    if (this._placed && this._placed.key[0] === key[0] && this._placed.key[1] === key[1]) return this._placed.value;
    const value = Object.fromEntries(
      placeDevices(this._building as Building, this.report?.topology?.nodes ?? []),
    );
    this._placed = { key, value };
    return value;
  }

  private _data(): SceneData {
    const style = getComputedStyle(this);
    const color = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
    return {
      building: this._building as Building,
      placed: this._placedRecord(),
      coordinatorKey: COORDINATOR_KEY,
      topology: this.report?.topology ?? { coordinator: null, nodes: [], links: [], unknown_parent: [], unknown_neighbors: [] },
      heat: this.live ? this.heat : {},
      alerts: this.alerts,
      hidden: this._hidden,
      showLinks: this._links,
      focus: this.marked ? { ieees: this.marked.ieees, areas: this.marked.areas } : null,
      colors: {
        good: color("--zh-good", "#43a047"),
        ok: color("--zh-ok", "#ffa000"),
        bad: color("--zh-bad", "#db4437"),
        info: color("--zh-info", "#039be5"),
        part: color("--zh-part", "#8e6bd8"),
        muted: color("--zh-muted", "#727272"),
      },
      dark: this.hass?.themes?.darkMode ?? window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false,
      coordinatorName: this.t("coordinator"),
    };
  }

  protected updated(changed: PropertyValues): void {
    if (!this._scene) return;
    if (["report", "heat", "alerts", "_hidden", "_links", "live", "hass", "marked"].some((k) => changed.has(k))) {
      this._scene.update(this._data());
    }
  }

  spark(ieee: string, delay: number): void {
    if (!this._scene || !this.layout) return;
    const coordinator = this.report?.topology?.coordinator?.ieee;
    const route = routeToCoordinator(this.layout, ieee);
    if (coordinator && route[route.length - 1] !== coordinator) return;
    window.setTimeout(() => this._scene?.spark(route), delay);
  }

  protected render() {
    const t = this.t;
    const floors = [...(this._building?.floors ?? [])].sort((a, b) => b.elevation - a.elevation);
    const empty = this._building !== undefined && !this._building?.floors.some((f) => f.rooms.length);
    return html`${floors.length && !empty
        ? html`<div class="toolbar">
            ${floors.map(
              (f) => html`<button
                class="ftab ${this._hidden.includes(f.id) ? "" : "on"}"
                @click=${() =>
                  (this._hidden = this._hidden.includes(f.id)
                    ? this._hidden.filter((id) => id !== f.id)
                    : [...this._hidden, f.id])}
              >
                ${f.name}
              </button>`,
            )}
            <button class="ftab ${this._links ? "on" : ""}" @click=${() => (this._links = !this._links)}>
              ${t("3d.links")}
            </button>
            <span class="spacer"></span>
            <button class="ftab" @click=${() => this._scene?.reset()}>${t("3d.reset")}</button>
          </div>`
        : nothing}
      <div class="stage">
        <div class="scene"></div>
        ${empty
          ? html`<div class="msg">${t("3d.empty")}</div>`
          : this._status === "loading"
            ? html`<div class="msg">${t("3d.loading")}</div>`
            : this._status === "failed"
              ? html`<div class="msg">${t("3d.failed")}</div>`
              : html`<div class="hint">${t("3d.hint")}</div>`}
        ${this._renderTip()}
      </div>`;
  }

  private _renderTip() {
    const hover = this._hover;
    if (!hover) return nothing;
    const t = this.t;
    const topology = this.report?.topology;
    if (hover.ieee === topology?.coordinator?.ieee) {
      return html`<div class="tip" style="left:${hover.x}px;top:${hover.y}px"><b>${t("coordinator")}</b></div>`;
    }
    const node = topology?.nodes.find((n) => n.ieee === hover.ieee);
    if (!node) return nothing;
    const parent =
      node.parent === topology?.coordinator?.ieee
        ? t("coordinator")
        : topology?.nodes.find((n) => n.ieee === node.parent)?.name;
    return html`<div class="tip" style="left:${hover.x}px;top:${hover.y}px">
      <b>${node.name}</b>
      <div class="k">${node.type === "router" ? t(`kind.${node.kind ?? "always_on"}`) : t("end_device")}${node.area ? ` · ${node.area}` : ""}</div>
      <span class="pill">${t(`state.${node.state}`)}</span>
      ${parent
        ? html`<div class="row"><span class="k">${t("parent")}</span><span>${parent}${node.parent_lqi ? ` · LQI ${node.parent_lqi}` : ""}</span></div>`
        : nothing}
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zigbee-health-3d": ZigbeeHealth3d;
  }
}
