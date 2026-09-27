import { css } from "lit";

export const styles = css`
  :host {
    --zh-good: var(--success-color, #43a047);
    --zh-ok: var(--warning-color, #ffa000);
    --zh-bad: var(--error-color, #db4437);
    --zh-info: var(--info-color, #039be5);
    --zh-part: #8e6bd8;
    --zh-muted: var(--secondary-text-color, #727272);
    --zh-line: var(--divider-color, rgba(127, 127, 127, 0.25));
    --zh-surface: var(--secondary-background-color, rgba(127, 127, 127, 0.08));
    --zh-card: var(--card-background-color, var(--ha-card-background, #fff));
    --zh-text: var(--primary-text-color, #212121);
    --zh-radius: var(--ha-card-border-radius, 12px);
    display: block;
  }
  ha-card {
    overflow: hidden;
    color: var(--zh-text);
  }
  .wrap {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  /* header */
  .head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px 16px;
  }
  .head .btns {
    display: flex;
    gap: 8px;
    margin-left: auto;
  }
  .gauge {
    position: relative;
    width: 84px;
    height: 84px;
    flex: none;
  }
  .gauge svg {
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }
  .gauge .track {
    fill: none;
    stroke: var(--zh-line);
    stroke-width: 9;
  }
  .gauge .value {
    fill: none;
    stroke-width: 9;
    stroke-linecap: round;
    transition: stroke-dasharray 0.8s ease;
  }
  .gauge .num {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-size: 26px;
    font-weight: 600;
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }
  .gauge .num small {
    font-size: 11px;
    font-weight: 500;
    color: var(--zh-muted);
    margin-top: 3px;
  }
  .headtext {
    flex: 1 1 170px;
    min-width: 0;
  }
  .title {
    font-size: 20px;
    font-weight: 500;
    margin: 0;
  }
  .level {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 4px;
    font-weight: 500;
  }
  .level .dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: currentColor;
  }
  .sub {
    color: var(--zh-muted);
    font-size: 13px;
    margin-top: 2px;
  }
  .lvl-stable {
    color: var(--zh-good);
  }
  .lvl-degraded {
    color: var(--zh-ok);
  }
  .lvl-fragile {
    color: var(--zh-bad);
  }
  .lvl-paused {
    color: var(--zh-muted);
  }
  .iconbtn {
    border: none;
    background: var(--zh-surface);
    color: var(--zh-text);
    width: 38px;
    height: 38px;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex: none;
    transition: background 0.2s;
  }
  .iconbtn:hover {
    background: var(--zh-line);
  }
  .iconbtn svg {
    width: 20px;
    height: 20px;
  }
  .iconbtn.busy svg {
    animation: spin 1.2s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* tiles */
  .tiles {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(92px, 1fr));
    gap: 8px;
  }
  .tile {
    position: relative;
    border: 1px solid var(--zh-line);
    border-radius: 10px;
    padding: 9px 10px 8px;
    text-align: left;
    background: none;
    color: inherit;
    font: inherit;
    cursor: pointer;
    overflow: hidden;
    transition: border-color 0.2s, background 0.2s;
  }
  .tile::before {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    background: var(--accent, var(--zh-line));
  }
  .tile:hover {
    background: var(--zh-surface);
  }
  .tile.active {
    border-color: var(--accent);
    background: color-mix(in srgb, var(--accent) 10%, transparent);
  }
  .tile.zero {
    --accent: var(--zh-line) !important;
    opacity: 0.7;
  }
  .tile .n {
    font-size: 22px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    line-height: 1.1;
  }
  .tile .l {
    font-size: 12px;
    color: var(--zh-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* tabs */
  .tabs {
    display: flex;
    gap: 4px;
    padding: 4px;
    background: var(--zh-surface);
    border-radius: 999px;
    overflow-x: auto;
  }
  .tabs button {
    flex: 1 0 auto;
    border: none;
    background: none;
    color: var(--zh-muted);
    font: inherit;
    font-size: 13px;
    font-weight: 500;
    padding: 7px 10px;
    border-radius: 999px;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.2s, color 0.2s;
  }
  .tabs button.on {
    background: var(--zh-card);
    color: var(--zh-text);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  }
  .tabs .badge {
    display: inline-block;
    min-width: 18px;
    padding: 0 5px;
    margin-left: 4px;
    border-radius: 9px;
    font-size: 11px;
    line-height: 18px;
    background: var(--zh-bad);
    color: #fff;
  }

  /* map */
  .mapbox {
    position: relative;
  }
  .map {
    width: 100%;
    height: auto;
    display: block;
    max-height: 760px;
    touch-action: manipulation;
  }
  .guide {
    fill: none;
    stroke: var(--zh-line);
    stroke-dasharray: 3 6;
  }
  .guide-label {
    fill: var(--zh-muted);
    font-size: 11px;
    opacity: 0.8;
  }
  .edge {
    fill: none;
    stroke-linecap: round;
    transition: opacity 0.25s, stroke-width 0.25s;
    animation: draw 0.9s ease both;
  }
  @keyframes draw {
    from {
      opacity: 0;
    }
  }
  .edge.parent {
    stroke-width: 1.8;
  }
  .edge.backbone {
    stroke-width: 3;
  }
  .edge.mesh {
    stroke-width: 1;
    opacity: 0.14;
  }
  .edge.anchor {
    stroke-width: 1.5;
    stroke-dasharray: 3 5;
    stroke: var(--zh-muted) !important;
    opacity: 0.6;
  }
  .lqi-good {
    stroke: var(--zh-good);
  }
  .lqi-ok {
    stroke: var(--zh-ok);
  }
  .lqi-bad {
    stroke: var(--zh-bad);
  }
  .lqi-none {
    stroke: var(--zh-muted);
  }
  .dim .edge:not(.hl) {
    opacity: 0.07;
  }
  .dim .node:not(.hl) {
    opacity: 0.18;
  }
  .edge.hl {
    stroke-width: 3.5;
    opacity: 1;
  }
  .node {
    cursor: pointer;
    transition: opacity 0.25s;
  }
  .node .shape {
    stroke: var(--zh-card);
    stroke-width: 2.5;
    transition: transform 0.2s;
    transform-box: fill-box;
    transform-origin: center;
  }
  .node:hover .shape,
  .node.sel .shape {
    transform: scale(1.35);
  }
  .node.part .shape,
  .node.unclear .shape {
    stroke: var(--zh-part);
    stroke-dasharray: 3 2;
    stroke-width: 2;
  }
  .node.offline .shape,
  .node.ignored .shape {
    stroke-dasharray: 2 2;
    stroke: var(--zh-muted);
  }
  .st-ok {
    fill: var(--zh-good);
  }
  .node.orphan:not(.offline):not(.ignored) .shape {
    fill: var(--zh-card);
    stroke: var(--zh-good);
    stroke-width: 2;
    stroke-dasharray: 2.5 2;
  }
  .group-label {
    font-size: 11.5px;
    fill: var(--zh-muted);
    font-style: italic;
  }
  .st-weak {
    fill: var(--zh-ok);
  }
  .st-battery {
    fill: #f57c00;
  }
  .st-offline,
  .st-ignored {
    fill: var(--zh-muted);
  }
  .st-part_time_router {
    fill: color-mix(in srgb, var(--zh-part) 35%, var(--zh-card));
  }
  .st-unclear {
    fill: color-mix(in srgb, var(--zh-part) 18%, var(--zh-card));
  }
  .st-dead {
    fill: var(--zh-bad);
  }
  .pulse {
    fill: none;
    stroke-width: 2;
    animation: pulse 2.2s ease-out infinite;
    transform-box: fill-box;
    transform-origin: center;
  }
  @keyframes pulse {
    from {
      transform: scale(1);
      opacity: 0.8;
    }
    to {
      transform: scale(2.6);
      opacity: 0;
    }
  }
  .coord .shape {
    fill: var(--primary-color, #03a9f4);
  }
  .coord .glyph {
    fill: none;
    stroke: #fff;
    stroke-width: 3;
    stroke-linecap: round;
    stroke-linejoin: round;
    pointer-events: none;
  }
  .label {
    font-size: 12px;
    fill: var(--zh-text);
    pointer-events: none;
    paint-order: stroke;
    stroke: var(--zh-card);
    stroke-width: 3px;
    stroke-linejoin: round;
  }
  .label.small {
    font-size: 10.5px;
    fill: var(--zh-muted);
  }
  .tip {
    position: absolute;
    z-index: 2;
    min-width: 180px;
    max-width: 260px;
    padding: 10px 12px;
    border-radius: 10px;
    background: var(--zh-card);
    border: 1px solid var(--zh-line);
    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.18);
    font-size: 12.5px;
    pointer-events: none;
    transform: translate(-50%, calc(-100% - 14px));
  }
  .tip b {
    display: block;
    font-size: 14px;
    margin-bottom: 2px;
  }
  .tip .k {
    color: var(--zh-muted);
  }
  .tip .row {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    margin-top: 3px;
  }
  .pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 1px 8px;
    border-radius: 999px;
    font-size: 11.5px;
    font-weight: 500;
    background: var(--zh-surface);
    margin: 2px 0 4px;
  }
  .pill i {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    display: inline-block;
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 16px;
    align-items: center;
    font-size: 12px;
    color: var(--zh-muted);
  }
  .legend svg {
    width: 16px;
    height: 16px;
    vertical-align: -3px;
    margin-right: 4px;
  }
  .legend .bar {
    display: inline-flex;
    height: 6px;
    width: 72px;
    border-radius: 3px;
    overflow: hidden;
    margin: 0 6px;
    vertical-align: 1px;
  }
  .legend .bar span {
    flex: 1;
  }
  .switch {
    margin-left: auto;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    user-select: none;
  }
  .switch input {
    accent-color: var(--primary-color, #03a9f4);
  }

  /* chips (dead strip, items) */
  .strip h4 {
    margin: 4px 0 8px;
    font-size: 13px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 7px;
  }
  .strip h4 i {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--zh-bad);
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .chip {
    border: 1px solid var(--zh-line);
    border-radius: 999px;
    padding: 3px 10px;
    font-size: 12.5px;
    background: none;
    color: inherit;
    font-family: inherit;
    cursor: pointer;
  }
  .chip:hover {
    background: var(--zh-surface);
  }
  .chip span {
    color: var(--zh-muted);
    margin-left: 4px;
  }

  /* measures */
  .actions {
    display: flex;
    flex-direction: column;
    gap: 10px;
    counter-reset: action;
  }
  .action {
    display: grid;
    grid-template-columns: 40px 1fr;
    gap: 4px 12px;
    padding: 14px;
    border-radius: var(--zh-radius);
    background: var(--zh-surface);
  }
  .action .no {
    grid-row: span 3;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    color: #fff;
    background: var(--zh-bad);
  }
  .action:nth-child(2) .no {
    background: var(--zh-ok);
  }
  .action:nth-child(3) .no {
    background: var(--zh-info);
  }
  .action .t {
    font-weight: 600;
    font-size: 15px;
  }
  .action .h {
    color: var(--zh-muted);
    font-size: 13px;
  }
  .action .foot {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
    margin-top: 6px;
  }
  .btn {
    margin-left: auto;
    border: none;
    border-radius: 999px;
    padding: 7px 16px;
    font: inherit;
    font-size: 13px;
    font-weight: 500;
    background: var(--primary-color, #03a9f4);
    color: var(--text-primary-color, #fff);
    cursor: pointer;
  }

  /* findings */
  .group h4 {
    margin: 6px 0;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--zh-muted);
  }
  .finding {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 9px 12px;
    border-radius: 10px;
    border-left: 4px solid var(--sev);
    background: var(--zh-surface);
    margin-bottom: 6px;
    cursor: pointer;
  }
  .finding:hover {
    background: var(--zh-line);
  }
  .finding .ft {
    font-weight: 500;
  }
  .finding .fs {
    font-size: 12px;
    color: var(--zh-muted);
  }
  .sev-critical {
    --sev: var(--zh-bad);
  }
  .sev-warning {
    --sev: var(--zh-ok);
  }
  .sev-info {
    --sev: var(--zh-info);
  }

  /* rooms */
  .rooms {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 10px;
  }
  .room {
    padding: 12px 14px;
    border-radius: var(--zh-radius);
    background: var(--zh-surface);
  }
  .room .rh {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-weight: 600;
  }
  .room .rh span {
    font-size: 20px;
    font-variant-numeric: tabular-nums;
  }
  .bar {
    height: 6px;
    border-radius: 3px;
    background: var(--zh-line);
    overflow: hidden;
    margin: 8px 0;
  }
  .bar > div {
    height: 100%;
    border-radius: 3px;
    transition: width 0.8s ease;
  }
  .room .stats {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 12px;
    font-size: 12px;
    color: var(--zh-muted);
  }
  .room .stats b {
    color: var(--zh-text);
    font-weight: 600;
  }
  .room .rec {
    margin-top: 8px;
    font-size: 12.5px;
    color: var(--zh-ok);
  }

  /* live */
  .live-rate {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    color: var(--zh-text);
    font-variant-numeric: tabular-nums;
  }
  .live-rate i {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--zh-good);
    animation: blink 1.6s ease-in-out infinite;
  }
  @keyframes blink {
    50% {
      opacity: 0.25;
    }
  }
  .spark {
    fill: var(--primary-color, #03a9f4);
    filter: drop-shadow(0 0 4px var(--primary-color, #03a9f4));
    pointer-events: none;
  }
  .spark.router {
    fill: var(--zh-good);
    filter: drop-shadow(0 0 4px var(--zh-good));
  }
  .heat {
    fill: var(--primary-color, #03a9f4);
    pointer-events: none;
    transition: r 0.9s ease, opacity 0.9s ease;
  }
  .pulse.alarm {
    stroke: var(--zh-bad);
    stroke-width: 3;
    animation-duration: 1.2s;
  }
  .alert {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    text-align: left;
    border: 1px solid color-mix(in srgb, var(--zh-bad) 45%, transparent);
    background: color-mix(in srgb, var(--zh-bad) 10%, var(--zh-card));
    color: var(--zh-text);
    border-radius: var(--zh-radius);
    padding: 10px 14px;
    font: inherit;
    cursor: pointer;
    animation: alert-in 0.4s ease both;
  }
  @keyframes alert-in {
    from {
      transform: translateY(-6px);
      opacity: 0;
    }
  }
  .alert .bolt {
    flex: none;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--zh-bad);
    color: #fff;
    animation: blink 1.2s ease-in-out infinite;
  }
  .alert .bolt svg {
    width: 20px;
    height: 20px;
  }
  .alert .at {
    display: flex;
    flex-direction: column;
    font-size: 13px;
    color: var(--zh-muted);
  }
  .alert .at b {
    color: var(--zh-text);
    font-size: 14.5px;
  }
  .switch.live {
    margin-left: auto;
  }
  .switch.live + .switch {
    margin-left: 0;
  }
  @media (prefers-reduced-motion: reduce) {
    .spark,
    .pulse,
    .alert .bolt,
    .live-rate i {
      animation: none;
      display: none;
    }
  }

  /* sidebar panel layout */
  .panel-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(340px, 420px);
    gap: 16px;
    height: 100%;
    align-items: start;
  }
  .panel-layout .map-card {
    height: 100%;
    min-height: 480px;
  }
  .map-wrap {
    height: 100%;
    box-sizing: border-box;
  }
  .map-wrap .mapbox {
    flex: 1;
    min-height: 0;
  }
  /* Fit the map into the free space (keeps its aspect ratio). */
  .map-wrap .map {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    max-height: none;
  }
  .map-wrap .strip {
    flex: none;
    max-height: 84px;
    overflow-y: auto;
  }
  .map-wrap .strip h4 {
    margin-top: 0;
  }
  .map-wrap .chip {
    padding: 2px 9px;
    font-size: 12px;
  }
  .side {
    display: flex;
    flex-direction: column;
    gap: 16px;
    height: 100%;
    min-height: 0;
  }
  .side-content {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }
  .panel-layout.narrow {
    grid-template-columns: 1fr;
    height: auto;
  }
  .panel-layout.narrow .map-card {
    height: 78vh;
  }
  .panel-layout.narrow .side {
    height: auto;
  }
  .search {
    width: 100%;
    box-sizing: border-box;
    padding: 9px 14px;
    border-radius: 999px;
    border: 1px solid var(--zh-line);
    background: var(--zh-surface);
    color: var(--zh-text);
    font: inherit;
  }
  .search:focus-visible {
    outline: 2px solid var(--primary-color, #03a9f4);
    outline-offset: 1px;
  }
  .devlist {
    display: flex;
    flex-direction: column;
  }
  .dev {
    display: grid;
    grid-template-columns: 14px minmax(0, 1fr) auto;
    gap: 10px;
    align-items: center;
    padding: 9px 4px;
    border: none;
    border-bottom: 1px solid var(--zh-line);
    background: none;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .dev:hover {
    background: var(--zh-surface);
  }
  .dev .dot {
    width: 11px;
    height: 11px;
    border-radius: 50%;
    background: currentColor;
  }
  .dev .dot.router {
    border-radius: 3px;
  }
  .dev .dot.st-ok { color: var(--zh-good); }
  .dev .dot.st-weak { color: var(--zh-ok); }
  .dev .dot.st-battery { color: #f57c00; }
  .dev .dot.st-offline, .dev .dot.st-ignored { color: var(--zh-muted); }
  .dev .dot.st-part_time_router, .dev .dot.st-unclear { color: var(--zh-part); }
  .dev .dot.st-dead { color: var(--zh-bad); }
  .dev .dn,
  .dev .dm {
    display: flex;
    flex-direction: column;
    min-width: 0;
    font-size: 12px;
    color: var(--zh-muted);
  }
  .dev .dn b {
    font-size: 14px;
    font-weight: 500;
    color: var(--zh-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .dev .dm {
    text-align: right;
    align-items: flex-end;
    font-variant-numeric: tabular-nums;
  }
  .lqi-t.lqi-good { color: var(--zh-good); }
  .lqi-t.lqi-ok { color: var(--zh-ok); }
  .lqi-t.lqi-bad { color: var(--zh-bad); }

  /* map / floor plan switch */
  .viewswitch {
    display: inline-flex;
    align-self: flex-start;
    padding: 3px;
    border-radius: 999px;
    background: var(--zh-surface);
    flex: none;
  }
  .viewswitch button {
    border: none;
    background: none;
    color: var(--zh-muted);
    font: inherit;
    font-size: 13px;
    font-weight: 500;
    padding: 5px 14px;
    border-radius: 999px;
    cursor: pointer;
  }
  .viewswitch button.on {
    background: var(--zh-card);
    color: var(--zh-text);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  }
  zigbee-health-floor {
    min-height: 420px;
  }

  /* network check */
  .checkbtn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    height: 38px;
    padding: 0 14px 0 11px;
    border: none;
    border-radius: 999px;
    background: var(--primary-color, #03a9f4);
    color: var(--text-primary-color, #fff);
    font: inherit;
    font-size: 13.5px;
    font-weight: 500;
    cursor: pointer;
    flex: none;
    box-shadow: 0 2px 10px color-mix(in srgb, var(--primary-color, #03a9f4) 40%, transparent);
  }
  .checkbtn svg {
    width: 19px;
    height: 19px;
  }
  .map.checking {
    opacity: 0.35;
    transition: opacity 0.4s;
  }
  .check-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 3;
  }
  .radar {
    position: absolute;
    left: 50%;
    top: 50%;
    height: 86%;
    max-width: 100%;
    aspect-ratio: 1;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    overflow: hidden;
    pointer-events: none;
  }
  .radar .sweep {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: conic-gradient(
      from 0deg,
      transparent 0deg,
      transparent 280deg,
      color-mix(in srgb, var(--primary-color, #03a9f4) 12%, transparent) 320deg,
      color-mix(in srgb, var(--primary-color, #03a9f4) 55%, transparent) 360deg
    );
    animation: spin 2.2s linear infinite;
  }
  .steps {
    position: relative;
    list-style: none;
    margin: 0;
    padding: 16px 20px;
    border-radius: 14px;
    background: color-mix(in srgb, var(--zh-card) 88%, transparent);
    backdrop-filter: blur(6px);
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.18);
    min-width: 260px;
  }
  .steps li {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 5px 0;
    color: var(--zh-muted);
    font-size: 14px;
    transition: color 0.3s;
  }
  .steps li i {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 2px solid var(--zh-line);
    box-sizing: border-box;
    flex: none;
  }
  .steps li.run {
    color: var(--zh-text);
  }
  .steps li.run i {
    border-color: var(--primary-color, #03a9f4);
    border-right-color: transparent;
    animation: spin 0.8s linear infinite;
  }
  .steps li.done {
    color: var(--zh-text);
  }
  .steps li.done i {
    border-color: var(--zh-good);
    background: var(--zh-good);
    box-shadow: inset 0 0 0 3px var(--zh-card);
  }
  .check-overlay.reveal {
    background: color-mix(in srgb, var(--zh-card) 72%, transparent);
    backdrop-filter: blur(3px);
    animation: fade-in 0.4s ease both;
  }
  @keyframes fade-in {
    from {
      opacity: 0;
    }
  }
  .verdict {
    text-align: center;
    max-width: 440px;
    padding: 24px;
    animation: rise 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) both;
  }
  @keyframes rise {
    from {
      transform: translateY(18px) scale(0.96);
      opacity: 0;
    }
  }
  .verdict .big {
    font-size: 88px;
    font-weight: 700;
    line-height: 1;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.03em;
  }
  .verdict .of {
    color: var(--zh-muted);
    margin-top: 2px;
  }
  .verdict .lvl {
    font-size: 20px;
    font-weight: 600;
    margin-top: 6px;
  }
  .verdict .lead {
    margin: 18px 0 6px;
    font-weight: 500;
  }
  .verdict ol {
    text-align: left;
    margin: 0 auto 10px;
    padding-left: 22px;
    display: inline-block;
  }
  .verdict ol li {
    margin: 5px 0;
  }
  .verdict .row {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
    margin-top: 14px;
  }
  .verdict .row .btn {
    margin-left: 0;
  }
  .btn.ghost {
    background: var(--zh-surface);
    color: var(--zh-text);
  }
  .muted {
    color: var(--zh-muted);
    font-size: 13px;
  }

  /* waiting for the first analysis */
  .waiting {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 28px 16px;
    gap: 4px;
  }
  .waiting-card {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .waiting h3 {
    margin: 18px 0 4px;
    font-size: 20px;
    font-weight: 500;
  }
  .waiting p {
    margin: 0;
  }
  .waiting .btn {
    margin: 16px 0 0;
  }
  .radar.big {
    position: relative;
    left: auto;
    top: auto;
    transform: none;
    width: min(320px, 70vw);
    height: auto;
    border: 1px solid var(--zh-line);
  }
  .radar .rings {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: repeating-radial-gradient(
      circle,
      transparent 0 17%,
      var(--zh-line) 17% calc(17% + 1px)
    );
  }
  .radar .core {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 44px;
    height: 44px;
    margin: -22px 0 0 -22px;
    border-radius: 50%;
    background: var(--primary-color, #03a9f4);
    color: #fff;
    font-weight: 700;
    font-size: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* router planner */
  .plans {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .plan-intro {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-bottom: 4px;
  }
  .plan-intro b {
    font-size: 15px;
  }
  .plan-intro span {
    color: var(--zh-muted);
    font-size: 13px;
  }
  .plan {
    display: grid;
    grid-template-columns: 30px minmax(0, 1fr) auto;
    gap: 12px;
    align-items: center;
    padding: 12px;
    border-radius: var(--zh-radius);
    border: 1px solid var(--zh-line);
    background: none;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
    transition: border-color 0.2s, background 0.2s;
  }
  .plan:hover {
    background: var(--zh-surface);
  }
  .plan.on {
    border-color: var(--zh-good);
    background: color-mix(in srgb, var(--zh-good) 9%, transparent);
  }
  .plan .rank {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--zh-surface);
    font-weight: 700;
  }
  .plan.best .rank {
    background: var(--zh-good);
    color: #fff;
  }
  .plan .pb {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    font-size: 12.5px;
    color: var(--zh-muted);
  }
  .plan .pb b {
    font-size: 15px;
    color: var(--zh-text);
  }
  .plan .pb em {
    font-style: normal;
    font-size: 11px;
    font-weight: 600;
    margin-left: 8px;
    padding: 1px 7px;
    border-radius: 999px;
    background: var(--zh-good);
    color: #fff;
    vertical-align: 2px;
  }
  .plan .res {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 3px;
  }
  .plan .res .chip {
    cursor: default;
    font-size: 11.5px;
    padding: 1px 8px;
  }
  .plan .ps {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    font-variant-numeric: tabular-nums;
  }
  .plan .ps .room {
    font-size: 16px;
    white-space: nowrap;
  }
  .plan .ps .room b {
    color: var(--zh-good);
    font-size: 20px;
  }
  .plan .ps .k {
    font-size: 11px;
    color: var(--zh-muted);
  }
  .plan .ps .net {
    font-size: 11.5px;
    font-weight: 600;
    color: var(--zh-good);
  }
  .toast {
    position: fixed;
    left: 50%;
    bottom: calc(24px + env(safe-area-inset-bottom, 0px));
    transform: translateX(-50%);
    z-index: 30;
    background: var(--zh-text);
    color: var(--zh-card);
    padding: 10px 16px;
    border-radius: 10px;
    font-size: 14px;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
    animation: alert-in 0.3s ease both;
  }
  .strip.marked {
    border-radius: 10px;
    box-shadow: 0 0 0 2px var(--primary-color, #03a9f4);
    padding: 8px 10px;
  }
  .strip .chip.on {
    background: var(--zh-bad);
    border-color: var(--zh-bad);
    color: #fff;
  }
  .strip .chip.on span {
    color: rgba(255, 255, 255, 0.85);
  }
  .plan-banner.focus-banner {
    background: color-mix(in srgb, var(--primary-color, #03a9f4) 10%, var(--zh-card));
    border-color: color-mix(in srgb, var(--primary-color, #03a9f4) 45%, transparent);
  }
  .plan-banner.focus-banner .pi {
    background: var(--primary-color, #03a9f4);
  }
  .action .foot .grow {
    flex: 1;
  }
  .action .foot .btn.on {
    box-shadow: 0 0 0 2px var(--zh-card), 0 0 0 4px var(--primary-color, #03a9f4);
  }
  .plan-banner {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    border-radius: var(--zh-radius);
    background: color-mix(in srgb, var(--zh-good) 12%, var(--zh-card));
    border: 1px solid color-mix(in srgb, var(--zh-good) 45%, transparent);
    animation: alert-in 0.4s ease both;
  }
  .plan-banner .pi {
    width: 32px;
    height: 32px;
    border-radius: 9px;
    background: var(--zh-good);
    color: #fff;
    font-size: 22px;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    flex: none;
  }
  .plan-banner .pt {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
    font-size: 12.5px;
    color: var(--zh-muted);
  }
  .plan-banner .pt b {
    color: var(--zh-text);
    font-size: 14.5px;
  }
  .plan-banner .btn {
    margin-left: 0;
  }
  .planned-edge {
    stroke: var(--zh-good);
    stroke-width: 2.6;
    stroke-dasharray: 7 6;
    fill: none;
    animation: march 0.9s linear infinite;
  }
  @keyframes march {
    to {
      stroke-dashoffset: -13;
    }
  }
  .virtual {
    fill: var(--zh-good);
    stroke: var(--zh-card);
    stroke-width: 3;
  }
  .virtual-plus {
    stroke: #fff;
    stroke-width: 3;
    stroke-linecap: round;
  }
  .plan-pulse {
    stroke: var(--zh-good);
  }
  .plan-label {
    font-weight: 600;
    fill: var(--zh-good);
  }
  .map-wrap .plan-banner {
    flex: none;
  }

  .empty {
    text-align: center;
    color: var(--zh-muted);
    padding: 28px 12px;
  }
`;
