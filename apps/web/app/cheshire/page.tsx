import Link from "next/link";
import { ClientTracker } from "../../components/client-tracker";

export default function CheshireEntryPage() {
  return (
    <main className="landing cheshire-entry" aria-labelledby="cheshire-title">
      <ClientTracker event="cheshire_started" />

      <div className="landing-content">
        <section className="cheshire-entry-copy">
          <div className="eyebrow">WONDERLAND / CHESHIRE</div>
          <h1 className="hero-title" id="cheshire-title">
            The Cat never answers the question you asked.
          </h1>
          <p className="hero-subtitle">
            It only watches long enough to discover which question you meant.
            Four choices. No right direction. One answer Wonderland will remember.
          </p>
          <Link className="primary-cta" href="/cheshire/quiz">
            Ask the Cat <span aria-hidden="true">↗</span>
          </Link>
        </section>

        <div className="cheshire-entry-scene" aria-hidden="true">
          <div className="cheshire-orbit" />
          <div className="cheshire-face-mark">
            <span className="cheshire-eye cheshire-eye-left" />
            <span className="cheshire-eye cheshire-eye-right" />
            <span className="cheshire-mouth" />
          </div>
          <p className="cheshire-whisper">Some creatures arrive before the rest of themselves.</p>
        </div>
      </div>
    </main>
  );
}
