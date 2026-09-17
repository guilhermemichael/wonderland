"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { getLocalSessionId } from "../../../lib/session";
import { QUIZ_QUESTIONS, QuestionId, AnswerId } from "../../../lib/quiz-content";
import { getQuizAnswers, saveQuizAnswer, submitQuiz } from "../../../lib/api-client";
import { trackEvent } from "../../../lib/analytics";

type QuizState = "loading" | "ready" | "saving" | "submitting" | "error";

export default function CheshireQuizPage() {
  const router = useRouter();
  const [status, setStatus] = useState<QuizState>("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selectedAnswer, setSelectedAnswer] = useState<AnswerId | null>(null);
  
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    async function loadState() {
      const sessionId = getLocalSessionId();
      if (!sessionId) {
        // Without a session, we can't do the quiz.
        router.replace("/crossroads");
        return;
      }

      try {
        const data = await getQuizAnswers(sessionId);
        if (data.is_complete) {
          router.replace("/cheshire/result");
          return;
        }

        setAnswers(data.answers || {});
        
        // Find the first unanswered question
        let nextIndex = 0;
        for (let i = 0; i < QUIZ_QUESTIONS.length; i++) {
          if (!data.answers[QUIZ_QUESTIONS[i].id]) {
            nextIndex = i;
            break;
          }
        }
        
        // If all 4 are answered but not complete? (Shouldn't happen with our API)
        if (nextIndex >= QUIZ_QUESTIONS.length) {
          nextIndex = QUIZ_QUESTIONS.length - 1; 
        }

        setCurrentIndex(nextIndex);
        setSelectedAnswer(data.answers[QUIZ_QUESTIONS[nextIndex].id] || null);
        setStatus("ready");

        trackEvent({
          event_name: nextIndex > 0 ? "quiz_resumed" : "quiz_started",
          page: "/cheshire/quiz",
          properties: { question_index: nextIndex }
        });
        
        trackEvent({
          event_name: "quiz_question_viewed",
          page: "/cheshire/quiz",
          properties: { question_id: QUIZ_QUESTIONS[nextIndex].id }
        });

      } catch (err) {
        setStatus("error");
        setErrorMsg("The Cat seems to have misplaced your memory. Try refreshing.");
      }
    }

    loadState();
  }, [router]);

  const handleSelect = (id: AnswerId) => {
    setSelectedAnswer(id);
  };

  const handleContinue = async () => {
    if (!selectedAnswer) return;

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
        properties: { question_id: question.id, answer_id: selectedAnswer }
      });

      setAnswers(prev => ({ ...prev, [question.id]: selectedAnswer }));

      if (currentIndex < QUIZ_QUESTIONS.length - 1) {
        const nextIdx = currentIndex + 1;
        setCurrentIndex(nextIdx);
        setSelectedAnswer(answers[QUIZ_QUESTIONS[nextIdx].id] || null);
        setStatus("ready");
        
        // Move focus to the question container for accessibility
        setTimeout(() => {
          const eyebrow = document.querySelector('.eyebrow') as HTMLElement;
          if (eyebrow) eyebrow.focus();
        }, 0);

        trackEvent({
          event_name: "quiz_question_viewed",
          page: "/cheshire/quiz",
          properties: { question_id: QUIZ_QUESTIONS[nextIdx].id }
        });
      } else {
        setStatus("ready");
      }
    } catch (err) {
      setStatus("error");
      setErrorMsg("A ripple in Wonderland prevented your choice from being saved.");
    }
  };

  const handleSubmit = async () => {
    const sessionId = getLocalSessionId();
    if (!sessionId) return;
    if (!selectedAnswer) return;

    setStatus("submitting");
    setErrorMsg(null);
    try {
      // Must save the final answer before submitting, otherwise the backend rejects it as incomplete
      await saveQuizAnswer(sessionId, QUIZ_QUESTIONS[QUIZ_QUESTIONS.length - 1].id, selectedAnswer);
      
      trackEvent({
        event_name: "quiz_answer_confirmed",
        page: "/cheshire/quiz",
        properties: { question_id: QUIZ_QUESTIONS[QUIZ_QUESTIONS.length - 1].id, answer_id: selectedAnswer }
      });

      await submitQuiz(sessionId);
      trackEvent({
        event_name: "quiz_submitted",
        page: "/cheshire/quiz",
      });
      router.push("/cheshire/result");
    } catch (err) {
      setStatus("error");
      setErrorMsg("The Cat is distracted. Could not finalize the decision.");
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
  const currentQ = QUIZ_QUESTIONS[currentIndex];

  // Progressive opacity of the smile
  const smileOpacity = 0.25 + (currentIndex * 0.25);

  return (
    <main className="landing cheshire-quiz">
      <div className="cheshire-background-art" aria-hidden="true" style={{ opacity: smileOpacity }}>
        {/* Placeholder for the Cheshire visual. Just using a stylized text symbol for now. */}
        <div className="cheshire-smile">)</div>
      </div>

      <div className="landing-content quiz-container">
        {status === "error" && (
          <div className="error-banner" role="alert">
            {errorMsg}
            <button className="secondary-cta" onClick={() => setStatus("ready")}>Try again</button>
          </div>
        )}

        <div className="eyebrow" aria-live="polite" tabIndex={-1}>
          Question {currentIndex + 1} of {QUIZ_QUESTIONS.length}
        </div>

        <fieldset className="quiz-fieldset" disabled={status === "saving" || status === "submitting"}>
          <legend className="hero-title">{currentQ.text}</legend>
          
          <div className="quiz-options">
            {currentQ.answers.map(ans => (
              <label key={ans.id} className={`quiz-option ${selectedAnswer === ans.id ? "selected" : ""}`}>
                <input
                  type="radio"
                  name={currentQ.id}
                  value={ans.id}
                  checked={selectedAnswer === ans.id}
                  onChange={() => handleSelect(ans.id)}
                />
                <span className="quiz-option-text">{ans.label}</span>
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
