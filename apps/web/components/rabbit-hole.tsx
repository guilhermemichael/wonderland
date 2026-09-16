"use client";

import { useEffect, useRef, useState } from "react";
import { trackEvent } from "../lib/analytics";

type RabbitHoleProps = { page?: string };

export function RabbitHole({ page = "/rabbit-hole" }: RabbitHoleProps) {
  const root = useRef<HTMLElement>(null);
  const progress = useRef<HTMLSpanElement>(null);
  const started = useRef(false);
  const skipped = useRef(false);
  const completed = useRef(false);
  const reached = useRef(new Set<number>());
  const reducedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [reducedEntered, setReducedEntered] = useState(false);

  useEffect(() => {
    const rootElement = root.current;
    if (!rootElement) return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(query.matches);
    const begin = () => {
      if (started.current || skipped.current) return;
      started.current = true;
      trackEvent({ event_name: "rabbit_hole_started", page });
    };
    const finish = () => {
      if (completed.current || skipped.current) return;
      completed.current = true;
      trackEvent({ event_name: "rabbit_hole_completed", page });
    };
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && query.matches) {
        begin();
        setReducedEntered(true);
        reducedTimer.current = setTimeout(finish, 380);
      }
    }, { threshold: 0.35 });
    observer.observe(rootElement);
    let cleanup: () => void = () => undefined;
    let cancelled = false;
    void import("gsap").then(async ({ gsap }) => {
      if (cancelled || !root.current) return;
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      gsap.registerPlugin(ScrollTrigger);
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const ctx = gsap.context(() => {
          const timeline = gsap.timeline({
            scrollTrigger: {
              trigger: root.current,
              start: "top top",
              end: "bottom bottom",
              scrub: 0.8,
              onEnter: begin,
              onUpdate: (self) => {
                if (skipped.current) return;
                if (progress.current) progress.current.style.transform = `scaleX(${self.progress})`;
                const depth = Math.floor(self.progress * 100);
                for (const threshold of [25, 50, 75]) {
                  if (depth >= threshold && !reached.current.has(threshold)) {
                    reached.current.add(threshold);
                    trackEvent({ event_name: "scroll_depth", page, properties: { threshold } });
                  }
                }
                if (depth >= 100 && reached.current.size === 3) {
                  if (!reached.current.has(100)) {
                    reached.current.add(100);
                    trackEvent({ event_name: "scroll_depth", page, properties: { threshold: 100 } });
                  }
                  finish();
                }
              },
            },
          });
          timeline
            .fromTo(".rabbit-copy", { y: 20, opacity: 1 }, { y: -80, opacity: 0.32, ease: "none" }, 0)
            .fromTo(".watch", { y: -30, rotate: 0, opacity: 0.5 }, { y: 500, rotate: 420, opacity: 1, ease: "none" }, 0)
            .fromTo(".key", { y: -120, rotate: -28, opacity: 0 }, { y: 560, rotate: 190, opacity: 1, ease: "none" }, 0.08)
            .fromTo(".card", { y: -320, rotate: 21, opacity: 0 }, { y: 430, rotate: -60, opacity: 1, ease: "none" }, 0.18)
            .fromTo(".ink", { y: -240, rotate: 16, opacity: 0 }, { y: 530, rotate: 230, opacity: 1, ease: "none" }, 0.27)
            .to(".rabbit-copy h1", { textContent: "Curiouser and curiouser.", duration: 0.01 }, 0.48)
            .to(".rabbit-copy h1", { color: "#86b6cf", duration: 0.2 }, 0.5)
            .to(".rabbit-copy h1", { textContent: "Welcome to Wonderland.", duration: 0.01 }, 0.88)
            .to(".rabbit-copy .quiet", { textContent: "Which path will you choose?", duration: 0.01 }, 0.88)
            .to(".rabbit-copy", { y: 0, opacity: 1, duration: 0.12 }, 0.9);
        }, root);
        cleanup = () => ctx.revert();
      });
      const priorCleanup = cleanup;
      cleanup = () => { priorCleanup(); mm.revert(); };
    });
    return () => {
      cancelled = true;
      observer.disconnect();
      if (reducedTimer.current) clearTimeout(reducedTimer.current);
      cleanup();
    };
  }, [page]);

  const handleSkip = () => {
    if (completed.current || skipped.current) return;
    skipped.current = true;
    trackEvent({ event_name: "rabbit_hole_skipped", page, properties: { reason: "explicit_navigation" } });
  };

  return (
    <section ref={root} className={`rabbit-hole${reducedMotion ? " is-reduced" : ""}`} aria-labelledby="rabbit-hole-title">
      <div className="rabbit-sticky">
        <div className="rabbit-copy">
          <p>Threshold / 01</p>
          <h1 id="rabbit-hole-title">{reducedEntered ? "Welcome to Wonderland." : "Down?"}</h1>
          <div className="quiet">{reducedEntered ? "Which path will you choose?" : "Or up? Does it matter?"}</div>
        </div>
        <div className="fall-object watch" aria-hidden="true">late</div>
        <div className="fall-object key" aria-hidden="true">a key to somewhere</div>
        <div className="fall-object card" aria-hidden="true">?</div>
        <div className="fall-object ink" aria-hidden="true" />
        <div className="rabbit-progress" aria-hidden="true"><span ref={progress} /></div>
        <a className="skip-rabbit" href="#crossroads" onClick={handleSkip}>Skip to the crossroads ↗</a>
      </div>
    </section>
  );
}
