"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { markFeatureTourSeenAction } from "./daily-actions";

export type TourStep = {
  /** CSS selector of the thing to highlight (the first match). Steps whose target isn't on the page are skipped. */
  target: string;
  title: string;
  text: string;
};

/**
 * A short guided tour of one tab (Nutrition or Training), shown once the first time they open it after
 * Tyler publishes that part of their plan. Dims the page and highlights each part with a short note.
 */
export default function FeatureTour({
  tour,
  label,
  steps,
  finish,
}: {
  tour: "nutrition" | "training";
  label: string;
  steps: TourStep[];
  /** The last card: a closing note. */
  finish: { title: string; text: string };
}) {
  const [list, setList] = useState<TourStep[]>([]);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const [closed, setClosed] = useState(false);
  const [ready, setReady] = useState(false);

  // Only the steps whose target is on this page.
  useEffect(() => {
    setList(steps.filter((s) => document.querySelector(s.target)));
    setReady(true);
  }, [steps]);

  const step = list[i];
  const last = ready && i >= list.length;

  useLayoutEffect(() => {
    if (!step) return setRect(null);
    const el = document.querySelector(step.target) as HTMLElement | null;
    if (!el) return setRect(null);
    const inTabBar = !!el.closest(".tabbar");
    if (!inTabBar) {
      // Bring it near the top of the screen, clear of the card at the bottom.
      const y = el.getBoundingClientRect().top + window.scrollY - 70;
      window.scrollTo({ top: Math.max(0, y), behavior: "auto" });
    }
    const measure = () => {
      const r = el.getBoundingClientRect();
      const maxH = Math.max(80, window.innerHeight * 0.48);
      setRect({ left: r.left, top: r.top, width: r.width, height: inTabBar ? r.height : Math.min(r.height, maxH) });
    };
    measure();
    const t = setTimeout(measure, 120);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true });
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
    };
  }, [step]);

  function done() {
    setClosed(true);
    window.scrollTo({ top: 0 });
    markFeatureTourSeenAction(tour).catch(() => {});
  }

  if (closed || !ready) return null;
  return (
    <div className="tour-layer" role="dialog" aria-modal="true" aria-label={label}>
      {rect && !last ? (
        <div className="tour-spot" style={{ left: rect.left - 4, top: rect.top - 4, width: rect.width + 8, height: rect.height + 8 }} />
      ) : (
        <div className="tour-dim" />
      )}
      <div className={`tour-card${last ? " tour-card-center" : ""}`}>
        {last ? (
          <>
            <p className="eyebrow" style={{ margin: "0 0 4px" }}>That's the tour</p>
            <h2 className="h2" style={{ margin: "0 0 6px" }}>{finish.title}</h2>
            <p className="coming" style={{ margin: "0 0 14px" }}>{finish.text}</p>
            <button type="button" className="btn btn-wide" onClick={done}>
              Got it
            </button>
          </>
        ) : (
          <>
            <p className="eyebrow" style={{ margin: "0 0 4px" }}>
              {label} · {i + 1} of {list.length}
            </p>
            <h2 className="h2" style={{ margin: "0 0 6px" }}>{step.title}</h2>
            <p className="coming" style={{ margin: "0 0 14px" }}>{step.text}</p>
            <div className="row" style={{ gap: 10 }}>
              {i === 0 ? (
                <button type="button" className="btn btn-ghost" onClick={done}>
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
