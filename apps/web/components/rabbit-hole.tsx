"use client";

import { useEffect, useRef } from "react";
import { trackEvent } from "../lib/analytics";

export function RabbitHole() {
  const root = useRef<HTMLElement>(null);
  const progress = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let cleanup: () => void = () => undefined;
    let cancelled = false;
    void import("gsap").then(async ({ gsap }) => {
      if (cancelled || !root.current) return;
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      gsap.registerPlugin(ScrollTrigger);
      const ctx = gsap.context(() => {
        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: root.current,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.8,
            onUpdate: (self) => {
              if (progress.current) progress.current.style.transform = `scaleX(${self.progress})`;
              const depth = Math.round(self.progress * 100);
              for (const threshold of [25, 50, 75, 100]) {
                const key = `wonderland_depth_${threshold}`;
                if (depth >= threshold && !sessionStorage.getItem(key)) {
                  sessionStorage.setItem(key, "1");
                  trackEvent({ event_name: "scroll_depth", page: "/rabbit-hole", properties: { threshold } });
                }
              }
            },
          },
        });
        timeline
          .fromTo(".rabbit-copy", { y: 20, opacity: 1 }, { y: -80, opacity: 0.25, ease: "none" }, 0)
          .fromTo(".watch", { y: -30, rotate: 0, opacity: 0.5 }, { y: 500, rotate: 420, opacity: 1, ease: "none" }, 0)
          .fromTo(".key", { y: -120, rotate: -28, opacity: 0 }, { y: 560, rotate: 190, opacity: 1, ease: "none" }, 0.08)
          .fromTo(".card", { y: -320, rotate: 21, opacity: 0 }, { y: 430, rotate: -60, opacity: 1, ease: "none" }, 0.18)
          .fromTo(".ink", { y: -240, rotate: 16, opacity: 0 }, { y: 530, rotate: 230, opacity: 1, ease: "none" }, 0.27)
          .to(".rabbit-copy h1", { textContent: "Curiouser and curiouser.", duration: 0.01 }, 0.48)
          .to(".rabbit-copy h1", { color: "#86b6cf", duration: 0.2 }, 0.5)
          .to(".rabbit-copy h1", { textContent: "Welcome to Wonderland.", duration: 0.01 }, 0.88)
          .to(".rabbit-copy .quiet", { textContent: "Which path will you choose?", duration: 0.01 }, 0.88);
        trackEvent({ event_name: "rabbit_hole_started", page: "/rabbit-hole" });
        cleanup = () => ctx.revert();
      }, root);
    });
    return () => { cancelled = true; cleanup(); };
  }, []);

  return (
    <section ref={root} className="rabbit-hole" aria-labelledby="rabbit-hole-title">
      <div className="rabbit-sticky">
        <div className="rabbit-copy">
          <p>Threshold / 01</p>
          <h1 id="rabbit-hole-title">Down?</h1>
          <div className="quiet">Or up? Does it matter?</div>
        </div>
        <div className="fall-object watch" aria-hidden="true">late</div>
        <div className="fall-object key" aria-hidden="true">a key to somewhere</div>
        <div className="fall-object card" aria-hidden="true">?</div>
        <div className="fall-object ink" aria-hidden="true" />
        <div className="rabbit-progress" aria-hidden="true"><span ref={progress} /></div>
      </div>
    </section>
  );
}
