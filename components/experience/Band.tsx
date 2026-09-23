import { Fragment } from "react";

import { Arrow } from "@/components/ui/Arrow";
import { PlatePicture } from "@/components/scene/PlatePicture";
import { SplitText } from "@/components/text/SplitText";
import type { Chapter } from "@/lib/content";

import { CrossroadsStatic } from "./Crossroads";

const SPLIT: Record<Chapter["id"], { mode: "words" | "chars"; spread: number; jitter: number }> = {
  threshold: { mode: "words", spread: 0.45, jitter: 0 },
  fall: { mode: "words", spread: 0.55, jitter: 10 },
  disorientation: { mode: "words", spread: 0.5, jitter: 26 },
  landing: { mode: "words", spread: 0.5, jitter: 0 },
  crossroads: { mode: "words", spread: 0.25, jitter: 0 },
};

export const anchorOf = (id: Chapter["id"]) => (id === "crossroads" ? "paths" : id);

export function Band({ chapter }: { chapter: Chapter }) {
  const H = chapter.id === "threshold" ? "h1" : "h2";
  const split = SPLIT[chapter.id];
  const titleId = `t-${chapter.id}`;
  return (
    <section
      id={anchorOf(chapter.id)}
      className={`band band--${chapter.id}`}
      data-band={chapter.id}
      aria-labelledby={titleId}
    >
      <div className="band-media" aria-hidden="true">
        {chapter.id !== "crossroads" && <PlatePicture scene={chapter.id} responsiveCrop lazy className="band-pic" />}
      </div>
      <div className="band-scrim" aria-hidden="true" />

      <div className="band-col">
        <p className="kicker">{chapter.kicker}</p>
        <H id={titleId} className="headline">
          <SplitText text={chapter.headline} mode={split.mode} spread={split.spread} jitter={split.jitter} />
        </H>
        <p className={chapter.bodySerif ? "body body--serif" : "body"}>
          {chapter.body.split("\n").map((line, i) => (
            <Fragment key={i}>
              <span className="body-line">{line}</span>{" "}
            </Fragment>
          ))}
        </p>

        {chapter.cta ? (
          <div className="band-actions">
            <a
              className="cta"
              href={`#${chapter.cta.href.replace("#", "")}`}
              data-cta={chapter.id}
              data-cursor={chapter.cta.cursor}
            >
              <span className="cta-label">{chapter.cta.label}</span>
              <Arrow dir={chapter.id === "threshold" ? "down-right" : "up-right"} />
            </a>
            {chapter.cue ? <span className="cue cue--inline">{chapter.cue}</span> : null}
          </div>
        ) : chapter.cue ? (
          <p className="cue">
            {chapter.cue}
            {chapter.id !== "crossroads" ? <Arrow dir="down" /> : null}
          </p>
        ) : null}
      </div>

      {chapter.id === "threshold" ? (
        <div className="band-counter" aria-hidden="true">
          <span className="band-counter-num" data-counter>
            00.00
          </span>
          <span className="band-counter-rule" />
          <span className="band-counter-label">FOLLOW</span>
        </div>
      ) : null}

      {chapter.telemetry ? (
        <dl className="band-telemetry">
          {chapter.telemetry.map(([k, v]) => (
            <div key={k}>
              <dt>{k}:</dt> <dd>{v}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {chapter.id === "crossroads" ? <CrossroadsStatic /> : null}
    </section>
  );
}
