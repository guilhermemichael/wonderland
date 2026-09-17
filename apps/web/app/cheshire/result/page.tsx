"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { forceNewSession, getCurrentSession, getLocalSessionId } from "../../../lib/session";
import { getQuizResult } from "../../../lib/api-client";
import { trackEvent } from "../../../lib/analytics";

type ResultState = "loading" | "ready" | "error";
type Affinity = "curious" | "chaotic" | "mysterious";

interface QuizResult {
  affinity: Affinity;
  confidence: number;
  scoringVersion: string;
  submittedAt: string;
  scores: {
    curious: number;
    chaotic: number;
    mysterious: number;
  };
}

const AFFINITY_CONTENT: Record<Affinity, { title: string; text: string; colorClass: string }> = {
  curious: {
    title: "Curious.",
    text: "You keep asking what lies beyond the next door. Wonderland noticed.",
    colorClass: "affinity-curious",
  },
  chaotic: {
    title: "Chaotic.",
    text: "You rearrange the rules simply by arriving. Wonderland noticed that too.",
    colorClass: "affinity-chaotic",
  },
  mysterious: {
    title: "Mysterious.",
    text: "You leave more questions behind than answers. The Cat approves of the imbalance.",
    colorClass: "affinity-mysterious",
  },
};

const AFFINITY_LABEL: Record<Affinity, string> = {
  curious: "curiosity",
  chaotic: "chaos",
  mysterious: "mystery",
};

function isAffinity(value?: string): value is Affinity {
  return value === "curious" || value === "chaotic" || value === "mysterious";
}

export default function CheshireResultPage() {
  const router = useRouter();
  const [status, setStatus] = useState<ResultState>("loading");
  const [result, setResult] = useState<QuizResult | null>(null);
  const [entryAffinity, setEntryAffinity] = useState<Affinity | null>(null);
  const [restartError, setRestartError] = useState<string | null>(null);
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
        const [data, session] = await Promise.all([
          getQuizResult(sessionId),
          getCurrentSession(),
        ]);

        setResult(data);
        if (isAffinity(session?.entry_affinity)) setEntryAffinity(session.entry_affinity);
        setStatus("ready");

        trackEvent({
          event_name: "quiz_result_viewed",
          page: "/cheshire/result",
          final_segment: data.affinity,
          properties: {
            affinity: data.affinity,
            curious_score: data.scores.curious,
            chaotic_score: data.scores.chaotic,
            mysterious_score: data.scores.mysterious,
            confidence: data.confidence,
          },
        });
        trackEvent({
          event_name: "cheshire_completed",
          page: "/cheshire/result",
          final_segment: data.affinity,
        });
      } catch {
        setStatus("error");
      }
    }

    loadResult();
  }, [router]);

  const handleRestart = async () => {
    setRestartError(null);
    const newSession = await forceNewSession();
    if (!newSession) {
      setRestartError("Wonderland could not open a fresh path just yet. Try again.");
      return;
    }
    router.push("/");
  };

  if (status === "loading") {
    return (
      <main className="landing cheshire-quiz" aria-busy="true">
        <div className="landing-content">
          <p className="hero-subtitle">The Cat is arranging the evidence...</p>
        </div>
      </main>
    );
  }

  if (status === "error" || !result) {
    return (
      <main className="landing cheshire-quiz">
        <div className="landing-content">
          <div className="error-banner" role="alert">
            We could not find an authoritative result for this journey.
            <button className="secondary-cta" onClick={() => router.push("/cheshire/quiz")}>Return to the quiz</button>
          </div>
        </div>
      </main>
    );
  }

  const content = AFFINITY_CONTENT[result.affinity];
  const resonance = entryAffinity === result.affinity;
  const journeyLine = entryAffinity
    ? resonance
      ? `You followed ${AFFINITY_LABEL[entryAffinity]}. Wonderland answered in the same language.`
      : `You followed ${AFFINITY_LABEL[entryAffinity]}. Wonderland found ${AFFINITY_LABEL[result.affinity]} waiting underneath.`
    : "The Cat watched how you moved through the questions. Wonderland answered in kind.";

  return (
    <main className="landing cheshire-quiz">
      <div className="cheshire-background-art" aria-hidden="true" style={{ opacity: 0.85 }}>
        <div className="cheshire-smile">)</div>
      </div>

      <div className="landing-content result-container">
        <div className="eyebrow">The Cat knew before you did.</div>

        <p className="result-journey-line">{journeyLine}</p>

        <h1 className={`hero-title ${content.colorClass}`}>
          {content.title}
        </h1>

        <p className="hero-subtitle">{content.text}</p>

        <div className="result-stats" aria-label="Authoritative quiz scores">
          <div className="stat-pill" data-type="curious">Curious: {result.scores.curious}</div>
          <div className="stat-pill" data-type="chaotic">Chaotic: {result.scores.chaotic}</div>
          <div className="stat-pill" data-type="mysterious">Mysterious: {result.scores.mysterious}</div>
        </div>

        <p className="result-confidence">
          Signal separation: {Math.round(result.confidence * 100)}%
          <span className="sr-only">. This is a scoring margin, not a psychological probability.</span>
        </p>

        {restartError && <div className="error-banner" role="alert">{restartError}</div>}

        <div className="quiz-actions result-actions">
          <button className="secondary-cta" onClick={() => router.push("/crossroads")}>Keep exploring</button>
          <button className="secondary-cta" onClick={handleRestart}>Begin a new journey</button>
        </div>
      </div>
    </main>
  );
}
