import { Arrow } from "@/components/ui/Arrow";
import { PATH_ORDER, PATHS, SITE } from "@/lib/content";

import { VeilLink } from "./VeilLink";

const NAMES = { rabbit: "RABBIT", hatter: "HATTER", cheshire: "CHESHIRE" } as const;

export function About() {
  return (
    <footer id="about" className="about" aria-labelledby="about-title">
      <div className="about-inner">
        <div>
          <p className="kicker">ABOUT</p>
          <h2 id="about-title" className="about-title">
            WONDERLAND
          </h2>
          <p className="about-premise">
            {SITE.premise[0]} <em>{SITE.premise[1]}</em>
          </p>
          <p className="about-credit">{SITE.credit}</p>
        </div>
        <nav aria-label="Os caminhos" className="about-paths">
          {PATH_ORDER.map((id) => (
            <VeilLink key={id} href={`/${id}/`}>
              <span className="num">{PATHS[id].number}</span>
              <span className="name">{NAMES[id]}</span>
              <Arrow />
            </VeilLink>
          ))}
        </nav>
      </div>
      <div className="about-foot">
        <span>{SITE.tagline}</span>
        <VeilLink href="/#experience">BACK TO THE THRESHOLD ↑</VeilLink>
      </div>
    </footer>
  );
}
