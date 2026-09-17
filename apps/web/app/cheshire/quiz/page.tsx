"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getLocalSessionId } from "../../../lib/session";
import { QUIZ_QUESTIONS, AnswerId } from "../../../lib/quiz-content";
import { getQuizAnswers, getQuizResult, saveQuizAnswer, submitQuiz } from "../../../lib/api-client";
import { trackEvent } from "../../../lib/analytics";

type QuizState = "loading" | "ready" | "saving" | "submitting" | "error";

export default function CheshireQuizPage() {
  const router = useRouter();
  const [status, setStatus] = useState<QuizState>("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selectedAnswer, setSelectedAnswer] = useState<AnswerId | null>(null);
  const initialized = useRef(false);
  const questionFocusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    async function loadState() {
      const sessionId = getLocalSessionId();
      if (!sessionId) {
        router.replace("/crossroads");
        return;
      }

      try {
        const data = await getQuizAnswers(sessionId);

        // Four saved answers are not the same thing as a final submission.
        // A previous submit may have failed after Q4 was durably saved, so
        // only redirect to the result page after the authoritative result exists.
        if (data.is_complete) {
          try {
            await getQuizResult(sessionId);
            router.replace("/cheshire/result");
            return;
          } catch {
            // No authoritative submission yet. Resume at Q4 so the user can
            // explicitly retry the final submit without losing saved answers.
          }
        }

        const persistedAnswers = data.answers || {};
        setAnswers(persistedAnswers);

        let nextIndex = data.is_complete ? QUIZ_QUESTIONS.length - 1 : 0;
        if (!data.is_complete) {
          const unansweredIndex = QUIZ_QUESTIONS.findIndex((question) => !persistedAnswers[question.id]);
          nextIndex = unansweredIndex === -1 ? QUIZ_QUESTIONS.length - 1 : unansweredIndex;
        }

        setCurrentIndex(nextIndex);
        setSelectedAnswer((persistedAnswers[QUIZ_QUESTIONS[nextIndex].id] as AnswerId | undefined) ?? null);
        setStatus("ready");

        trackEvent({
          event_name: data.total_answered > 0 ? "quiz_resumed" : "quiz_started",
          page: "/cheshire/quiz",
          properties: { question_index: nextIndex, total_answered: data.total_answered },
        });

        trackEvent({
          event_name: "quiz_question_viewed",
          page: "/cheshire/quiz",
          properties: { question_id: QUIZ_QUESTIONS[nextIndex].id },
        });
      } catch {
        setStatus("error");
        setErrorMsg("The Cat seems to have misplaced your memory. Try refreshing.");
      }
    }

    loadState();
  }, [router]);

  const handleSelect = (id: AnswerId) => {
    setSelectedAnswer(id);
  };

  const focusCurrentQuestion = () => {
    requestAnimationFrame(() => questionFocusRef.current?.focus());
  };

  const handleContinue = async () => {
    if (!selectedAnswer || status === "saving" || status === "submitting") return;

    const sessionId = getLocalSessionId();
    if (!sessionId) return;

    const question = QUIZ_QUESTIONS[currentIndex];
    setStatus("saving");
    setErrorMsg(null);

    try {
      await saveQuizAnswer(sessionId, question.id, selectedAnswer);

      trackEvent({
        event_name: "quiz_answer_confirmed",
        page: "/cheshire/quiz",
        properties: { question_id: question.id, answer_id: selectedAnswer },
      });

      const nextAnswers = { ...answers, [question.id]: selectedAnswer };
      setAnswers(nextAnswers);

      if (currentIndex < QUIZ_QUESTIONS.length - 1) {
        const nextIndex = currentIndex + 1;
        setCurrentIndex(nextIndex);
        setSelectedAnswer((nextAnswers[QUIZ_QUESTIONS[nextIndex].id] as AnswerId | undefined) ?? null);
        setStatus("ready");
        focusCurrentQuestion();

        trackEvent({
          event_name: "quiz_question_viewed",
          page: "/cheshire/quiz",
          properties: { question_id: QUIZ_QUESTIONS[nextIndex].id },
        });
      } else {
        setStatus("ready");
      }
    } catch {
      setStatus("error");
      setErrorMsg("A ripple in Wonderland prevented your choice from being saved.");
    }
  };

  const handleSubmit = async () => {
    if (!selectedAnswer || status === "saving" || status === "submitting") return;

    const sessionId = getLocalSessionId();
    if (!sessionId) return;

    setStatus("submitting");
    setErrorMsg(null);

    try {
      const finalQuestion = QUIZ_QUESTIONS[QUIZ_QUESTIONS.length - 1];
      await saveQuizAnswer(sessionId, finalQuestion.id, selectedAnswer);

      trackEvent({
        event_name: "quiz_answer_confirmed",
        page: "/cheshire/quiz",
        properties: { question_id: finalQuestion.id, answer_id: selectedAnswer },
      });

      await submitQuiz(sessionId);
      trackEvent({ event_name: "quiz_submitted", page: "/cheshire/quiz" });
      router.push("/cheshire/result");
    } catch {
      setStatus("error");
      setErrorMsg("The Cat is distracted. Your answers are safe; try the final reveal again.");
    }
  };

  if (status === "loading") {
    return (
      <main className="landing cheshire-quiz" aria-busy="true">
        <div className="landing-content">
          <p className="hero-subtitle">The smile is forming...</p>
        </div>
      </main>
    );
  }

  const isLastQuestion = currentIndex === QUIZ_QUESTIONS.length - 1;
  const currentQuestion = QUIZ_QUESTIONS[currentIndex];
  const smileOpacity = 0.25 + currentIndex * 0.25;

  return (
    <main className="landing cheshire-quiz">
      <div className="cheshire-background-art" aria-hidden="true" style={{ opacity: smileOpacity }}>
        <div className="cheshire-smile">)</div>
      </div>

      <div className="landing-content quiz-container">
        {status === "error" && (
          <div className="error-banner" role="alert">
            {errorMsg}
            <button className="secondary-cta" onClick={() => setStatus("ready")}>Try again</button>
          </div>
        )}

        <div className="eyebrow" aria-live="polite" tabIndex={-1} ref={questionFocusRef}>
          Question {currentIndex + 1} of {QUIZ_QUESTIONS.length}
        </div>

        <fieldset className="quiz-fieldset" disabled={status === "saving" || status === "submitting"}>
          <legend className="hero-title">{currentQuestion.text}</legend>

          <div className="quiz-options">
            {currentQuestion.answers.map((answer) => (
              <label key={answer.id} className={`quiz-option ${selectedAnswer === answer.id ? "selected" : ""}`}>
                <input
                  type="radio"
                  name={currentQuestion.id}
                  value={answer.id}
                  checked={selectedAnswer === answer.id}
                  onChange={() => handleSelect(answer.id)}
                />
                <span className="quiz-option-text">{answer.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="quiz-actions">
          {isLastQuestion ? (
            <button
              className="primary-cta"
              onClick={handleSubmit}
              disabled={!selectedAnswer || status === "saving" || status === "submitting"}
              aria-busy={status === "submitting"}
            >
              {status === "submitting" ? "Asking..." : "Let the Cat decide"} <span aria-hidden="true">↗</span>
            </button>
          ) : (
            <button
              className="primary-cta"
              onClick={handleContinue}
              disabled={!selectedAnswer || status === "saving" || status === "submitting"}
              aria-busy={status === "saving"}
            >
              {status === "saving" ? "Persisting..." : "Continue"} <span aria-hidden="true">↗</span>
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
