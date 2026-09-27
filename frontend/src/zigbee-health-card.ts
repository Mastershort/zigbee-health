/**
 * Zigbee Health card – radial network map, measures, findings and rooms.
 * Data: `zigbee_health.get_report` (format: full) via the websocket API.
 */

import { LitElement, type PropertyValues, html, nothing, svg } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import "./editor";
import "./building";
import "./building3d";
import "./device-panel";
import "./floor";
import "./panel";
import type { ZigbeeHealthBuilding } from "./building";
import type { ZigbeeHealth3d } from "./building3d";
import {
  CENTER,
  type Edge,
  type Layout,
  type PlacedNode,
  computeLayout,
  lqiClass,
  pathToCoordinator,
  routeToCoordinator,
} from "./layout";
import { type Translate, translator } from "./i18n";
import { styles } from "./styles";
import { ago, navigate } from "./util";
import type {
  Alert,
  CardConfig,
  Plan,
  Finding,
  Focus,
  HomeAssistant,
  Report,
  Severity,
  Tab,
  TopologyNode,
  TrafficMessage,
} from "./types";

const REFRESH_MS = 60_000;
const SPARK_SPEED = 240; // px per second along the route
const MAX_SPARKS = 90;
const RATE_WINDOW = 60; // seconds for messages/min
const CHECK_MIN_MS = 4200; // the radar runs at least this long
const CHECK_STEPS = ["coordinator", "devices", "routers", "links", "batteries", "measures"];
const CHECK_SEEN_KEY = "zigbee-health-check-seen";
const VIEW_KEY = "zigbee-health-view";
const TILES: { key: string; color: string; filter: (n: TopologyNode) => boolean }[] = [
  { key: "dead", color: "var(--zh-bad)", filter: (n) => n.state === "dead" },
  { key: "offline", color: "var(--zh-muted)", filter: (n) => n.state === "offline" },
  {
    key: "routers_part_time",
    color: "var(--zh-part)",
    filter: (n) => n.kind === "part_time" || n.kind === "unclear",
  },
  { key: "battery_critical", color: "#f57c00", filter: (n) => n.state === "battery" },
  { key: "weak_links", color: "var(--zh-ok)", filter: (n) => n.state === "weak" },
  { key: "routers_always_on", color: "var(--zh-good)", filter: (n) => n.kind === "always_on" },
];
const SEVERITIES: Severity[] = ["critical", "warning", "info"];
const STATE_ORDER = ["dead", "offline", "part_time_router", "battery", "weak", "ignored", "ok"];
const LEVEL_COLOR: Record<string, string> = {
  stable: "var(--zh-good)",
  degraded: "var(--zh-ok)",
  fragile: "var(--zh-bad)",
  paused: "var(--zh-muted)",
};

const ICON_SCAN = svg`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="2.2" fill="currentColor"/><path d="M7.8 16.2a6 6 0 0 1 0-8.4M16.2 7.8a6 6 0 0 1 0 8.4M4.9 19.1a10 10 0 0 1 0-14.2M19.1 4.9a10 10 0 0 1 0 14.2"/></svg>`;
const ICON_BOLT = svg`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12L13 2z"/></svg>`;
const ICON_REFRESH = svg`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12a8 8 0 1 1-2.34-5.66"/><path d="M20 4v5h-5"/></svg>`;

@customElement("zigbee-health-card")
export class ZigbeeHealthCard extends LitElement {
  static styles = styles;

  @property({ attribute: false }) hass?: HomeAssistant;
  /** Full-page layout used by the sidebar panel. */
  @property({ attribute: false }) panelMode = false;
  @property({ attribute: false }) narrow = false;
  @state() private _config?: CardConfig;
  @state() private _query = "";
  @state() private _report?: Report;
  @state() private _error?: string;
  @state() private _tab: Tab = "map";
  @state() private _hover?: string;
  @state() private _filter?: string;
  @state() private _labels = false;
  @state() private _loading = false;
  @state() private _alerts: Alert[] = [];
  @state() private _live = true;
  @state() private _heat: Record<string, number> = {};
  @state() private _rate: number | null = null;
  @state() private _check?: { phase: "sweep" | "reveal"; step: number; scanStarted: boolean };
  @state() private _countUp = 0;
  @state() private _plans?: Plan[];
  @state() private _planLoading = false;
  @state() private _plan?: Plan;
  @state() private _focus?: Focus;
  @state() private _device?: string;
  @state() private _toast?: string;
  private _readyAt = 0;
  @state() private _view: "map" | "floor" | "3d" = (() => {
    try {
      const stored = localStorage.getItem(VIEW_KEY);
      return stored === "floor" || stored === "3d" ? stored : "map";
    } catch {
      return "map";
    }
  })();

  private _layout?: Layout;
  private _timer?: number;
  private _tipPos: { x: number; y: number } = { x: 0, y: 0 };
  private _unsubTraffic?: () => Promise<void> | void;
  private _subscribing = false;
  private _decayTimer?: number;
  private _rateWindow: number[] = [];
  private _sparks = 0;

  static getConfigElement(): HTMLElement {
    return document.createElement("zigbee-health-card-editor");
  }

  static getStubConfig(): Partial<CardConfig> {
    return {};
  }

  setConfig(config: CardConfig): void {
    this._config = { ...config };
    this._tab = config.default_tab ?? "map";
    this._labels = config.show_labels ?? false;
    this._live = config.live ?? true;
  }

  getCardSize(): number {
    return 10;
  }

