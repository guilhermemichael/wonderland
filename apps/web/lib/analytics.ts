import { applyFlushOutcomes, type FlushOutcome } from "./analytics-queue";

export type EventName =
  | "page_view" | "cta_click" | "rabbit_hole_started" | "scroll_depth"
  | "rabbit_hole_completed" | "rabbit_hole_skipped" | "path_selected";

export type AnalyticsEvent = {
  client_event_id: string;
  session_id?: string;
  client_sequence: number;
  event_name: EventName;
  page: string;
  occurred_at: string;
  properties?: Record<string, string | number | boolean | null>;
};

type QueuedEvent = AnalyticsEvent & { attempts: number };
const QUEUE_KEY = "wonderland_event_queue";
const SESSION_KEY = "wonderland_session_id";
const SEQUENCE_KEY = "wonderland_client_sequence";
const MAX_ATTEMPTS = 3;
let flushing = false;
let initialized = false;

function storage(kind: "localStorage" | "sessionStorage") {
  if (typeof window === "undefined") return null;
  try { return window[kind]; } catch { return null; }
}

function apiEventsUrl() {
  const base = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");
  return base.endsWith("/api/v1") ? `${base}/events` : `${base}/api/v1/events`;
}

function readQueue(): QueuedEvent[] {
  const store = storage("localStorage");
  if (!store) return [];
  try {
    const parsed: unknown = JSON.parse(store.getItem(QUEUE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed as QueuedEvent[] : [];
  } catch { return []; }
}

function writeQueue(queue: QueuedEvent[]) {
  const store = storage("localStorage");
  if (!store) return;
  try { store.setItem(QUEUE_KEY, JSON.stringify(queue)); } catch { /* optional analytics storage */ }
}

function sessionId() {
  const store = storage("localStorage");
  if (!store) return undefined;
  try {
    const existing = store.getItem(SESSION_KEY);
    if (existing) return existing;
    const created = crypto.randomUUID();
    store.setItem(SESSION_KEY, created);
    return created;
  } catch { return undefined; }
}

function nextSequence() {
  const store = storage("localStorage");
  if (!store) return Date.now();
  try {
    const current = Number(store.getItem(SEQUENCE_KEY) ?? "0");
    const next = Number.isFinite(current) ? current + 1 : 1;
    store.setItem(SEQUENCE_KEY, String(next));
    return next;
  } catch { return Date.now(); }
}

export async function flushEventQueue() {
  if (flushing || typeof window === "undefined") return;
  flushing = true;
  try {
    const queue = readQueue();
    const outcomes: FlushOutcome[] = [];
    for (let index = 0; index < queue.length; index += 1) {
      const queued = queue[index];
      if (queued.attempts >= MAX_ATTEMPTS) break;
      try {
        const response = await fetch(apiEventsUrl(), {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(queued),
        });
        if (!response.ok) throw new Error(`analytics_http_${response.status}`);
        outcomes.push({ client_event_id: queued.client_event_id, success: true });
      } catch {
        outcomes.push({ client_event_id: queued.client_event_id, success: false });
        break;
      }
    }
    writeQueue(applyFlushOutcomes(queue, outcomes, MAX_ATTEMPTS) as QueuedEvent[]);
  } finally {
    flushing = false;
  }
}

export function initializeAnalytics() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  void flushEventQueue();
  window.addEventListener("online", () => void flushEventQueue());
  window.addEventListener("focus", () => void flushEventQueue());
}

export function trackEvent(payload: Omit<AnalyticsEvent, "client_event_id" | "session_id" | "client_sequence" | "occurred_at">) {
  if (typeof window === "undefined") return;
  initializeAnalytics();
  const event: QueuedEvent = {
    ...payload,
    client_event_id: crypto.randomUUID(),
    session_id: sessionId(),
    client_sequence: nextSequence(),
    occurred_at: new Date().toISOString(),
    attempts: 0,
  };
  writeQueue([...readQueue(), event]);
  void flushEventQueue();
}
