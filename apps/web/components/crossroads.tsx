"use client";

import { useState } from "react";
import { trackEvent } from "../lib/analytics";
import { updateSession } from "../lib/session";

const paths = [
  { id: "rabbit", number: "01", title: "Follow the Rabbit", copy: "Curiosity will take you places reason never could.", cta: "Explore", href: "/rabbit" },
  { id: "hatter", number: "02", title: "Join the Tea Party", copy: "Time has stopped. Manners have too.", cta: "Take a seat", href: "/hatter" },
  { id: "cheshire", number: "03", title: "Ask the Cheshire Cat", copy: "Answers are terribly overrated. Questions are much more fun.", cta: "Ask the cat", href: "/cheshire" },
] as const;

type CrossroadsProps = { page?: string };

export function Crossroads({ page = "/" }: CrossroadsProps) {
  const [activePath, setActivePath] = useState<(typeof paths)[number]["id"]>("rabbit");
  const active = paths.find((path) => path.id === activePath) ?? paths[0];
  const confirmPath = (e?: React.MouseEvent) => {
    // Determine the affinity based on path choice
    let entry_affinity = "curious";
    if (active.id === "hatter") entry_affinity = "chaotic";
    else if (active.id === "cheshire") entry_affinity = "mysterious";

    // Attempt session update in the background, don't wait to emit event
    void updateSession({ selected_path: active.id, entry_affinity });

    trackEvent({ event_name: "path_selected", page, properties: { surface: "crossroads", path: active.id } });
  };
  return (
    <section className="crossroads" aria-labelledby="crossroads-title">
      <p className="section-kicker">The crossroads / 02</p>
      <h2 id="crossroads-title">Which path will you choose?</h2>
      <div className="path-switcher-mobile" aria-label="Choose a Wonderland path">
        <div className="path-switcher-controls" role="tablist" aria-label="Preview paths">
          {paths.map((path) => (
            <button className={`path-switcher-tab${activePath === path.id ? " is-active" : ""}`} key={path.id} type="button" role="tab" aria-selected={activePath === path.id} onClick={() => setActivePath(path.id)}>
              {path.title.replace(/^(Follow the |Join the |Ask the )/, "")}
            </button>
          ))}
        </div>
        <article className="path-scene" data-path={active.id}>
          <div className="path-number">{active.number}</div>
          <h3>{active.title}</h3>
          <p>{active.copy}</p>
          <a className="path-link" href={active.href} onClick={confirmPath}>{active.cta} ↗</a>
        </article>
      </div>
      <div className="path-grid">
        {paths.map((path) => (
          <article className="path-zone" data-path={path.id} key={path.id}>
            <div><div className="path-number">{path.number}</div><h3>{path.title}</h3><p>{path.copy}</p></div>
            <a className="path-link" href={path.href} onClick={(e) => {
              let entry_affinity = "curious";
              if (path.id === "hatter") entry_affinity = "chaotic";
              else if (path.id === "cheshire") entry_affinity = "mysterious";
              void updateSession({ selected_path: path.id, entry_affinity });
              trackEvent({ event_name: "path_selected", page, properties: { surface: "crossroads", path: path.id } });
            }}>{path.cta} ↗</a>
          </article>
        ))}
      </div>
    </section>
  );
}
