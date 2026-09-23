/**
 * One shared pointer reading for every depth effect (normalised -1..1).
 * Only fine pointers move the world; touch never does.
 */
import { FINE_POINTER, REDUCED_MOTION } from "./gates";

export const pointer = { x: 0, y: 0, active: false };

let installed = false;
const listeners = new Set<(x: number, y: number) => void>();

export function onPointer(fn: (x: number, y: number) => void) {
  install();
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function install() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  const fine = window.matchMedia(FINE_POINTER);
  const reduced = window.matchMedia(REDUCED_MOTION);
  window.addEventListener(
    "pointermove",
    (e) => {
      if (!fine.matches || reduced.matches || e.pointerType !== "mouse") return;
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
      pointer.active = true;
      listeners.forEach((fn) => fn(pointer.x, pointer.y));
    },
    { passive: true },
  );
  document.documentElement.addEventListener("pointerleave", () => {
    pointer.x = 0;
    pointer.y = 0;
    listeners.forEach((fn) => fn(0, 0));
  });
}
