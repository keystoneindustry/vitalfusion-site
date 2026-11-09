"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { site } from "@/content/site";
import {
  ACTIVITY_LEVELS,
  GOALS,
  RULES,
  obstaclesFor,
  PACES,
  SEXES,
  TRYING_FOR,
  ageRangeFor,
  calculate,
  formatDate,
  goalDate,
  labelOf,
  REALITY_PUNCH,
  realityContext,
  tipsFor,
  validateQuiz,
  type MacroResults,
  type QuizErrors,
  type QuizInput,
} from "@/lib/macros";

// Hidden macro calculator (vitalfusioncoaching.com/macros). One question per
// screen; single-choice questions advance on tap. Name + email come last.

type Answers = {
  sex: string;
  age: string;
  heightFt: string;
  heightIn: string;
  weightLb: string;
  goalWeightLb: string;
  activity: string;
  goal: string;
  pace: string;
  tryingFor: string;
  obstacles: string[];
  name: string;
  email: string;
};

const EMPTY: Answers = {
  sex: "", age: "", heightFt: "", heightIn: "", weightLb: "", goalWeightLb: "",
  activity: "", goal: "", pace: "", tryingFor: "", obstacles: [],
  name: "", email: "",
};

type StepId = "sex" | "age" | "height" | "weight" | "goalWeight" | "activity" | "goal" | "pace" | "trying" | "obstacles" | "lead";

const FIELDS: Record<StepId, (keyof QuizInput)[]> = {
  sex: ["sex"],
  age: ["age"],
  height: ["heightFt"],
  weight: ["weightLb"],
  goalWeight: ["goalWeightLb"],
  activity: ["activity"],
  goal: ["goal"],
  pace: ["pace"],
  trying: ["tryingFor"],
  obstacles: ["obstacles"],
  lead: ["name", "email"],
};

const APPLY_SAVE_KEY = "vf-apply-progress"; // read by the application form

// Goal comes first; the rest of the path depends on it.
function stepsFor(goal: string): StepId[] {
  const s: StepId[] = ["goal"];
  if (goal === "lose") s.push("pace"); // speed question is only for fat loss
  s.push("sex", "age", "height", "weight");
  if (goal !== "maintain") s.push("goalWeight"); // maintain has no goal weight
  s.push("activity", "trying", "obstacles", "lead");
  return s;
}

const GOAL_WEIGHT_Q: Record<string, { q: string; hint: string; placeholder: string }> = {
  lose: { q: "What's your goal weight?", hint: "Your best guess is fine. I'll show you when you could hit it.", placeholder: "e.g. 170" },
  muscle: { q: "What weight do you want to build up to?", hint: "Your best guess is fine. I'll show you when you could hit it.", placeholder: "e.g. 190" },
};

const TRYING_Q: Record<string, string> = {
  lose: "How long have you been trying to lose the weight?",
  muscle: "How long have you been trying to build muscle?",
  maintain: "How long have you been working on your health and fitness?",
};

