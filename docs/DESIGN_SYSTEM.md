# Design System

The code is the source of truth for the first design-system implementation. Tokens live in `apps/web/app/globals.css` and are organized by surface, text, border, narrative accent, analytics meaning, spacing and motion. Functional UI follows a 4px/8px rhythm; narrative sections can break the grid with controlled asymmetry.

Typography intentionally uses editorial Georgia as a local-safe fallback for Cormorant Garamond and system UI as a local-safe fallback for Manrope. A future production pass can self-host the exact font files without changing component APIs.
