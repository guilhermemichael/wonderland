# WONDERLAND — Technical Handoff

## Current state

Milestone 01 is consolidated under one repository root. The root `npm run dev` command provisions a local Python virtual environment when necessary, starts FastAPI on port 8000 and starts Next.js on port 3000.

## Architecture

- `apps/web`: Next.js App Router, TypeScript, CSS token system, GSAP/ScrollTrigger.
- `apps/api`: FastAPI, Pydantic event contract, CORS, in-memory idempotent event store.
- `scripts`: cross-platform local orchestration and API smoke testing.
- `docs`: source documentation and case-study material.

## Main decisions

- No PostgreSQL, Redis, external queue services, login or background workers in Milestone 01; the browser has a localStorage event queue.
- One master GSAP timeline controls the Rabbit Hole.
- The client uses an anonymous local session ID, persistent client sequence and UUID `client_event_id`. Serial delivery reads the latest queue after each response, preserving events added in flight and removing only the ACKed UUID. Each event has three attempts per recovery cycle; exhaustion leaves it pending and eligible for later startup/focus/online recovery.
- `rabbit_hole_started` means semantic entry, `rabbit_hole_completed` requires depth milestones, and `rabbit_hole_skipped` is explicit navigation. Navbar Choose and internal skip share one synchronous operation before scrolling. Skip is never completion; an already completed scene ignores later skip requests.
- Mobile Crossroads uses a Narrative Scene Switcher; previews do not emit selection.
- Narrative accents remain separate from future analytics semantics.
- Desktop hover/focus-within share active path treatment. Crossroads focus is dark on Ivory and light on dark zones at all widths.
- The project remains an original, non-Disney literary interpretation.

## Commands

```bash
npm install
cp .env.example .env
npm run dev
npm test
npm run test:regressions
```

Browser regressions require a running production frontend, API and Playwright browser; setup and optional screenshot output are described in README. The final patch has six new analytics-module tests and seven browser tests. All six module cases failed on the initial implementation; navbar skip and hover contrast also failed against its production build before the patch. The focused browser suite now confirms all eight normal-flow events receive HTTP 202, completion survives depth-100 delivery, and exhausted queues recover on online/focus/reload.

## Milestone 02 Implemented

- Cheshire quiz with native question/answer IDs and partial progress recovery.
- Server-authoritative scoring and deterministic tie-break rules (Q4 -> Q1 -> Q2 -> Q3).
- PostgreSQL normalized state (`sessions`, `quiz_answers`, `quiz_submissions`, `leads`) plus append-only event stream (`campaign_events`).
- Persistent database-level idempotency by `client_event_id` with concurrent collision safety.
- Lead capture with explicit marketing and privacy consent tracking, keeping PII segregated from generic analytics.
- Alembic database migration system and Docker Compose for reproducible local PostgreSQL 16.

## Pending Milestone 03

- Marketing/performance analytics dashboard & BI visualization layer.
- Lead routing & automated campaign follow-up integrations.

## Known risks

- The API event store is process memory and resets on restart by design.
- Cormorant Garamond and Manrope are bundled through Fontsource packages; local-safe fallbacks remain for resilience.
- Formal WCAG AA and Core Web Vitals audits remain future validation work.
