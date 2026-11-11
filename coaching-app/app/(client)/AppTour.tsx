"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { markTourSeenAction } from "./daily-actions";

const STEPS = [
  { target: "today", title: "🏠 Today", text: "Your home base. Each day it shows your workout, your habits to tick off, and anything due, like a weigh-in or your check-in." },
  { target: "calendar", title: "📅 Calendar", text: "Your week at a glance: workout days, weigh-ins, progress photos, check-ins, habits and calls with Tyler." },
  { target: "training", title: "🏋️ Training", text: "Your program, one workout per day. Tap an exercise's “Watch demo” to see how it's done." },
  { target: "nutrition", title: "🍽️ Nutrition", text: "Your daily calorie and macro targets and your perfect day of eating, plus the app to track your calories in." },
  { target: "more", title: "☰ More", text: "Your check-ins and Tyler's replies, your progress (weight graph and photos), your meal library, Resources and Settings." },
] as const;

/**
 * A live tour of the tab bar, shown once after onboarding: dims the screen, highlights each tab with a short
 * explanation, then sends them to the READ FIRST guide in Resources.
 */
export default function AppTour({ guideHref }: { guideHref: string | null }) {
  const router = useRouter();
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [closed, setClosed] = useState(false);
  const step = STEPS[i];
  const last = i >= STEPS.length;

  useEffect(() => {
    if (last) return setRect(null);
    const find = () => setRect(document.querySelector(`[data-tour="${step.target}"]`)?.getBoundingClientRect() ?? null);
    find();
    window.addEventListener("resize", find);
    window.addEventListener("scroll", find, { passive: true });
    return () => {
      window.removeEventListener("resize", find);
      window.removeEventListener("scroll", find);
    };
  }, [i, last, step]);

  function finish(to?: string) {
    setClosed(true);
    markTourSeenAction().catch(() => {});
    if (to) router.push(to);
  }

  if (closed) return null;
  return (
    <div className="tour-layer" role="dialog" aria-modal="true" aria-label="App tour">
      {rect ? (
        <div className="tour-spot" style={{ left: rect.left - 4, top: rect.top - 4, width: rect.width + 8, height: rect.height + 8 }} />
      ) : (
        <div className="tour-dim" />
      )}
      <div className={`tour-card${last ? " tour-card-center" : ""}`}>
        {last ? (
          <>
            <p className="eyebrow" style={{ margin: "0 0 4px" }}>You're all set</p>
            <h2 className="h2" style={{ margin: "0 0 6px" }}>📚 Start here</h2>
            <p className="coming" style={{ margin: "0 0 14px" }}>
              Read Tyler's “How Your Coaching Works” guide next. It walks you through weigh-ins, progress photos and tracking. It's always in ☰ More → Resources.
            </p>
            <button type="button" className="btn btn-wide" onClick={() => finish(guideHref ?? "/resources")}>
              Open the guide →
            </button>
            <button type="button" className="btn-link small" style={{ display: "block", margin: "12px auto 0" }} onClick={() => finish()}>
              Later
            </button>
          </>
        ) : (
          <>
            <p className="eyebrow" style={{ margin: "0 0 4px" }}>
              App tour · {i + 1} of {STEPS.length}
            </p>
            <h2 className="h2" style={{ margin: "0 0 6px" }}>{step.title}</h2>
            <p className="coming" style={{ margin: "0 0 14px" }}>{step.text}</p>
            <div className="row" style={{ gap: 10 }}>
              {i === 0 ? (
                <button type="button" className="btn btn-ghost" onClick={() => finish()}>
                  Skip
                </button>
              ) : (
                <button type="button" className="btn btn-ghost" onClick={() => setI(i - 1)}>
                  Back
                </button>
              )}
              <button type="button" className="btn" style={{ flex: 1 }} onClick={() => setI(i + 1)}>
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
