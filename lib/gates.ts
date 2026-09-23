/**
 * The five static-experience gates (references/scrub-pipeline.md).
 *
 * These strings MUST stay character-for-character identical to the media
 * query used in app/experience.css (search for "STATIC GATES"). When any of
 * them matches, the page is the composed static-first experience: no scrub,
 * no video requests.
 */
export const STATIC_GATES = [
  "(max-width: 720px)",
  "(orientation: portrait) and (max-width: 1024px)",
  "(orientation: portrait) and (pointer: coarse)",
  "(orientation: landscape) and (pointer: coarse) and (max-height: 560px)",
  "(prefers-reduced-motion: reduce)",
] as const;

export const STATIC_MEDIA = STATIC_GATES.join(", ");

export const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
export const FINE_POINTER = "(hover: hover) and (pointer: fine)";
/** Narrow or portrait layouts of the static experience. */
export const NARROW_MEDIA = "(max-width: 720px), (orientation: portrait)";

/**
 * Subscribes to the gates, calling `onChange(isStatic)` immediately and on
 * every rotation, resize or preference flip. Keeps the MediaQueryList
 * objects referenced for the lifetime of the subscription.
 */
export function watchGates(onChange: (isStatic: boolean) => void): () => void {
  const lists = STATIC_GATES.map((q) => window.matchMedia(q));
  const evaluate = () => onChange(lists.some((l) => l.matches));
  lists.forEach((l) => l.addEventListener("change", evaluate));
  evaluate();
  return () => lists.forEach((l) => l.removeEventListener("change", evaluate));
}

export function watchMedia(query: string, onChange: (matches: boolean) => void): () => void {
  const list = window.matchMedia(query);
  const handler = () => onChange(list.matches);
  list.addEventListener("change", handler);
  handler();
  return () => list.removeEventListener("change", handler);
}
