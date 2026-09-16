# WONDERLAND — Follow the White Rabbit

WONDERLAND is an experimental digital product exploring how storytelling, marketing, product design, full-stack engineering and MarTech can coexist within one measurable interactive ecosystem.

**Author:** Guilherme Araújo — Lead Strategist / Product Designer / Full-Stack Developer

## Overview

Milestone 01 delivers the integrated narrative foundation: Landing, Rabbit Hole, Crossroads, Rabbit/Hatter/Cheshire paths, design tokens, GSAP motion, reduced-motion behavior and basic event ingestion. It is an original literary interpretation inspired by Lewis Carroll, not an official Disney product and not built with Disney assets.

## Stack

- Next.js 15, React 19 and TypeScript
- GSAP + ScrollTrigger
- Fontsource Cormorant Garamond + Manrope
- FastAPI + Pydantic
- Node.js scripts for one-command local orchestration
- In-memory API event store for Milestone 01

PostgreSQL, quiz scoring, lead capture and session recovery are intentionally deferred to Milestone 02.

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
npm test           # typecheck + API smoke test
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

The queue removes accepted events, preserves failures, recovers on startup/focus/online and limits retries. The API store is process memory until PostgreSQL is implemented in Milestone 02. No quiz, lead or conversion backend is implemented in this milestone.

## Current milestone

**Milestone 01 — Foundation and narrative entry experience.**

## Next milestone

Milestone 02 will add the Cheshire quiz, server-authoritative scoring, PostgreSQL persistence, session recovery, result segmentation and lead capture. It has not been implemented here.

## Quality and accessibility

The project uses semantic HTML, visible focus, keyboard-compatible links, reduced-motion support and responsive semantic reflow. Accessibility is not claimed as formal WCAG AA compliance until a dedicated audit is completed.

## Synthetic data disclaimer

Any future dashboard values or experiment outcomes are synthetic portfolio data and must never be presented as real campaign performance.

## Intellectual property disclaimer

WONDERLAND is a personal educational and portfolio concept inspired by *Alice's Adventures in Wonderland*. It is not affiliated with Disney and does not use Disney logos, film stills, trademarks, character designs or adaptation-specific assets.
