import Link from "next/link";
import { trackEvent } from "../../lib/analytics";
import { ClientTracker } from "../../components/client-tracker";

export default function CheshireEntryPage() {
  return (
    <main className="landing cheshire-entry" aria-labelledby="cheshire-title">
      <ClientTracker event="cheshire_started" />
      <div className="landing-content">
        <div className="eyebrow" aria-hidden="true">WONDERLAND / CHESHIRE</div>
        <h1 className="hero-title" id="cheshire-title">
          We are all mad here.
        </h1>
        <p className="hero-subtitle">
          I'm mad. You're mad. You must be, or you wouldn't have come here.
          <br /><br />
          But madness is simply a matter of perspective.
          Are you ready to see yours?
        </p>
        <Link className="primary-cta" href="/cheshire/quiz">
          Ask the Cat <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </main>
  );
}
