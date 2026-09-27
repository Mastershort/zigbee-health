/** Sidebar panel "Zigbee Health": the card in its full-page layout. */

import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";

import type { HomeAssistant } from "./types";

interface PanelInfo {
  config?: { config_entry_id?: string; title?: string };
}

@customElement("zigbee-health-panel")
export class ZigbeeHealthPanel extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @property({ type: Boolean }) narrow = false;
  @property({ attribute: false }) panel?: PanelInfo;

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--primary-background-color, #fafafa);
      color: var(--primary-text-color);
      font-family: var(--paper-font-body1_-_font-family, Roboto, system-ui, sans-serif);
    }
    .toolbar {
      display: flex;
      align-items: center;
      gap: 8px;
      height: 56px;
      padding: 0 12px;
      padding-top: env(safe-area-inset-top, 0px);
      box-sizing: content-box;
      flex: none;
      background: var(--app-header-background-color, var(--primary-color, #03a9f4));
      color: var(--app-header-text-color, #fff);
      border-bottom: var(--app-header-border-bottom, none);
    }
    .title {
      font-size: 20px;
      font-weight: 400;
      margin-left: 8px;
    }
    .content {
      flex: 1;
      min-height: 0;
      padding: 16px;
      box-sizing: border-box;
      overflow: auto;
    }
    zigbee-health-card {
      display: block;
      height: 100%;
    }
  `;

  protected firstUpdated(): void {
    const card = this.renderRoot.querySelector("zigbee-health-card");
    card?.setConfig({
      type: "custom:zigbee-health-card",
      config_entry_id: this.panel?.config?.config_entry_id,
    });
  }

  protected render() {
    return html`<div class="toolbar">
        <ha-menu-button .hass=${this.hass} .narrow=${this.narrow}></ha-menu-button>
        <div class="title">${this.panel?.config?.title ?? "Zigbee Health"}</div>
      </div>
      <div class="content">
        <zigbee-health-card
          .hass=${this.hass}
          .panelMode=${true}
          .narrow=${this.narrow}
        ></zigbee-health-card>
      </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zigbee-health-panel": ZigbeeHealthPanel;
  }
}
