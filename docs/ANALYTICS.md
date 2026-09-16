# Analytics

Tracked facts in Milestone 01.1: `cta_click`, `rabbit_hole_started`, `scroll_depth`, `rabbit_hole_completed`, `rabbit_hole_skipped`, and `path_selected`. Scroll thresholds are emitted only during a real, non-skipped Rabbit Hole traversal. Mobile path previews do not count as selection.

Each event has a UUID `client_event_id`, persistent `client_sequence`, and anonymous/public `session_id`. In Milestone 02, the API enforces persistent database-level idempotency via a `UNIQUE` constraint on `client_event_id` in PostgreSQL (`campaign_events` table). Concurrent duplicate requests are resolved safely without error or duplicated rows.

Analytics events strictly maintain privacy boundaries: generic event properties NEVER contain lead PII (email, name). All lead data is segregated in the normalized `leads` table.

The browser queues events locally before sending them to `/api/v1/events`. Delivery is a serial drain. After every asynchronous response, it reads the current queue again and applies the outcome only to the matching `client_event_id`. A successful response removes that event; B/C/D appended while A was in flight remain pending and are drained next. Completion uses this same delivery path, including when it is queued during depth-100 delivery.

Each event has a budget of three attempts within one flush/recovery cycle, separated by 250ms and 500ms waits. On exhaustion the cycle stops with the queue intact. Stored `attempts` counts failures for diagnostics only: it never makes an event ineligible. A subsequent startup, focus, `online`, or new event enqueue can start another cycle. FIFO ordering is retained; once an earlier event succeeds, later pending events drain in the same cycle. There is no autonomous infinite retry or silent permanent abandonment. Storage failures do not block interaction; if an ACK cannot be persisted, the drain stops rather than repeatedly sending it. API UUID deduplication makes a later resend safe.

Both `Choose` and the internal skip link call `RabbitHole.requestSkip` synchronously before anchor navigation. The operation marks the scene skipped before ScrollTrigger processes the jump, emits `rabbit_hole_skipped` once (`navigation_choose` or `explicit_navigation`), and suppresses fabricated start/depth/completion. It does nothing after completion. Normal hero entry remains traversal.

The reconciliation guarantee covers asynchronous delivery/enqueue within one document. localStorage is not a transactional multi-tab queue, and blocked/unavailable browser storage cannot provide durable delivery. No cross-tab locking or new persistence system is introduced in M01.

The root `npm test` command verifies actual analytics-module delivery with controlled in-flight responses, exhausted-cycle recovery, persisted startup recovery, plus health, schema validation, distinct IDs, concurrent duplicate idempotency and sequence-reset behavior. `npm run test:regressions` checks real browser/API delivery, both skip entrypoints, all eight normal-flow events, and recovery after exhaustion via online/focus/reload; see README for runtime prerequisites.
