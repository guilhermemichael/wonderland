"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { getLocalSessionId, clearLocalSessionId, forceNewSession } from "../../../lib/session";
import { getQuizResult } from "../../../lib/api-client";
import { trackEvent } from "../../../lib/analytics";

type ResultState = "loading" | "ready" | "error";

interface QuizResult {
  affinity: "curious" | "chaotic" | "mysterious";
  scores: {
    curious: number;
    chaotic: number;
    mysterious: number;
  };
}

const AFFINITY_CONTENT = {
  curious: {
    title: "Curious.",
    text: "You ask too many questions for your own good. The Cat finds this amusing, for now.",
    colorClass: "affinity-curious"
  },
  chaotic: {
    title: "Chaotic.",
    text: "You break the rules before you even learn them. The Cat respects your disregard for order.",
    colorClass: "affinity-chaotic"
  },
  mysterious: {
    title: "Mysterious.",
    text: "You speak in circles and walk in spirals. The Cat thinks you might actually belong here.",
    colorClass: "affinity-mysterious"
  }
};

export default function CheshireResultPage() {
  const router = useRouter();
  const [status, setStatus] = useState<ResultState>("loading");
  const [result, setResult] = useState<QuizResult | null>(null);
  
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    async function loadResult() {
      const sessionId = getLocalSessionId();
      if (!sessionId) {
        router.replace("/crossroads");
        return;
      }

      try {
        const data = await getQuizResult(sessionId);
        setResult(data);
        setStatus("ready");

        trackEvent({
          event_name: "quiz_result_viewed",
          page: "/cheshire/result",
          properties: { 
            affinity: data.affinity, 
            curious_score: data.scores.curious,
            chaotic_score: data.scores.chaotic,
            mysterious_score: data.scores.mysterious 
          }
        });
        trackEvent({
          event_name: "cheshire_completed",
          page: "/cheshire/result"
        });
      } catch (err) {
        setStatus("error");
      }
    }

    loadResult();
  }, [router]);

  const handleRestart = async () => {
    // Preserve old session in backend history, start a new one locally
    await forceNewSession();
    router.push("/");
  };

  if (status === "loading") {
    return (
      <main className="landing cheshire-quiz" aria-busy="true">
        <div className="landing-content">
          <p className="hero-subtitle">The Cat is calculating your worth...</p>
        </div>
      </main>
    );
  }

  if (status === "error" || !result) {
    return (
      <main className="landing cheshire-quiz" aria-busy="true">
        <div className="landing-content">
          <div className="error-banner" role="alert">
            We could not find your result. The Cat has absconded with it.
            <button className="secondary-cta" onClick={() => router.push("/crossroads")}>Return to Crossroads</button>
          </div>
        </div>
      </main>
    );
  }

  const content = AFFINITY_CONTENT[result.affinity] || AFFINITY_CONTENT.mysterious;

  return (
    <main className="landing cheshire-quiz">
      <div className="cheshire-background-art" aria-hidden="true" style={{ opacity: 0.85 }}>
        {/* Full smile */}
        <div className="cheshire-smile">)</div>
      </div>

      <div className="landing-content result-container">
        <div className="eyebrow" aria-live="polite">
          The Verdict
        </div>
        
        <h1 className={`hero-title ${content.colorClass}`}>
          {content.title}
        </h1>
        
        <p className="hero-subtitle">
          {content.text}
        </p>

        <div className="result-stats">
          <div className="stat-pill" data-type="curious">Curious: {result.scores.curious}</div>
          <div className="stat-pill" data-type="chaotic">Chaotic: {result.scores.chaotic}</div>
          <div className="stat-pill" data-type="mysterious">Mysterious: {result.scores.mysterious}</div>
        </div>

        <div className="quiz-actions" style={{ marginTop: '48px' }}>
          <button className="secondary-cta" onClick={handleRestart}>
            Wake up (Start Over)
          </button>
        </div>
      </div>
    </main>
  );
}
