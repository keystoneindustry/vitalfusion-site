"use client";

import { useState } from "react";
import Rich from "@/app/components/Rich";
import { GROCERY_LIST as G } from "@/lib/grocery-list";

// Name + email form for the free Fat Loss Grocery List (same look as the meal plan pages). On submit the
// thank-you screen with the PDF download shows straight away; the email, follow-ups and tracking happen in
// /api/grocery-list in the background.
export default function GroceryListForm({ source }: { source: string }) {
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
      const res = await fetch("/api/grocery-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, company, source }),
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
        <p className="lead">Your grocery list is ready. Download it below, and we&apos;ve also sent a copy to your inbox.</p>
        <a className="btn-cta" href={G.pdf} target="_blank" rel="noopener">Download my grocery list (PDF)</a>
        <p className="hero-note">Can&apos;t find the email? Check your spam or promotions folder for an email from Vital Fusion Coaching.</p>
        <div className="card-lp mp-next">
          <p className="mp-next-title">Start here</p>
          <ol>
            <li>Pick your foods from each section on page 2.</li>
            <li>Buy it all in one trip for the week.</li>
            <li>Choose a breakfast, lunch, dinner and snack from the sample meals.</li>
          </ol>
        </div>
      </main>
    );
  }

  return (
    <main className="wrap lp apply-lp mp">
      <h1 className="display"><Rich text={G.title} /></h1>
      <p className="lead">{G.intro}</p>

      <div className="mp-stats">
        {G.stats.map((s) => (
          <div key={s.label} className="mp-stat"><b>{s.value}</b><span>{s.label}</span></div>
        ))}
      </div>

      <form className="card-lp mp-form" onSubmit={submit} noValidate>
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
        <button type="submit" className="btn-cta" disabled={busy}>{busy ? "Sending…" : "Send me the list"}</button>
        <p className="hero-note">Free. Instant download, and a copy goes to your inbox.</p>
      </form>

      <h2 className="mp-h2">What&apos;s inside</h2>
      <div className="mp-meals">
        {G.sections.map((sec) => (
          <div key={sec.name} className="card-lp mp-meal">
            <p className="mp-meal-label">{sec.pick}</p>
            <p className="mp-meal-name">{sec.name}</p>
            <ul>
              {sec.items.map((f) => (
                <li key={f}><span>{f}</span><span className="mp-blur" aria-hidden>{sec.blur}</span></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="hero-note">Plus my picks when you can&apos;t decide in the aisle.</p>
    </main>
  );
}
