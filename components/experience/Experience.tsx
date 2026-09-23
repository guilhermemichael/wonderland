"use client";

import { useEffect, useRef, type CSSProperties } from "react";

import { Particles } from "@/components/atmosphere/Particles";
import { attachParallax } from "@/components/scene/parallax";
import { PlatePicture } from "@/components/scene/PlatePicture";
import { SceneLife } from "@/components/scene/SceneLife";
import { track } from "@/lib/analytics";
import { CHAPTER_ORDER, CHAPTERS, type StateId } from "@/lib/content";
import { watchGates } from "@/lib/gates";
import type { VideoId } from "@/lib/media";
import { revealVeil } from "@/lib/veil";

import { Band } from "./Band";
import { CrossroadsStage } from "./Crossroads";
import { ScrubEngine } from "./engine";
import { Hud } from "./Hud";
import { computeLayout } from "./timeline";

const TOTAL_VH = computeLayout().totalVh;
const VIDEOS: VideoId[] = [1, 2, 3, 4, 5];
const HASH_TO_CHAPTER: Record<string, StateId> = {
  threshold: "threshold",
  experience: "threshold",
  fall: "fall",
  disorientation: "disorientation",
  landing: "landing",
  paths: "crossroads",
  crossroads: "crossroads",
};

export function Experience() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current!;
    revealVeil();

    const q = <T extends Element>(s: string) => el.querySelector<T>(s);
    const plates: Partial<Record<StateId, HTMLElement>> = {};
    const bands: Partial<Record<StateId, HTMLElement>> = {};
    for (const id of CHAPTER_ORDER) {
      plates[id] = q<HTMLElement>(`[data-plate="${id}"]`) ?? undefined;
      bands[id] = q<HTMLElement>(`[data-band="${id}"]`) ?? undefined;
    }
    const videos: Partial<Record<VideoId, HTMLVideoElement>> = {};
    for (const v of VIDEOS) videos[v] = q<HTMLVideoElement>(`[data-video="${v}"]`) ?? undefined;

    const engine = new ScrubEngine({
      root: el,
      track: q<HTMLElement>(".track")!,
      stage: q<HTMLElement>(".stage")!,
      plates,
      videos,
      bands,
      counter: q<HTMLElement>("[data-counter]"),
      cue: q<HTMLElement>("[data-cue]"),
    });

    // life layers reuse the exact image the plate resolved to
    const cleanups: Array<() => void> = [];
    cleanups.push(attachParallax(q<HTMLElement>(".par-bg")!, q<HTMLElement>(".stage-media .frame")!));
    for (const wrap of Object.values(plates)) {
      const img = wrap?.querySelector("img");
      if (!wrap || !img) continue;
      const set = () => {
        if (img.currentSrc) wrap.style.setProperty("--plate-img", `url("${img.currentSrc}")`);
        wrap.classList.add("is-loaded");
      };
      if (img.complete && img.naturalWidth) set();
      img.addEventListener("load", set);
      cleanups.push(() => img.removeEventListener("load", set));
    }

    let isStatic = true;
    const unwatch = watchGates((s) => {
      isStatic = s;
      if (s) engine.disable();
      else engine.enable();
    });

    // entrances of the static chapters (no-op under reduced motion via CSS).
    // Chapters already on screen stay as they are; only the ones below the
    // fold hold their entrance, so slow scripts never leave a page of images
    // without words.
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries)
          if (e.isIntersecting) {
            e.target.classList.remove("pending");
            e.target.classList.add("in");
          }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.12 },
    );
    el.querySelectorAll<HTMLElement>(".band").forEach((b) => {
      if (b.getBoundingClientRect().top > window.innerHeight * 0.85) b.classList.add("pending");
      io.observe(b);
    });
    // slow push on static frames only while they are on screen
    const vis = new IntersectionObserver((entries) => {
      for (const e of entries) e.target.classList.toggle("vis", e.isIntersecting);
    });
    el.querySelectorAll(".band").forEach((b) => vis.observe(b));

    const goToChapter = (id: StateId, how: "cut" | "glide" = "cut") => {
      if (isStatic) {
        const target = document.getElementById(id === "crossroads" ? "paths" : id);
        target?.scrollIntoView({ block: "start" });
        return;
      }
      const p = engine.chapterProgress(id);
      if (how === "glide") engine.glideTo(p, Math.min(5.5, 2.2 + Math.abs(p - engine.shown) * 11));
      else void engine.cutTo(p);
    };

    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest<HTMLAnchorElement>("a[href]");
      if (!a || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const href = a.getAttribute("href") ?? "";
      const m = href.match(/^\/?#([a-z-]+)$/);
      if (!m) return;
      const hash = m[1];
      if (hash === "about") return; // plain in-page anchor below the journey
      const chapter = HASH_TO_CHAPTER[hash];
      if (!chapter) return;
      e.preventDefault();
      const cta = a.dataset.cta;
      // the descent itself reports rabbit_hole_started, so the CTA only
      // reports the click: one event per moment, never two
      if (cta) track("cta_click", { cta: cta === "threshold" ? "enter_rabbit_hole" : "discover_what_lies_ahead" });
      history.replaceState(null, "", `#${hash}`);
      // a guided descent for story CTAs, a clean cut for navigation jumps
      goToChapter(chapter, cta ? "glide" : "cut");
    };
    document.addEventListener("click", onClick);

    // deep links (/#paths from a path page, reloads with a hash)
    const initial = HASH_TO_CHAPTER[window.location.hash.slice(1)];
    if (initial && initial !== "threshold") requestAnimationFrame(() => goToChapter(initial, "cut"));

    return () => {
      unwatch();
      io.disconnect();
      vis.disconnect();
      document.removeEventListener("click", onClick);
      cleanups.forEach((c) => c());
      engine.destroy();
    };
  }, []);

  return (
    <div className="experience" ref={root} data-chapter="threshold" data-choose="off">
      <div
        id="experience"
        className="track"
        style={{ "--track-vh": TOTAL_VH + 100 } as CSSProperties}
      >
        <div className="stage">
          <div className="stage-media" aria-hidden="true">
            <div className="par par-bg">
              <div className="frame">
                {VIDEOS.map((v) => (
                  <video
                    key={v}
                    className="scrub"
                    data-video={v}
                    muted
                    playsInline
                    preload="none"
                    tabIndex={-1}
                    aria-hidden="true"
                    disablePictureInPicture
                    disableRemotePlayback
                  />
                ))}
                {CHAPTER_ORDER.map((id) => (
                  <div key={id} className="plate" data-plate={id}>
                    <PlatePicture scene={id} deferred={id !== "threshold"} priority={id === "threshold"} className="plate-pic" />
                    <SceneLife scene={id} />
                    {id === "crossroads" ? (
                      <div className="xr-react">
                        <div className="rx-dim dim-rabbit" />
                        <div className="rx-dim dim-hatter" />
                        <div className="rx-dim dim-cheshire" />
                        <div className="rx-light rx-rabbit" />
                        <div className="rx-light rx-hatter" />
                        <div className="rx-light rx-cheshire" />
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
            <div className="scrim-global" />
            <Particles />
          </div>

          <div className="bands">
            {CHAPTER_ORDER.map((id) => (
              <Band key={id} chapter={CHAPTERS[id]} />
            ))}
          </div>

          <div className="frame-overlay">
            <div className="frame frame--ui">
              <CrossroadsStage />
            </div>
          </div>

          <Hud />
          <div className="stage-veil" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
