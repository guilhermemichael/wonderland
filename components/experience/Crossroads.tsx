"use client";

import { useRouter } from "next/navigation";
import type { CSSProperties, MouseEvent } from "react";

import { PlatePicture } from "@/components/scene/PlatePicture";
import { track, type PathId } from "@/lib/analytics";
import { PATH_ORDER, PATHS } from "@/lib/content";
import { coverVeil } from "@/lib/veil";

/** Physical areas of the Crossroads frame (percent of the 16:9 plate). */
const AREAS: Record<PathId, { x: number; y: number; w: number; h: number; mx: number; my: number }> = {
  rabbit: { x: 0, y: 44, w: 27, h: 46, mx: 52, my: 30 },
  hatter: { x: 39, y: 11, w: 21, h: 60, mx: 44, my: 30 },
  cheshire: { x: 76, y: 22, w: 24, h: 56, mx: 50, my: 60 },
};

const NAMES: Record<PathId, string> = { rabbit: "Rabbit", hatter: "Hatter", cheshire: "Cheshire" };

function useChoose() {
  const router = useRouter();
  return async (e: MouseEvent<HTMLAnchorElement>, id: PathId) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    track("path_selected", { path: id });
    await coverVeil();
    router.push(`/${id}/`);
  };
}

/** Hotspots over the live stage frame (desktop journey). */
export function CrossroadsStage() {
  const choose = useChoose();
  return (
    <div className="xr" role="group" aria-label="Os três caminhos">
      {PATH_ORDER.map((id) => {
        const a = AREAS[id];
        const p = PATHS[id];
        return (
          <a
            key={id}
            href={`/${id}/`}
            className={`hotspot hotspot--${id}`}
            style={
              {
                "--x": a.x,
                "--y": a.y,
                "--w": a.w,
                "--h": a.h,
                "--mx": `${a.mx}%`,
                "--my": `${a.my}%`,
              } as CSSProperties
            }
            data-cursor={p.cursor}
            aria-label={`Path ${p.number}: ${NAMES[id]}`}
            onClick={(e) => choose(e, id)}
          >
            <span className="hotspot-mark" aria-hidden="true">
              <span className="hotspot-dot" />
              <span className="hotspot-num">{p.number}</span>
              <span className="hotspot-name">{p.label}</span>
            </span>
          </a>
        );
      })}
    </div>
  );
}

/** Static layouts: the whole frame stays visible, with an index of the paths. */
export function CrossroadsStatic() {
  const choose = useChoose();
  return (
    <div className="xr-static">
      <div className="xr-figure" aria-hidden="true">
        <PlatePicture scene="crossroads" lazy className="xr-pic" />
        {PATH_ORDER.map((id) => {
          const a = AREAS[id];
          return (
            <a
              key={id}
              href={`/${id}/`}
              tabIndex={-1}
              className={`hotspot hotspot--${id}`}
              style={{ "--x": a.x, "--y": a.y, "--w": a.w, "--h": a.h, "--mx": `${a.mx}%`, "--my": `${a.my}%` } as CSSProperties}
              onClick={(e) => choose(e, id)}
            >
              <span className="hotspot-mark">
                <span className="hotspot-dot" />
                <span className="hotspot-num">{PATHS[id].number}</span>
              </span>
            </a>
          );
        })}
      </div>
      <ol className="xr-index">
        {PATH_ORDER.map((id) => {
          const p = PATHS[id];
          return (
            <li key={id}>
              <a href={`/${id}/`} className={`xr-row xr-row--${id}`} onClick={(e) => choose(e, id)}>
                <span className="xr-row-num">{p.number}</span>
                <span className="xr-row-name">{NAMES[id].toUpperCase()}</span>
                <span className="xr-row-line">{p.headline.replace(/\n/g, " ")}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
