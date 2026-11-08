"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import {
  AGE_RANGES,
  FITNESS_LEVELS,
  HELP_AREAS,
  type FieldErrors,
} from "@/lib/application";

type Status = "idle" | "sending" | "done";

export default function ApplyForm({ source }: { source: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      ageRange: fd.get("ageRange"),
      fitnessLevel: fd.get("fitnessLevel"),
      helpAreas: fd.getAll("helpAreas"),
      goal: fd.get("goal"),
      whyNow: fd.get("whyNow"),
      fullName: fd.get("fullName"),
      email: fd.get("email"),
      phone: fd.get("phone"),
      instagram: fd.get("instagram"),
      company: fd.get("company"), // honeypot
      source,
    };

    setStatus("sending");
    setFormError("");
    try {
      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setStatus("done");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      setErrors(json.errors ?? {});
      setFormError(json.error ?? "Something went wrong. Please try again.");
      setStatus("idle");
      const firstBad = Object.keys(json.errors ?? {})[0];
      if (firstBad) document.getElementById(`q-${firstBad}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch {
      setFormError("Couldn't reach the server. Check your connection and try again.");
      setStatus("idle");
    }
  }

  if (status === "done") {
    return (
      <main className="wrap center">
        <div className="check" aria-hidden>✓</div>
        <h1 className="title">Application Submitted!</h1>
        <div className="card">
          <p className="thanks">
            Thank you for applying. We&apos;ll review your information and see if one-on-one coaching
            is the right fit for your goals. We&apos;ll reach out soon to schedule your consultation call.
          </p>
        </div>
        <Link href="/" className="btn">← Back to Home</Link>
      </main>
    );
  }

  const err = (k: keyof FieldErrors) =>
    errors[k] ? <p className="err" role="alert">{errors[k]}</p> : null;

  return (
    <main className="wrap">
      <header className="hero">
        <h1 className="title">Apply for Coaching</h1>
        <p className="sub">Take the first step towards your transformation</p>
      </header>

      <form onSubmit={onSubmit} noValidate>
        <fieldset className="card" id="q-ageRange">
          <legend>What is your age range? <span className="req">*</span></legend>
          {AGE_RANGES.map((a) => (
            <label key={a} className="opt">
              <input type="radio" name="ageRange" value={a} required />
              <span>{a}</span>
            </label>
          ))}
          {err("ageRange")}
        </fieldset>

        <fieldset className="card" id="q-fitnessLevel">
          <legend>What best describes your current level of fitness? <span className="req">*</span></legend>
          {FITNESS_LEVELS.map((l) => (
            <label key={l.value} className="opt boxed">
              <input type="radio" name="fitnessLevel" value={l.value} required />
              <span>{l.label}</span>
            </label>
          ))}
          {err("fitnessLevel")}
        </fieldset>

        <fieldset className="card" id="q-helpAreas">
          <legend>What areas do you feel you need the most help with? <span className="req">*</span></legend>
          <p className="hint">Select all that apply</p>
          {HELP_AREAS.map((h) => (
            <label key={h.value} className="opt">
              <input type="checkbox" name="helpAreas" value={h.value} />
              <span>{h.label}</span>
            </label>
          ))}
          {err("helpAreas")}
        </fieldset>

        <div className="card" id="q-goal">
          <label htmlFor="goal" className="q">
            Fast-forward six to 12 months. What do you want to be able to say you achieved with your own
            fitness? <span className="req">*</span>
          </label>
          <textarea id="goal" name="goal" rows={5} maxLength={2000} placeholder="Describe your ideal outcome..." required />
          {err("goal")}
        </div>

        <div className="card" id="q-whyNow">
          <label htmlFor="whyNow" className="q">
            Why is now the right time for you to focus on this? <span className="req">*</span>
          </label>
          <textarea id="whyNow" name="whyNow" rows={5} maxLength={2000} placeholder="What's motivating you to start now..." required />
          {err("whyNow")}
        </div>

        <div className="card">
          <h2 className="section">Contact Information</h2>

          <div className="field" id="q-fullName">
            <label htmlFor="fullName">Full Name <span className="req">*</span></label>
            <input id="fullName" name="fullName" autoComplete="name" placeholder="John Doe" required />
            {err("fullName")}
          </div>

          <div className="field" id="q-email">
            <label htmlFor="email">Email Address <span className="req">*</span></label>
            <input id="email" name="email" type="email" autoComplete="email" inputMode="email" placeholder="john@example.com" required />
            {err("email")}
          </div>

          <div className="field" id="q-phone">
            <label htmlFor="phone">Phone Number <span className="req">*</span></label>
            <input id="phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" placeholder="+1 (555) 123-4567" required />
            {err("phone")}
          </div>

          <div className="field" id="q-instagram">
            <label htmlFor="instagram">Instagram Handle <span className="muted">(Optional)</span></label>
            <input id="instagram" name="instagram" autoCapitalize="none" autoCorrect="off" placeholder="@yourusername" />
            {err("instagram")}
          </div>

          {/* Honeypot — hidden from people, tempting to bots */}
          <div className="hp" aria-hidden>
            <label htmlFor="company">Company</label>
            <input id="company" name="company" tabIndex={-1} autoComplete="off" />
          </div>
        </div>

        {formError && <p className="err form-err" role="alert">{formError}</p>}

        <button type="submit" className="btn submit" disabled={status === "sending"}>
          {status === "sending" ? "Submitting…" : "Submit Application"}
        </button>
      </form>
    </main>
  );
}
