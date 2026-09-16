import Link from "next/link";

export default function CheshireQuizPage() {
  return (
    <main className="landing" aria-labelledby="quiz-title">
      <div className="landing-content">
        <div className="eyebrow">The Cheshire Cat / A question</div>
        <h1 className="hero-title" id="quiz-title">Questions are much more fun.</h1>
        <p className="hero-subtitle">The cat is considering your question. It may answer when it feels like it.</p>
        <Link className="primary-cta" href="/crossroads">Return to the crossroads <span aria-hidden="true">↗</span></Link>
      </div>
    </main>
  );
}
