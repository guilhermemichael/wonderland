"use client";

import gsap from "gsap";
import { useEffect, useRef } from "react";

import { FINE_POINTER, REDUCED_MOTION } from "@/lib/gates";

/**
 * A contextual label that trails the native cursor over interactive scene
 * elements only (DESCEND, FOLLOW, CHOOSE, LOOK). The system cursor is never
 * hidden and focus states are never replaced. Absent on touch.
 */
export function Cursor() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fine = window.matchMedia(FINE_POINTER);
    const reduced = window.matchMedia(REDUCED_MOTION);
    if (!fine.matches) return;
    const label = el.querySelector<HTMLElement>(".cursor-label")!;
    const dur = reduced.matches ? 0 : 0.32;
    const xTo = gsap.quickTo(el, "x", { duration: dur, ease: "power3.out" });
    const yTo = gsap.quickTo(el, "y", { duration: dur, ease: "power3.out" });
    let current = "";
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      xTo(e.clientX);
      yTo(e.clientY);
      const target = (e.target as Element | null)?.closest<HTMLElement>("[data-cursor]");
      const text = target?.dataset.cursor ?? "";
      if (text !== current) {
        current = text;
        if (text) label.textContent = text;
        el.dataset.on = text ? "1" : "0";
      }
    };
    const leave = () => {
      current = "";
      el.dataset.on = "0";
    };
    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", leave);
      gsap.killTweensOf(el);
    };
  }, []);

  return (
    <div className="cursor" ref={ref} aria-hidden="true" data-on="0">
      <div className="cursor-inner">
        <span className="cursor-ring" />
        <span className="cursor-label" />
      </div>
    </div>
  );
}
