/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { site } from "@/content/site";

// Homepage. All text comes from content/site.ts — edit words there, not here.
export default function Home() {
  const { hero, results, problem, mission, method, included, about, faq, blueprint, closing } = site;

  return (
    <main className="home">
      {/* HERO */}
      <section className="hero-home">
        <div className="hero-copy">
          <p className="pill">✦ {hero.eyebrow}</p>
          <h1 className="display">{hero.headline}</h1>
          <p className="lead">{hero.sub}</p>
          <div className="btn-row">
            <Link href="/apply" className="btn">{hero.cta} →</Link>
            <a href="#method" className="btn btn-ghost">{hero.secondaryCta}</a>
          </div>
          <p className="hint-gold">
            Looking for the Free Fat Loss Blueprint? <a href="#blueprint">Scroll down 👇</a>
          </p>
        </div>
        <img className="hero-photo" src={hero.photo} alt={`${site.coachName}, ${site.brand} coach`} />
      </section>

      {/* RESULTS */}
      <section className="block" id="results">
        <p className="eyebrow center-text">{results.eyebrow}</p>
        <h2 className="h2 center-text">{results.headline}</h2>
        <p className="lead center-text">{results.sub}</p>

        <article className="featured-result">
          <p className="result-name">{results.featured.name}</p>
          <p className="result-headline">{results.featured.headline}</p>
          <ul>
            {results.featured.points.map((p) => (
              <li key={p}>✓ {p}</li>
            ))}
          </ul>
        </article>

        <div className="results">
          {results.images.map((img, i) => (
            <figure key={img.src} className="result">
              <img src={img.src} alt={img.alt} loading="lazy" />
              {results.quotes[i] && <figcaption>“{results.quotes[i]}”</figcaption>}
            </figure>
          ))}
        </div>
      </section>

      {/* PROBLEM */}
      <section className="block narrow">
        <h2 className="h2">{problem.headline}</h2>
        <ul className="pain">
          {problem.points.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
        <p className="closer">{problem.closer}</p>
        <Link href="/apply" className="btn">{closing.cta}</Link>
      </section>

      {/* MISSION */}
      <section className="mission">
        <p>{mission}</p>
      </section>

      {/* THE VITAL METHOD */}
      <section className="block" id="method">
        <p className="eyebrow center-text">{method.eyebrow}</p>
        <h2 className="h2 center-text">{method.headline}</h2>
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

        <h2 className="h2 center-text included-title">{included.headline}</h2>
        <div className="pillars">
          {included.items.map((p) => (
            <article key={p.title} className="pillar">
              <span className="pillar-icon" aria-hidden>{p.icon}</span>
              <h3>{p.title}</h3>
              <p>{p.text}</p>
            </article>
          ))}
        </div>
        <div className="center-text">
          <Link href="/apply" className="btn">{closing.cta}</Link>
        </div>
      </section>

      {/* ABOUT */}
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
          <div className="mission-card">
            <h3>{about.missionTitle}</h3>
            <p>{about.mission}</p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="block narrow" id="faq">
        <p className="eyebrow center-text">{faq.eyebrow}</p>
        <h2 className="h2 center-text">{faq.headline}</h2>
        <div className="faq">
          {faq.items.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
        <div className="still center-text">
          <h3>{faq.stillTitle}</h3>
          <p>{faq.stillText}</p>
          <Link href="/apply" className="btn">{closing.cta} →</Link>
        </div>
      </section>

      {/* FREE BLUEPRINT */}
      <section className="blueprint" id="blueprint">
        <p className="eyebrow gold">{blueprint.eyebrow}</p>
        <h2 className="h2">{blueprint.headline}</h2>
        <p className="lead tight">{blueprint.sub}</p>
        <p className="muted-text">{blueprint.text}</p>
        <a href={blueprint.url} target="_blank" rel="noopener noreferrer" className="btn btn-gold">
          {blueprint.cta} →
        </a>
      </section>

      {/* CLOSING CTA */}
      <section className="closing">
        <h2 className="h2">{closing.headline}</h2>
        <p className="lead">{closing.sub}</p>
        <Link href="/apply" className="btn">{closing.cta}</Link>
      </section>
    </main>
  );
}
