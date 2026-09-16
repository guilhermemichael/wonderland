# Architecture

The first milestone is a deliberately small, executable monorepo:

- `apps/web`: Next.js App Router, TypeScript, CSS-token design system, GSAP ScrollTrigger narrative surface.
- `apps/api`: FastAPI typed event boundary with CORS and idempotent in-memory ingestion for local development.
- `docs`: decisions and case-study source material.
- `scripts`: local orchestration, Python environment provisioning and smoke tests.

The Rabbit Hole uses one GSAP timeline attached to one ScrollTrigger instance. The timeline is registered through `gsap.matchMedia()` only for `prefers-reduced-motion: no-preference`; the reduced-motion path uses a short semantic transition and does not create the long scroll scene. Overflow is clipped only on the horizontal axis, preserving sticky positioning.

The API uses `client_event_id` as the idempotency identity, while `client_sequence` remains an ordering field. The event store is protected by a lock but remains process memory by design. PostgreSQL and its durable uniqueness constraint are deferred to Milestone 02.
