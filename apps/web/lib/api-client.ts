const DEFAULT_PRODUCTION_API_URL = "https://wonderland-api-wmxc.onrender.com";
const DEFAULT_DEVELOPMENT_API_URL = "http://localhost:8000";

export function apiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  const fallbackUrl = process.env.NODE_ENV === "production"
    ? DEFAULT_PRODUCTION_API_URL
    : DEFAULT_DEVELOPMENT_API_URL;

  const base = (envUrl ?? fallbackUrl).replace(/\/$/, "");
  return base.endsWith("/api/v1") ? base : `${base}/api/v1`;
}

export function apiEventsUrl(): string {
  const base = apiBaseUrl();
  return base.endsWith("/events") ? base : `${base}/events`;
}

export async function saveQuizAnswer(sessionId: string, questionId: string, answerId: string) {
  const response = await fetch(`${apiBaseUrl()}/sessions/${sessionId}/quiz/answers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question_id: questionId, answer_id: answerId }),
  });
  if (!response.ok) throw new Error("Failed to save answer");
  return response.json();
}

export async function getQuizAnswers(sessionId: string) {
  const response = await fetch(`${apiBaseUrl()}/sessions/${sessionId}/quiz/answers`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) throw new Error("Failed to get answers");
  return response.json();
}

export async function submitQuiz(sessionId: string) {
  const response = await fetch(`${apiBaseUrl()}/sessions/${sessionId}/quiz/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) throw new Error("Failed to submit quiz");
  return response.json();
}

export async function getQuizResult(sessionId: string) {
  const response = await fetch(`${apiBaseUrl()}/sessions/${sessionId}/quiz/result`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) throw new Error("Failed to get result");

  const data = await response.json();
  return {
    affinity: data.final_segment as "curious" | "chaotic" | "mysterious",
    confidence: Number(data.confidence),
    scoringVersion: data.scoring_version as string,
    submittedAt: data.submitted_at as string,
    scores: {
      curious: Number(data.curious_score),
      chaotic: Number(data.chaotic_score),
      mysterious: Number(data.mysterious_score),
    },
  };
}
