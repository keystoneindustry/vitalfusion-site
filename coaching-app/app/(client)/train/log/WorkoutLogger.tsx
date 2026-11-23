"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { saveWorkoutAction } from "../log-actions";

type SetRow = { weight: string; reps: string; time: string; hintWeight: string; hintReps: string };
export type LogRow = {
  name: string;
  kind: "reps" | "time";
  unit: "sec" | "min";
  plan: string;
  last: string | null;
  lastDate: string | null;
  sets: SetRow[];
};

/** Set-by-set logging. Unsaved entries are kept on the phone until saved, so a refresh mid-workout loses nothing. */
export default function WorkoutLogger({
  day,
  date,
  rows: initial,
  alreadyLogged,
  storageKey,
}: {
  day: number;
  date: string;
  rows: LogRow[];
  alreadyLogged: boolean;
  storageKey: string;
}) {
  const [rows, setRows] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ records: { title: string }[] } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw) as LogRow[];
        if (Array.isArray(saved) && saved.length === initial.length) setRows(saved);
      }
    } catch {}
  }, [storageKey, initial.length]);

  function update(next: LogRow[]) {
    setRows(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {}
  }
  function setField(i: number, j: number, field: "weight" | "reps" | "time", value: string) {
    update(rows.map((r, a) => (a !== i ? r : { ...r, sets: r.sets.map((s, b) => (b !== j ? s : { ...s, [field]: value })) })));
  }
  function addSet(i: number) {
    update(rows.map((r, a) => (a !== i ? r : { ...r, sets: [...r.sets, { ...r.sets[r.sets.length - 1], weight: r.sets[r.sets.length - 1]?.weight ?? "", reps: "", time: "" }] })));
  }
  function removeSet(i: number) {
    update(rows.map((r, a) => (a !== i || r.sets.length <= 1 ? r : { ...r, sets: r.sets.slice(0, -1) })));
  }

  async function save() {
    setSaving(true);
    setError(null);
    const exercises = rows.map((r) => ({
      name: r.name,
      kind: r.kind,
      sets: r.sets.map((s) =>
        r.kind === "time"
          ? { weight: s.weight, seconds: s.time === "" ? "" : String(Number(s.time) * (r.unit === "min" ? 60 : 1)) }
          : { weight: s.weight, reps: s.reps },
      ),
    }));
    const res = await saveWorkoutAction({ day, date, exercises });
    setSaving(false);
    if (!res.ok) return setError(res.error);
    try {
      localStorage.removeItem(storageKey);
    } catch {}
    setDone({ records: res.records });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (done) {
    return (
      <section className="card log-done">
        <p className="log-done-title">💪 Workout logged</p>
        {done.records.length > 0 ? (
          <div className="pr-list">
            {done.records.map((r) => (
              <p key={r.title} className="pr-item">🏆 {r.title}</p>
            ))}
          </div>
        ) : (
          <p className="muted" style={{ marginTop: 0 }}>Nice work. Next time, try to beat today's numbers.</p>
        )}
        <div className="log-done-actions">
          <Link className="btn btn-wide" href="/">Back to Today</Link>
          <Link className="btn btn-ghost btn-wide" href="/train/history">See your history</Link>
        </div>
      </section>
    );
  }

  return (
    <div className="logger">
      {alreadyLogged && <p className="notice notice-good">You already logged this workout. Saving again updates it.</p>}
      {rows.map((r, i) => (
        <section key={r.name + i} className="card log-ex">
          <div className="log-ex-head">
            <b>{r.name}</b>
            <span className="muted small">{r.plan}</span>
          </div>
          {r.last && (
            <p className="log-last">
              Last time{r.lastDate ? ` (${r.lastDate})` : ""}: <b>{r.last}</b>
            </p>
          )}
          <div className={`log-sets ${r.kind}`}>
            <span className="log-col">Set</span>
            <span className="log-col">{r.kind === "time" ? "lb (optional)" : "lb"}</span>
            <span className="log-col">{r.kind === "time" ? r.unit : "Reps"}</span>
            {r.sets.map((s, j) => (
              <div key={j} className="log-set" style={{ display: "contents" }}>
                <span className="log-n">{j + 1}</span>
                <input
                  inputMode="decimal"
                  aria-label={`${r.name} set ${j + 1} weight in pounds`}
                  placeholder={s.hintWeight || (r.kind === "time" ? "–" : "lb")}
                  value={s.weight}
                  onChange={(e) => setField(i, j, "weight", e.target.value.replace(/[^\d.]/g, ""))}
                />
                {r.kind === "time" ? (
                  <input
                    inputMode="decimal"
                    aria-label={`${r.name} set ${j + 1} ${r.unit === "min" ? "minutes" : "seconds"}`}
                    placeholder={r.unit}
                    value={s.time}
                    onChange={(e) => setField(i, j, "time", e.target.value.replace(/[^\d.]/g, ""))}
                  />
                ) : (
                  <input
                    inputMode="numeric"
                    aria-label={`${r.name} set ${j + 1} reps`}
                    placeholder={s.hintReps || "reps"}
                    value={s.reps}
                    onChange={(e) => setField(i, j, "reps", e.target.value.replace(/\D/g, ""))}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="log-set-btns">
            <button type="button" className="btn-link" onClick={() => addSet(i)}>+ Add set</button>
            {r.sets.length > 1 && (
              <button type="button" className="btn-link muted" onClick={() => removeSet(i)}>Remove last set</button>
            )}
          </div>
        </section>
      ))}
      {error && <p className="err">{error}</p>}
      <button type="button" className="btn btn-wide" disabled={saving} onClick={save}>
        {saving ? "Saving…" : alreadyLogged ? "Update workout" : "Save workout"}
      </button>
      <p className="small muted center" style={{ marginTop: 10 }}>
        Didn't track numbers? Just tap Save: the workout still counts as done.
      </p>
    </div>
  );
}
