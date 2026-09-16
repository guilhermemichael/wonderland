import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const key = "wonderland_event_queue";
let store: Map<string, string>;
let target: EventTarget;
const queue = () => JSON.parse(store.get(key) ?? "[]") as { client_event_id: string; event_name: string; attempts: number }[];
const settle = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  store = new Map();
  target = new EventTarget();
  vi.stubGlobal("window", Object.assign(target, { localStorage: {
    getItem: (name: string) => store.get(name) ?? null,
    setItem: (name: string, value: string) => store.set(name, value),
  } }));
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("actual analytics delivery regressions", () => {
  it.each([1, 3])("preserves %i appends during an in-flight ACK and drains them", async (count) => {
    const replies: ((response: Response) => void)[] = [];
    const send = vi.fn(() => new Promise<Response>((resolve) => replies.push(resolve)));
    vi.stubGlobal("fetch", send);
    const { trackEvent } = await import("./analytics");
    trackEvent({ event_name: "cta_click", page: "/" });
    for (let i = 0; i < count; i++) trackEvent({ event_name: "path_selected", page: "/" });
    const appended = queue().slice(1).map((event) => event.client_event_id);
    replies[0](new Response(null, { status: 202 }));
    await settle();
    expect(queue().map((event) => event.client_event_id)).toEqual(appended);
    for (let i = 1; i <= count; i++) { replies[i](new Response(null, { status: 202 })); await settle(); }
    expect(send).toHaveBeenCalledTimes(count + 1);
    expect(queue()).toEqual([]);
  });

  it("delivers completion queued during depth-100 delivery, retaining it until ACK", async () => {
    const replies: ((response: Response) => void)[] = [];
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((resolve) => replies.push(resolve))));
    const { trackEvent } = await import("./analytics");
    trackEvent({ event_name: "scroll_depth", page: "/", properties: { threshold: 100 } });
    trackEvent({ event_name: "rabbit_hole_completed", page: "/" });
    replies[0](new Response(null, { status: 202 })); await settle();
    expect(queue().map((event) => event.event_name)).toEqual(["rabbit_hole_completed"]);
    replies[1](new Response(null, { status: 202 })); await settle();
    expect(queue()).toEqual([]);
  });

  it.each(["online", "focus"])("recovers an exhausted cycle on %s without starving later events", async (trigger) => {
    const send = vi.fn().mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", send);
    const { trackEvent } = await import("./analytics");
    trackEvent({ event_name: "cta_click", page: "/" });
    trackEvent({ event_name: "rabbit_hole_started", page: "/" });
    await vi.runAllTimersAsync();
    expect(send).toHaveBeenCalledTimes(3);
    expect(queue()).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(60000);
    expect(send).toHaveBeenCalledTimes(3);
    send.mockResolvedValue(new Response(null, { status: 202 }));
    target.dispatchEvent(new Event(trigger)); await vi.runAllTimersAsync();
    expect(send).toHaveBeenCalledTimes(5);
    expect(queue()).toEqual([]);
  });

  it("startup after reload recovers persisted exhausted events", async () => {
    store.set(key, JSON.stringify([{ client_event_id: "persisted", event_name: "cta_click", page: "/", attempts: 3 }]));
    const send = vi.fn().mockResolvedValue(new Response(null, { status: 202 }));
    vi.stubGlobal("fetch", send);
    const { initializeAnalytics } = await import("./analytics");
    initializeAnalytics(); await settle();
    expect(send).toHaveBeenCalledTimes(1);
    expect(queue()).toEqual([]);
  });
});
