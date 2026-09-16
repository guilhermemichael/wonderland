# Analytics

Tracked facts in Milestone 01.1: `cta_click`, `rabbit_hole_started`, `scroll_depth`, `rabbit_hole_completed`, `rabbit_hole_skipped`, and `path_selected`. Scroll thresholds are emitted only during a real, non-skipped Rabbit Hole traversal. Mobile path previews do not count as selection.

Each event has a UUID `client_event_id`, persistent `client_sequence`, and anonymous `session_id`. The API uses `client_event_id` as the in-memory idempotency key. PostgreSQL uniqueness is deferred to Milestone 02.

Dashboard metrics and experiments are synthetic by definition and must be labeled as such when implemented.

The browser queues events locally before sending them to `/api/v1/events`. Successful responses remove them; failures remain pending and are retried at most three times per flush. Pending events recover on startup, focus and `online`. Storage failures do not block the experience.

The root `npm test` command verifies health, schema validation, distinct event IDs, concurrent duplicate idempotency and sequence-reset behavior.
