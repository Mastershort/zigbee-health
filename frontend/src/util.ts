import type { Translate } from "./i18n";

export function navigate(path: string): void {
  history.pushState(null, "", path);
  window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: false } }));
}

export function ago(iso: string | null | undefined, t: Translate): string {
  if (!iso) return t("never");
  const minutes = Math.max(0, (Date.now() - Date.parse(iso)) / 60_000);
  if (minutes < 1) return t("just_now");
  if (minutes < 60) return t("minutes_ago", { n: Math.round(minutes) });
  if (minutes < 48 * 60) return t("hours_ago", { n: Math.round(minutes / 60) });
  return t("days_ago", { n: Math.round(minutes / 1440) });
}

/** Ask the card to open the device panel (from the floor plan, 3D view, lists). */
export function selectDevice(from: HTMLElement, ieee: string): void {
  from.dispatchEvent(
    new CustomEvent("zh-device", { detail: { ieee }, bubbles: true, composed: true }),
  );
}
