"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  AGE_RANGES,
  FITNESS_LEVELS,
  HELP_AREAS,
  STEPS,
  validateApplication,
  type FieldErrors,
} from "@/lib/application";

// One question per screen. Single-choice questions advance on tap; the rest
// have a Continue button. Contact details come last, once people are invested.

type Answers = {
  ageRange: string;
  fitnessLevel: string;
  helpAreas: string[];
  otherArea: string;
  goal: string;
  whyNow: string;
  fullName: string;
  email: string;
  phone: string;
  instagram: string;
};

const EMPTY: Answers = {
  ageRange: "",
  fitnessLevel: "",
  helpAreas: [],
  otherArea: "",
  goal: "",
  whyNow: "",
  fullName: "",
  email: "",
  phone: "",
  instagram: "",
};

const SAVE_KEY = "vf-apply-progress";
const LAST = STEPS.length - 1;

function errorsForStep(a: Answers, step: number): FieldErrors {
  const res = validateApplication(a);
  if (res.ok) return {};
  const out: FieldErrors = {};
  for (const k of STEPS[step]) if (res.errors[k]) out[k] = res.errors[k];
  return out;
}

export default function ApplyForm({ source, initialAge = "" }: { source: string; initialAge?: string }) {
  const [a, setA] = useState<Answers>(initialAge ? { ...EMPTY, ageRange: initialAge } : EMPTY);
  const [step, setStep] = useState(initialAge ? 1 : 0);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");
  const [formError, setFormError] = useState("");
  const [company, setCompany] = useState(""); // honeypot
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  // Restore progress if they refresh or come back in the same tab.
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(SAVE_KEY) || "null");
      if (saved?.a) {
        // Coming from the homepage age buttons: keep their saved answers but use the new age.
        setA({ ...EMPTY, ...saved.a, ...(initialAge ? { ageRange: initialAge } : {}) });
        setStep(initialAge ? Math.max(1, Math.min(saved.step | 0, LAST)) : Math.min(Math.max(0, saved.step | 0), LAST));
      }
    } catch {}
  }, []);
  useEffect(() => {
    if (status === "done") return;
    try {
      sessionStorage.setItem(SAVE_KEY, JSON.stringify({ a, step }));
    } catch {}
  }, [a, step, status]);

  function set<K extends keyof Answers>(k: K, v: Answers[K]) {
    setA((prev) => ({ ...prev, [k]: v }));
    if (errors[k as keyof FieldErrors]) setErrors((e) => ({ ...e, [k]: undefined }));
  }

  function goTo(n: number) {
    setErrors({});
    setFormError("");
    setStep(n);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function next() {
    const errs = errorsForStep(a, step);
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    goTo(Math.min(step + 1, LAST));
  }

  // Single-choice: select, show the highlight briefly, then move on.
  function pick(k: "ageRange" | "fitnessLevel", v: string) {
    set(k, v);
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(() => goTo(step + 1), 280);
  }

  function toggleArea(v: string) {
    const has = a.helpAreas.includes(v);
    set("helpAreas", has ? a.helpAreas.filter((x) => x !== v) : [...a.helpAreas, v]);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (step !== LAST) return next();
    const res = validateApplication(a);
    if (!res.ok) {
      // Jump back to the first step that has a problem.
      const bad = Math.max(0, STEPS.findIndex((keys) => keys.some((k) => res.errors[k])));
      setStep(bad);
      setErrors(errorsForStep(a, bad));
      return;
    }
    setStatus("sending");
    setFormError("");
    try {
      const r = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...a, company, source }),
      });
      const json = await r.json().catch(() => ({}));
      if (r.ok) {
        setStatus("done");
        try {
          sessionStorage.removeItem(SAVE_KEY);
        } catch {}
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      setFormError(json.error ?? "Something went wrong. Please try again.");
      if (json.errors) setErrors(json.errors);
      setStatus("idle");
    } catch {
      setFormError("Couldn't reach the server. Check your connection and try again.");
      setStatus("idle");
    }
  }

  if (status === "done") {
    return (
      <main className="wrap center lp apply-lp apply-done">
        <div className="check" aria-hidden>✓</div>
        <p className="kicker">Thank you</p>
        <h1 className="title">Application <em>received.</em></h1>
        <div className="card card-lp">
          <p className="thanks">
            Thank you for applying. We&apos;ll review your information and see if one-on-one coaching
            is the right fit for your goals. We&apos;ll reach out soon to schedule your consultation call.
          </p>
          <p className="thanks thanks-email">Check your email for additional information.</p>
        </div>
        <Link href="/" className="btn-ghost">← Back to Home</Link>
      </main>
    );
  }

  const err = (k: keyof FieldErrors) =>
    errors[k] ? <p className="err" role="alert">{errors[k]}</p> : null;
  const pct = Math.round(((step + 1) / STEPS.length) * 100);

  return (
    <main className="wrap apply lp apply-lp">
      <div ref={topRef} />
      <header className="apply-head">
        <p className="kicker">Coaching application</p>
        <h1 className="apply-title">Apply for <em>1:1 coaching</em></h1>
        <p className="apply-sub">Takes about 60 seconds</p>
      </header>

      <div className="apply-card card-lp">

      <div className="progress" aria-hidden>
        <div className="progress-bar" style={{ width: `${pct}%` }} />
      </div>
      <div className="progress-row">
        {step > 0 ? (
          <button type="button" className="back" onClick={() => goTo(step - 1)}>← Back</button>
        ) : (
          <span />
        )}
        <span className="progress-label">Question {step + 1} of {STEPS.length}</span>
      </div>

      <form onSubmit={submit} noValidate className="step-form">
        <div className="step" key={step}>
          {step === 0 && (
            <fieldset>
              <legend className="q">What is your age range?</legend>
              <div className="choices">
                {AGE_RANGES.map((v) => (
                  <button
                    type="button"
                    key={v}
                    className={`choice ${a.ageRange === v ? "on" : ""}`}
                    aria-pressed={a.ageRange === v}
                    onClick={() => pick("ageRange", v)}
                  >
                    {v}
                  </button>
                ))}
              </div>
              {err("ageRange")}
            </fieldset>
          )}

          {step === 1 && (
            <fieldset>
              <legend className="q">What best describes your current level of fitness?</legend>
              <div className="choices">
                {FITNESS_LEVELS.map((l) => (
                  <button
                    type="button"
                    key={l.value}
                    className={`choice long ${a.fitnessLevel === l.value ? "on" : ""}`}
                    aria-pressed={a.fitnessLevel === l.value}
                    onClick={() => pick("fitnessLevel", l.value)}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
              {err("fitnessLevel")}
            </fieldset>
          )}

          {step === 2 && (
            <fieldset>
              <legend className="q">What areas do you feel you need the most help with?</legend>
              <p className="hint">Select all that apply</p>
              <div className="choices">
                {HELP_AREAS.map((h) => {
                  const on = a.helpAreas.includes(h.value);
                  return (
                    <button
                      type="button"
                      key={h.value}
                      className={`choice multi ${on ? "on" : ""}`}
                      aria-pressed={on}
                      onClick={() => toggleArea(h.value)}
                    >
                      <span className="tick" aria-hidden>{on ? "✓" : ""}</span>
                      {h.label}
                    </button>
                  );
                })}
              </div>
              {err("helpAreas")}
              {a.helpAreas.includes("other") && (
                <div className="other-box">
                  <label htmlFor="otherArea">What else do you need help with?</label>
                  <input
                    id="otherArea"
                    autoFocus
                    maxLength={300}
                    value={a.otherArea}
                    onChange={(e) => set("otherArea", e.target.value)}
                    placeholder="e.g. sleep, stress, injury recovery..."
                  />
                  {err("otherArea")}
                </div>
              )}
            </fieldset>
          )}

          {step === 3 && (
            <div>
              <label htmlFor="goal" className="q">
                Fast-forward six to 12 months. What do you want to be able to say you achieved with your own fitness?
              </label>
              <textarea
                id="goal"
                rows={5}
                maxLength={2000}
                autoFocus
                value={a.goal}
                onChange={(e) => set("goal", e.target.value)}
                placeholder="Describe your ideal outcome..."
              />
              {err("goal")}
            </div>
          )}

          {step === 4 && (
            <div>
              <label htmlFor="whyNow" className="q">Why is now the right time for you to focus on this?</label>
              <textarea
                id="whyNow"
                rows={5}
                maxLength={2000}
                autoFocus
                value={a.whyNow}
                onChange={(e) => set("whyNow", e.target.value)}
                placeholder="What's motivating you to start now..."
              />
              {err("whyNow")}
            </div>
          )}

          {step === 5 && (
            <div>
              <p className="q">Last step! Where should we reach you?</p>
              <div className="field">
                <label htmlFor="fullName">Full Name</label>
                <input id="fullName" autoComplete="name" value={a.fullName} onChange={(e) => set("fullName", e.target.value)} placeholder="John Doe" />
                {err("fullName")}
              </div>
              <div className="field">
                <label htmlFor="email">Email Address</label>
                <input id="email" type="email" autoComplete="email" inputMode="email" value={a.email} onChange={(e) => set("email", e.target.value)} placeholder="john@example.com" />
                {err("email")}
              </div>
              <div className="field">
                <label htmlFor="phone">Phone Number</label>
                <input id="phone" type="tel" autoComplete="tel" inputMode="tel" value={a.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+1 (555) 123-4567" />
                {err("phone")}
              </div>
              <div className="field">
                <label htmlFor="instagram">Instagram Handle <span className="muted">(Optional)</span></label>
                <input id="instagram" autoCapitalize="none" autoCorrect="off" value={a.instagram} onChange={(e) => set("instagram", e.target.value)} placeholder="@yourusername" />
                {err("instagram")}
              </div>
              <div className="hp" aria-hidden>
                <label htmlFor="company">Company</label>
                <input id="company" tabIndex={-1} autoComplete="off" value={company} onChange={(e) => setCompany(e.target.value)} />
              </div>
            </div>
          )}
        </div>

        {formError && <p className="err form-err" role="alert">{formError}</p>}

        {step >= 2 && (
          <button type="submit" className="btn-cta submit" disabled={status === "sending"}>
            {step === LAST ? (status === "sending" ? "Submitting…" : "Submit Application") : <>Continue <span aria-hidden>→</span></>}
          </button>
        )}
        {step === LAST && <p className="privacy">Your info stays private and is only used to contact you about coaching.</p>}
      </form>
      </div>
    </main>
  );
}
