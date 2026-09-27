/** Visual editor of the card (uses Home Assistant's ha-form). */

import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import type { CardConfig, HomeAssistant } from "./types";

const SCHEMA = [
  { name: "title", selector: { text: {} } },
  { name: "config_entry_id", selector: { config_entry: { integration: "zigbee_health" } } },
  {
    name: "default_tab",
    selector: {
      select: {
        mode: "dropdown",
        options: [
          { value: "map", label: "Netzkarte / Network map" },
          { value: "actions", label: "Maßnahmen / Measures" },
          { value: "findings", label: "Befunde / Findings" },
          { value: "rooms", label: "Räume / Rooms" },
        ],
      },
    },
  },
  { name: "show_labels", selector: { boolean: {} } },
];

const LABELS: Record<string, [string, string]> = {
  title: ["Titel", "Title"],
  config_entry_id: ["Zigbee-Netz (leer = erstes)", "Zigbee network (empty = first)"],
  default_tab: ["Start-Ansicht", "Default view"],
  show_labels: ["Alle Gerätenamen zeigen", "Show all device names"],
};

@customElement("zigbee-health-card-editor")
export class ZigbeeHealthCardEditor extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @state() private _config?: CardConfig;

  setConfig(config: CardConfig): void {
    this._config = config;
  }

  protected render() {
    if (!this.hass || !this._config) return html``;
    const german = (this.hass.locale?.language ?? "en").startsWith("de");
    return html`<ha-form
      .hass=${this.hass}
      .data=${this._config}
      .schema=${SCHEMA}
      .computeLabel=${(s: { name: string }) => LABELS[s.name]?.[german ? 0 : 1] ?? s.name}
      @value-changed=${(ev: CustomEvent<{ value: CardConfig }>) => {
        this.dispatchEvent(
          new CustomEvent("config-changed", {
            detail: { config: ev.detail.value },
            bubbles: true,
            composed: true,
          }),
        );
      }}
    ></ha-form>`;
  }
}
