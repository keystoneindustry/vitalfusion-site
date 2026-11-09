/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { site } from "@/content/site";
import StickyApply from "./components/StickyApply";

// Homepage: one goal — start the application.
// Order: Start Now → client results → V.I.T.A.L. Method → your coach → Start Now.
// All text comes from content/site.ts.
export default function Home() {
  const { hero, results, method, about, closing, applyCta } = site;

  return (
    <main className="home">
      {/* HERO — fills the first phone screen */}
      <section className="hero-home">
        <div className="hero-copy">
          <h1 className="display">{hero.headline}</h1>
          <p className="lead">{hero.sub}</p>
          <div className="hero-cta" id="hero-form">
            <Link href="/apply" className="btn btn-wide btn-big">{hero.button}</Link>
            <p className="hero-note">{hero.note}</p>
          </div>
          <a href="#results" className="see-results">
            {hero.resultsLink}
            <span aria-hidden>↓</span>
          </a>
        </div>
        <img className="hero-photo" src={hero.photo} alt={`${site.coachName}, ${site.brand} coach`} />
      </section>

      {/* RESULTS */}
      <section className="block" id="results">
        <p className="eyebrow center-text">{results.eyebrow}</p>
        <h2 className="h2 center-text">{results.headline}</h2>

        <article className="featured-result">
          <p className="result-name">{results.featured.name}</p>
          <p className="result-headline">{results.featured.headline}</p>
          <ul>
            {results.featured.points.map((p) => (
              <li key={p}>✓ {p}</li>
            ))}
          </ul>
        </article>

        <div className="results" aria-label="Client results">
          {results.cards.map((c) => (
            <figure key={c.image} className="result">
              <img src={c.image} alt={`Client weigh-in chart: ${c.headline}`} loading="lazy" />
              <figcaption>
                <strong>{c.headline}</strong>
                <span>“{c.quote}”</span>
              </figcaption>
            </figure>
          ))}
        </div>
        <p className="swipe-hint" aria-hidden>Swipe for more →</p>
      </section>

      {/* THE VITAL METHOD */}
      <section className="block narrow" id="method">
        <p className="eyebrow center-text">{method.eyebrow}</p>
        <h2 className="h2 center-text">{method.headline}</h2>
        <p className="lead center-text">{method.sub}</p>
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

      {/* YOUR COACH */}
      <section className="block about" id="about">
        <img className="about-photo" src={hero.photo} alt={site.coachName} loading="lazy" />
        <div>
          <p className="eyebrow">{about.eyebrow}</p>
          <h2 className="h2">{about.headline}</h2>
          <p className="coach-name">{site.coachName}</p>
          {about.paragraphs.map((p) => (
            <p key={p} className="body">{p}</p>
          ))}
          <div className="creds">
            {about.credentials.map((c) => (
              <span key={c} className="cred">✓ {c}</span>
            ))}
          </div>
        </div>
      </section>

      {/* CLOSING CTA */}
      <section className="closing">
        <h2 className="h2">{closing.headline}</h2>
        <p className="lead">{closing.sub}</p>
        <Link href="/apply" className="btn btn-wide btn-big">{applyCta} →</Link>
      </section>

      <StickyApply label={applyCta} />
    </main>
  );
}
