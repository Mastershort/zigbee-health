/**
 * Device panel: details and actions for one device without leaving Zigbee Health.
 * Area, name, ignore and remove go through `zigbee_health/device/update` (admin only);
 * removing always needs a second, explicit confirmation.
 */

import { LitElement, type PropertyValues, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import type { Translate } from "./i18n";
import { styles } from "./styles";
import type { Finding, HomeAssistant, Report, TopologyNode } from "./types";
import { ago, navigate } from "./util";

type Busy = "area" | "rename" | "ignore" | "remove" | null;

@customElement("zigbee-health-device")
export class ZigbeeHealthDevice extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @property({ attribute: false }) report?: Report;
  @property({ attribute: false }) ieee?: string;
  @property({ attribute: false }) t: Translate = (key) => key;
  @property({ attribute: false }) configEntryId?: string;

  @state() private _busy: Busy = null;
  @state() private _error?: string;
  @state() private _done?: string;
  @state() private _name = "";
  @state() private _confirmRemove = false;
  @state() private _force = false;

  static styles = [
    styles,
    css`
      .backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.25);
        z-index: 20;
        animation: fade 0.2s ease both;
      }
      .drawer {
        position: fixed;
        top: 0;
        right: 0;
        bottom: 0;
        width: min(400px, 100vw);
        z-index: 21;
        background: var(--zh-card);
        color: var(--zh-text);
        box-shadow: -8px 0 30px rgba(0, 0, 0, 0.2);
        display: flex;
        flex-direction: column;
        animation: slide 0.25s ease both;
        padding-top: env(safe-area-inset-top, 0px);
        padding-bottom: env(safe-area-inset-bottom, 0px);
      }
      @keyframes slide {
        from {
          transform: translateX(100%);
        }
      }
      @keyframes fade {
        from {
          opacity: 0;
        }
      }
      .head {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 18px 18px 12px;
        border-bottom: 1px solid var(--zh-line);
      }
      .head .dot {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        margin-top: 6px;
        flex: none;
        background: currentColor;
      }
      .head .router {
        border-radius: 4px;
      }
      .head h2 {
        margin: 0;
        font-size: 19px;
        font-weight: 500;
        word-break: break-word;
      }
      .head .sub {
        font-size: 13px;
        color: var(--zh-muted);
        margin-top: 2px;
      }
      .head .grow {
        flex: 1;
        min-width: 0;
      }
      .close {
        border: none;
        background: none;
        color: var(--zh-muted);
        font-size: 24px;
        line-height: 1;
        cursor: pointer;
        padding: 2px 6px;
      }
      .body {
        flex: 1;
        overflow-y: auto;
        padding: 14px 18px 24px;
        display: flex;
        flex-direction: column;
        gap: 18px;
      }
      h3 {
        margin: 0 0 8px;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--zh-muted);
      }
      .facts {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 6px 14px;
        font-size: 14px;
      }
      .facts .k {
        color: var(--zh-muted);
      }
      .finding {
        padding: 8px 10px;
        border-radius: 8px;
        background: var(--zh-surface);
        border-left: 3px solid var(--zh-muted);
        font-size: 13.5px;
        margin-bottom: 6px;
      }
      .finding.sev-critical {
        border-left-color: var(--zh-bad);
      }
      .finding.sev-warning {
        border-left-color: var(--zh-ok);
      }
      .row {
        display: flex;
        gap: 8px;
        align-items: center;
      }
      .row > input,
      .row > select {
        flex: 1;
        min-width: 0;
        font: inherit;
        font-size: 14px;
        padding: 8px 10px;
        border-radius: 8px;
        border: 1px solid var(--zh-line);
        background: var(--zh-card);
        color: var(--zh-text);
      }
      .row .btn {
        margin-left: 0;
        white-space: nowrap;
      }
      .note {
        font-size: 12.5px;
        color: var(--zh-muted);
        margin-top: 6px;
      }
      .danger {
        border: 1px solid color-mix(in srgb, var(--zh-bad) 40%, transparent);
        background: color-mix(in srgb, var(--zh-bad) 7%, var(--zh-card));
        border-radius: 10px;
        padding: 12px;
        font-size: 13.5px;
      }
      .danger label {
        display: flex;
        gap: 8px;
        align-items: flex-start;
        margin: 10px 0;
        font-size: 13px;
      }
      .btn:disabled {
        opacity: 0.45;
        cursor: default;
      }
      .btn.bad {
        background: var(--zh-bad);
        color: #fff;
      }
      .btn.outline-bad {
        background: none;
        color: var(--zh-bad);
        border: 1px solid color-mix(in srgb, var(--zh-bad) 50%, transparent);
      }
      .msg {
        font-size: 13px;
        padding: 8px 10px;
        border-radius: 8px;
      }
      .msg.err {
        color: var(--zh-bad);
        background: color-mix(in srgb, var(--zh-bad) 8%, transparent);
      }
      .msg.ok {
        color: var(--zh-good);
        background: color-mix(in srgb, var(--zh-good) 10%, transparent);
      }
      .link {
        border: none;
        background: none;
        color: var(--primary-color, #03a9f4);
        font: inherit;
        font-size: 14px;
        cursor: pointer;
        padding: 0;
        text-align: left;
      }
    `,
  ];

  private _onKey = (ev: KeyboardEvent) => {
    if (ev.key === "Escape") this._close();
  };

  connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener("keydown", this._onKey);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener("keydown", this._onKey);
  }

  protected willUpdate(changed: PropertyValues): void {
    if (changed.has("ieee")) {
      this._name = this._node?.name ?? "";
      this._confirmRemove = false;
      this._force = this._node?.state === "dead";
      this._error = undefined;
      this._done = undefined;
    }
  }

  private get _node(): TopologyNode | undefined {
    return this.report?.topology?.nodes.find((n) => n.ieee === this.ieee);
  }

  private get _admin(): boolean {
    return this.hass?.user?.is_admin ?? true;
  }

  private _close(): void {
    this.dispatchEvent(new CustomEvent("close"));
  }

  private async _run(busy: Exclude<Busy, null>, payload: Record<string, unknown>, done: string) {
    if (!this.hass || !this.ieee) return false;
    this._busy = busy;
    this._error = undefined;
    this._done = undefined;
    try {
      const message: Record<string, unknown> = {
        type: "zigbee_health/device/update",
        ieee: this.ieee,
        ...payload,
      };
      if (this.configEntryId) message.config_entry_id = this.configEntryId;
      await this.hass.callWS(message);
      this._done = done;
      this.dispatchEvent(new CustomEvent("changed"));
      return true;
    } catch (err) {
      const text = String((err as { message?: string })?.message ?? err);
      this._error = this.t("device.failed", { error: text });
      return false;
    } finally {
      this._busy = null;
    }
  }

  private async _remove(): Promise<void> {
    const name = this._node?.name ?? "";
    if (await this._run("remove", { action: "remove", force: this._force }, "")) {
      this.dispatchEvent(new CustomEvent("removed", { detail: { name } }));
      this._close();
    }
  }

  protected render() {
    const node = this._node;
    if (!this.ieee) return nothing;
    return html`<div class="backdrop" @click=${() => this._close()}></div>
      <aside class="drawer" role="dialog" aria-label=${node?.name ?? ""}>
        ${node ? this._renderNode(node) : this._renderGone()}
      </aside>`;
  }

  private _renderGone() {
    return html`<div class="head">
        <div class="grow"><h2>${this.t("device.gone")}</h2></div>
        <button class="close" @click=${() => this._close()} aria-label=${this.t("device.close")}>×</button>
      </div>`;
  }

  private _renderNode(node: TopologyNode) {
    const t = this.t;
    const topology = this.report?.topology;
    const router = node.type === "router";
    const parent =
      node.parent === topology?.coordinator?.ieee
        ? t("coordinator")
        : topology?.nodes.find((n) => n.ieee === node.parent)?.name;
    const findings = (this.report?.findings ?? []).filter((f) => f.ieee === node.ieee);
    const color =
      node.state === "dead"
        ? "var(--zh-bad)"
        : node.state === "ok"
          ? "var(--zh-good)"
          : node.state === "part_time_router"
            ? "var(--zh-part)"
            : node.state === "weak" || node.state === "battery"
              ? "var(--zh-ok)"
              : "var(--zh-muted)";
    return html`<div class="head">
        <span class="dot ${router ? "router" : ""}" style="color:${color}"></span>
        <div class="grow">
          <h2>${node.name}</h2>
          <div class="sub">
            ${router ? t(`kind.${node.kind ?? "always_on"}`) : t("end_device")} · ${t(`state.${node.state}`)}
          </div>
        </div>
        <button class="close" @click=${() => this._close()} aria-label=${t("device.close")}>×</button>
      </div>
      <div class="body">
        <section>
          <div class="facts">
            <span class="k">${t("last_seen")}</span><span>${ago(node.last_seen, t)}</span>
            <span class="k">${t("device.area")}</span><span>${node.area ?? "–"}</span>
            ${parent
              ? html`<span class="k">${t("parent")}</span>
                  <span>${parent}${node.parent_lqi ? ` · LQI ${node.parent_lqi}` : ""}</span>`
              : nothing}
            ${router
              ? html`<span class="k">${t("device.children")}</span><span>${node.children.length}</span>`
              : nothing}
            ${node.battery !== null
              ? html`<span class="k">${t("device.battery")}</span><span>${node.battery} %</span>`
              : nothing}
          </div>
        </section>
        ${findings.length
          ? html`<section>
              <h3>${t("device.findings")}</h3>
              ${findings.map(
                (f: Finding) =>
                  html`<div class="finding sev-${f.severity}">${t(`finding.${f.type}`, f.placeholders)}</div>`,
              )}
            </section>`
          : nothing}
        ${this._done ? html`<div class="msg ok">${this._done}</div>` : nothing}
        ${this._error ? html`<div class="msg err">${this._error}</div>` : nothing}
        ${this._admin ? this._renderActions(node) : html`<div class="note">${t("device.admin_only")}</div>`}
        ${node.device_id
          ? html`<button class="link" @click=${() => navigate(`/config/devices/device/${node.device_id}`)}>
              ${t("device.open_ha")} →
            </button>`
          : nothing}
      </div>`;
  }

  private _renderActions(node: TopologyNode) {
    const t = this.t;
    const areas = this.report?.topology?.areas ?? [];
    const ignored = node.state === "ignored";
    return html`<section>
        <h3>${t("device.area")}</h3>
        <div class="row">
          <select
            id="zh-dev-area"
            ?disabled=${this._busy !== null || !node.device_id}
            @change=${(ev: Event) => {
              const areaId = (ev.target as HTMLSelectElement).value || null;
              const name = areas.find((a) => a.area_id === areaId)?.name ?? "–";
              void this._run("area", { action: "area", area_id: areaId }, t("device.area_done", { area: name }));
            }}
          >
            <option value="" ?selected=${!node.area_id}>${t("draw.no_area_option")}</option>
            ${areas.map(
              (a) => html`<option value=${a.area_id} ?selected=${node.area_id === a.area_id}>${a.name}</option>`,
            )}
          </select>
        </div>
        <div class="note">${t("device.area_note")}</div>
      </section>
      <section>
        <h3>${t("device.name")}</h3>
        <div class="row">
          <input
            id="zh-dev-name"
            type="text"
            maxlength="100"
            .value=${this._name}
            @input=${(ev: Event) => (this._name = (ev.target as HTMLInputElement).value)}
            @keydown=${(ev: KeyboardEvent) => ev.key === "Enter" && this._rename(node)}
          />
          <button
            class="btn"
            ?disabled=${this._busy !== null || !this._name.trim() || this._name.trim() === node.name}
            @click=${() => this._rename(node)}
          >
            ${this._busy === "rename" ? "…" : t("device.rename")}
          </button>
        </div>
        <div class="note">${t("device.rename_note")}</div>
      </section>
      <section>
        <h3>${t("device.monitoring")}</h3>
        <div class="row">
          <button
            class="btn ghost"
            ?disabled=${this._busy !== null}
            @click=${() =>
              this._run(
                "ignore",
                { action: ignored ? "unignore" : "ignore" },
                ignored ? t("device.unignore_done") : t("device.ignore_done"),
              )}
          >
            ${ignored ? t("device.unignore") : t("device.ignore")}
          </button>
        </div>
        <div class="note">${ignored ? t("device.unignore_note") : t("device.ignore_note")}</div>
      </section>
      <section>
        <h3>${t("device.remove_title")}</h3>
        ${this._confirmRemove
          ? html`<div class="danger">
              <b>${t("device.remove_confirm", { name: node.name })}</b>
              <div class="note">${t("device.remove_note")}</div>
              <label>
                <input
                  type="checkbox"
                  .checked=${this._force}
                  @change=${(ev: Event) => (this._force = (ev.target as HTMLInputElement).checked)}
                />
                <span>${t("device.force")}</span>
              </label>
              <div class="row">
                <button class="btn ghost" ?disabled=${this._busy !== null} @click=${() => (this._confirmRemove = false)}>
                  ${t("device.cancel")}
                </button>
                <button class="btn bad" ?disabled=${this._busy !== null} @click=${() => this._remove()}>
                  ${this._busy === "remove" ? t("device.removing") : t("device.remove")}
                </button>
              </div>
            </div>`
          : html`<button class="btn outline-bad" @click=${() => (this._confirmRemove = true)}>
              ${t("device.remove")} …
            </button>`}
      </section>`;
  }

  private _rename(node: TopologyNode): void {
    const name = this._name.trim();
    if (!name || name === node.name || this._busy) return;
    void this._run("rename", { action: "rename", name }, this.t("device.rename_done", { name }));
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zigbee-health-device": ZigbeeHealthDevice;
  }
}
