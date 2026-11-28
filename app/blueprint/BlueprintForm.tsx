"use client";

import { readAttribution } from "@/app/components/Attribution";
import { useState } from "react";
import { BLUEPRINT as G } from "@/lib/blueprint";

// Name + email form for the free Blueprint guide (same look as the meal plan pages). On submit the
// thank-you screen with the PDF download shows straight away; the email, follow-ups and tracking happen in
// /api/blueprint in the background.
export default function BlueprintForm({ source }: { source: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState(""); // honeypot
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: { name?: string; email?: string } = {};
    if (!name.trim()) errs.name = "Please enter your first name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) errs.email = "Please enter a valid email.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      const res = await fetch("/api/blueprint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, company, source, attr: readAttribution() }),
        keepalive: true,
      });
      if (res.status === 422) {
        const j = await res.json().catch(() => ({}));
        setErrors(j.errors ?? { email: "Please check your details." });
        setBusy(false);
        return;
      }
    } catch {
      // Network trouble: still give them the PDF.
    }
    setDone(true);
    setBusy(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const first = name.trim().split(/\s+/)[0] || "";

  if (done) {
    return (
      <main className="wrap lp apply-lp mp mp-done">
        <p className="mp-check" aria-hidden>✓</p>
        <h1 className="title">You&apos;re in{first ? `, ${first}` : ""}! 🎉</h1>
        <p className="lead">Your copy of The Busy Professional Blueprint is ready. Download it below, and we&apos;ve also sent a copy to your inbox.</p>
        <a className="btn-cta" href={G.pdf} target="_blank" rel="noopener">Download the Blueprint (PDF)</a>
        <p className="hero-note">Can&apos;t find the email? Check your spam or promotions folder for an email from Vital Fusion Coaching.</p>
        <div className="card-lp mp-next">
          <p className="mp-next-title">Start here</p>
          <ol>
            <li>Do Day 1 in the next 48 hours. It&apos;s on page 3.</li>
            <li>Buy the week&apos;s groceries from the list on page 9.</li>
            <li>Pick the 3 to 4 days you&apos;ll do your 20 minutes of cardio.</li>
          </ol>
        </div>
      </main>
    );
  }

  return (
    <main className="wrap lp apply-lp mp bp">
      <div className="bp-grid" aria-hidden />
      <header className="bp-hero">
        <p className="bp-pill"><span aria-hidden />Free guide · For men with full-time jobs</p>
        <h1 className="bp-title">The Busy Professional <em>Blueprint</em></h1>
        <p className="lead">Training, nutrition, cardio and recovery in one plan. <b>The best way to get shredded in 90 days.</b></p>
        <a className="btn-cta bp-top-cta" href="#get">Get it free</a>
      </header>

      <div className="bp-mock" aria-hidden>
        <img className="bp-page bp-page-l" src="/images/blueprint/day1.jpg" alt="" width={680} height={880} />
        <img className="bp-page bp-page-r" src="/images/blueprint/week.jpg" alt="" width={680} height={880} />
        <img className="bp-page bp-page-c" src="/images/blueprint/cover.jpg" alt="" width={680} height={880} />
      </div>

      <div className="bp-stats">
        {G.stats.map((s) => (
          <div key={s.label} className="bp-stat"><b>{s.value}</b><span>{s.label}</span></div>
        ))}
      </div>

      <form id="get" className="bp-form" onSubmit={submit} noValidate>
        <p className="bp-form-title">Where should I send it?</p>
        <div className="field">
          <label htmlFor="mp-name">First name</label>
          <input id="mp-name" autoComplete="given-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your first name" />
          {errors.name && <p className="err" role="alert">{errors.name}</p>}
        </div>
        <div className="field">
          <label htmlFor="mp-email">Email</label>
          <input id="mp-email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
          {errors.email && <p className="err" role="alert">{errors.email}</p>}
        </div>
        <div className="hp" aria-hidden>
          <label htmlFor="mp-company">Company</label>
          <input id="mp-company" tabIndex={-1} autoComplete="off" value={company} onChange={(e) => setCompany(e.target.value)} />
        </div>
        <button type="submit" className="btn-cta" disabled={busy}>{busy ? "Sending…" : "Send me the Blueprint"}</button>
        <p className="hero-note">Free. Instant download, and a copy goes to your inbox.</p>
      </form>

      <h2 className="bp-h2">What&apos;s <em>inside</em></h2>
      <ol className="bp-list">
        {G.sections.map((sec, i) => (
          <li key={sec.name} className="bp-item">
            <span className="bp-num" aria-hidden>{String(i + 1).padStart(2, "0")}</span>
            <div className="bp-item-body">
              <p className="bp-item-label">{sec.label}</p>
              <p className="bp-item-name">{sec.name}</p>
              <ul>
                {sec.items.map(([item, hidden]) => (
                  <li key={item}><span>{item}</span><span className="mp-blur" aria-hidden>{hidden}</span></li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ol>
      <p className="hero-note bp-center">Plus warm-up tips for every workout and two sample weeks.</p>

      <div className="bp-coach">
        <img src="/images/email/tyler-work.jpg" alt="Tyler" width={520} height={682} loading="lazy" />
        <div>
          <p className="bp-coach-quote">I work a desk job in sales. Long days, work lunches, happy hours. This is the plan I&apos;d give a guy in the same spot.</p>
          <p className="bp-coach-name">Tyler · Vital Fusion Coaching</p>
        </div>
      </div>

      <a className="btn-cta bp-bottom-cta" href="#get">Get the Blueprint free</a>
    </main>
  );
}
