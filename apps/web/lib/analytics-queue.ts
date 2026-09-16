export type QueueEvent = { client_event_id: string; attempts: number; [key: string]: unknown };
export type FlushOutcome = { client_event_id: string; success: boolean };

export function applyFlushOutcomes(queue: QueueEvent[], outcomes: FlushOutcome[]) {
  const outcomeById = new Map(outcomes.map((outcome) => [outcome.client_event_id, outcome]));
  return queue.flatMap((event) => {
    const outcome = outcomeById.get(event.client_event_id);
    if (!outcome) return [event];
    if (outcome.success) return [];
    return [{ ...event, attempts: event.attempts + 1 }];
  });
}
