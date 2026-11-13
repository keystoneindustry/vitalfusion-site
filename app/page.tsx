/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { site } from "@/content/site";
import AppTour from "./components/AppTour";
import VideoHero from "./components/VideoHero";
import Reveal from "./components/Reveal";
import Icon from "./components/Icon";
import Rich from "./components/Rich";

// Homepage: one goal — start the application.
// Order: video hero → 3 pillars → how it works → client results → what you get
// → your coach → is this for you? → closing. (No sticky button bar; Start Now repeats in the page.) All text comes from content/site.ts.

function Cta({ label, note }: { label: string; note?: string }) {
  return (
    <div className="cta">
      <Link href="/apply" className="btn-cta">
        {label} <span aria-hidden>→</span>
      </Link>
      {note && <p className="cta-note">{note}</p>}
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="kicker">{children}</p>;
}

export default function Home() {
  const { hero, video, pillars, how, results, whatYouGet, about, fit, closing, applyCta } = site;

  return (
    <main className="home lp">
      <Reveal />

      {/* HERO */}
      <section className="lp-hero">
        <div className="lp-inner narrow">
          <p className="hero-eyebrow">{hero.eyebrow}</p>
          <h1 className="hero-title">
            {hero.headline[0]}
            <span className="accent"> {hero.headline[1]}</span> {hero.headline[2]}
          </h1>
          <VideoHero {...video} />
          <div id="hero-form">
            <Cta label={hero.button} note={hero.note} />
          </div>
          {hero.holiday && <p className="holiday">{hero.holiday}</p>}
        </div>
      </section>

      {/* 3 PILLARS */}
      <section className="lp-sec alt" id="pillars">
        <div className="lp-inner">
          <div className="sec-head reveal">
            <Eyebrow>{pillars.eyebrow}</Eyebrow>
            <h2 className="sec-title"><Rich text={pillars.headline} /></h2>
            <p className="sec-sub">{pillars.sub}</p>
          </div>
          <div className="pillars">
            {pillars.items.map((p) => (
              <article key={p.title} className="pillar card-lp reveal">
                <div className="pillar-top">
                  <span className="icon-tile"><Icon name={p.icon} /></span>
                  <span className="pillar-label">{p.label}</span>
                </div>
                <h3>{p.title}</h3>
                <p>{p.text}</p>
              </article>
            ))}
          </div>
          <p className="pillars-close reveal">{pillars.closing}</p>
          <Cta label={applyCta} />
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="lp-sec" id="how">
        <div className="lp-inner narrow">
          <div className="sec-head reveal">
            <Eyebrow>{how.eyebrow}</Eyebrow>
            <h2 className="sec-title"><Rich text={how.headline} /></h2>
          </div>
          <ol className="steps">
            {how.steps.map((s, i) => (
              <li key={s.title} className="step card-lp reveal">
                <span className="step-num">{i + 1}</span>
                <div>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* CLIENT RESULTS */}
      <section className="lp-sec alt" id="results">
        <div className="lp-inner">
          <div className="sec-head reveal">
            <Eyebrow>{results.eyebrow}</Eyebrow>
            <h2 className="sec-title"><Rich text={results.headline} /></h2>
          </div>

          <article className="feature card-lp reveal">
            <img src={results.featured.image} alt={`${results.featured.name}'s weigh-in chart`} loading="lazy" />
            <div className="feature-body">
              <span className="result-tag">{results.featured.name} · {results.featured.headline}</span>
              <blockquote>“{results.featured.quote}”</blockquote>
              <ul className="ticks">
                {results.featured.points.map((p) => (
                  <li key={p}><Icon name="check" size={18} /> {p}</li>
                ))}
              </ul>
            </div>
          </article>

          <div className="quotes">
            {results.cards.map((c) => (
              <figure key={c.image} className="quote card-lp reveal">
                <img src={c.image} alt={`Client weigh-in chart: ${c.headline}`} loading="lazy" />
                <figcaption>
                  <strong>{c.headline}</strong>
                  <span>“{c.quote}”</span>
                  <em>— Vital Fusion client</em>
                </figcaption>
              </figure>
            ))}
          </div>
          <Cta label={applyCta} />
        </div>
      </section>

      {/* WHAT YOU GET */}
      <section className="lp-sec" id="included">
        <div className="lp-inner">
          <div className="sec-head reveal">
            <Eyebrow>{whatYouGet.eyebrow}</Eyebrow>
            <h2 className="sec-title"><Rich text={whatYouGet.headline} /></h2>
          </div>
          <div className="get">
            <ul className="get-list">
              {whatYouGet.items.map((g) => (
                <li key={g.title} className="card-lp reveal">
                  <span className="icon-tile"><Icon name={g.icon} /></span>
                  <div>
                    <h3>{g.title}</h3>
                    <p>{g.text}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="reveal">
              <AppTour screens={whatYouGet.appScreens} />
            </div>
          </div>
        </div>
      </section>

      {/* YOUR COACH */}
      <section className="lp-sec alt" id="about">
        <div className="lp-inner coach reveal">
          <img className="coach-photo" src={hero.photo} alt={site.coachName} loading="lazy" />
          <div>
            <Eyebrow>{about.eyebrow}</Eyebrow>
            <h2 className="sec-title left">{about.headline}</h2>
            <p className="coach-name">{site.coachName}</p>
            {about.paragraphs.map((p) => (
              <p key={p} className="coach-text">{p}</p>
            ))}
            <div className="creds">
              {about.credentials.map((c) => (
                <span key={c} className="cred"><Icon name="check" size={16} /> {c}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* IS THIS FOR YOU? */}
      <section className="lp-sec" id="fit">
        <div className="lp-inner fit">
          <div className="fit-card card-lp reveal">
            <h2 className="fit-title"><Rich text={fit.yesTitle} /></h2>
            <ul>
              {fit.yes.map((t) => (
                <li key={t}><span className="mark yes"><Icon name="check" size={18} /></span>{t}</li>
              ))}
            </ul>
          </div>
          <div className="fit-card card-lp reveal">
            <h2 className="fit-title"><Rich text={fit.noTitle} /></h2>
            <ul>
              {fit.no.map((t) => (
                <li key={t}><span className="mark no"><Icon name="x" size={16} /></span>{t}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CLOSING */}
      <section className="lp-final">
        <div className="lp-inner narrow reveal">
          <h2 className="final-title"><Rich text={closing.headline} /></h2>
          <p className="sec-sub">{closing.sub}</p>
          <Cta label={applyCta} note={hero.note} />
          <p className="disclaimer">{closing.disclaimer}</p>
        </div>
      </section>

    </main>
  );
}
