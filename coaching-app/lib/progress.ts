/** Weigh-ins, progress photos, water, and the weigh-in / photo schedules. */

import { db, q } from "./supabase";
import { addDays, isIsoDate, todayIn } from "./dates";
import { parseDays, stepGoalFor, weekdayFromName, type Schedule } from "./calendar";
import { assignHabit, listClientHabits, stepsHabit } from "./habits";
import { getSettings } from "./settings";
import { getResponse } from "./onboarding-data";
import { addEvent, type ClientRow } from "./clients";

export const PHOTO_BUCKET = "progress-photos";
export const POSES = [
  { value: "front", label: "Front", tip: "Face the camera, arms relaxed by your sides, feet hip-width apart." },
  { value: "side", label: "Side", tip: "Turn to your right, arms relaxed, stand tall and look straight ahead." },
  { value: "back", label: "Back", tip: "Face away from the camera, arms relaxed, feet hip-width apart." },
] as const;
export type Pose = (typeof POSES)[number]["value"];

export type WeighIn = { client_id: string; date: string; weight_lb: number; note: string | null; created_at: string };
export type ProgressPhoto = { client_id: string; date: string; pose: Pose; path: string; created_at: string };
export type ScheduleRow = Schedule & { client_id: string; created_at: string };

// ───────── Schedules ─────────

export async function listSchedules(clientId: string): Promise<ScheduleRow[]> {
  return db<ScheduleRow[]>(`schedules?select=*&client_id=eq.${q(clientId)}&active=eq.true&order=created_at.asc`);
}

export async function addSchedule(row: Omit<Schedule, "id" | "active"> & { client_id: string }): Promise<void> {
  await db("schedules", { method: "POST", prefer: "return=minimal", body: row });
}

export async function endSchedule(id: string, clientId: string): Promise<void> {
  await db(`schedules?id=eq.${q(id)}&client_id=eq.${q(clientId)}`, { method: "PATCH", prefer: "return=minimal", body: { active: false } });
}

// ───────── Weigh-ins ─────────

export async function listWeighIns(clientId: string, limit = 120): Promise<WeighIn[]> {
  const rows = await db<WeighIn[]>(`weigh_ins?select=*&client_id=eq.${q(clientId)}&order=date.desc&limit=${limit}`);
  return rows.map((r) => ({ ...r, weight_lb: Number(r.weight_lb) }));
}

export async function saveWeighIn(clientId: string, date: string, weightLb: number, note: string | null): Promise<void> {
  await db("weigh_ins?on_conflict=client_id,date", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: { client_id: clientId, date, weight_lb: Math.round(weightLb * 10) / 10, note },
  });
}

export async function deleteWeighIn(clientId: string, date: string): Promise<void> {
  await db(`weigh_ins?client_id=eq.${q(clientId)}&date=eq.${date}`, { method: "DELETE", prefer: "return=minimal" });
}

export function parseWeight(raw: unknown): number | null {
  const n = parseFloat(String(raw ?? "").replace(",", "."));
  return Number.isFinite(n) && n >= 50 && n <= 800 ? Math.round(n * 10) / 10 : null;
}

/** Average weight per week (weeks starting Sunday), oldest first. */
export function weeklyAverages(entries: Pick<WeighIn, "date" | "weight_lb">[]): { week: string; avg: number; count: number }[] {
  const map = new Map<string, number[]>();
  for (const e of entries) {
    const d = new Date(`${e.date}T00:00:00Z`);
    const week = addDays(e.date, -d.getUTCDay());
    if (!map.has(week)) map.set(week, []);
    map.get(week)!.push(e.weight_lb);
  }
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([week, w]) => ({ week, avg: Math.round((w.reduce((x, y) => x + y, 0) / w.length) * 10) / 10, count: w.length }));
}

// ───────── Photos ─────────

export async function listPhotos(clientId: string): Promise<ProgressPhoto[]> {
  return db<ProgressPhoto[]>(`progress_photos?select=*&client_id=eq.${q(clientId)}&order=date.desc`);
}

export async function savePhoto(clientId: string, date: string, pose: Pose, path: string): Promise<string | null> {
  const old = await db<ProgressPhoto[]>(`progress_photos?select=path&client_id=eq.${q(clientId)}&date=eq.${date}&pose=eq.${pose}`);
  await db("progress_photos?on_conflict=client_id,date,pose", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: { client_id: clientId, date, pose, path },
  });
  return old[0] && old[0].path !== path ? old[0].path : null;
}

/** Photo sets by date, newest first: { date, front?, side?, back? }. */
export function photoSets(photos: ProgressPhoto[]): { date: string; poses: Partial<Record<Pose, string>> }[] {
  const map = new Map<string, Partial<Record<Pose, string>>>();
  for (const p of photos) {
    if (!map.has(p.date)) map.set(p.date, {});
    map.get(p.date)![p.pose] = p.path;
  }
  return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)).map(([date, poses]) => ({ date, poses }));
}

// ───────── Water ─────────

export async function getWater(clientId: string, date: string): Promise<number> {
  const rows = await db<{ oz: number }[]>(`water_logs?select=oz&client_id=eq.${q(clientId)}&date=eq.${date}`);
  return rows[0]?.oz ?? 0;
}

export async function setWater(clientId: string, date: string, oz: number): Promise<void> {
  await db("water_logs?on_conflict=client_id,date", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: { client_id: clientId, date, oz: Math.max(0, Math.min(400, Math.round(oz))) },
  });
}

export function isDate(v: unknown): v is string {
  return typeof v === "string" && isIsoDate(v);
}

// ───────── Default schedule ─────────

/**
 * Gives a client the starting setup, skipping anything they already have: a daily step-goal habit (sized from
 * their onboarding answer), weigh-ins on the default days, and progress photos on the day they picked
 * (default Sunday). Returns what was added.
 */
export async function applyDefaultSchedule(client: ClientRow): Promise<string[]> {
  const added: string[] = [];
  const [habits, schedules, settings, response] = await Promise.all([
    listClientHabits(client.id),
    listSchedules(client.id),
    getSettings(),
    getResponse(client.id),
  ]);
  const answers = response?.answers ?? {};
  const start = todayIn(client.timezone);

  const steps = await stepsHabit();
  if (steps && !habits.some((h) => h.habit_id === steps.id)) {
    const goal = stepGoalFor(typeof answers.steps === "string" ? answers.steps : "");
    await assignHabit({ client_id: client.id, habit_id: steps.id, title: `Walk ${goal.toLocaleString("en-US")} steps`, days: [0, 1, 2, 3, 4, 5, 6], start_date: start });
    added.push(`step goal (${goal.toLocaleString("en-US")} a day)`);
  }
  if (!schedules.some((s) => s.kind === "weigh_in")) {
    const days = parseDays(settings.default_weighin_days || "1,3,5");
    if (days.length) {
      await addSchedule({ client_id: client.id, kind: "weigh_in", days, every_weeks: 1, start_date: start, end_date: client.end_date, one_date: null });
      added.push("weigh-ins");
    }
  }
  if (!schedules.some((s) => s.kind === "photos")) {
    const day = weekdayFromName(typeof answers.photoDay === "string" ? answers.photoDay : "") ?? 0;
    const every = Math.max(1, Math.min(8, parseInt(settings.default_photo_every_weeks || "1", 10) || 1));
    await addSchedule({ client_id: client.id, kind: "photos", days: [day], every_weeks: every, start_date: start, end_date: client.end_date, one_date: null });
    added.push("progress photos");
  }
  if (added.length) await addEvent(client.id, "schedule_added", { added });
  return added;
}
