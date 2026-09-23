"use client";

import gsap from "gsap";
import { useEffect, useRef, useState } from "react";

import { Particles } from "@/components/atmosphere/Particles";
import { attachParallax } from "@/components/scene/parallax";
import { PlatePicture } from "@/components/scene/PlatePicture";
import { SceneLife } from "@/components/scene/SceneLife";
import { SplitText } from "@/components/text/SplitText";
import { Arrow } from "@/components/ui/Arrow";
import { VeilLink } from "@/components/ui/VeilLink";
import { track, type PathId } from "@/lib/analytics";
import { PATH_ORDER, PATHS } from "@/lib/content";
import { NARROW_MEDIA, REDUCED_MOTION } from "@/lib/gates";
import { revealVeil } from "@/lib/veil";

/** Where each path's closer look travels (percent of the 16:9 plate). */
const FOCUS: Record<PathId, { x: number; y: number; s: number }> = {
  rabbit: { x: 50, y: 46, s: 1.32 }, // down the corridor, to the small door
  hatter: { x: 66, y: 58, s: 1.28 }, // the chair that says you are late
  cheshire: { x: 71, y: 62, s: 1.4 }, // the arch, the sitting shadow, the plaque
};

const NAMES: Record<PathId, string> = { rabbit: "RABBIT", hatter: "HATTER", cheshire: "CHESHIRE" };
const CTA_KEY: Record<PathId, string> = {
  rabbit: "keep_following",
  hatter: "join_the_table",
  cheshire: "look_closer",
};

export function PathScene({ id }: { id: PathId }) {
  const p = PATHS[id];
  const root = useRef<HTMLDivElement>(null);
  const [closer, setCloser] = useState(false);
  const first = useRef(true);

  useEffect(() => {
    const el = root.current!;
    revealVeil();
    document.documentElement.dataset.chapter = id;
    const wrap = el.querySelector<HTMLElement>(".plate")!;
    const img = wrap.querySelector("img");
    const set = () => {
      if (img?.currentSrc) wrap.style.setProperty("--plate-img", `url("${img.currentSrc}")`);
      wrap.classList.add("is-loaded");
    };
    if (img?.complete && img.naturalWidth) set();
    img?.addEventListener("load", set);

    const detach = attachParallax(
      el.querySelector<HTMLElement>(".par-bg")!,
      el.querySelector<HTMLElement>(".path-media .frame")!,
    );
    return () => {
      img?.removeEventListener("load", set);
      detach();
      delete document.documentElement.dataset.chapter;
    };
  }, [id]);

  useEffect(() => {
    const el = root.current!;
    const zoom = el.querySelector<HTMLElement>(".path-zoom")!;
    const reduced = window.matchMedia(REDUCED_MOTION).matches;
    const narrow = window.matchMedia(NARROW_MEDIA).matches;
    const f = FOCUS[id];
    if (first.current) {
      first.current = false;
      return;
    }
    const to = closer
      ? {
          scale: narrow ? 1.16 : f.s,
          xPercent: narrow ? 0 : (50 - f.x) * 0.55,
          yPercent: narrow ? 0 : (50 - f.y) * 0.45,
        }
      : { scale: 1, xPercent: 0, yPercent: 0 };
    gsap.set(zoom, { transformOrigin: narrow ? "50% 50%" : `${f.x}% ${f.y}%` });
    const tween = gsap.to(zoom, { ...to, duration: reduced ? 0 : 1.9, ease: "power3.inOut" });
    if (closer) el.querySelector<HTMLElement>(".path-closer a, .path-closer button")?.focus({ preventScroll: true });
    else el.querySelector<HTMLElement>(".path-band .cta")?.focus({ preventScroll: true });
    return () => {
      tween.kill();
    };
  }, [closer, id]);

  return (
    <div className={`path path--${id}`} ref={root} data-chapter={id} data-closer={closer ? "1" : "0"}>
      <section className="path-stage" aria-labelledby="path-title">
        <div className="path-media" aria-hidden="true">
          <div className="par par-bg">
            <div className="frame">
              <div className="path-zoom">
                <div className="plate" data-plate={id}>
                  <PlatePicture scene={id} priority responsiveCrop className="plate-pic" />
                  <SceneLife scene={id} />
                </div>
              </div>
            </div>
          </div>
          <div className="scrim-global" />
          <div className="path-scrim" />
          <Particles scene={id} />
        </div>

        <p className="path-label" aria-hidden="true">
          {p.label}
        </p>
        <dl className="path-telemetry">
          {p.telemetry.map(([k, v]) => (
            <div key={k}>
              <dt>{k}:</dt> <dd>{v}</dd>
            </div>
          ))}
        </dl>

        <div className="path-band" inert={closer}>
          <p className="kicker">{p.kicker}</p>
          <h1 id="path-title" className="headline">
            {id === "cheshire" ? (
              <span className="headline-soft" aria-hidden="true">
                {p.headline.split("\n").map((l) => (
                  <span key={l}>{l}</span>
                ))}
              </span>
            ) : null}
            <SplitText
              text={p.headline}
              mode={id === "rabbit" ? "chars" : "words"}
              spread={id === "rabbit" ? 0.5 : 0.4}
              jitter={id === "rabbit" ? 22 : 0}
            />
          </h1>
          <p className="body">{p.body}</p>
          <div className="band-actions">
            <button
              type="button"
              className="cta"
              aria-expanded={closer}
              aria-controls="path-closer"
              data-cursor={p.cursor}
              onClick={() => {
                track("cta_click", { cta: CTA_KEY[id], path: id });
                setCloser(true);
              }}
            >
              <span className="cta-label">{p.cta}</span>
              <Arrow />
            </button>
          </div>
        </div>

        <div id="path-closer" className="path-closer" data-open={closer ? "1" : "0"} inert={!closer}>
          <button type="button" className="cta cta--back" onClick={() => setCloser(false)}>
            <Arrow dir="left" />
            <span className="cta-label">STEP BACK</span>
          </button>
        </div>

        <nav className="path-bar" aria-label="Caminhos">
          <VeilLink href="/#paths" className="path-back">
            <Arrow dir="left" />
            <span>THE CROSSROADS</span>
          </VeilLink>
          <ol className="path-index">
            {PATH_ORDER.map((o) => (
              <li key={o}>
                {o === id ? (
                  <span className="is-current" aria-current="page">
                    {PATHS[o].number} {NAMES[o]}
                  </span>
                ) : (
                  <VeilLink href={`/${o}/`}>
                    {PATHS[o].number} {NAMES[o]}
                  </VeilLink>
                )}
              </li>
            ))}
          </ol>
        </nav>
      </section>
    </div>
  );
}