  getGridOptions(): Record<string, unknown> {
    return { columns: 12, min_columns: 6, rows: "auto" };
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener("zh-device", this._onDeviceEvent);
    this._timer = window.setInterval(() => void this._load(), REFRESH_MS);
    this._decayTimer = window.setInterval(() => this._tick(), 1000);
    if (this.hass) {
      void this._load();
      void this._subscribe();
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener("zh-device", this._onDeviceEvent);
    window.clearInterval(this._timer);
    window.clearInterval(this._decayTimer);
    void this._unsubTraffic?.();
    this._unsubTraffic = undefined;
  }

  protected updated(changed: PropertyValues): void {
    if (changed.has("hass") && !changed.get("hass") && this.hass) {
      void this._load();
      void this._subscribe();
    }
  }

  // --- live traffic -------------------------------------------------------------------

  private async _subscribe(): Promise<void> {
    if (!this.hass?.connection || this._unsubTraffic || this._subscribing) return;
    this._subscribing = true;
    try {
      const message: Record<string, unknown> = { type: "zigbee_health/traffic" };
      if (this._config?.config_entry_id) message.config_entry_id = this._config.config_entry_id;
      this._unsubTraffic = await this.hass.connection.subscribeMessage<TrafficMessage>(
        (msg) => this._onTraffic(msg),
        message,
      );
    } catch {
      // Older backend without live traffic: the card works without it.
    } finally {
      this._subscribing = false;
    }
  }

  private _onTraffic(msg: TrafficMessage): void {
    if (msg.alerts) this._alerts = msg.alerts;
    const counts = Object.entries(msg.counts ?? {});
    if (!counts.length) return;
    const total = counts.reduce((sum, [, n]) => sum + n, 0);
    this._rateWindow[this._rateWindow.length - 1] =
      (this._rateWindow[this._rateWindow.length - 1] ?? 0) + total;
    const heat = { ...this._heat };
    for (const [ieee, n] of counts) {
      heat[ieee] = Math.min(1, (heat[ieee] ?? 0) + 0.45 * n);
      if (this._live && (this._tab === "map" || this.panelMode)) {
        const floor =
          this._view === "floor"
            ? this.renderRoot.querySelector<ZigbeeHealthBuilding>("zigbee-health-building")
            : this._view === "3d"
              ? this.renderRoot.querySelector<ZigbeeHealth3d>("zigbee-health-3d")
              : null;
        for (let i = 0; i < Math.min(n, 3); i++) {
          if (floor) floor.spark(ieee, i * 160);
          else this._spark(ieee, i * 160);
        }
      }
    }
    this._heat = heat;
  }

  /** Once per second: decay the glow, roll the messages/min window. */
  private _tick(): void {
    if (this._report && !this._report.ready) this.requestUpdate();
    this._rateWindow.push(0);
    if (this._rateWindow.length > RATE_WINDOW) this._rateWindow.shift();
    if (this._unsubTraffic && this._rateWindow.length >= 5) {
      const seconds = this._rateWindow.length;
      const sum = this._rateWindow.reduce((a, b) => a + b, 0);
      this._rate = Math.round((sum / seconds) * 60);
    }
    const entries = Object.entries(this._heat);
    if (!entries.length) return;
    const next: Record<string, number> = {};
    for (const [ieee, value] of entries) {
      const decayed = value * 0.82;
      if (decayed > 0.04) next[ieee] = decayed;
    }
    this._heat = next;
  }

  /** A glowing dot travelling along the route of a message to the coordinator. */
  private _spark(ieee: string, delay: number): void {
    const layout = this._layout;
    const layer = this.renderRoot.querySelector<SVGGElement>("g.traffic");
    if (!layout || !layer || this._sparks >= MAX_SPARKS) return;
    const route = routeToCoordinator(layout, ieee)
      .map((id) => layout.placed.get(id))
      .filter((p): p is PlacedNode => !!p);
    if (route.length < 2) return;
    let length = 0;
    for (let i = 1; i < route.length; i++) {
      length += Math.hypot(route[i].x - route[i - 1].x, route[i].y - route[i - 1].y);
    }
    const duration = Math.max(0.7, length / SPARK_SPEED);
    const ns = "http://www.w3.org/2000/svg";
    const dot = document.createElementNS(ns, "circle");
    dot.setAttribute("r", "4");
    dot.setAttribute("class", `spark ${route[0].node?.type === "router" ? "router" : ""}`);
    const motion = document.createElementNS(ns, "animateMotion");
    motion.setAttribute("dur", `${duration}s`);
    motion.setAttribute("fill", "freeze");
    motion.setAttribute("begin", "indefinite");
    motion.setAttribute("path", `M${route.map((p) => `${p.x},${p.y}`).join(" L")}`);
    dot.appendChild(motion);
    this._sparks++;
    window.setTimeout(() => {
      layer.appendChild(dot);
      (motion as SVGAnimationElement).beginElement();
      window.setTimeout(() => {
        dot.remove();
        this._sparks--;
      }, duration * 1000 + 60);
    }, delay);
  }

  private get _t(): Translate {
    return translator(this.hass?.locale?.language ?? this.hass?.language);
  }

  private async _load(): Promise<void> {
    if (!this.hass || this._loading) return;
    this._loading = true;
    try {
      const data: Record<string, unknown> = { format: "full" };
      if (this._config?.config_entry_id) data.config_entry_id = this._config.config_entry_id;
      const result = await this.hass.callWS<{ response: Report }>({
        type: "call_service",
        domain: "zigbee_health",
        service: "get_report",
        service_data: data,
        return_response: true,
      });
      const wasReady = this._report?.ready;
      this._report = result.response;
      this._layout = this._report.topology ? computeLayout(this._report.topology) : undefined;
      this._error = undefined;
      if (!this._report.ready) this._readyAt = Date.now() + (this._report.warmup_left ?? 0) * 1000;
      if (this._report.ready && wasReady === false) void this._runCheck(true);
      else this._maybeFirstCheck();
    } catch (err) {
      this._error = err instanceof Error ? err.message : String((err as { message?: string })?.message ?? err);
    } finally {
      this._loading = false;
    }
  }

  // --- network check -------------------------------------------------------------

  private async _runCheck(auto = false): Promise<void> {
    if (!this.hass || this._check) return;
    if (!this.panelMode) this._tab = "map";
    this._plan = undefined;
    this._check = { phase: "sweep", step: 0, scanStarted: false };
    const started = Date.now();
    const stepper = window.setInterval(() => {
      if (this._check?.phase === "sweep" && this._check.step < CHECK_STEPS.length - 1) {
        this._check = { ...this._check, step: this._check.step + 1 };
      }
    }, CHECK_MIN_MS / CHECK_STEPS.length);
    let result: Report | undefined = auto ? this._report : undefined;
    if (!auto) {
      try {
        const message: Record<string, unknown> = { type: "zigbee_health/check" };
        if (this._config?.config_entry_id) message.config_entry_id = this._config.config_entry_id;
        result = await this.hass.callWS<Report>(message);
      } catch {
        result = this._report;
      }
    }
    const wait = CHECK_MIN_MS - (Date.now() - started);
    if (wait > 0) await new Promise((resolve) => window.setTimeout(resolve, wait));
    window.clearInterval(stepper);
    if (result?.ready) {
      this._report = result;
      this._layout = result.topology ? computeLayout(result.topology) : undefined;
      this._plans = undefined;
    }
    this._check = { phase: "reveal", step: CHECK_STEPS.length, scanStarted: !!result?.scan_started };
    this._animateScore(result?.score ?? this._report?.score ?? 0);
  }

  private _animateScore(target: number): void {
    const start = performance.now();
    const duration = 1300;
    const frame = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      this._countUp = Math.round(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  private _closeCheck(tab?: Tab): void {
    this._check = undefined;
    if (tab) this._tab = tab;
    try {
      localStorage.setItem(CHECK_SEEN_KEY, "1");
    } catch {
      // storage may be unavailable
    }
  }

  private _maybeFirstCheck(): void {
    if (!this.panelMode || this._check || !this._report?.ready) return;
    let seen = true;
    try {
      seen = localStorage.getItem(CHECK_SEEN_KEY) === "1";
    } catch {
      seen = true;
    }
    if (!seen) void this._runCheck(true);
  }

  // --- router planner --------------------------------------------------------------

  private async _loadPlans(): Promise<void> {
    if (!this.hass || this._planLoading) return;
    this._planLoading = true;
    try {
      const message: Record<string, unknown> = { type: "zigbee_health/plan" };
      if (this._config?.config_entry_id) message.config_entry_id = this._config.config_entry_id;
      const result = await this.hass.callWS<{ plans: Plan[] }>(message);
      this._plans = result.plans;
    } catch {
      this._plans = [];
    } finally {
      this._planLoading = false;
    }
  }

  private _selectPlan(plan: Plan | undefined): void {
    this._plan = this._plan?.area_id === plan?.area_id ? undefined : plan;
    this._focus = undefined;
    this._filter = undefined;
    this._hover = undefined;
    if (this._plan && !this.panelMode) this._tab = "map";
  }

  /** Mark the devices and rooms of a measure or finding on the map and floor plan. */
  private _showFocus(title: string, ieees: string[], areas: string[]): void {
    const nodes = this._report?.topology?.nodes ?? [];
    const inRooms = nodes.filter((n) => n.area_id && areas.includes(n.area_id)).map((n) => n.ieee);
    this._focus = { title, ieees: [...new Set([...ieees, ...inRooms])], areas };
    this._check = undefined;
    this._plan = undefined;
    this._filter = undefined;
    this._hover = undefined;
    if (!this.panelMode) this._tab = "map";
    // Dead devices are not on the map but in the strip below it.
    void this.updateComplete.then(() =>
      this.renderRoot.querySelector(".strip.marked")?.scrollIntoView({ block: "nearest", behavior: "smooth" }),
    );
  }

  /** Planner for rooms without router: open it with the best plan among those rooms. */
  private async _planFor(areas: string[]): Promise<void> {
    this._tab = "plan";
    this._check = undefined;
    if (!this._plans) await this._loadPlans();
    const plan = this._plans?.find((p) => areas.includes(p.area_id));
    if (plan) {
      this._plan = undefined;
      this._selectPlan(plan);
    }
  }

  private _renderFocusBanner() {
    const focus = this._focus;
    if (!focus || this._plan) return nothing;
    const t = this._t;
    return html`<div class="plan-banner focus-banner">
      <span class="pi">!</span>
      <span class="pt">
        <b>${focus.title}</b>
        <span>${t("focus.marked", { n: focus.ieees.length })}${focus.areas.length ? ` · ${t("focus.rooms", { n: focus.areas.length })}` : ""}</span>
      </span>
      <button class="btn ghost" @click=${() => (this._focus = undefined)}>${t("focus.clear")}</button>
    </div>`;
  }

  /** Open the device panel; the device page in HA is one click further inside it. */
  private _openDevice(node: TopologyNode | undefined): void {
    if (node) this._device = node.ieee;
  }

  private _onDeviceEvent = (ev: Event) => {
    const ieee = (ev as CustomEvent<{ ieee: string }>).detail?.ieee;
    if (ieee) this._device = ieee;
  };

  private _renderDevicePanel() {
    if (!this._device) return nothing;
    return html`<zigbee-health-device
      .hass=${this.hass}
      .report=${this._report}
      .ieee=${this._device}
      .t=${this._t}
      .configEntryId=${this._config?.config_entry_id}
      @close=${() => (this._device = undefined)}
      @changed=${() => void this._load()}
      @removed=${(ev: CustomEvent<{ name: string }>) => {
        this._toast = this._t("device.removed", { name: ev.detail.name });
        window.setTimeout(() => (this._toast = undefined), 6000);
        // Zigbee2MQTT publishes the new device list shortly after the removal.
        window.setTimeout(() => void this._load(), 2500);
      }}
    ></zigbee-health-device>
    ${nothing}`;
  }

  private _renderToast() {
    return this._toast ? html`<div class="toast" role="status">${this._toast}</div>` : nothing;
  }

  // --- render -------------------------------------------------------------------------

  protected render() {
    const t = this._t;
    const report = this._report;
    if (!report) {
      return html`<ha-card><div class="empty">${this._error ? `${t("error")}: ${this._error}` : t("loading")}</div></ha-card>`;
    }
    if (!report.ready) return this._renderWaiting(report);
    if (this.panelMode) {
      return html`${this._renderPanel(report)} ${this._renderDevicePanel()} ${this._renderToast()}`;
    }
    return html`<ha-card>
      <div class="wrap">
        ${this._renderHeader(report)} ${this._renderAlerts()} ${this._renderTiles(report)}
        ${this._renderTabs(report, ["map", "actions", "plan", "findings", "rooms"])}
        ${this._tab === "map"
          ? this._renderMap(report)
          : this._tab === "actions"
            ? this._renderActions(report)
            : this._tab === "plan"
              ? this._renderPlans()
              : this._tab === "findings"
                ? this._renderFindings(report)
                : this._renderRooms(report)}
      </div>
    ${this._renderDevicePanel()} ${this._renderToast()}
    </ha-card>`;
  }

  private _renderPanel(report: Report) {
    if (this._tab === "map") this._tab = "actions";
    const content =
      this._tab === "actions"
        ? this._renderActions(report)
        : this._tab === "plan"
          ? this._renderPlans()
          : this._tab === "findings"
            ? this._renderFindings(report)
            : this._tab === "rooms"
              ? this._renderRooms(report)
              : this._renderDevices(report);
    return html`<div class="panel-layout ${this.narrow ? "narrow" : ""}">
      <ha-card class="map-card"><div class="wrap map-wrap">${this._renderMap(report)}</div></ha-card>
      <div class="side">
        <ha-card>
          <div class="wrap">
            ${this._renderHeader(report)} ${this._renderAlerts()} ${this._renderTiles(report)}
          </div>
        </ha-card>
        <ha-card class="side-content">
          <div class="wrap">
            ${this._renderTabs(report, ["actions", "plan", "findings", "rooms", "devices"])}
            ${content}
          </div>
        </ha-card>
      </div>
    </div>`;
  }

  private _renderWaiting(report: Report) {
    const t = this._t;
    const left = Math.max(0, Math.round((this._readyAt - Date.now()) / 1000));
    const mm = Math.floor(left / 60);
    const ss = String(left % 60).padStart(2, "0");
    const body = html`<div class="waiting">
      <div class="radar big"><div class="sweep"></div><div class="rings"></div><div class="core">Z</div></div>
      <h3>${t("check.first_title")}</h3>
      <p>
        ${t("check.found", { n: report.devices_found ?? 0 })}
        ${report.scanning ? html` · ${t("check.scanning")}` : nothing}
      </p>
      <p class="muted">${left > 0 ? t("check.ready_in", { time: `${mm}:${ss}` }) : t("check.almost")}</p>
      <button class="btn" @click=${() => this._runCheck()}>${t("check.now")}</button>
    </div>`;
    return this.panelMode
      ? html`<ha-card class="waiting-card">${body}</ha-card>`
      : html`<ha-card><div class="wrap">${body}</div></ha-card>`;
  }

  private _renderCheckOverlay(report: Report) {
    const check = this._check;
    if (!check) return nothing;
    const t = this._t;
    if (check.phase === "sweep") {
      const nodes = report.topology?.nodes.length ?? 0;
      return html`<div class="check-overlay">
        <div class="radar"><div class="sweep"></div></div>
        <ul class="steps">
          ${CHECK_STEPS.map(
            (step, i) => html`<li class=${i < check.step ? "done" : i === check.step ? "run" : ""}>
              <i></i>${t(`check.step.${step}`, { n: nodes })}
            </li>`,
          )}
        </ul>
      </div>`;
    }
    const level = report.level ?? "stable";
    const actions = report.actions ?? [];
    return html`<div class="check-overlay reveal">
      <div class="verdict">
        <div class="big" style="color:${LEVEL_COLOR[level]}">${this._countUp}</div>
        <div class="of">${t("check.of")}</div>
        <div class="lvl lvl-${level}">${t(`level.${level}`)}</div>
        <p class="lead">
          ${actions.length
            ? t(actions.length === 1 ? "check.todo_one" : "check.todo", { n: actions.length })
            : t("check.nothing")}
        </p>
        <ol>
          ${actions.map(
            (a) => html`<li>${t(`action.${a.key}`, { count: a.count })}</li>`,
          )}
        </ol>
        ${check.scanStarted ? html`<p class="muted">${t("check.scan_started")}</p>` : nothing}
        <div class="row">
          <button class="btn ghost" @click=${() => this._closeCheck()}>${t("check.to_map")}</button>
          ${actions.length
            ? html`<button class="btn" @click=${() => this._closeCheck("actions")}>
                ${t("check.to_actions")}
              </button>`
            : nothing}
          <button class="btn ghost" @click=${() => {
            this._closeCheck("plan");
            void this._loadPlans();
          }}>${t("check.to_plan")}</button>
        </div>
      </div>
    </div>`;
  }

  private _renderPlans() {
    const t = this._t;
    if (this._planLoading && !this._plans) return html`<div class="empty">${t("plan.loading")}</div>`;
    const plans = this._plans ?? [];
    if (!plans.length) return html`<div class="empty">${t("plan.no_areas")}</div>`;
    const useful = plans.filter((p) => p.impact > 0);
    return html`<div class="plans">
      <div class="plan-intro">
        <b>${t("plan.title")}</b>
        <span>${t("plan.subtitle")}</span>
      </div>
      ${useful.length
        ? nothing
        : html`<div class="empty">${t("plan.all_good")}</div>`}
      ${useful.map(
        (p, i) => html`<button
          class="plan ${this._plan?.area_id === p.area_id ? "on" : ""} ${i === 0 ? "best" : ""}"
          @click=${() => this._selectPlan(p)}
        >
          <span class="rank">${i + 1}</span>
          <span class="pb">
            <b>${p.area_name}${i === 0 ? html`<em>${t("plan.best")}</em>` : nothing}</b>
            <span>${p.improved.length
              ? t(p.improved.length === 1 ? "plan.improved_one" : "plan.improved", { n: p.improved.length })
              : t("plan.no_devices")}</span>
            <span class="res">
              ${Object.entries(p.resolved).map(
                ([type, n]) => html`<span class="chip">${t(`plan.resolved.${type}`, { n })}</span>`,
              )}
            </span>
          </span>
          <span class="ps">
            <span class="room">${p.room_score_before} → <b>${p.room_score_after}</b></span>
            <span class="k">${t("plan.room_score")}</span>
            ${p.gain > 0 ? html`<span class="net">${t("plan.network", { n: p.gain })}</span>` : nothing}
          </span>
        </button>`,
      )}
    </div>`;
  }

  private _planPosition(plan: Plan): { x: number; y: number } | null {
    const layout = this._layout;
    if (!layout) return null;
    const points = plan.improved
      .map((i) => layout.placed.get(i.ieee))
      .filter((p): p is PlacedNode => !!p);
    if (!points.length) return null;
    const sx = points.reduce((s, p) => s + Math.cos(p.angle), 0);
    const sy = points.reduce((s, p) => s + Math.sin(p.angle), 0);
    const angle = Math.atan2(sy, sx);
    return { x: CENTER + 205 * Math.cos(angle), y: CENTER + 205 * Math.sin(angle) };
  }

  private _renderPlanOverlay() {
    const plan = this._plan;
    const layout = this._layout;
    if (!plan || !layout) return nothing;
    const pos = this._planPosition(plan);
    if (!pos) return nothing;
    return svg`<g class="plan-layer">
      ${plan.improved.map((i) => {
        const p = layout.placed.get(i.ieee);
        return p
          ? svg`<path class="planned-edge" d="M${p.x},${p.y} L${pos.x},${pos.y}"></path>`
          : nothing;
      })}
      <circle class="pulse plan-pulse" cx=${pos.x} cy=${pos.y} r="13"></circle>
      <rect class="virtual" x=${pos.x - 14} y=${pos.y - 14} width="28" height="28" rx="7"></rect>
      <path class="virtual-plus" d="M${pos.x - 6},${pos.y} h12 M${pos.x},${pos.y - 6} v12"></path>
      <text class="label plan-label" x=${pos.x} y=${pos.y + 32} text-anchor="middle">${this._t("plan.virtual", { room: plan.area_name })}</text>
    </g>`;
  }

  private _renderPlanBanner() {
    const plan = this._plan;
    if (!plan) return nothing;
    const t = this._t;
    return html`<div class="plan-banner">
      <span class="pi">+</span>
      <span class="pt">
        <b>${t("plan.banner", { room: plan.area_name })}</b>
        <span>
          ${t(plan.improved.length === 1 ? "plan.improved_one" : "plan.improved", { n: plan.improved.length })}
          · ${t("plan.room_score")} ${plan.room_score_before} → ${plan.room_score_after}
          ${plan.gain > 0 ? html` · ${t("plan.network", { n: plan.gain })}` : nothing}
        </span>
      </span>
      <button class="btn ghost" @click=${() => this._selectPlan(undefined)}>${t("plan.discard")}</button>
    </div>`;
  }

  private _renderDevices(report: Report) {
    const t = this._t;
    const topology = report.topology;
    if (!topology) return html`<div class="empty">${t("not_ready")}</div>`;
    const byId = new Map(topology.nodes.map((n) => [n.ieee, n]));
    const coordinatorId = topology.coordinator?.ieee;
    const query = this._query.trim().toLowerCase();
    const rows = topology.nodes
      .filter(
        (n) =>
          !query ||
          n.name.toLowerCase().includes(query) ||
          (n.area ?? "").toLowerCase().includes(query),
      )
      .sort(
        (a, b) =>
          STATE_ORDER.indexOf(a.state) - STATE_ORDER.indexOf(b.state) ||
          a.name.localeCompare(b.name, undefined, { numeric: true }),
      );
    const parentName = (n: TopologyNode): string =>
      n.parent === coordinatorId
        ? t("coordinator")
        : n.parent
          ? (byId.get(n.parent)?.name ?? "?")
          : n.type === "router"
            ? "–"
            : t("unknown_parent");
    return html`<input
        id="zh-search"
        class="search"
        type="search"
        placeholder=${t("search")}
        .value=${this._query}
        @input=${(ev: Event) => (this._query = (ev.target as HTMLInputElement).value)}
      />
      <div class="devlist">
        ${rows.map(
          (n) => html`<button class="dev" @click=${() => this._openDevice(n)}>
            <span class="dot st-${n.kind === "unclear" && n.state === "ok" ? "unclear" : n.state} ${n.type}"></span>
            <span class="dn">
              <b>${n.name}</b>
              <span
                >${t(`state.${n.state}`)}${n.area ? ` · ${n.area}` : ""} ·
                ${n.type === "router" ? t(`kind.${n.kind ?? "always_on"}`) : t("end_device")}</span
              >
            </span>
            <span class="dm">
              <span>${parentName(n)}${n.parent_lqi ? html` · <b class="lqi-t lqi-${lqiClass(n.parent_lqi)}">${n.parent_lqi}</b>` : nothing}</span>
              <span>${n.battery !== null ? `${Math.round(n.battery)} % · ` : ""}${ago(n.last_seen, t)}</span>
            </span>
          </button>`,
        )}
      </div>`;
  }

  private _renderHeader(report: Report) {
    const t = this._t;
    const score = report.score ?? 0;
    const level = report.level ?? "paused";
    const circumference = 2 * Math.PI * 36;
    const nodes = report.topology?.nodes.length ?? report.counts?.devices ?? 0;
    return html`<div class="head">
      <div class="gauge">
        <svg viewBox="0 0 84 84">
          <circle class="track" cx="42" cy="42" r="36"></circle>
          <circle
            class="value"
            cx="42"
            cy="42"
            r="36"
            stroke=${LEVEL_COLOR[level]}
            stroke-dasharray="${(circumference * score) / 100} ${circumference}"
          ></circle>
        </svg>
        <div class="num">${report.ready ? score : "–"}<small>/ 100</small></div>
      </div>
      <div class="headtext">
        <h2 class="title">${this._config?.title ?? t("title")}</h2>
        <div class="level lvl-${level}"><span class="dot"></span>${t(`level.${level}`)}</div>
        <div class="sub">
          ${nodes} ${t("devices")} · ${t("last_scan")} ${ago(report.last_scan, t)}${this._rate !== null
            ? html` · <span class="live-rate"><i></i>${t("per_minute", { n: this._rate })}</span>`
            : nothing}
        </div>
      </div>
      <div class="btns">
        <button class="checkbtn" title=${t("check.button")} @click=${() => this._runCheck()}>
          ${ICON_SCAN}<span>${t("check.button")}</span>
        </button>
        <button class="iconbtn ${this._loading ? "busy" : ""}" title=${t("refresh")} @click=${() => this._load()}>
          ${ICON_REFRESH}
        </button>
      </div>
    </div>`;
  }

  private _renderAlerts() {
    if (!this._alerts.length) return nothing;
    const t = this._t;
    return html`${this._alerts.map(
      (a) => html`<button
        class="alert"
        @click=${() => {
          if (!this.panelMode) this._tab = "map";
          this._filter = undefined;
          this._hover = a.ieee;
        }}
      >
        <span class="bolt">${ICON_BOLT}</span>
        <span class="at">
          <b>${t("alert.title", { name: a.name })}</b>
          <span
            >${a.children.length > 1
              ? t("alert.children", { n: a.children.length, names: a.children.join(", ") })
              : a.children.length === 1
                ? t("alert.child", { names: a.children[0] })
                : t("alert.no_children")}
            · ${ago(a.since, t)}</span
          >
        </span>
      </button>`,
    )}`;
  }

  private _renderTiles(report: Report) {
    const t = this._t;
    return html`<div class="tiles">
      ${TILES.map((tile) => {
        const n = report.counts?.[tile.key] ?? 0;
        const zero = n === 0 && tile.key !== "routers_always_on";
        return html`<button
          class="tile ${this._filter === tile.key ? "active" : ""} ${zero ? "zero" : ""}"
          style="--accent:${tile.color}"
          @click=${() => {
            this._filter = this._filter === tile.key ? undefined : tile.key;
            if (tile.key !== "dead" && !this.panelMode) this._tab = "map";
          }}
        >
          <div class="n">${n}</div>
          <div class="l">${t(`tile.${tile.key}`)}</div>
        </button>`;
      })}
    </div>`;
  }

  private _renderTabs(report: Report, tabs: Tab[]) {
    const t = this._t;
    const critical = (report.findings ?? []).filter((f) => f.severity !== "info").length;
    return html`<div class="tabs" role="tablist">
      ${tabs.map(
        (tab) => html`<button
          role="tab"
          class=${this._tab === tab ? "on" : ""}
          @click=${() => {
            this._tab = tab;
            if (tab === "plan" && !this._plans) void this._loadPlans();
          }}
        >
          ${t(`tab.${tab}`)}${tab === "findings" && critical
            ? html`<span class="badge">${critical}</span>`
            : nothing}
        </button>`,
      )}
    </div>`;
  }

  // --- network map ----------------------------------------------------------------------

  private _highlight(): Set<string> | undefined {
    const layout = this._layout;
    if (!layout) return undefined;
    if (this._plan) return new Set(this._plan.improved.map((i) => i.ieee));
    if (this._hover) return pathToCoordinator(layout, this._hover);
    if (this._focus) return new Set(this._focus.ieees);
    if (this._filter) {
      const tile = TILES.find((x) => x.key === this._filter);
      const nodes = this._report?.topology?.nodes ?? [];
      if (tile) return new Set(nodes.filter(tile.filter).map((n) => n.ieee));
    }
    return undefined;
  }

  private _renderMap(report: Report) {
    const layout = this._layout;
    const topology = report.topology;
    if (!layout || !topology) return html`<div class="empty">${this._t("not_ready")}</div>`;
    const t = this._t;
    const hl = this._highlight();
    const placed = layout.placed;
    const edgeHl = (e: Edge): boolean =>
      !!hl && hl.has(e.from) && hl.has(e.to) && e.kind !== "mesh";

    const toggle = html`<div class="viewswitch" role="group">
      ${(["map", "floor", "3d"] as const).map(
        (view) => html`<button
          class=${this._view === view ? "on" : ""}
          @click=${() => {
            this._view = view;
            try {
              localStorage.setItem(VIEW_KEY, view);
            } catch {
              // storage may be unavailable
            }
          }}
        >
          ${t(`view.${view}`)}
        </button>`,
      )}
    </div>`;
    if (this._view === "floor") {
      return html`${toggle} ${this._renderPlanBanner()} ${this._renderFocusBanner()}
        <zigbee-health-building
          .marked=${this._focus}
          .hass=${this.hass}
          .report=${report}
          .layout=${layout}
          .heat=${this._heat}
          .alerts=${this._alerts}
          .plan=${this._plan}
          .t=${t}
          .live=${this._live}
          .configEntryId=${this._config?.config_entry_id}
        ></zigbee-health-building>`;
    }
    if (this._view === "3d") {
      return html`${toggle} ${this._renderFocusBanner()}
        <zigbee-health-3d
          .marked=${this._focus}
          .hass=${this.hass}
          .report=${report}
          .layout=${layout}
          .heat=${this._heat}
          .alerts=${this._alerts}
          .t=${t}
          .live=${this._live}
          .configEntryId=${this._config?.config_entry_id}
        ></zigbee-health-3d>`;
    }
    return html`${toggle} ${this._renderPlanBanner()} ${this._renderFocusBanner()}<div class="mapbox">
        <svg
          class="map ${hl ? "dim" : ""} ${this._check?.phase === "sweep" ? "checking" : ""}"
          viewBox="-60 -20 920 840"
          @mouseleave=${() => (this._hover = undefined)}
        >
          ${[150, 240, 330].map(
            (r) => svg`<circle class="guide" cx=${CENTER} cy=${CENTER} r=${r}></circle>`,
          )}
          ${layout.unknownAngle !== null
            ? svg`<text class="group-label" x=${CENTER + 392 * Math.cos(layout.unknownAngle)} y=${CENTER + 392 * Math.sin(layout.unknownAngle) + 4} text-anchor=${Math.cos(layout.unknownAngle) > 0.2 ? "start" : Math.cos(layout.unknownAngle) < -0.2 ? "end" : "middle"}>${t("unknown_parent")}</text>`
            : nothing}
          <g>
            ${layout.edges.map((e) => {
              const a = placed.get(e.from);
              const b = placed.get(e.to);
              if (!a || !b) return nothing;
              return svg`<path
                class="edge ${e.kind} lqi-${lqiClass(e.lqi)} ${edgeHl(e) ? "hl" : ""}"
                d=${this._edgePath(a, b, e)}
              ></path>`;
            })}
          </g>
          <g>${[...placed.values()].map((p) => this._renderNode(p, hl))}</g>
          ${this._renderPlanOverlay()}
          <g class="traffic"></g>
        </svg>
        ${this._renderTip()} ${this._renderCheckOverlay(report)}
      </div>
      <div class="legend">
        <span>${svg`<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="var(--primary-color,#03a9f4)"/></svg>`}${t("coordinator")}</span>
        <span>${svg`<svg viewBox="0 0 16 16"><rect x="2" y="2" width="12" height="12" rx="3" class="st-ok"/></svg>`}${t("kind.always_on")}</span>
        <span>${svg`<svg viewBox="0 0 16 16"><rect x="2" y="2" width="12" height="12" rx="3" class="st-part_time_router" stroke="var(--zh-part)" stroke-dasharray="3 2" stroke-width="1.6"/></svg>`}${t("kind.part_time")}</span>
        <span>${svg`<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="5" class="st-ok"/></svg>`}${t("end_device")}</span>
        <span
          >${t("legend_lqi")}<span class="bar"
            ><span style="background:var(--zh-bad)"></span><span style="background:var(--zh-ok)"></span
            ><span style="background:var(--zh-good)"></span></span
        ></span>
        ${this._unsubTraffic
          ? html`<label class="switch live"
              ><input
                type="checkbox"
                .checked=${this._live}
                @change=${(ev: Event) => (this._live = (ev.target as HTMLInputElement).checked)}
              />${t("live")}</label
            >`
          : nothing}
        <label class="switch"
          ><input
            type="checkbox"
            .checked=${this._labels}
            @change=${(ev: Event) => (this._labels = (ev.target as HTMLInputElement).checked)}
          />${t("labels")}</label
        >
      </div>
      ${this._renderDead(layout.dead)}`;
  }

  private _edgePath(a: PlacedNode, b: PlacedNode, e: Edge): string {
    if (e.kind === "mesh" || e.kind === "backbone") {
      // Slight curve through the centre side keeps parallel links apart.
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const pull = e.kind === "mesh" ? 0.25 : 0.12;
      const cx = mx + (CENTER - mx) * pull;
      const cy = my + (CENTER - my) * pull;
      return `M${a.x},${a.y} Q${cx},${cy} ${b.x},${b.y}`;
    }
    return `M${a.x},${a.y} L${b.x},${b.y}`;
  }

  private _renderNode(p: PlacedNode, hl: Set<string> | undefined) {
    const node = p.node;
    const on = !!hl && hl.has(p.id);
    const enter = (ev: MouseEvent) => {
      const box = (this.renderRoot.querySelector(".mapbox") as HTMLElement).getBoundingClientRect();
      this._tipPos = { x: ev.clientX - box.left, y: ev.clientY - box.top };
      this._hover = p.id;
    };
    if (!node) {
      return svg`<g class="node coord ${on ? "hl" : ""}" @mouseenter=${enter}>
        <circle class="shape" cx=${p.x} cy=${p.y} r="24"></circle>
        <path class="glyph" d="M${p.x - 9},${p.y - 8} h18 l-18,16 h18"></path>
      </g>`;
    }
    const router = node.type === "router";
    const kind = node.kind === "part_time" ? "part" : node.kind === "unclear" ? "unclear" : "";
    const stateClass =
      node.kind === "unclear" && node.state === "ok" ? "unclear" : node.state;
    const size = router ? 20 : 13;
    const critical =
      node.state === "offline" ||
      node.state === "battery" ||
      (node.kind === "part_time" && node.children.length > 0);
    const label = router || this._labels || on;
    const heat = this._live ? (this._heat[p.id] ?? 0) : 0;
    const alerted = this._alerts.some((a) => a.ieee === p.id);
    // Labels point away from the centre so neighbours on a ring do not collide.
    const cos = Math.cos(p.angle);
    const sin = Math.sin(p.angle);
    const gap = size / 2 + 7;
    const lx = p.x + cos * gap;
    const ly = p.y + sin * gap + 4 + (Math.abs(cos) < 0.35 ? sin * 6 : 0);
    const anchor = cos > 0.35 ? "start" : cos < -0.35 ? "end" : "middle";
    const orphan = this._layout?.unknownParent.has(node.ieee) ?? false;
    const name = node.name.length > 22 ? `${node.name.slice(0, 21)}…` : node.name;
    return svg`<g
      class="node ${kind} ${node.state} ${orphan ? "orphan" : ""} ${alerted ? "alerted" : ""} ${on ? "hl" : ""} ${this._hover === p.id ? "sel" : ""}"
      @mouseenter=${enter}
      @click=${() => this._openDevice(node)}
    >
      ${heat > 0.05 ? svg`<circle class="heat" cx=${p.x} cy=${p.y} r=${size / 2 + 3 + heat * 6} style="opacity:${0.12 + heat * 0.33}"></circle>` : nothing}
      ${alerted ? svg`<circle class="pulse alarm" cx=${p.x} cy=${p.y} r=${size / 2}></circle>` : nothing}
      ${critical && !alerted ? svg`<circle class="pulse" cx=${p.x} cy=${p.y} r=${size / 2} stroke=${node.state === "offline" ? "var(--zh-muted)" : node.state === "battery" ? "#f57c00" : "var(--zh-part)"}></circle>` : nothing}
      ${router
        ? svg`<rect class="shape st-${stateClass}" x=${p.x - size / 2} y=${p.y - size / 2} width=${size} height=${size} rx="5"></rect>`
        : svg`<circle class="shape st-${stateClass}" cx=${p.x} cy=${p.y} r=${size / 2}></circle>`}
      ${label
        ? svg`<text class="label ${router ? "" : "small"}" x=${lx} y=${ly} text-anchor=${anchor}>${name}</text>`
        : nothing}
    </g>`;
  }

  private _renderTip() {
    const layout = this._layout;
    if (!this._hover || !layout) return nothing;
    const t = this._t;
    const p = layout.placed.get(this._hover);
    if (!p) return nothing;
    const node = p.node;
    const style = `left:${this._tipPos.x}px;top:${this._tipPos.y}px`;
    if (!node) {
      const count = this._report?.topology?.nodes.filter((n) => n.parent === p.id).length ?? 0;
      return html`<div class="tip" style=${style}>
        <b>${this._report?.topology?.coordinator?.name ?? t("coordinator")}</b>
        <div class="k">${t("coordinator")}</div>
        <div class="row"><span class="k">${t("children")}</span><span>${count}</span></div>
      </div>`;
    }
    const parentName =
      node.parent === layout.coordinatorId
        ? t("coordinator")
        : this._report?.topology?.nodes.find((n) => n.ieee === node.parent)?.name;
    const kindText = node.type === "router" ? t(`kind.${node.kind ?? "always_on"}`) : t("end_device");
    return html`<div class="tip" style=${style}>
      <b>${node.name}</b>
      <div class="k">${kindText}${node.area ? ` · ${node.area}` : ""}</div>
      <span class="pill"><i class="st-${node.state}" style="background:currentColor"></i>${t(`state.${node.state}`)}</span>
      ${parentName
        ? html`<div class="row"><span class="k">${t("parent")}</span><span>${parentName}${node.parent_lqi ? ` · LQI ${node.parent_lqi}` : ""}</span></div>`
        : node.type === "end_device"
          ? html`<div class="row"><span class="k">${t("parent")}</span><span>${t("unknown_parent")}</span></div>`
          : nothing}
      ${node.children.length
        ? html`<div class="row"><span class="k">${t("children")}</span><span>${node.children.length}</span></div>`
        : nothing}
      ${node.battery !== null
        ? html`<div class="row"><span class="k">${t("battery")}</span><span>${Math.round(node.battery)} %</span></div>`
        : nothing}
      ${node.battery_empty
        ? html`<div class="row"><span class="k">${t("battery_empty")}</span><span>${new Date(node.battery_empty).toLocaleDateString()}</span></div>`
        : nothing}
      ${node.last_seen
        ? html`<div class="row"><span class="k">${t("last_seen")}</span><span>${ago(node.last_seen, t)}</span></div>`
        : nothing}
    </div>`;
  }

  private _renderDead(dead: TopologyNode[]) {
    if (!dead.length) return nothing;
    const t = this._t;
    const sorted = [...dead].sort(
      (a, b) => Date.parse(a.last_seen ?? "") - Date.parse(b.last_seen ?? "") || 0,
    );
    const marked = new Set(this._focus?.ieees ?? []);
    return html`<div class="strip ${sorted.some((n) => marked.has(n.ieee)) ? "marked" : ""}">
      <h4><i></i>${t("unreachable")} · ${dead.length}</h4>
      <div class="chips">
        ${sorted.map(
          (n) => html`<button class="chip ${marked.has(n.ieee) ? "on" : ""}" @click=${() => this._openDevice(n)}>
            ${n.name}<span>${ago(n.last_seen, t)}</span>
          </button>`,
        )}
      </div>
    </div>`;
  }

  // --- measures, findings, rooms --------------------------------------------------------

  private _renderActions(report: Report) {
    const t = this._t;
    const actions = report.actions ?? [];
    if (!actions.length) return html`<div class="empty">${t("no_actions")}</div>`;
    const admin = this.hass?.user?.is_admin ?? true;
    return html`<div class="actions">
      ${actions.map(
        (a, i) => html`<div class="action">
          <div class="no">${i + 1}</div>
          <div class="t">${t(`action.${a.key}`, { count: a.count })}</div>
          <div class="h">${t(`action.hint.${a.key}`)}</div>
          <div class="foot">
            ${a.items.slice(0, 8).map((item) => html`<span class="chip">${item}</span>`)}
            ${a.items.length > 8 ? html`<span class="chip">+${a.items.length - 8}</span>` : nothing}
            <span class="grow"></span>
            ${a.ieees?.length || a.area_ids?.length
              ? html`<button
                  class="btn ${this._focus?.title === t(`action.${a.key}`, { count: a.count }) ? "on" : ""}"
                  @click=${() =>
                    this._showFocus(t(`action.${a.key}`, { count: a.count }), a.ieees ?? [], a.area_ids ?? [])}
                >
                  ${t("focus.show")}
                </button>`
              : nothing}
            ${a.key === "add_router_rooms" || a.key === "add_routers"
              ? html`<button class="btn ghost" @click=${() => this._planFor(a.area_ids ?? [])}>
                  ${t("focus.planner")}
                </button>`
              : nothing}
            ${admin && a.key === "remove_dead"
              ? html`<button class="btn ghost" @click=${() => navigate("/config/repairs")}>
                  ${t("focus.remove_in_repairs")}
                </button>`
              : nothing}
          </div>
        </div>`,
      )}
    </div>`;
  }

  private _findingTitle(f: Finding): string {
    return this._t(`finding.${f.type}`, f.placeholders);
  }

  private _renderFindings(report: Report) {
    const t = this._t;
    const findings = report.findings ?? [];
    if (!findings.length) return html`<div class="empty">${t("no_findings")}</div>`;
    const nodes = new Map((report.topology?.nodes ?? []).map((n) => [n.ieee, n]));
    return html`${SEVERITIES.map((sev) => {
      const group = findings.filter((f) => f.severity === sev);
      if (!group.length) return nothing;
      return html`<div class="group">
        <h4>${t(`severity.${sev}`)} · ${group.length}</h4>
        ${group.map((f) => {
          const node = f.ieee ? nodes.get(f.ieee) : undefined;
          const room = f.placeholders.room && f.placeholders.room !== "-" ? f.placeholders.room : "";
          return html`<div
            class="finding sev-${f.severity}"
            @click=${() =>
              node
                ? this._openDevice(node)
                : f.area_id
                  ? this._showFocus(this._findingTitle(f), f.related, [f.area_id])
                  : navigate("/config/repairs")}
          >
            <div>
              <div class="ft">${this._findingTitle(f)}</div>
              ${room || node?.last_seen
                ? html`<div class="fs">${[room, node?.last_seen ? `${t("last_seen")} ${ago(node.last_seen, t)}` : ""].filter(Boolean).join(" · ")}</div>`
                : nothing}
            </div>
          </div>`;
        })}
      </div>`;
    })}`;
  }

  private _renderRooms(report: Report) {
    const t = this._t;
    const rooms = (report.rooms ?? []).filter((r) => r.area_id !== null);
    if (!rooms.length) return html`<div class="empty">${t("no_rooms")}</div>`;
    const color = (score: number) =>
      score >= 80 ? "var(--zh-good)" : score >= 55 ? "var(--zh-ok)" : "var(--zh-bad)";
    return html`<div class="rooms">
      ${[...rooms]
        .sort((a, b) => a.score - b.score)
        .map(
          (r) => html`<div class="room">
            <div class="rh">${r.area_name ?? t("room.without_area")}<span style="color:${color(r.score)}">${r.score}</span></div>
            <div class="bar"><div style="width:${r.score}%;background:${color(r.score)}"></div></div>
            <div class="stats">
              <span>${t("room.end_devices")} <b>${r.end_devices}</b></span>
              <span>${t("room.always_on")} <b>${r.always_on_routers}</b></span>
              ${r.part_time_routers ? html`<span>${t("room.part_time")} <b>${r.part_time_routers}</b></span>` : nothing}
              ${r.weakest_lqi !== null ? html`<span>${t("room.weakest")} <b>${r.weakest_lqi}</b></span>` : nothing}
            </div>
            ${r.recommendation ? html`<div class="rec">→ ${t(`rec.${r.recommendation}`)}</div>` : nothing}
          </div>`,
        )}
    </div>`;
  }
}

declare global {
  interface Window {
    customCards?: { type: string; name: string; description: string; preview?: boolean }[];
  }
  interface HTMLElementTagNameMap {
    "zigbee-health-card": ZigbeeHealthCard;
  }
}

window.customCards = window.customCards ?? [];
if (!window.customCards.some((c) => c.type === "zigbee-health-card")) {
  window.customCards.push({
    type: "zigbee-health-card",
    name: "Zigbee Health",
    description: "Zigbee network map, measures, findings and rooms",
    preview: true,
  });
}
