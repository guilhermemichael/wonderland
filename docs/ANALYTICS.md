# Analytics

Tracked facts in Milestone 01: `cta_click`, `rabbit_hole_started`, `scroll_depth`, and `path_selected`. Scroll thresholds are emitted once per session at 25/50/75/100. The client stores a small local queue so a backend outage does not break the experience; the API deduplicates by `(session_id, client_sequence)` when a session is present.

Dashboard metrics and experiments are synthetic by definition and must be labeled as such when implemented.

The browser sends events to the integrated FastAPI endpoint at `/api/v1/events`. The root `npm test` command starts a temporary API process and verifies health, valid ingestion and duplicate idempotency.
