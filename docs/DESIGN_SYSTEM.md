# Design System

The code is the source of truth for the first design-system implementation. Tokens live in `apps/web/app/globals.css` and are organized by surface, text, border, narrative accent, analytics meaning, spacing and motion. Functional UI follows a 4px/8px rhythm; narrative sections can break the grid with controlled asymmetry.

Typography loads Cormorant Garamond and Manrope from local Fontsource packages at build time, with Georgia/system fallbacks retained only as resilience. Narrative headings use Cormorant Garamond; controls and functional labels use Manrope.

Desktop Crossroads preserves three simultaneous narrative zones. At mobile widths it becomes a Narrative Scene Switcher with immediately visible, keyboard-accessible Rabbit, Hatter and Cheshire selectors. Only the confirmation CTA emits `path_selected`.

Focus treatment is contextual: gold on nocturne surfaces and dark plum on ivory surfaces. Primary links and selectors use at least a 44px interaction height. Formal WCAG conformance is not claimed.
