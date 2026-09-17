# WONDERLAND — Follow the White Rabbit

WONDERLAND is an experimental digital product exploring how storytelling, marketing, product design, full-stack engineering and MarTech can coexist within one measurable interactive ecosystem.

**Author:** Guilherme Araújo — Lead Strategist / Product Designer / Full-Stack Developer

## Overview

Milestone 01 delivered the integrated narrative foundation: Landing, Rabbit Hole, Crossroads, Rabbit/Hatter/Cheshire paths, design tokens, GSAP motion, reduced-motion behavior and event ingestion.
Milestone 02 introduces the durable product data foundation: PostgreSQL persistence, Alembic migrations, session lifecycle management, persistent event stream with database-level idempotency, authoritative server-side quiz scoring, deterministic tie-breaking, partial quiz progress recovery, lead capture, and explicit consent tracking.

## Stack

- Next.js 15, React 19 and TypeScript
- GSAP + ScrollTrigger
- Fontsource Cormorant Garamond + Manrope
- FastAPI + Pydantic v2
- PostgreSQL 16+ with SQLAlchemy 2.x, psycopg 3, and Alembic migrations
- Docker Compose for local database reproducibility
- Node.js scripts for one-command local orchestration

## Requirements

- Node.js 20+
- npm 10+
- Python 3.11+
- Internet access on the first `npm run dev` so the local Python environment can install `apps/api/requirements.txt`

## Installation

```bash
git clone <repository-url>
cd wonderland
npm install
cp .env.example .env
```

On Windows, copy `.env.example` to `.env` manually if `cp` is unavailable.

## Running locally

The root command starts both applications. On first run it creates `.venv` and installs the FastAPI dependencies automatically.

```bash
npm run dev
```

The development server uses `127.0.0.1` for the web process to avoid host-interface issues in restricted environments. Stop both processes with `Ctrl+C`.

## Available URLs

| Surface | URL |
| --- | --- |
| Frontend | http://localhost:3000 |
| Landing | http://localhost:3000/ |
| Rabbit Hole | http://localhost:3000/rabbit-hole |
| Crossroads | http://localhost:3000/crossroads |
| Rabbit | http://localhost:3000/rabbit |
| Hatter | http://localhost:3000/hatter |
| Cheshire | http://localhost:3000/cheshire |
| Backend health | http://localhost:8000/api/v1/health |
| Backend docs | http://localhost:8000/api/docs |

## Commands

```bash
npm run dev        # Next.js + FastAPI
npm run dev:web    # frontend only
npm run dev:api    # API only
npm run lint       # ESLint
npm run typecheck  # TypeScript
npm run build      # production build
npm test           # typecheck + queue regression tests + API smoke test
npm run test:regressions # browser regressions; requires running web + API
```

## Architecture

```text
wonderland/
├── apps/web/       Next.js product experience
├── apps/api/       FastAPI event boundary
├── docs/           architecture, system, analytics and case study
├── scripts/        local orchestration and smoke tests
├── .env.example    shared local configuration contract
└── package.json    root commands
```

The Rabbit Hole uses one master GSAP timeline with one ScrollTrigger instance. The client stores events locally before sending them to `POST /api/v1/events`. Each event has a UUID `client_event_id`; the API deduplicates by that UUID while `client_sequence` remains an ordering field.

## Analytics

Currently emitted events:

- `cta_click`
- `rabbit_hole_started` only on semantic entry
- `scroll_depth` at 25, 50, 75 and 100 during a real traversal
- `rabbit_hole_completed` only after narrative depth milestones
- `rabbit_hole_skipped` for explicit skip navigation
- `path_selected` only after a path CTA; mobile previews do not count

The serial queue reconciles each response against the latest localStorage state: an ACK removes only its `client_event_id`, preserving events appended during delivery. Each event gets up to three attempts per flush/recovery cycle, with 250ms/500ms waits. Exhausting a cycle leaves events pending; startup, focus or online starts a new eligible cycle. The stored failure count is diagnostic, never a permanent delivery cutoff. The API uses PostgreSQL for persistence. The backend supports quiz, lead and conversion, but the frontend interface for these will be built in Milestone 03.

Navbar `Choose` and the internal skip link call the same synchronous Rabbit Hole operation before anchor scrolling. It emits skip once and suppresses fabricated traversal events; a completed experience cannot be retroactively skipped.

### Focused browser regressions

Install the test browser with `npx playwright install chromium`. Run `npm run build`, start the production frontend with `npm --workspace apps/web exec -- next start -H 127.0.0.1`, and start the API in another terminal with `npm run dev:api`. Then run `npm run test:regressions`. The suite uses real API responses and delays/aborts requests to reproduce the delivery failures. `WEB_URL` can override the default `http://127.0.0.1:3000`; `BROWSER_CHANNEL=msedge` selects an installed Edge browser (PowerShell: `$env:BROWSER_CHANNEL='msedge'`). Optional `EVIDENCE_DIR` saves the six desktop hover/focus screenshots outside the repository.

## Current milestone

**Milestone 02 — Data Foundation, persistence, idempotency, and session management.**

## Next milestone

Milestone 03 will complete the product flow: building the visual Cheshire quiz interface, handling the submission sequence, displaying segmented results (Curious, Chaotic, Mysterious), providing lead capture, and routing to dynamic destination pages.

## Quality and accessibility

The project uses semantic HTML, visible focus, keyboard-compatible links, reduced-motion support and responsive semantic reflow. Crossroads uses dark focus on Ivory at all breakpoints and light focus within active dark zones; hover and keyboard focus share surface, text and accent states. Accessibility is not claimed as formal WCAG AA compliance until a dedicated audit is completed.

## Synthetic data disclaimer

Any future dashboard values or experiment outcomes are synthetic portfolio data and must never be presented as real campaign performance.

## Intellectual property disclaimer

WONDERLAND is a personal educational and portfolio concept inspired by *Alice's Adventures in Wonderland*. It is not affiliated with Disney and does not use Disney logos, film stills, trademarks, character designs or adaptation-specific assets.
