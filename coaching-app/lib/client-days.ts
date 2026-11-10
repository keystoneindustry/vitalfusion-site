/** Everything due for a client over a range of days (Today and Calendar screens). */

import { db, q } from "./supabase";
import { habitDueOn, scheduleDueOn } from "./calendar";
import { habitTitle, listChecks, listClientHabits, type ClientHabit } from "./habits";
import { listSchedules, type ScheduleRow } from "./progress";

export type DayTasks = {
  date: string;
  habits: { id: string; title: string; icon: string; description: string | null; done: boolean }[];
  weighIn: { due: boolean; weight: number | null };
  photos: { due: boolean; count: number };
};

export async function loadDays(clientId: string, dates: string[]): Promise<{ days: DayTasks[]; habits: ClientHabit[]; schedules: ScheduleRow[] }> {
  if (dates.length === 0) return { days: [], habits: [], schedules: [] };
  const from = dates[0];
  const to = dates[dates.length - 1];
  const [habits, schedules, checks, weighIns, photos] = await Promise.all([
    listClientHabits(clientId, false),
    listSchedules(clientId),
    listChecks(clientId, from, to),
    db<{ date: string; weight_lb: number }[]>(`weigh_ins?select=date,weight_lb&client_id=eq.${q(clientId)}&date=gte.${from}&date=lte.${to}`),
    db<{ date: string }[]>(`progress_photos?select=date&client_id=eq.${q(clientId)}&date=gte.${from}&date=lte.${to}`),
  ]);
  const weights = new Map(weighIns.map((w) => [w.date, Number(w.weight_lb)]));
  const days = dates.map((date) => ({
    date,
    habits: habits
      .filter((h) => habitDueOn(h, date))
      .map((h) => ({ id: h.id, title: habitTitle(h), icon: h.habit?.icon ?? "✅", description: h.habit?.description ?? null, done: checks.has(`${h.id}|${date}`) })),
    weighIn: { due: schedules.some((s) => s.kind === "weigh_in" && scheduleDueOn(s, date)), weight: weights.get(date) ?? null },
    photos: { due: schedules.some((s) => s.kind === "photos" && scheduleDueOn(s, date)), count: photos.filter((p) => p.date === date).length },
  }));
  return { days, habits: habits.filter((h) => h.active), schedules };
}
