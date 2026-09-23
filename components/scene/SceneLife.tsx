import type { CSSProperties } from "react";

import type { SceneId } from "@/lib/content";

import { LIFE, type Life } from "./life";

/** An ordinary cat, sitting. Drawn by hand as a soft shadow, never a cartoon. */
const CAT_PATH =
  "M20 4 L26 11 Q30 10 34 11 L40 4 L43 18 Q45 26 40 30 Q44 38 47 52 Q52 70 50 84 Q50 93 47 97 L13 97 Q10 92 11 84 Q9 68 14 52 Q17 38 20 30 Q15 26 17 18 Z M46 95 Q58 96 58 86 Q58 78 52 76 Q55 83 53 88 Q51 92 45 92 Z";

function style(item: Life): CSSProperties {
  switch (item.kind) {
    case "region":
      return {
        "--x": item.x,
        "--y": item.y,
        "--w": item.w,
        "--h": item.h,
        "--ox": `${item.ox ?? 50}%`,
        "--oy": `${item.oy ?? 50}%`,
        "--ax": `${item.ax ?? 0}px`,
        "--ay": `${item.ay ?? 0}px`,
        "--ar": `${item.ar ?? 0}deg`,
        "--as": item.as ?? 1,
        "--core": `${Math.round((item.core ?? 0.7) * 100)}%`,
        ...(item.hole ? { "--h0": `${item.hole[0]}%`, "--h1": `${item.hole[1]}%` } : {}),
        // the mask window stays put; only the image inside it moves
        "--an": `life-${item.anim}`,
        "--ad": `${item.dur}s`,
        "--adl": `${item.delay ?? 0}s`,
      } as CSSProperties;
    case "glow":
      return {
        "--x": item.x,
        "--y": item.y,
        "--r": item.r,
        "--c": item.color,
        "--o0": item.o0,
        "--o1": item.o1,
        animationName: item.flicker ? "life-flicker" : "life-pulse",
        animationDuration: `${item.dur}s`,
        animationDelay: `${item.delay ?? 0}s`,
      } as CSSProperties;
    case "mist":
      return {
        "--x": item.x,
        "--y": item.y,
        "--w": item.w,
        "--h": item.h,
        "--mo": item.opacity,
        "--tint": item.tint ?? "rgba(200, 212, 216, 1)",
        animationDuration: `${item.dur}s`,
        animationDelay: `${item.delay ?? 0}s`,
      } as CSSProperties;
    case "steam":
      return {
        "--x": item.x,
        "--y": item.y,
        "--size": item.size,
        animationDuration: `${item.dur}s`,
        animationDelay: `${item.delay ?? 0}s`,
      } as CSSProperties;
    case "cat":
      return {
        "--x": item.x,
        "--y": item.y,
        "--size": item.size,
        animationDuration: `${item.dur}s`,
        animationDelay: `${item.delay ?? 0}s`,
      } as CSSProperties;
    case "whisper":
      return {
        "--x": item.x,
        "--y": item.y,
        "--w": item.w,
        "--rot": `${item.rot}deg`,
        animationDuration: `${item.dur}s`,
        animationDelay: `${item.delay ?? 0}s`,
      } as CSSProperties;
  }
}

export function SceneLife({ scene }: { scene: SceneId }) {
  const items = LIFE[scene] ?? [];
  return (
    <div className="life" aria-hidden="true">
      {items.map((item) => {
        const common = {
          style: style(item),
          "data-life": item.id,
          "data-react": "react" in item ? item.react : undefined,
        };
        switch (item.kind) {
          case "region":
            return (
              <div
                key={item.id}
                {...common}
                className={`life-region${item.depth ? ` depth-${item.depth}` : ""}${item.hole ? " has-hole" : ""}`}
              >
                <div className="life-region-img" />
              </div>
            );
          case "glow":
            return <div key={item.id} {...common} className="life-glow" />;
          case "mist":
            return <div key={item.id} {...common} className="life-mist" />;
          case "steam":
            return (
              <svg key={item.id} {...common} className="life-steam" viewBox="0 0 40 90" preserveAspectRatio="xMidYMax meet">
                <path d="M20 88 C12 72 28 62 19 48 C11 36 26 26 18 8" />
                <path d="M24 86 C18 74 31 66 25 54 C19 42 30 34 25 20" />
              </svg>
            );
          case "cat":
            return (
              <svg
                key={item.id}
                {...common}
                className={`life-cat${item.flip ? " is-flipped" : ""}`}
                viewBox="0 0 60 100"
                preserveAspectRatio="xMidYMax meet"
              >
                <path d={CAT_PATH} />
              </svg>
            );
          case "whisper":
            return (
              <div key={item.id} {...common} className="life-whisper">
                {item.text}
              </div>
            );
        }
      })}
    </div>
  );
}
