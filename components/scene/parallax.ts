/**
 * Mouse depth, desktop only: background 0-2px, mid 1-4px, foreground 2-8px.
 * The frame moves as one layer (GSAP quickTo, compositor-only transforms);
 * life regions read the same smoothed offset through two CSS variables and
 * add their own depth on top.
 */
import gsap from "gsap";

import { FINE_POINTER, REDUCED_MOTION } from "@/lib/gates";
import { onPointer } from "@/lib/pointer";

export function attachParallax(bg: HTMLElement, frame: HTMLElement, amount = 2) {
  if (!window.matchMedia(FINE_POINTER).matches || window.matchMedia(REDUCED_MOTION).matches) {
    return () => {};
  }
  const opts = { duration: 1.6, ease: "power3.out" };
  const bx = gsap.quickTo(bg, "x", opts);
  const by = gsap.quickTo(bg, "y", opts);
  const fx = gsap.quickTo(frame, "--px", opts);
  const fy = gsap.quickTo(frame, "--py", opts);
  const off = onPointer((x, y) => {
    bx(-x * amount);
    by(-y * amount * 0.6);
    fx(-x);
    fy(-y * 0.6);
  });
  return () => {
    off();
    gsap.killTweensOf([bg, frame]);
  };
}