export default function MacroQuiz({ source }: { source: string }) {
  const q = site.macroQuiz;
  const [started, setStarted] = useState(false);
  const [a, setA] = useState<Answers>(EMPTY);
  const [idx, setIdx] = useState(0);
  const [errors, setErrors] = useState<QuizErrors>({});
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");
  const [emailFailed, setEmailFailed] = useState(false);
  const [result, setResult] = useState<{ input: QuizInput; r: MacroResults } | null>(null);
  const [company, setCompany] = useState(""); // honeypot
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  const steps = stepsFor(a.goal);
  const stepId = steps[Math.min(idx, steps.length - 1)];
  const isLast = stepId === "lead";

  const payload = (ans: Answers = a) => ({
    ...ans,
    goalWeightLb: ans.goal === "maintain" ? ans.weightLb : ans.goalWeightLb,
    source,
  });

  function scrollTop() {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function set<K extends keyof Answers>(k: K, v: Answers[K]) {
    setA((p) => ({ ...p, [k]: v }));
    setErrors({});
  }

  function stepErrors(ans: Answers, id: StepId): QuizErrors {
    const res = validateQuiz(payload(ans), FIELDS[id]);
    return res.ok ? {} : res.errors;
  }

  function goTo(n: number) {
    setErrors({});
    setIdx(n);
    scrollTop();
  }

  function next() {
    const errs = stepErrors(a, stepId);
    if (Object.keys(errs).length) return setErrors(errs);
    goTo(idx + 1);
  }

  function pick<K extends "sex" | "activity" | "goal" | "pace" | "tryingFor">(k: K, v: string) {
    const updated = { ...a, [k]: v };
    if (k === "goal") {
      if (v !== "lose") updated.pace = "";
      const ok = obstaclesFor(v).map((o) => o.value as string);
      updated.obstacles = updated.obstacles.filter((o) => ok.includes(o));
    }
    setA(updated);
    setErrors({});
    if (timer.current) clearTimeout(timer.current);
    // Steps can change when the goal changes (pace only for fat loss).
    const nextSteps = stepsFor(updated.goal);
    const here = nextSteps.indexOf(stepId);
    timer.current = setTimeout(() => goTo(here + 1), 260);
  }

  function toggleObstacle(v: string) {
    set("obstacles", a.obstacles.includes(v) ? a.obstacles.filter((x) => x !== v) : [...a.obstacles, v]);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!isLast) return next();
    const res = validateQuiz(payload());
    if (!res.ok) {
      const bad = steps.findIndex((id) => FIELDS[id].some((f) => res.errors[f]));
      setIdx(Math.max(0, bad));
      setErrors(res.errors);
      return;
    }
    const input = res.data;
    const r = calculate(input);
    setStatus("sending");
    try {
      const resp = await fetch("/api/macros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload(), company }),
      });
      if (resp.status === 422) {
        const json = await resp.json().catch(() => ({}));
        setErrors(json.errors ?? {});
        setStatus("idle");
        return;
      }
      const json = await resp.json().catch(() => ({}));
      setEmailFailed(!resp.ok || json.emailed === false);
    } catch {
      setEmailFailed(true);
    }
    // Results always show, even if the email couldn't be sent.
    setResult({ input, r });
    setStatus("done");
    window.scrollTo({ top: 0 });
  }

  function prefillApplication(input: QuizInput) {
    const helpAreas = new Set<string>(["diet"]);
    if (input.goal === "muscle" || input.obstacles.some((o) => o === "program" || o === "gym")) helpAreas.add("training");
    if (input.obstacles.some((o) => o === "accountability" || o === "consistency")) helpAreas.add("accountability");
    const ageRange = ageRangeFor(input.age);
    try {
      sessionStorage.setItem(
        APPLY_SAVE_KEY,
        JSON.stringify({
          a: {
            ageRange,
            helpAreas: [...helpAreas],
            fullName: input.name,
            email: input.email,
          },
          step: ageRange ? 1 : 0,
        }),
      );
    } catch {}
  }

  const err = (k: keyof QuizErrors) => (errors[k] ? <p className="err" role="alert">{errors[k]}</p> : null);

  /* ───────── Results ───────── */
  if (status === "done" && result) {
    const { input, r } = result;
    const first = input.name.split(/\s+/)[0];
    const paceLabel = labelOf(PACES, input.pace);
    const weekly = Math.abs(r.weeklyChangeLb);
    const tips = tipsFor(input.obstacles);
    const date = r.weeksToGoal ? formatDate(goalDate(r.weeksToGoal)) : null;
    const months = r.weeksToGoal ? Math.round(r.weeksToGoal / 4.345) : 0;
    const goalLine =
      input.goal === "lose"
        ? r.minorAtMaintenance
          ? "Maintenance calories + high protein"
          : `${paceLabel} fat loss · about ${weekly.toFixed(1)} lb a week`
        : input.goal === "muscle"
          ? `Build muscle · ${RULES.muscleSurplus} calories above maintenance`
          : "Maintain your weight · maintenance calories";
    const total = r.protein * 4 + r.carbs * 4 + r.fat * 9;
    const pct = (g: number, cal: number) => Math.round(((g * cal) / total) * 100);

    return (
      <main className="wrap macros" ref={topRef}>
        <p className="pill">✓ Your plan is ready</p>
        <h1 className="title">{first}, here are your numbers</h1>

        <section className="m-cal">
          <p className="m-cal-label">Eat about</p>
          <p className="m-cal-num">{r.calories.toLocaleString()}</p>
          <p className="m-cal-unit">calories a day</p>
          <p className="m-cal-goal">{goalLine}</p>
        </section>

        <div className="m-macros">
          <div className="m-macro"><span className="m-g">{r.protein}g</span><span className="m-name">Protein</span></div>
          <div className="m-macro"><span className="m-g">{r.carbs}g</span><span className="m-name">Carbs</span></div>
          <div className="m-macro"><span className="m-g">{r.fat}g</span><span className="m-name">Fat</span></div>
        </div>
        <div className="m-bar" aria-hidden>
          <span className="m-bar-p" style={{ width: `${pct(r.protein, 4)}%` }} />
          <span className="m-bar-c" style={{ width: `${pct(r.carbs, 4)}%` }} />
          <span className="m-bar-f" style={{ width: `${pct(r.fat, 9)}%` }} />
        </div>
        <p className="m-fine">
          Plus <strong>{r.fiber}g+ of fiber</strong> a day. Your maintenance is about {r.maintenance.toLocaleString()} calories.
        </p>

        {r.minorAtMaintenance && (
          <p className="m-note">Because you&apos;re under 18, I&apos;ve kept you at maintenance calories. Your body is still growing, so focus on protein, training and healthy habits instead of dieting.</p>
        )}
        {r.floorApplied && (
          <p className="m-note">Your target is set at a safe minimum, so progress will be gradual. Adding daily walks or workouts is the best way to speed it up.</p>
        )}

        {date && (
          <section className="m-date">
            <p className="m-date-label">At this pace, you could reach</p>
            <p className="m-date-big">{input.goalWeightLb} lbs by {date}</p>
            <p className="m-fine">
              That&apos;s about {r.weeksToGoal} weeks{months >= 3 ? ` (around ${months} months)` : ""}. It&apos;s an estimate: progress is never a straight line, but consistency gets you there.
            </p>
          </section>
        )}

        {tips.length > 0 && (
          <section className="m-section">
            <h2 className="m-h2">Based on what gets in your way</h2>
            <div className="m-tips">
              {tips.map((t) => (
                <div key={t.label} className="m-tip">
                  <p className="m-tip-label">{t.label}</p>
                  <p>{t.tip}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="m-section">
          <h2 className="m-h2">{q.mealsTitle[input.goal]}</h2>
          <p className="m-sub">{q.mealsSub}</p>
          <div className="m-meals">
            {q.meals.map((m, i) => (
              <article key={m.name} className="m-meal">
                <p className="m-meal-num">Meal {i + 1}</p>
                <h3>{m.name}</h3>
                {"detail" in m && m.detail && <p className="m-meal-detail">{m.detail}</p>}
                <ul>
                  {m.why[input.goal].map((w) => (
                    <li key={w}>✓ {w}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="m-bridge">
          <div className="m-reality">
            {realityContext(input) && <p className="m-reality-context">{realityContext(input)}</p>}
            <p className="m-reality-punch">{REALITY_PUNCH}</p>
          </div>
          <h2 className="m-h2">{q.bridgeTitle}</h2>
          <p>{q.bridge}</p>
          <figure className="m-client">
            <p className="m-client-label">{q.clientExample.label}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={q.clientExample.image} alt={`Weigh-in chart: ${q.clientExample.headline}`} loading="lazy" />
            <figcaption>
              <strong>{q.clientExample.headline}</strong>
              <span>{q.clientExample.text}</span>
            </figcaption>
          </figure>
          <Link href="/apply?source=macro-quiz" className="btn btn-wide" onClick={() => prefillApplication(input)}>
            {q.bridgeButton}
          </Link>
          <p className="m-vary">{q.resultsVary}</p>
        </section>

        <p className="m-emailed">
          {emailFailed
            ? "We couldn't email your results right now. Screenshot this page so you have them."
            : `📩 I also emailed a copy to ${input.email}.`}
        </p>
        <p className="m-disclaimer">{q.disclaimer}</p>
      </main>
    );
  }

  /* ───────── Intro ───────── */
  if (!started) {
    return (
      <main className="wrap macros macros-intro">
        <p className="pill">{site.brand}</p>
        <h1 className="display">{q.title}</h1>
        <p className="lead">{q.intro}</p>
        <button type="button" className="btn btn-wide btn-big" onClick={() => setStarted(true)}>
          {q.startButton}
        </button>
        <p className="hero-note">{q.note}</p>
      </main>
    );
  }

  /* ───────── Quiz ───────── */
  const pctDone = Math.round(((idx + 1) / steps.length) * 100);
  const choice = (k: "sex" | "activity" | "goal" | "pace" | "tryingFor", list: readonly { value: string; label: string; detail?: string; badge?: string }[]) => (
    <div className="choices">
      {list.map((o) => (
        <button
          type="button"
          key={o.value}
          className={`choice ${o.detail ? "long" : ""} ${a[k] === o.value ? "on" : ""}`}
          aria-pressed={a[k] === o.value}
          onClick={() => pick(k, o.value)}
        >
          <span className="choice-text">
            <span className="choice-title">
              {o.label}
              {o.badge && <span className="badge">{o.badge}</span>}
            </span>
            {o.detail && <span className="choice-detail">{o.detail}</span>}
          </span>
        </button>
      ))}
    </div>
  );

  return (
    <main className="wrap apply macros">
      <div ref={topRef} />
      <header className="apply-head">
        <h1 className="apply-title">{q.title}</h1>
      </header>
      <div className="progress" aria-hidden>
        <div className="progress-bar" style={{ width: `${pctDone}%` }} />
      </div>
      <div className="progress-row">
        {idx > 0 ? (
          <button type="button" className="back" onClick={() => goTo(idx - 1)}>← Back</button>
        ) : (
          <span />
        )}
        <span className="progress-label">Question {idx + 1} of {steps.length}</span>
      </div>

      <form onSubmit={submit} noValidate className="step-form">
        <div className="step" key={stepId}>
          {stepId === "sex" && (
            <fieldset>
              <legend className="q">What&apos;s your sex?</legend>
              <p className="hint">Used for the calorie formula.</p>
              {choice("sex", SEXES)}
              {err("sex")}
            </fieldset>
          )}

          {stepId === "age" && (
            <div>
              <label htmlFor="age" className="q">How old are you?</label>
              <input id="age" inputMode="numeric" pattern="[0-9]*" autoFocus placeholder="e.g. 30" value={a.age} onChange={(e) => set("age", e.target.value.replace(/\D/g, "").slice(0, 3))} />
              {err("age")}
            </div>
          )}

          {stepId === "height" && (
            <div>
              <p className="q">How tall are you?</p>
              <div className="pair">
                <div className="unit-input">
                  <input id="heightFt" aria-label="Feet" inputMode="numeric" pattern="[0-9]*" autoFocus placeholder="5" value={a.heightFt} onChange={(e) => set("heightFt", e.target.value.replace(/\D/g, "").slice(0, 1))} />
                  <span>ft</span>
                </div>
                <div className="unit-input">
                  <input id="heightIn" aria-label="Inches" inputMode="decimal" placeholder="10" value={a.heightIn} onChange={(e) => set("heightIn", e.target.value.replace(/[^\d.]/g, "").slice(0, 4))} />
                  <span>in</span>
                </div>
              </div>
              {err("heightFt")}
            </div>
          )}

          {stepId === "weight" && (
            <div>
              <label htmlFor="weightLb" className="q">What do you weigh right now?</label>
              <div className="unit-input">
                <input id="weightLb" inputMode="decimal" autoFocus placeholder="e.g. 185" value={a.weightLb} onChange={(e) => set("weightLb", e.target.value.replace(/[^\d.]/g, "").slice(0, 5))} />
                <span>lbs</span>
              </div>
              {err("weightLb")}
            </div>
          )}

          {stepId === "goalWeight" && (
            <div>
              <label htmlFor="goalWeightLb" className="q">{(GOAL_WEIGHT_Q[a.goal] ?? GOAL_WEIGHT_Q.lose).q}</label>
              <p className="hint">{(GOAL_WEIGHT_Q[a.goal] ?? GOAL_WEIGHT_Q.lose).hint}</p>
              <div className="unit-input">
                <input id="goalWeightLb" inputMode="decimal" autoFocus placeholder={(GOAL_WEIGHT_Q[a.goal] ?? GOAL_WEIGHT_Q.lose).placeholder} value={a.goalWeightLb} onChange={(e) => set("goalWeightLb", e.target.value.replace(/[^\d.]/g, "").slice(0, 5))} />
                <span>lbs</span>
              </div>
              {err("goalWeightLb")}
            </div>
          )}

          {stepId === "activity" && (
            <fieldset>
              <legend className="q">How active are you?</legend>
              {choice("activity", ACTIVITY_LEVELS)}
              {err("activity")}
            </fieldset>
          )}

          {stepId === "goal" && (
            <fieldset>
              <legend className="q">What&apos;s your main goal?</legend>
              {choice("goal", GOALS)}
              {err("goal")}
            </fieldset>
          )}

          {stepId === "pace" && (
            <fieldset>
              <legend className="q">How fast do you want to lose it?</legend>
              {choice("pace", PACES)}
              {err("pace")}
            </fieldset>
          )}

          {stepId === "trying" && (
            <fieldset>
              <legend className="q">{TRYING_Q[a.goal] ?? TRYING_Q.lose}</legend>
              {choice("tryingFor", TRYING_FOR)}
              {err("tryingFor")}
            </fieldset>
          )}

          {stepId === "obstacles" && (
            <fieldset>
              <legend className="q">What usually gets in the way?</legend>
              <p className="hint">Select all that apply</p>
              <div className="choices">
                {obstaclesFor(a.goal).map((o) => {
                  const on = a.obstacles.includes(o.value);
                  return (
                    <button type="button" key={o.value} className={`choice multi ${on ? "on" : ""}`} aria-pressed={on} onClick={() => toggleObstacle(o.value)}>
                      <span className="tick" aria-hidden>{on ? "✓" : ""}</span>
                      {o.label}
                    </button>
                  );
                })}
              </div>
              {err("obstacles")}
            </fieldset>
          )}

          {stepId === "lead" && (
            <div>
              <p className="q">{q.leadTitle}</p>
              <p className="hint">{q.leadNote}</p>
              <div className="field">
                <label htmlFor="name">First & last name</label>
                <input id="name" autoComplete="name" value={a.name} onChange={(e) => set("name", e.target.value)} placeholder="John Doe" />
                {err("name")}
              </div>
              <div className="field">
                <label htmlFor="email">Email</label>
                <input id="email" type="email" autoComplete="email" inputMode="email" value={a.email} onChange={(e) => set("email", e.target.value)} placeholder="john@example.com" />
                {err("email")}
              </div>
              <div className="hp" aria-hidden>
                <label htmlFor="company">Company</label>
                <input id="company" tabIndex={-1} autoComplete="off" value={company} onChange={(e) => setCompany(e.target.value)} />
              </div>
            </div>
          )}
        </div>

        {["age", "height", "weight", "goalWeight", "obstacles", "lead"].includes(stepId) && (
          <button type="submit" className="btn submit" disabled={status === "sending"}>
            {isLast ? (status === "sending" ? "Calculating…" : q.resultsButton) : "Continue →"}
          </button>
        )}
        {isLast && <p className="privacy">No spam. Your info stays private.</p>}
      </form>
    </main>
  );
}
