# Architecture

The first milestone is a deliberately small, executable monorepo:

- `apps/web`: Next.js App Router, TypeScript, CSS-token design system, GSAP ScrollTrigger narrative surface.
- `apps/api`: FastAPI typed event boundary with CORS and idempotent in-memory ingestion for local development.
- `docs`: decisions and case-study source material.
- `scripts`: local orchestration, Python environment provisioning and smoke tests.

The Rabbit Hole uses one GSAP timeline attached to one ScrollTrigger instance. The timeline is registered through `gsap.matchMedia()` only for `prefers-reduced-motion: no-preference`; the reduced-motion path uses a short semantic transition and does not create the long scroll scene. Overflow is clipped only on the horizontal axis, preserving sticky positioning.

The API uses `client_event_id` as the idempotency identity, while `client_sequence` remains an ordering field. The event store is protected by a lock but remains process memory by design. PostgreSQL and its durable uniqueness constraint are deferred to Milestone 02.

Client delivery remains a small localStorage serial drain. Each response is reconciled by UUID against a fresh queue read, preserving in-flight additions. Retry budgets belong to a flush cycle (three attempts per event, 250ms/500ms waits); persisted failure counts do not gate eligibility. Startup/focus/online can retry a previously exhausted queue. The in-document flush guard prevents overlapping drains; this is not a cross-tab transactional guarantee.

The home holds a React ref to the Rabbit Hole's `requestSkip` handle. Navbar Choose and the internal link invoke that single operation. It updates the scene's skipped ref synchronously before native anchor scrolling, then emits one skip event. Completed scenes ignore skip requests. The timeline and completion emitter are unchanged; completion delivery is repaired at the shared queue boundary.
