"use client";

import { useState } from "react";
import { finishStep } from "../actions";
import SubmitButton from "@/app/components/SubmitButton";

const SLIDES = [
  { icon: "🏠", title: "Today", text: "Today's workout, your habits to tick off, and anything due, like a weigh-in or your check-in. Open the app and you'll know exactly what to do." },
  { icon: "📅", title: "Calendar", text: "Your week at a glance: workout days, weigh-ins, progress photos, check-ins, habits and calls with Tyler." },
  { icon: "🏋️", title: "Training", text: "Your program, one workout per day, with sets, reps and rest for every exercise. Tap a workout on Today to open it." },
  { icon: "🍽️", title: "Nutrition", text: "Your daily targets, your perfect day and a meal library built around foods you like. Your food log lives here until your plan is ready." },
  { icon: "📝", title: "Weekly check-in", text: "Once a week, on the day you pick, take your progress photos and answer a short check-in. Tyler replies in the app, and you can book an optional 1-on-1 call." },
  { icon: "☰", title: "More", text: "Your progress (weight graph and photos), past check-ins and Tyler's replies, your food log, videos and guides from Tyler, and settings." },
];

/** A short swipe-through tour of the tabs. */
export default function Tour() {
  const [i, setI] = useState(0);
  const last = i === SLIDES.length - 1;
  const s = SLIDES[i];

  return (
    <section className="card card-accent">
      <p className="eyebrow">
        App tour · {i + 1} of {SLIDES.length}
      </p>
      <div className="tour-slide" key={s.title}>
        <div className="tour-icon" aria-hidden="true">
          {s.icon}
        </div>
        <h2 className="h2" style={{ marginBottom: 6 }}>
          {s.title}
        </h2>
        <p className="coming" style={{ margin: 0 }}>
          {s.text}
        </p>
      </div>
      <div className="dots" aria-hidden="true">
        {SLIDES.map((x, n) => (
          <span key={x.title} className={n === i ? "on" : ""} />
        ))}
      </div>
      {last ? (
        <form action={finishStep}>
          <input type="hidden" name="step" value="welcome" />
          <SubmitButton label="Let's set up your app →" pendingLabel="One moment…" />
        </form>
      ) : (
        <div className="row" style={{ gap: 10 }}>
          {i > 0 && (
            <button type="button" className="btn btn-ghost" onClick={() => setI(i - 1)}>
              Back
            </button>
          )}
          <button type="button" className="btn" style={{ flex: 1 }} onClick={() => setI(i + 1)}>
            Next
          </button>
        </div>
      )}
    </section>
  );
}
