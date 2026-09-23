const PATHS = {
  right: "M2 8h11M9 4l4 4-4 4",
  down: "M8 2v11M4 9l4 4 4-4",
  "down-right": "M3 3l9 9M5 12h7V5",
  "up-right": "M3 13l9-9M5 4h7v7",
  left: "M14 8H3M7 4L3 8l4 4",
} as const;

export function Arrow({ dir = "right" }: { dir?: keyof typeof PATHS }) {
  return (
    <svg className={`arrow arrow--${dir}`} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d={PATHS[dir]} fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="square" />
    </svg>
  );
}
