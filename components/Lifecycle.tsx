"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { track } from "@/lib/analytics";
import { watchGates } from "@/lib/gates";

/**
 * Page-level housekeeping: one page_view per navigation, every loop paused
 * on hidden tabs, and the live static/scrub mode on <html>.
 */
export function Lifecycle() {
  const pathname = usePathname();
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (last.current === pathname) return;
    last.current = pathname;
    track("page_view", { path: pathname });
  }, [pathname]);

  useEffect(() => {
    const root = document.documentElement;
    const onVis = () => root.classList.toggle("is-hidden", document.hidden);
    document.addEventListener("visibilitychange", onVis);
    onVis();
    const unwatch = watchGates((isStatic) => {
      root.dataset.mode = isStatic ? "static" : "scrub";
    });
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      unwatch();
    };
  }, []);

  return null;
}
