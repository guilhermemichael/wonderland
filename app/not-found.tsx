import type { Metadata } from "next";

import { VeilLink } from "@/components/ui/VeilLink";

export const metadata: Metadata = { title: "404", robots: { index: false } };

export default function NotFound() {
  return (
    <section className="lost" aria-labelledby="lost-title">
      <p className="kicker">404</p>
      <h1 id="lost-title" className="headline lost-title">
        Este caminho não existe.
      </h1>
      <VeilLink href="/" className="cta">
        <span className="cta-label">FOLLOW THE WHITE RABBIT</span>
      </VeilLink>
    </section>
  );
}
