"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";

type Screen = { image: string; title: string; text: string };

// Swipeable phone showing the coaching app, one feature per screen.
// The caption under the phone changes as you swipe; dots and arrows jump between screens.
export default function AppTour({ screens }: { screens: Screen[] }) {
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const onScroll = () => {
      const i = Math.round(el.scrollLeft / el.clientWidth);
      setActive(Math.max(0, Math.min(screens.length - 1, i)));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [screens.length]);

  function go(i: number) {
    const el = track.current;
    if (!el) return;
    const n = (i + screens.length) % screens.length;
    el.scrollTo({ left: n * el.clientWidth, behavior: "smooth" });
  }

  const s = screens[active];

  return (
    <div className="tour">
      <div className="tour-stage">
        <button type="button" className="tour-arrow prev" onClick={() => go(active - 1)} aria-label="Previous screen">‹</button>
        <div className="phone">
          <div className="tour-track" ref={track}>
            {screens.map((sc, i) => (
              <img key={sc.image} src={sc.image} alt={sc.title} loading={i === 0 ? "eager" : "lazy"} />
            ))}
          </div>
        </div>
        <button type="button" className="tour-arrow next" onClick={() => go(active + 1)} aria-label="Next screen">›</button>
      </div>
      <div className="tour-caption" aria-live="polite">
        <p className="tour-count">{active + 1} / {screens.length}</p>
        <h3>{s.title}</h3>
        <p>{s.text}</p>
      </div>
      <div className="tour-dots">
        {screens.map((sc, i) => (
          <button
            key={sc.image}
            type="button"
            className={i === active ? "on" : ""}
            onClick={() => go(i)}
            aria-label={`Show ${sc.title}`}
          />
        ))}
      </div>
      <p className="tour-hint" aria-hidden>Swipe to see more →</p>
    </div>
  );
}
