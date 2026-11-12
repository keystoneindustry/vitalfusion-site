"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { markWinsSeenAction } from "./wins-actions";

type Win = { key: string; title: string; emoji: string };

/** Shown on Today when they've reached milestones they haven't seen yet. */
export default function WinsCelebration({ wins }: { wins: Win[] }) {
  const [hidden, setHidden] = useState(false);
  const [, start] = useTransition();
  if (hidden || wins.length === 0) return null;
  const shown = wins.slice(-3).reverse();
  const more = wins.length - shown.length;
  return (
    <section className="card win-card" aria-live="polite">
      <div className="win-burst" aria-hidden="true">🎉</div>
      <h2 className="h2" style={{ marginBottom: 6 }}>{wins.length === 1 ? "New win!" : `${wins.length} new wins!`}</h2>
      <ul className="win-list">
        {shown.map((w) => (
          <li key={w.key}>
            <span aria-hidden="true">{w.emoji}</span> {w.title}
          </li>
        ))}
        {more > 0 && <li className="muted small">+ {more} more</li>}
      </ul>
      <div className="row" style={{ marginTop: 12 }}>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => {
            setHidden(true);
            start(() => markWinsSeenAction());
          }}
        >
          Nice! 💪
        </button>
        <Link className="btn-link" href="/wins">
          See all your wins
        </Link>
      </div>
    </section>
  );
}
