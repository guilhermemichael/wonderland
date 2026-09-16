# WONDERLAND — Milestone 01.1 Hardening Report

Source document: `docs/MILESTONE_01_HARDENING_REPORT.md`

## Findings Addressed

### Findings

- Rabbit Hole sticky continuity and direct-route dead end.
- Event identity collision after reload.
- Mount incorrectly reported as narrative start.
- Missing completion and skip semantics.
- False scroll-depth/completion on explicit skip.
- Non-functional analytics queue.
- Incorrect Crossroads page context.
- GSAP ignored reduced motion.
- Mobile Crossroads hid Cheshire below the first viewport.
- Narrative fonts were not actually bundled.
- Focus, contrast and target-size weaknesses.
- Cheshire placeholder exposed implementation language.

## Root Causes

- The shell used `overflow: hidden`, creating an ancestor scrolling context for sticky.
- `client_sequence` was module-local while `session_id` persisted.
- Analytics were dispatched during component initialization and left in storage after success.
- Desktop-only Crossroads markup was stacked without a mobile choice architecture.
- CSS named fonts were not loaded by the application.

## Fixes

- Horizontal-only clipping preserves sticky positioning without page-wide horizontal overflow.
- UUID `client_event_id` is generated for every event; sequence persists for ordering only.
- FastAPI deduplicates by UUID under a lock; PostgreSQL uniqueness remains an M02 concern.
- ScrollTrigger `onEnter` marks real entry; sequential 25/50/75 depth plus the end marks completion.
- Explicit skip emits `rabbit_hole_skipped` and suppresses depth/completion.
- Queue persists before send, removes 2xx responses, retains failures and recovers on startup/focus/online with bounded retries.
- Crossroads receives the actual route and exposes a mobile Narrative Scene Switcher.
- `gsap.matchMedia()` only creates the long timeline for `no-preference`; reduced motion receives a short semantic path.
- Fontsource packages load Cormorant Garamond and Manrope locally.
- Contextual focus rings, darker ivory-surface accents and 44px controls improve keyboard accessibility.
- Cheshire placeholder is now entirely in-world.

## Validation

Passed on this branch:

```text
npm install
npm run lint
npm run typecheck
npm run test
npm run build
python -m py_compile apps/api/main.py
```

Tests cover queue success/failure/preservation, API validation, duplicate retry, distinct events, concurrent requests and sequence reuse after reload. Runtime smoke validation covers `/`, `/rabbit-hole`, `/crossroads`, `/rabbit`, `/hatter`, `/cheshire`, `/cheshire/quiz` and `/api/v1/health`.

## Remaining Limitations

- Event persistence is process memory and resets on API restart.
- Durable event uniqueness and PostgreSQL remain deferred to Milestone 02.
- Formal WCAG AA and Core Web Vitals certification is not claimed.
- The Next 15 build prints an informational warning about detecting the valid ESLint flat config; `npm run lint` passes.

## Milestone 02 Readiness

**READY WITH CONDITIONS**

The branch is ready for independent regression verification. Milestone 02 must preserve `client_event_id` as the durable database uniqueness identity.
