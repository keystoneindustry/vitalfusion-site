/** Loads a client's streaks and milestones and records newly reached ones (see lib/milestones.ts). */

import { db, q } from "./supabase";
import { addDays, packageStatus } from "./dates";
import { scheduleDueOn } from "./calendar";
import { listChecks, listClientHabits } from "./habits";
import { listSchedules, listWeighIns } from "./progress";
import { getResponse } from "./onboarding-data";
import { addEvent, type ClientRow } from "./clients";
import { checkinStreak, goalDirection, habitStreaks, milestoneFamilies, weightChange, type HabitStreaks, type Milestone } from "./milestones";

export type StoredMilestone = { key: string; title: string; emoji: string; achieved_at: string; seen_at: string | null };

export type Wins = {
  streaks: HabitStreaks;
  checkins: { current: number; total: number };
  families: Milestone[][];
  stored: StoredMilestone[];
  /** Reached but not celebrated yet. */
  unseen: StoredMilestone[];
};

/** How far back streaks are worked out. */
const LOOKBACK_DAYS = 400;

export async function loadWins(client: ClientRow, today: string): Promise<Wins> {
  const floor = addDays(today, -LOOKBACK_DAYS);
  const [habits, schedules, weighIns, photos, checkinForms, response, stored] = await Promise.all([
    listClientHabits(client.id, false),
    listSchedules(client.id),
    listWeighIns(client.id, 500),
    db<{ date: string }[]>(`progress_photos?select=date&client_id=eq.${q(client.id)}&limit=1`),
    db<{ id: string }[]>(`forms?select=id&kind=eq.checkin`),
    getResponse(client.id),
    db<StoredMilestone[]>(`client_milestones?select=key,title,emoji,achieved_at,seen_at&client_id=eq.${q(client.id)}&order=achieved_at.asc`),
  ]);

  const habitFrom = habits.reduce((m, h) => (h.start_date < m ? h.start_date : m), today);
  const from = habitFrom < floor ? floor : habitFrom;
  const checks = habits.length ? await listChecks(client.id, from, today) : new Set<string>();
  const streaks = habitStreaks(habits, checks, from, today);

  const checkinIds = new Set(checkinForms.map((f) => f.id));
  const checkinSchedules = schedules.filter((s) => s.kind === "form" && s.form_id && checkinIds.has(s.form_id));
  const sentRows = checkinIds.size
    ? await db<{ due_date: string }[]>(
        `form_submissions?select=due_date&client_id=eq.${q(client.id)}&form_id=in.(${[...checkinIds].map(q).join(",")})&submitted_at=not.is.null`,
      )
    : [];
  const sent = new Set(sentRows.map((r) => r.due_date));
  const dueDates: string[] = [];
  const schedFrom = checkinSchedules.reduce((m, s) => ((s.one_date ?? s.start_date) < m ? (s.one_date ?? s.start_date) : m), today);
  for (let d = schedFrom < floor ? floor : schedFrom; d <= today; d = addDays(d, 1)) {
    if (checkinSchedules.some((s) => scheduleDueOn(s, d))) dueDates.push(d);
  }
  const checkins = checkinStreak(dueDates, sent, today);
  checkins.total = sent.size;

  const status = packageStatus(client.start_date, client.end_date, today);
  const goal = String(response?.answers?.goal ?? "");
  const families = milestoneFamilies({
    streaks,
    checkins,
    weighInCount: weighIns.length,
    weightChange: weightChange(weighIns.map((w) => ({ date: w.date, weight: w.weight_lb }))),
    direction: goalDirection(goal),
    hasPhotos: photos.length > 0,
    week: status.kind === "in_progress" ? status.week : null,
    totalWeeks: status.kind === "no_dates" ? null : status.totalWeeks,
    finished: status.kind === "ended",
  });

  // Record anything newly reached, once.
  const have = new Set(stored.map((m) => m.key));
  const fresh = families.flat().filter((m) => m.reached && !have.has(m.key));
  if (fresh.length) {
    const now = new Date().toISOString();
    const rows = fresh.map((m) => ({ client_id: client.id, key: m.key, title: m.title, emoji: m.emoji, achieved_at: now }));
    try {
      await db("client_milestones?on_conflict=client_id,key", { method: "POST", prefer: "resolution=ignore-duplicates,return=minimal", body: rows });
      for (const m of fresh) await addEvent(client.id, "milestone", { key: m.key, title: m.title });
      stored.push(...rows.map((r) => ({ key: r.key, title: r.title, emoji: r.emoji, achieved_at: r.achieved_at, seen_at: null })));
    } catch (err) {
      console.error("Couldn't save milestones", err);
    }
  }

  return { streaks, checkins, families, stored, unseen: stored.filter((m) => !m.seen_at) };
}

export async function markMilestonesSeen(clientId: string): Promise<void> {
  await db(`client_milestones?client_id=eq.${q(clientId)}&seen_at=is.null`, {
    method: "PATCH",
    prefer: "return=minimal",
    body: { seen_at: new Date().toISOString() },
  });
}
