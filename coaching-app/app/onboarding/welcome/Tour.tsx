"use client";

import { useState } from "react";
import { finishStep } from "../actions";
import SubmitButton from "@/app/components/SubmitButton";

const SLIDES = [
  { icon: "🏠", title: "Today", text: "Your daily targets, habits, today's workout and anything that's due. Open the app and you'll know exactly what to do." },
  { icon: "📅", title: "Calendar", text: "Everything Tyler schedules for you: weekly check-ins, weigh-ins, progress pictures, habits and calls." },
  { icon: "🏋️", title: "Training", text: "Your workouts with sets, reps, rest and a demo video for every exercise. Log your weights as you go." },
  { icon: "🍽️", title: "Nutrition", text: "Your daily targets, your perfect day and a meal library built around foods you like. Your food log lives here until your plan is ready." },
  { icon: "☰", title: "More", text: "Your progress (weight trend, progress pictures, habit streaks), your food log, videos and documents from Tyler, and settings." },
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
