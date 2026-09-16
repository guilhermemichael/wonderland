export type EventName = "page_view" | "cta_click" | "rabbit_hole_started" | "scroll_depth" | "rabbit_hole_completed" | "path_selected";

type EventPayload = {
  event_name: EventName;
  page: string;
  properties?: Record<string, string | number | boolean | null>;
};

let sequence = 0;

function apiEventsUrl() {
  const base = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");
  return base.endsWith("/api/v1") ? `${base}/events` : `${base}/api/v1/events`;
}

function sessionId() {
  if (typeof window === "undefined") return undefined;
  const key = "wonderland_session_id";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const created = crypto.randomUUID();
  window.localStorage.setItem(key, created);
  return created;
}

export function trackEvent(payload: EventPayload) {
  sequence += 1;
  const event = { ...payload, session_id: sessionId(), client_sequence: sequence, occurred_at: new Date().toISOString() };
  if (typeof window !== "undefined") {
    const queue = JSON.parse(window.sessionStorage.getItem("wonderland_event_queue") ?? "[]") as unknown[];
    queue.push(event);
    window.sessionStorage.setItem("wonderland_event_queue", JSON.stringify(queue));
    void fetch(apiEventsUrl(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(event),
    }).catch(() => undefined);
  }
}
