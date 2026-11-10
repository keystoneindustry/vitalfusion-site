"use client";

import { useState, useTransition } from "react";
import { toggleHabitAction } from "./daily-actions";

export type HabitItem = { id: string; title: string; icon: string; description: string | null; done: boolean };

/** Tap-to-tick habits for one day. Updates instantly and saves in the background. */
export default function HabitChecklist({ date, items, editable = true }: { date: string; items: HabitItem[]; editable?: boolean }) {
  const [done, setDone] = useState<Record<string, boolean>>(() => Object.fromEntries(items.map((i) => [i.id, i.done])));
  const [, start] = useTransition();
  const [error, setError] = useState("");

  function toggle(id: string) {
    if (!editable) return;
    const next = !done[id];
    setDone({ ...done, [id]: next });
    setError("");
    start(async () => {
      const res = await toggleHabitAction(id, date, next);
      if (!res.ok) {
        setDone((d) => ({ ...d, [id]: !next }));
        setError("That didn't save. Try again.");
      }
    });
  }

  return (
    <>
      <ul className="habit-list">
        {items.map((h) => (
          <li key={h.id}>
            <button type="button" className={`habit-tick ${done[h.id] ? "on" : ""}`} aria-pressed={!!done[h.id]} onClick={() => toggle(h.id)} disabled={!editable}>
              <span className="tick-box" aria-hidden="true">
                {done[h.id] ? "✓" : ""}
              </span>
              <span className="habit-text">
                <b>
                  {h.icon} {h.title}
                </b>
                {h.description && <span className="muted small">{h.description}</span>}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {error && <p className="err">{error}</p>}
    </>
  );
}
