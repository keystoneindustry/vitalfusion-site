import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "The VITAL Method | Vital Fusion Coaching",
  description: "A proven system for sustainable fat loss. Apply for 1:1 coaching with Vital Fusion Coaching.",
};

// Promo landing page. Applications from here are tagged "Vital Method".
export default function VitalMethodPage() {
  const { promo, method, results } = site;
  const applyHref = "/apply?source=vital-method";

  return (
    <main className="home">
      <section className="closing">
        <p className="eyebrow">{site.brand}</p>
        <h1 className="display">{promo.headline}</h1>
        <p className="lead">{promo.sub}</p>
        <div className="promo-banner">
          <strong>{promo.banner}</strong>
          <span>{promo.bannerSub}</span>
        </div>
      </section>

      <section className="block">
        <h2 className="h2 center-text">What is the VITAL Method?</h2>
        <ol className="vital">
          {method.steps.map((s) => (
            <li key={s.letter}>
              <span className="vital-letter">{s.letter}</span>
              <div>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="block narrow">
        <h2 className="h2 center-text">Real Client Transformation</h2>
        <article className="featured-result">
          <p className="result-name">{results.featured.name}&apos;s 8-Week Journey</p>
          <p className="result-headline">{results.featured.headline}</p>
          <ul>
            {results.featured.points.map((p) => (
              <li key={p}>✓ {p}</li>
            ))}
          </ul>
          <blockquote>“{promo.testimonial}”<cite>— {results.featured.name}</cite></blockquote>
        </article>
      </section>

      <section className="closing">
        <h2 className="h2">{promo.ctaHeadline}</h2>
        <p className="lead tight">{promo.ctaSub}</p>
        <p className="muted-text">{promo.ctaNote}</p>
        <Link href={applyHref} className="btn">{promo.cta}</Link>
        <p className="muted-text small">{promo.fine}</p>
      </section>
    </main>
  );
}
