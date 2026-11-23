import Link from "next/link";
import { formatDate } from "@/lib/dates";
import { exerciseHistory, exerciseKey, formatSet, personalRecords, type WorkoutSession } from "@/lib/workout-log";
import LiftChart from "./LiftChart";

/**
 * Logged workouts: a lift picker with a progress chart, personal records and recent sessions.
 * Shared by the client's /train/history and the coach's Training tab (`base` is the page's own URL).
 */
export default function WorkoutHistory({
  sessions,
  base,
  lift,
  limit = 12,
  coach = false,
}: {
  sessions: WorkoutSession[];
  base: string;
  lift?: string;
  limit?: number;
  coach?: boolean;
}) {
  if (sessions.length === 0) {
    return (
      <section className="card">
        <p style={{ margin: 0 }}>{coach ? "No workouts logged yet." : "No workouts logged yet. Open a workout on the Training tab and tap “📝 Log this workout”."}</p>
      </section>
    );
  }
  const records = personalRecords(sessions);
  const lifts = records.filter((r) => exerciseHistory(sessions, r.name).length > 0);
  // Default to the lift logged most often.
  const counts = lifts.map((r) => ({ r, n: exerciseHistory(sessions, r.name).length })).sort((a, b) => b.n - a.n);
  const picked = lifts.find((r) => exerciseKey(r.name).replace(/ /g, "-") === lift) ?? counts[0]?.r;
  const sep = base.includes("?") ? "&" : "?";
  const sorted = [...sessions].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  return (
    <>
      {picked && (
        <section className="card">
          <h2 className="h2" style={{ marginTop: 0 }}>Progress</h2>
          {lifts.length > 1 && (
            <nav className="lift-chips" aria-label="Pick a lift">
              {counts.map(({ r }) => {
                const slug = exerciseKey(r.name).replace(/ /g, "-");
                return (
                  <Link key={slug} href={`${base}${sep}lift=${slug}`} aria-current={r === picked ? "true" : undefined} scroll={false}>
                    {r.name}
                  </Link>
                );
              })}
            </nav>
          )}
          <p style={{ margin: "0 0 4px" }}>
            <b>{picked.name}</b> · best {picked.best.label}
          </p>
          <LiftChart points={exerciseHistory(sessions, picked.name)} />
        </section>
      )}

      {records.length > 0 && (
        <section className="card">
          <h2 className="h2" style={{ marginTop: 0 }}>🏆 Personal records</h2>
          <table className="pr-table">
            <tbody>
              {records.map((r) => (
                <tr key={r.name}>
                  <td>
                    {r.name}
                    <br />
                    <span className="small muted">{formatDate(r.date, false)}</span>
                  </td>
                  <td>{r.best.label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <h2 className="h2">Recent workouts</h2>
      <div className="logger">
        {sorted.slice(0, limit).map((s) => (
          <section key={s.id} className="card hist-session">
            <h3>
              <span>{s.workout_name}</span>
              <span className="small muted">{formatDate(s.date, false)}</span>
            </h3>
            {s.exercises.filter((e) => e.sets.length).length === 0 ? (
              <p className="hist-ex muted">Marked done (no numbers logged)</p>
            ) : (
              s.exercises
                .filter((e) => e.sets.length)
                .map((e) => (
                  <p key={e.name} className="hist-ex">
                    <b>{e.name}:</b> {e.sets.map((x) => formatSet(x, e.kind)).join(", ")}
                  </p>
                ))
            )}
          </section>
        ))}
      </div>
    </>
  );
}
