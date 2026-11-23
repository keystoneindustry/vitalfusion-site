import Link from "next/link";
import { notFound } from "next/navigation";
import { requireClient } from "@/lib/auth";
import { getPublishedPlan, hasContent } from "@/lib/plans";
import { workoutName } from "@/lib/client-days";
import { addDays, formatDate, isIsoDate, todayIn } from "@/lib/dates";
import { exerciseKind, lastTime, plannedSetCount, timeUnit, formatSet } from "@/lib/workout-log";
import { listSessions } from "@/lib/workouts";
import WorkoutLogger, { type LogRow } from "./WorkoutLogger";

export const metadata = { title: "Log workout · Vital Fusion" };

export default async function LogWorkoutPage({ searchParams }: { searchParams: Promise<{ day?: string; date?: string }> }) {
  const { client } = await requireClient("/train");
  const sp = await searchParams;
  const plan = await getPublishedPlan(client.id);
  const days = hasContent(plan) ? (plan.content.training?.days ?? []) : [];
  const dayIdx = parseInt(sp.day ?? "0", 10);
  const program = days[dayIdx];
  if (!program) notFound();
  const today = todayIn(client.timezone);
  const date = sp.date && isIsoDate(sp.date) && sp.date <= today && sp.date >= addDays(today, -14) ? sp.date : today;

  const sessions = await listSessions(client.id, 300);
  const existing = sessions.find((s) => s.date === date && s.workout_day === dayIdx) ?? null;

  const rows: LogRow[] = program.exercises.map((e) => {
    const kind = exerciseKind(e.reps);
    const saved = existing?.exercises.find((x) => x.name.toLowerCase() === e.name.toLowerCase());
    const last = lastTime(sessions, e.name, { date, workout_day: dayIdx });
    const count = Math.max(saved?.sets.length ?? 0, plannedSetCount(e.sets));
    return {
      name: e.name,
      kind,
      unit: kind === "time" ? timeUnit(e.reps) : "sec",
      plan: `${e.sets} × ${e.reps}`.replace(/^ × |× $/g, "").trim(),
      last: last ? last.sets.map((s) => formatSet(s, last.kind)).join(", ") : null,
      lastDate: last ? formatDate(last.date, false) : null,
      sets: Array.from({ length: count }, (_, i) => {
        const s = saved?.sets[i];
        const prev = last?.sets[i] ?? last?.sets[last.sets.length - 1];
        return {
          weight: s?.weight != null ? String(s.weight) : "",
          reps: s?.reps != null ? String(s.reps) : "",
          time: s?.seconds != null ? String(kind === "time" && timeUnit(e.reps) === "min" ? s.seconds / 60 : s.seconds) : "",
          hintWeight: prev?.weight != null ? String(prev.weight) : "",
          hintReps: prev?.reps != null ? String(prev.reps) : "",
        };
      }),
    };
  });

  return (
    <>
      <p className="small" style={{ margin: "0 0 8px" }}>
        <Link href={`/train?day=${dayIdx}`}>‹ Training</Link>
      </p>
      <h1 className="h1" style={{ marginBottom: 4 }}>{workoutName(days, dayIdx)}</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        {date === today ? "Today" : formatDate(date)} · weights in pounds. Leave weight empty for bodyweight.
      </p>
      <WorkoutLogger
        day={dayIdx}
        date={date}
        rows={rows}
        alreadyLogged={!!existing}
        storageKey={`vf-workout-${client.id}-${dayIdx}-${date}`}
      />
    </>
  );
}
