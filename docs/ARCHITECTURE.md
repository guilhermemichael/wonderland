# Architecture

The first milestone is a deliberately small, executable monorepo:

- `apps/web`: Next.js App Router, TypeScript, CSS-token design system, GSAP ScrollTrigger narrative surface.
- `apps/api`: FastAPI persistent relational event boundary with PostgreSQL, SQLAlchemy 2.x, Alembic, and Pydantic v2.
- `docs`: decisions, architecture, analytics, milestone guides, and case-study source material.
- `scripts`: local orchestration, Python environment provisioning, regression and smoke tests.

The Rabbit Hole uses one GSAP timeline attached to one ScrollTrigger instance. The timeline is registered through `gsap.matchMedia()` only for `prefers-reduced-motion: no-preference`; the reduced-motion path uses a short semantic transition and does not create the long scroll scene. Overflow is clipped only on the horizontal axis, preserving sticky positioning.

In Milestone 02, the API implements a hybrid relational model:
1. **Normalized Current State Tables**: `campaigns`, `sessions`, `session_experiments`, `quiz_answers`, `quiz_submissions`, `leads`.
2. **Append-Only Event Stream**: `campaign_events` table with database-level UNIQUE constraint on `client_event_id` ensuring persistent idempotency under concurrency.
3. **Authoritative Quiz Scoring**: Evaluated on the server with deterministic tie-breaking hierarchy (Q4 -> Q1 -> Q2 -> Q3) and normalized confidence margin.
4. **Separation of Concerns**: `entry_affinity` and `final_segment` are strictly decoupled; PII is restricted to `leads` and excluded from `campaign_events`.

Client delivery remains a small localStorage serial drain. Each response is reconciled by UUID against a fresh queue read, preserving in-flight additions. Retry budgets belong to a flush cycle (three attempts per event, 250ms/500ms waits); persisted failure counts do not gate eligibility. Startup/focus/online can retry a previously exhausted queue. The in-document flush guard prevents overlapping drains; this is not a cross-tab transactional guarantee.

The home holds a React ref to the Rabbit Hole's `requestSkip` handle. Navbar Choose and the internal link invoke that single operation. It updates the scene's skipped ref synchronously before native anchor scrolling, then emits one skip event. Completed scenes ignore skip requests. The timeline and completion emitter are unchanged; completion delivery is repaired at the shared queue boundary.
