"use client";

import { useState } from "react";
import { WEEKDAYS } from "@/lib/calendar";
import SubmitButton from "@/app/components/SubmitButton";

type Option = { value: string; label: string };

/** One form for everything that goes on a client's calendar: pick what, then the days (or one date). */
export default function AddToCalendar({
  action,
  month,
  today,
  workouts,
  forms,
  habits,
}: {
  action: (form: FormData) => Promise<void>;
  month: string;
  today: string;
  workouts: Option[];
  forms: Option[];
  habits: Option[];
}) {
  const [what, setWhat] = useState(workouts[0]?.value ?? "weigh_in");
  const [mode, setMode] = useState<"repeat" | "once">("repeat");
  const isHabit = what.startsWith("habit:");
  const showOnce = !isHabit && mode === "once";

  return (
    <form action={action}>
      <input type="hidden" name="m" value={month} />
      <input type="hidden" name="mode" value={showOnce ? "once" : "repeat"} />
      <div className="field">
        <label htmlFor="cal-what">What</label>
        <select id="cal-what" name="what" value={what} onChange={(e: { target: { value: string } }) => setWhat(e.target.value)}>
          {workouts.length > 0 && (
            <optgroup label="Workouts">
              {workouts.map((o) => (
                <option key={o.value} value={o.value}>
                  🏋️ {o.label}
                </option>
              ))}
            </optgroup>
          )}
          <optgroup label="Progress">
            <option value="weigh_in">⚖️ Weigh-in</option>
            <option value="photos">📸 Progress photos</option>
          </optgroup>
          {forms.length > 0 && (
            <optgroup label="Check-ins & forms">
              {forms.map((o) => (
                <option key={o.value} value={o.value}>
                  📝 {o.label}
                </option>
              ))}
            </optgroup>
          )}
          {habits.length > 0 && (
            <optgroup label="Habits">
              {habits.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </div>

      {!isHabit && (
        <div className="seg seg-sm" role="group" aria-label="How often">
          <button type="button" aria-pressed={mode === "repeat"} onClick={() => setMode("repeat")}>
            Repeat weekly
          </button>
          <button type="button" aria-pressed={mode === "once"} onClick={() => setMode("once")}>
            Just once
          </button>
        </div>
      )}

      {showOnce ? (
        <div className="field">
          <label htmlFor="cal-once">Date</label>
          <input id="cal-once" type="date" name="once" min={today} defaultValue={today} />
        </div>
      ) : (
        <div className="field">
          <label>On</label>
          <div className="chips">
            {WEEKDAYS.map((d, i) => (
              <label key={d} className="chip chip-check">
                <input type="checkbox" name="days" value={i} />
                {d}
              </label>
            ))}
          </div>
          {!isHabit && (
            <select name="every" defaultValue="1" style={{ marginTop: 8 }}>
              <option value="1">Every week</option>
              <option value="2">Every 2 weeks</option>
              <option value="4">Every 4 weeks</option>
            </select>
          )}
        </div>
      )}

      {isHabit && (
        <div className="field">
          <label htmlFor="cal-title">Their version (optional)</label>
          <input id="cal-title" name="customTitle" maxLength={80} placeholder="e.g. Walk 9,000 steps" />
        </div>
      )}
      <SubmitButton className="btn btn-sm" label="Add to calendar" pendingLabel="Adding…" />
    </form>
  );
}
