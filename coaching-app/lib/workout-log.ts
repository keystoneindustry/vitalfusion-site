/**
 * Workout logging (pure, safe for the browser): what a logged workout looks like, how its sets are cleaned,
 * "last time" numbers and personal records. Pounds only. DB helpers live in lib/workouts.ts.
 */

export type ExerciseKind = "reps" | "time";

/** One set. Reps exercises use weight (optional: blank = bodyweight) + reps; timed ones use seconds. */
export type LoggedSet = { weight: number | null; reps: number | null; seconds: number | null };
export type LoggedExercise = { name: string; kind: ExerciseKind; sets: LoggedSet[] };

export type WorkoutSession = {
  id: string;
  client_id: string;
  date: string;
  workout_day: number;
  workout_name: string;
  exercises: LoggedExercise[];
  created_at: string;
  updated_at: string;
};

/** Timed exercise if the plan's reps say seconds or minutes ("30–45 sec", "1 min", "20s"). */
export function exerciseKind(reps: string): ExerciseKind {
  return /\d\s*(s|sec|secs|second|seconds|min|mins|minute|minutes)\b/i.test(reps) || /\b(sec|seconds|min|minutes)\b/i.test(reps) ? "time" : "reps";
}

/** Whether a timed exercise is planned in minutes (input in minutes) or seconds. */
export function timeUnit(reps: string): "min" | "sec" {
  return /\bmin/i.test(reps) ? "min" : "sec";
}

/** How many set rows to show: "3" → 3, "3–4" → 4, junk → 3 (1 to 10). */
export function plannedSetCount(sets: string): number {
  const nums = (sets.match(/\d+/g) ?? []).map(Number).filter((n) => n > 0);
  if (!nums.length) return 3;
  return Math.min(10, Math.max(1, Math.max(...nums.slice(0, 2))));
}

/** Lowercase, single-spaced name for matching the same exercise across workouts. */
export function exerciseKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function num(v: unknown, max: number, step: number): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  if (!Number.isFinite(n) || n < 0 || n > max) return null;
  return Math.round(n / step) * step;
}

/**
 * Cleans what the browser sent. Keeps sets with something in them, rounds weight to 0.5 lb, caps silly values.
 * Exercises with no sets are kept (so "did it, didn't log numbers" still marks the workout done).
 */
export function cleanExercises(raw: unknown): LoggedExercise[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 40).flatMap((e): LoggedExercise[] => {
    if (!e || typeof e !== "object") return [];
    const r = e as Record<string, unknown>;
    const name = String(r.name ?? "").trim().slice(0, 120);
    if (!name) return [];
    const kind: ExerciseKind = r.kind === "time" ? "time" : "reps";
    const sets = (Array.isArray(r.sets) ? r.sets : []).slice(0, 15).flatMap((s): LoggedSet[] => {
      if (!s || typeof s !== "object") return [];
      const x = s as Record<string, unknown>;
      const set: LoggedSet =
        kind === "time"
          ? { weight: num(x.weight, 2000, 0.5), reps: null, seconds: num(x.seconds, 36000, 1) }
          : { weight: num(x.weight, 2000, 0.5), reps: num(x.reps, 500, 1), seconds: null };
      return set.reps || set.seconds ? [set] : [];
    });
    return [{ name, kind, sets }];
  });
}

/** "135 lb × 10", "Bodyweight × 12", "45 sec", "2 min" */
export function formatSet(s: LoggedSet, kind: ExerciseKind): string {
  if (kind === "time") {
    const t = s.seconds ?? 0;
    const time = t >= 60 && t % 60 === 0 ? `${t / 60} min` : t >= 90 ? `${Math.floor(t / 60)} min ${t % 60} sec` : `${t} sec`;
    return s.weight ? `${fmtLb(s.weight)} lb · ${time}` : time;
  }
  return `${s.weight ? `${fmtLb(s.weight)} lb` : "Bodyweight"} × ${s.reps ?? 0}`;
}

