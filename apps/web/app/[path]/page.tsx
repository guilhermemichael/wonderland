import Link from "next/link";
import { notFound } from "next/navigation";

const experiences = {
  rabbit: { title: "Curiosity will take you places reason never could.", detail: "The Rabbit keeps moving. There may be a map somewhere, but it is still being written.", next: "Return to the crossroads", href: "/crossroads" },
  hatter: { title: "Time has stopped. Manners have too.", detail: "Take a seat. The tea is already cold, which is how we like it.", next: "Return to the crossroads", href: "/crossroads" },
};

export function generateStaticParams() {
  return Object.keys(experiences).map((path) => ({ path }));
}

export default async function PathPage({ params }: { params: Promise<{ path: string }> }) {
  const { path } = await params;
  const experience = experiences[path as keyof typeof experiences];
  if (!experience) notFound();
  return (
    <main className="landing" aria-labelledby="path-title">
      <div className="landing-content">
        <div className="eyebrow">WONDERLAND / {path}</div>
        <h1 className="hero-title" id="path-title">{experience.title}</h1>
        <p className="hero-subtitle">{experience.detail}</p>
        <Link className="primary-cta" href={experience.href}>{experience.next} <span aria-hidden="true">↗</span></Link>
      </div>
    </main>
  );
}
