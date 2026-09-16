# Design System

The code is the source of truth for the first design-system implementation. Tokens live in `apps/web/app/globals.css` and are organized by surface, text, border, narrative accent, analytics meaning, spacing and motion. Functional UI follows a 4px/8px rhythm; narrative sections can break the grid with controlled asymmetry.

Typography loads Cormorant Garamond and Manrope from local Fontsource packages at build time, with Georgia/system fallbacks retained only as resilience. Narrative headings use Cormorant Garamond; controls and functional labels use Manrope.

Desktop Crossroads preserves three simultaneous narrative zones. At mobile widths it becomes a Narrative Scene Switcher with immediately visible, keyboard-accessible Rabbit, Hatter and Cheshire selectors. Only the confirmation CTA emits `path_selected`.

Crossroads focus treatment is contextual at all widths: `--focus-light` (#5b3d5b) is dark plum on Ivory; `--focus-dark` (#d5b97d) is light gold inside active nocturne path zones. The token suffix names the background, not the ring color. The Ivory ring measured 7.82:1. Primary links and selectors use at least a 44px interaction height. Formal WCAG conformance is not claimed.

Desktop `.path-zone:is(:hover, :focus-within)` shares the dark surface, inverse text, muted description and path-specific light accent. `--path-accent-on-light` retains the original readable Ivory colors; `--path-accent-on-dark` uses #86b6cf (Rabbit), #b8c99d (Hatter), and #c7a5c0 (Cheshire). Browser-computed number contrast against #10151f measured 8.36:1, 10.34:1 and 8.33:1 in both hover and keyboard focus. CTA/description contrast and 44px CTA targets were also checked at 1440×900. Layout and mobile scene switching are unchanged.
