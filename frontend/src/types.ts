/** Shape of the `zigbee_health.get_report` response (format: full). */

export type Level = "stable" | "degraded" | "fragile" | "paused";
export type Severity = "critical" | "warning" | "info";
export type DeviceState =
  | "ok"
  | "weak"
  | "battery"
  | "offline"
  | "dead"
  | "part_time_router"
  | "ignored";
export type RouterKind = "always_on" | "part_time" | "unclear" | null;

export interface Action {
  key: string;
  count: number;
  items: string[];
  finding_type?: string;
  ieees?: string[];
  area_ids?: string[];
}

/** Devices and rooms marked on the map and floor plan ("Zeigen" on a measure). */
export interface Focus {
  title: string;
  ieees: string[];
  areas: string[];
}

export interface Finding {
  id: string;
  type: string;
  severity: Severity;
  ieee: string | null;
  device: string | null;
  area_id: string | null;
  placeholders: Record<string, string>;
  related: string[];
}

export interface Room {
  area_id: string | null;
  area_name: string | null;
  score: number;
  end_devices: number;
  always_on_routers: number;
  part_time_routers: number;
  weakest_lqi: number | null;
  open_findings: number;
  recommendation: string | null;
}

export interface TopologyNode {
  ieee: string;
  name: string;
  type: "router" | "end_device";
  kind: RouterKind;
  state: DeviceState;
  score: number;
  parent: string | null;
  parent_lqi: number | null;
  children: string[];
  area: string | null;
  area_id?: string | null;
  floor_id?: string | null;
  battery: number | null;
  battery_empty: string | null;
  last_seen: string | null;
  device_id: string | null;
}

export interface Link {
  a: string;
  b: string;
  lqi: number;
}

export interface Floor {
  floor_id: string;
  name: string;
  level: number | null;
}

export interface Topology {
  coordinator: { ieee: string; name: string } | null;
  nodes: TopologyNode[];
  links: Link[];
  unknown_parent: string[];
  unknown_neighbors: string[];
  floors?: Floor[];
  areas?: { area_id: string; name: string; floor_id: string | null }[];
}

export interface PlanImprovement {
  ieee: string;
  name: string;
  reason: "no_parent" | "part_time_parent" | "weak_link" | "far_parent";
  before_parent: string | null;
  before_lqi: number | null;
}

export interface Plan {
  area_id: string;
  area_name: string;
  score_before: number;
  score_after: number;
  gain: number;
  room_score_before: number;
  room_score_after: number;
  impact: number;
  improved: PlanImprovement[];
  resolved: Record<string, number>;
}

export interface Report {
  ready: boolean;
  devices_found?: number;
  scanning?: boolean;
  warmup_left?: number;
  scan_started?: boolean;
  generated_at?: string;
  last_scan?: string | null;
  score?: number | null;
  level?: Level;
  counts?: Record<string, number>;
  actions?: Action[];
  findings?: Finding[];
  rooms?: Room[];
  topology?: Topology;
}

export interface Alert {
  ieee: string;
  name: string;
  children: string[];
  since: string;
}

export interface TrafficMessage {
  counts: Record<string, number>;
  alerts?: Alert[];
}

export interface CardConfig {
  type: string;
  live?: boolean;
  title?: string;
  config_entry_id?: string;
  default_tab?: Tab;
  show_labels?: boolean;
}

export type Tab = "map" | "actions" | "plan" | "findings" | "rooms" | "devices";

/** Minimal subset of the Home Assistant frontend object used by the card. */
export interface HomeAssistant {
  language?: string;
  locale?: { language: string };
  themes?: { darkMode?: boolean };
  user?: { is_admin: boolean };
  localize: (key: string, values?: Record<string, string | number>) => string;
  loadBackendTranslation?: (category: string, integration: string) => Promise<unknown>;
  callWS: <T>(message: Record<string, unknown>) => Promise<T>;
  connection?: {
    subscribeMessage: <T>(
      callback: (message: T) => void,
      subscribe: Record<string, unknown>,
    ) => Promise<() => Promise<void> | void>;
  };
}
