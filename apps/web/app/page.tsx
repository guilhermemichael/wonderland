"use client";

import Link from "next/link";
import { useRef } from "react";
import { Crossroads } from "../components/crossroads";
import { RabbitHole, type RabbitHoleHandle } from "../components/rabbit-hole";
import { trackEvent } from "../lib/analytics";

export default function Home() {
  const rabbitHole = useRef<RabbitHoleHandle>(null);
  return (
    <main className="site-shell">
      <nav className="site-nav" aria-label="Primary navigation">
        <Link href="/" className="brand-mark">WONDERLAND</Link>
        <div className="nav-links"><a href="#rabbit-hole">Enter</a><a href="#crossroads" onClick={() => rabbitHole.current?.requestSkip("navigation_choose")}>Choose</a><a href="#about">About</a></div>
      </nav>
      <section className="landing" id="about" aria-labelledby="hero-title">
        <div className="landing-content">
          <div className="eyebrow">Follow the White Rabbit / 001</div>
          <h1 className="hero-title" id="hero-title">The White Rabbit<br />is <em>late.</em></h1>
          <p className="hero-subtitle">Will you follow him?</p>
          <a className="primary-cta" href="#rabbit-hole" onClick={() => trackEvent({ event_name: "cta_click", page: "/", properties: { cta: "follow_the_white_rabbit" } })}>Follow the White Rabbit <span aria-hidden="true">↘</span></a>
        </div>
        <div className="scroll-cue" aria-hidden="true">Scroll to follow ↓</div>
      </section>
      <div id="rabbit-hole"><RabbitHole ref={rabbitHole} page="/" /></div>
      <div id="crossroads"><Crossroads page="/" /></div>
      <footer className="footer-note">We're all mad here. / Marketing · Product · Engineering · MarTech</footer>
    </main>
  );
}
