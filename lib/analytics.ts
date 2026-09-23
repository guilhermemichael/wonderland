/**
 * WONDERLAND funnel. One call site per event; dedupe keys guarantee an event
 * never fires twice for the same moment (re-renders, StrictMode, re-scrolls).
 *
 * Events are forwarded to whichever collector the host page provides
 * (window.dataLayer, gtag, plausible) and always dispatched as a DOM event
 * ("wonderland:analytics") so any integration can subscribe without code
 * changes here.
 */
export type AnalyticsEvent =
  | "page_view"
  | "cta_click"
  | "rabbit_hole_started"
  | "scroll_depth"
  | "rabbit_hole_completed"
  | "path_selected"
  | "quiz_interaction"
  | "conversion_submit";

export type PathId = "rabbit" | "hatter" | "cheshire";

type Props = Record<string, string | number | boolean>;

const fired = new Set<string>();

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    plausible?: (name: string, opts?: { props?: Props }) => void;
  }
}

export function track(name: AnalyticsEvent, props: Props = {}, dedupeKey?: string) {
  if (typeof window === "undefined") return;
  if (dedupeKey) {
    const key = `${name}::${dedupeKey}`;
    if (fired.has(key)) return;
    fired.add(key);
  }
  const payload = { event: name, ...props, page: window.location.pathname };
  try {
    if (Array.isArray(window.dataLayer)) window.dataLayer.push(payload);
    if (typeof window.gtag === "function") window.gtag("event", name, props);
    if (typeof window.plausible === "function") window.plausible(name, { props });
  } catch {
    /* a broken third-party collector must never break the experience */
  }
  window.dispatchEvent(new CustomEvent("wonderland:analytics", { detail: payload }));
  if (process.env.NODE_ENV !== "production") console.debug("[analytics]", payload);
}

/** A fresh id per page visit, so per-visit milestones dedupe correctly. */
export function visitId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
