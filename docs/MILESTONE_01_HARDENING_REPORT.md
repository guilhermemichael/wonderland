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

## Initial validation and independent gate

The initial hardening passed these checks, but that did not establish queue correctness:

```text
npm install
npm run lint
npm run typecheck
npm run test
npm run build
python -m py_compile apps/api/main.py
```

The independent gate on `a00191abbab87653aca4ee3861640b66b506d4c0` rejected merge: a stale queue snapshot erased in-flight additions (including completion), a lifetime retry cutoff blocked recovery, navbar Choose bypassed skip semantics, and desktop hover/focus states had insufficient contrast/parity. The original pure queue tests did not exercise asynchronous delivery.

## Final regression patch

- ACK/failure reconciliation now reads the latest queue and updates only the matching UUID. A serial drain delivers newly appended events next; there is no completion-specific workaround.
- Three attempts are allowed per event per recovery cycle with 250ms/500ms waits. Exhaustion stops that cycle, retains pending entries and permits a fresh cycle on startup/focus/online. Persisted failures are diagnostic, not a lifetime cutoff; later entries drain after the head recovers.
- Navbar Choose and internal skip use the same synchronous `requestSkip` operation, setting the scene state before anchor scrolling. Completion prevents retroactive skip.
- Crossroads has contextual light/dark focus at all widths and shared hover/focus-within surface, text and accent states. Number contrast on dark is 8.36:1 / 10.34:1 / 8.33:1; dark focus on Ivory is 7.82:1. Desktop CTA/description contrast and targets were checked.

### Regression evidence

Before implementation edits, the six new tests in `analytics-delivery.test.ts` failed against the starting source: single/multiple in-flight additions disappeared, completion disappeared during depth-100 delivery, cycle-budget expectations failed for online/focus, and a persisted exhausted event was never sent on startup. Against the original production build, the new navbar test observed start/depth instead of skip and the hover test measured Rabbit at 2.70:1.

After the patch, all nine unit tests (six new, three existing), API smoke checks, lint, typecheck, production build and Python compile passed. The seven Playwright browser cases passed against the local production build and real FastAPI service:

1. Navbar Choose: one skip, no fabricated traversal.
2. Internal skip: one skip, no false depths/completion.
3. Normal hero traversal: all eight events receive HTTP 202; completion remains queued while depth 100 is held, then delivers and clears; Choose after completion emits no skip.
4. Exhausted offline cycle recovers on online.
5. Exhausted offline cycle recovers on focus.
6. Persisted exhausted queue recovers on reload/startup.
7. All three desktop hover and keyboard focus states, text contrast, 44px CTA targets and Ivory focus treatment.

Run `npm run test:regressions` with the production frontend and API running; see README. The browser suite uses delayed requests and connection failures, but successful deliveries receive real HTTP 202 responses. This is focused regression verification, not a new general product audit or global accessibility certification.

## Remaining Limitations

- Event persistence is process memory and resets on API restart.
- Durable event uniqueness and PostgreSQL remain deferred to Milestone 02.
- Formal WCAG AA and Core Web Vitals certification is not claimed.
- The Next 15 build prints an informational warning about detecting the valid ESLint flat config; `npm run lint` passes.

## Patch status

**READY FOR FINAL CODEX RE-VERIFICATION**

The branch requires an independent read-only regression gate on its new HEAD before merge. No merge, tag or Milestone 02 implementation is part of this patch. Milestone 02 must preserve `client_event_id` as the durable database uniqueness identity.
