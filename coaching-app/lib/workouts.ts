/** Workout logs in the database (table `workout_sessions`, one row per client + date + program day). */

import { db, q } from "./supabase";
import { addEvent } from "./clients";
import { newRecords, recordMilestone, type LoggedExercise, type WorkoutSession } from "./workout-log";

export async function listSessions(clientId: string, limit = 200): Promise<WorkoutSession[]> {
  return db<WorkoutSession[]>(`workout_sessions?select=*&client_id=eq.${q(clientId)}&order=date.desc,updated_at.desc&limit=${limit}`);
}

export async function sessionsBetween(clientId: string, from: string, to: string): Promise<WorkoutSession[]> {
  return db<WorkoutSession[]>(`workout_sessions?select=*&client_id=eq.${q(clientId)}&date=gte.${from}&date=lte.${to}&order=date.asc`);
}

/**
 * Saves (or replaces) the log for one workout on one day, records any new personal records once as wins,
 * and returns them so the screen can celebrate.
 */
export async function saveSession(
  clientId: string,
  s: { date: string; workout_day: number; workout_name: string; exercises: LoggedExercise[] },
): Promise<{ records: { key: string; title: string; emoji: string }[] }> {
  const all = await listSessions(clientId, 500);
  const others = all.filter((x) => !(x.date === s.date && x.workout_day === s.workout_day));
  const isNew = others.length === all.length;
  await db("workout_sessions?on_conflict=client_id,date,workout_day", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: { client_id: clientId, ...s, updated_at: new Date().toISOString() },
  });
  if (isNew) await addEvent(clientId, "workout_logged", { name: s.workout_name, date: s.date }).catch(() => {});

  const records = newRecords(others, s).map(recordMilestone);
  if (records.length) {
    const have = await db<{ key: string }[]>(`client_milestones?select=key&client_id=eq.${q(clientId)}&key=like.pr:*`).catch(() => []);
    const known = new Set(have.map((h) => h.key));
    const fresh = records.filter((r) => !known.has(r.key));
    if (fresh.length) {
      await db("client_milestones?on_conflict=client_id,key", {
        method: "POST",
        prefer: "resolution=ignore-duplicates,return=minimal",
        // Already celebrated on the "Workout logged" screen, so saved as seen (no second pop-up on Today).
        body: fresh.map((r) => ({ client_id: clientId, ...r, achieved_at: new Date().toISOString(), seen_at: new Date().toISOString() })),
      }).catch((err) => console.error("Couldn't save PR", err));
      for (const r of fresh) await addEvent(clientId, "milestone", { key: r.key, title: r.title }).catch(() => {});
    }
    return { records: fresh };
  }
  return { records: [] };
}
