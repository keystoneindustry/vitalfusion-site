"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Exercise, Training, TrainingDay } from "@/lib/plan";
import type { Answers } from "@/lib/onboarding-questions";
import { estimateMinutes, trainingWarnings } from "@/lib/training-brief";
import { EXERCISES } from "@/lib/suggestions";

type Result = { ok: true; message: string } | { ok: false; error: string };

const BLANK_EXERCISE: Exercise = { name: "", sets: "3", reps: "8–12", rest: "90 sec", notes: "" };

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const copy = [...list];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

type Ev = { target: { value: string } };

/** The coach's workout builder: days, exercises, and the program's notes. Saves everything at once. */
export default function TrainingBuilder({
  initial,
  answers,
  save,
}: {
  initial: Training;
  answers: Answers;
  save: (payload: string) => Promise<Result>;
}) {
  const router = useRouter();
  const [t, setT] = useState<Training>(initial);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<Result | null>(null);
  const [pending, start] = useTransition();

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function change(next: Training) {
    setT(next);
    setDirty(true);
    setStatus(null);
  }
  const setDays = (days: TrainingDay[]) => change({ ...t, days });
  const setDay = (i: number, day: TrainingDay) => setDays(t.days.map((d, k) => (k === i ? day : d)));
  const setEx = (i: number, j: number, patch: Partial<Exercise>) =>
    setDay(i, { ...t.days[i], exercises: t.days[i].exercises.map((e, k) => (k === j ? { ...e, ...patch } : e)) });

  function onSave() {
    for (const [i, d] of t.days.entries()) {
      if (!d.exercises.some((e) => e.name.trim())) return setStatus({ ok: false, error: `${d.name || `Day ${i + 1}`} needs at least one exercise (or remove the day).` });
    }
    const clean: Training = {
      ...t,
      days: t.days.map((d) => ({ ...d, exercises: d.exercises.filter((e) => e.name.trim()) })),
    };
    start(async () => {
      const res = await save(JSON.stringify(clean));
      setStatus(res);
      if (res.ok) {
        setDirty(false);
        router.refresh();
      }
    });
  }

  const warnings = trainingWarnings(t, answers);

  return (
    <div className="builder">
      <datalist id="exercise-names">
        {EXERCISES.map((e) => (
          <option key={e} value={e} />
        ))}
      </datalist>

      {t.days.length === 0 && <p className="muted">No training days yet. Add the first one below.</p>}

      {t.days.map((d, i) => (
        <div key={i} className="builder-card">
          <div className="builder-head">
            <span className="builder-num">{i + 1}</span>
            <input aria-label="Day name" className="builder-title" value={d.name} placeholder={`Day ${i + 1} – Upper`} onChange={(e: Ev) => setDay(i, { ...d, name: e.target.value })} />
          </div>
          <input aria-label="Focus" className="input-sm" value={d.focus} placeholder="Focus, e.g. Upper body strength" onChange={(e: Ev) => setDay(i, { ...d, focus: e.target.value })} />

          <ol className="ex-rows">
            {d.exercises.map((e, j) => (
              <li key={j} className="ex-row">
                <div className="ex-top">
                  <input
                    aria-label="Exercise"
                    list="exercise-names"
                    value={e.name}
                    placeholder="Exercise"
                    onChange={(ev: Ev) => setEx(i, j, { name: ev.target.value })}
                  />
                  <div className="icon-btns">
                    <button type="button" aria-label="Move up" onClick={() => setDay(i, { ...d, exercises: move(d.exercises, j, j - 1) })} disabled={j === 0}>
                      ↑
                    </button>
                    <button type="button" aria-label="Move down" onClick={() => setDay(i, { ...d, exercises: move(d.exercises, j, j + 1) })} disabled={j === d.exercises.length - 1}>
                      ↓
                    </button>
                    <button type="button" aria-label="Remove exercise" onClick={() => setDay(i, { ...d, exercises: d.exercises.filter((_, k) => k !== j) })}>
                      ✕
                    </button>
                  </div>
                </div>
                <div className="ex-grid">
                  <label>
                    Sets
                    <input value={e.sets} inputMode="numeric" onChange={(ev: Ev) => setEx(i, j, { sets: ev.target.value })} />
                  </label>
                  <label>
                    Reps
                    <input value={e.reps} onChange={(ev: Ev) => setEx(i, j, { reps: ev.target.value })} />
                  </label>
                  <label>
                    Rest
                    <input value={e.rest} onChange={(ev: Ev) => setEx(i, j, { rest: ev.target.value })} />
                  </label>
                </div>
                <input aria-label="Coaching note" className="input-sm" value={e.notes} placeholder="Coaching cue or swap (optional)" onChange={(ev: Ev) => setEx(i, j, { notes: ev.target.value })} />
              </li>
            ))}
          </ol>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDay(i, { ...d, exercises: [...d.exercises, { ...BLANK_EXERCISE }] })}>
            + Add exercise
          </button>
          <div className="builder-foot">
            <span className="muted small">≈ {estimateMinutes(d)} min</span>
            <div className="icon-btns">
              <button type="button" onClick={() => setDays(move(t.days, i, i - 1))} disabled={i === 0} aria-label="Move day up">
                ↑
              </button>
              <button type="button" onClick={() => setDays(move(t.days, i, i + 1))} disabled={i === t.days.length - 1} aria-label="Move day down">
                ↓
              </button>
              <button
                type="button"
                onClick={() => setDays([...t.days.slice(0, i + 1), { ...d, name: `${d.name} (copy)`, exercises: d.exercises.map((e) => ({ ...e })) }, ...t.days.slice(i + 1)])}
              >
                Copy
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Remove ${d.name || "this day"}?`)) setDays(t.days.filter((_, k) => k !== i));
                }}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        className="btn btn-ghost btn-wide"
        onClick={() => setDays([...t.days, { name: `Day ${t.days.length + 1}`, focus: "", exercises: [{ ...BLANK_EXERCISE }] }])}
        disabled={t.days.length >= 7}
      >
        + Add training day
      </button>

      <div className="spacer" />
      <div className="field">
        <label htmlFor="tb-overview">Overview (what {"they'll"} read first)</label>
        <textarea id="tb-overview" rows={3} value={t.overview} onChange={(e: Ev) => change({ ...t, overview: e.target.value })} />
      </div>
      <div className="field">
        <label htmlFor="tb-warmup">Warm-up</label>
        <textarea id="tb-warmup" rows={2} value={t.warmup} onChange={(e: Ev) => change({ ...t, warmup: e.target.value })} />
      </div>
      <div className="field">
        <label htmlFor="tb-prog">How to progress</label>
        <textarea id="tb-prog" rows={2} value={t.progression} onChange={(e: Ev) => change({ ...t, progression: e.target.value })} />
      </div>
      <div className="field">
        <label htmlFor="tb-notes">Other notes (steps, cardio, recovery)</label>
        <textarea id="tb-notes" rows={2} value={t.notes} onChange={(e: Ev) => change({ ...t, notes: e.target.value })} />
      </div>

      {warnings.length > 0 ? (
        <div className="notice notice-warn">
          <b>Doesn't match their answers yet:</b>
          <ul style={{ margin: "6px 0 0 18px", padding: 0 }}>
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      ) : (
        t.days.length > 0 && <div className="notice notice-good">✓ Matches their days, session length and equipment.</div>
      )}

      <div className="save-bar">
        <span className={status && !status.ok ? "err" : "muted small"}>
          {status ? (status.ok ? status.message : status.error) : dirty ? "Unsaved changes" : "All changes saved"}
        </span>
        <button type="button" className="btn btn-sm" onClick={onSave} disabled={pending || !dirty}>
          {pending ? "Saving…" : "Save workouts"}
        </button>
      </div>
    </div>
  );
}