export function fmtLb(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/** The most recent logged sets for an exercise, from sessions before `beforeDate` (or another day's session). */
export function lastTime(
  sessions: Pick<WorkoutSession, "date" | "workout_day" | "exercises">[],
  name: string,
  current: { date: string; workout_day: number },
): { date: string; sets: LoggedSet[]; kind: ExerciseKind } | null {
  const key = exerciseKey(name);
  const sorted = [...sessions].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  for (const s of sorted) {
    if (s.date > current.date) continue;
    if (s.date === current.date && s.workout_day === current.workout_day) continue;
    const ex = s.exercises.find((e) => exerciseKey(e.name) === key && e.sets.length > 0);
    if (ex) return { date: s.date, sets: ex.sets, kind: ex.kind };
  }
  return null;
}

export type Best = { metric: "weight" | "reps" | "time"; value: number; reps: number | null; label: string };

/**
 * An exercise's best in a list of sets: heaviest weight (most reps at it as the tie-break), or most reps if it was
 * all bodyweight, or longest hold for timed exercises.
 */
export function bestOf(sets: LoggedSet[], kind: ExerciseKind): Best | null {
  if (!sets.length) return null;
  if (kind === "time") {
    const top = sets.reduce((m, s) => ((s.seconds ?? 0) > (m.seconds ?? 0) ? s : m), sets[0]);
    if (!top.seconds) return null;
    return { metric: "time", value: top.seconds, reps: null, label: formatSet({ ...top, weight: null }, "time") };
  }
  const weighted = sets.filter((s) => (s.weight ?? 0) > 0 && (s.reps ?? 0) > 0);
  if (weighted.length) {
    const top = weighted.reduce((m, s) => (s.weight! > m.weight! || (s.weight === m.weight && s.reps! > m.reps!) ? s : m), weighted[0]);
    return { metric: "weight", value: top.weight!, reps: top.reps, label: formatSet(top, "reps") };
  }
  const top = sets.reduce((m, s) => ((s.reps ?? 0) > (m.reps ?? 0) ? s : m), sets[0]);
  if (!top.reps) return null;
  return { metric: "reps", value: top.reps, reps: top.reps, label: formatSet({ ...top, weight: null }, "reps") };
}

function beats(a: Best, b: Best): boolean {
  if (a.metric !== b.metric) return a.metric === "weight" && b.metric === "reps"; // first time adding weight
  if (a.metric === "weight") return a.value > b.value || (a.value === b.value && (a.reps ?? 0) > (b.reps ?? 0));
  return a.value > b.value;
}

/** Each exercise's all-time best across sessions. */
export function personalRecords(sessions: Pick<WorkoutSession, "date" | "exercises">[]): { name: string; best: Best; date: string }[] {
  const map = new Map<string, { name: string; best: Best; date: string }>();
  const sorted = [...sessions].sort((a, b) => (a.date < b.date ? -1 : 1));
  for (const s of sorted) {
    for (const e of s.exercises) {
      const b = bestOf(e.sets, e.kind);
      if (!b) continue;
      const key = exerciseKey(e.name);
      const prev = map.get(key);
      if (!prev || beats(b, prev.best)) map.set(key, { name: e.name, best: b, date: s.date });
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * New personal records in `session` compared with every other session. The first time an exercise is logged is
 * the starting point, not a record.
 */
export function newRecords(
  others: Pick<WorkoutSession, "date" | "exercises">[],
  session: Pick<WorkoutSession, "exercises">,
): { name: string; best: Best }[] {
  const before = new Map(personalRecords(others).map((r) => [exerciseKey(r.name), r.best]));
  return session.exercises.flatMap((e) => {
    const b = bestOf(e.sets, e.kind);
    const prev = before.get(exerciseKey(e.name));
    return b && prev && beats(b, prev) ? [{ name: e.name, best: b }] : [];
  });
}

/** Stored milestone for a record: one per exercise + value, so it's celebrated once. */
export function recordMilestone(r: { name: string; best: Best }): { key: string; title: string; emoji: string } {
  const what = r.best.metric === "weight" ? `${r.best.label}` : r.best.metric === "reps" ? `${r.best.value} reps` : r.best.label;
  return {
    key: `pr:${exerciseKey(r.name).replace(/ /g, "-")}:${r.best.metric}:${r.best.value}${r.best.metric === "weight" ? `x${r.best.reps}` : ""}`.slice(0, 200),
    title: `New PR: ${r.name}, ${what}`.slice(0, 200),
    emoji: "🏆",
  };
}

/** Points for a lift's progress chart: the best set each day it was logged. */
export function exerciseHistory(sessions: Pick<WorkoutSession, "date" | "exercises">[], name: string): { date: string; best: Best }[] {
  const key = exerciseKey(name);
  return [...sessions]
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .flatMap((s) => {
      const e = s.exercises.find((x) => exerciseKey(x.name) === key);
      const b = e ? bestOf(e.sets, e.kind) : null;
      return b ? [{ date: s.date, best: b }] : [];
    });
}
