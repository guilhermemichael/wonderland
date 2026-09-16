import { describe, expect, it } from "vitest";
import { applyFlushOutcomes } from "./analytics-queue";

describe("analytics queue", () => {
  it("removes accepted events", () => {
    const queue = [{ client_event_id: "a", attempts: 0 }, { client_event_id: "b", attempts: 0 }];
    expect(applyFlushOutcomes(queue, [{ client_event_id: "a", success: true }])).toEqual([{ client_event_id: "b", attempts: 0 }]);
  });

  it("keeps failed events and increments attempts", () => {
    const queue = [{ client_event_id: "a", attempts: 1 }, { client_event_id: "b", attempts: 0 }];
    expect(applyFlushOutcomes(queue, [{ client_event_id: "a", success: false }])).toEqual([{ client_event_id: "a", attempts: 2 }, { client_event_id: "b", attempts: 0 }]);
  });

  it("preserves events after a failed request", () => {
    const queue = [{ client_event_id: "a", attempts: 0 }, { client_event_id: "b", attempts: 0 }];
    expect(applyFlushOutcomes(queue, [{ client_event_id: "a", success: false }])).toHaveLength(2);
  });
});
