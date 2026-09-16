"use client";

import { trackEvent } from "../lib/analytics";

const paths = [
  { id: "rabbit", number: "01", title: "Follow the Rabbit", copy: "Curiosity will take you places reason never could.", cta: "Explore", href: "/rabbit" },
  { id: "hatter", number: "02", title: "Join the Tea Party", copy: "Time has stopped. Manners have too.", cta: "Take a seat", href: "/hatter" },
  { id: "cheshire", number: "03", title: "Ask the Cheshire Cat", copy: "Answers are terribly overrated. Questions are much more fun.", cta: "Ask the cat", href: "/cheshire" },
];

export function Crossroads() {
  return (
    <section className="crossroads" aria-labelledby="crossroads-title">
      <p className="section-kicker">The crossroads / 02</p>
      <h2 id="crossroads-title">Which path will you choose?</h2>
      <div className="path-grid">
        {paths.map((path) => (
          <article className="path-zone" data-path={path.id} key={path.id}>
            <div>
              <div className="path-number">{path.number}</div>
              <h3>{path.title}</h3>
              <p>{path.copy}</p>
            </div>
            <a className="path-link" href={path.href} onClick={() => trackEvent({ event_name: "path_selected", page: "/crossroads", properties: { path: path.id } })}>{path.cta} ↗</a>
          </article>
        ))}
      </div>
    </section>
  );
}
