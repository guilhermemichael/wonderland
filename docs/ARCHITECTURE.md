# Architecture

The first milestone is a deliberately small, executable monorepo:

- `apps/web`: Next.js App Router, TypeScript, CSS-token design system, GSAP ScrollTrigger narrative surface.
- `apps/api`: FastAPI typed event boundary with CORS and idempotent in-memory ingestion for local development.
- `docs`: decisions and case-study source material.
- `scripts`: local orchestration, Python environment provisioning and smoke tests.

The Rabbit Hole uses one GSAP timeline attached to one ScrollTrigger instance. Animation is restricted to transform, opacity and text transitions. The API contract already reserves `session_id`, `schema_version` and JSON properties for the PostgreSQL event stream planned for Milestone 02. There is intentionally no database in Milestone 01.
