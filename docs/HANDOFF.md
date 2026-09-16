# WONDERLAND — Technical Handoff

## Current state

Milestone 01 is consolidated under one repository root. The root `npm run dev` command provisions a local Python virtual environment when necessary, starts FastAPI on port 8000 and starts Next.js on port 3000.

## Architecture

- `apps/web`: Next.js App Router, TypeScript, CSS token system, GSAP/ScrollTrigger.
- `apps/api`: FastAPI, Pydantic event contract, CORS, in-memory idempotent event store.
- `scripts`: cross-platform local orchestration and API smoke testing.
- `docs`: source documentation and case-study material.

## Main decisions

- No PostgreSQL, Redis, queues, login or background workers in Milestone 01.
- One master GSAP timeline controls the Rabbit Hole.
- The client uses an anonymous local session ID and sends events to FastAPI.
- Narrative accents remain separate from future analytics semantics.
- The project remains an original, non-Disney literary interpretation.

## Commands

```bash
npm install
cp .env.example .env
npm run dev
npm test
```

## Pending Milestone 02

- Cheshire quiz and native accessible answer controls.
- Server-authoritative scoring and tie-break rules.
- PostgreSQL normalized state plus JSONB event stream.
- Session recovery, result page, lead capture and conversion event.

## Known risks

- The API event store is process memory and resets on restart by design.
- The exact Cormorant Garamond and Manrope font files are not bundled yet; local-safe editorial/system fallbacks are used.
- Formal WCAG AA and Core Web Vitals audits remain future validation work.
