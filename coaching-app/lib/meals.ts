/**
 * Food log: the meals and snacks a client photographs between onboarding and their kickoff call.
 * Pure helpers first (tested), then the database functions.
 */

import { db, q } from "./supabase";

export const MEAL_PHOTO_BUCKET = "meal-photos";

export const MEAL_TYPES = [
  { value: "breakfast", label: "Breakfast", icon: "🍳" },
  { value: "lunch", label: "Lunch", icon: "🥗" },
  { value: "dinner", label: "Dinner", icon: "🍽️" },
  { value: "snack", label: "Snack", icon: "🍎" },
  { value: "drink", label: "Drink", icon: "🥤" },
] as const;

export const PLACES = ["Home", "Work", "Restaurant", "Takeout", "On the go"] as const;

export const HUNGER = [
  { value: 1, label: "Not hungry" },
  { value: 2, label: "A little" },
  { value: 3, label: "Hungry" },
  { value: 4, label: "Very" },
  { value: 5, label: "Starving" },
] as const;

export type MealType = (typeof MEAL_TYPES)[number]["value"];

export type MealLog = {
  id: string;
  client_id: string;
  eaten_at: string;
  meal: MealType;
  photo_path: string | null;
  place: string | null;
  hunger: number | null;
  note: string | null;
  created_at: string;
};

export type MealInput = {
  eatenAt: string;
  meal: MealType;
  place: string | null;
  hunger: number | null;
  note: string | null;
};

export function mealLabel(meal: string): string {
  return MEAL_TYPES.find((m) => m.value === meal)?.label ?? meal;
}

export function mealIcon(meal: string): string {
  return MEAL_TYPES.find((m) => m.value === meal)?.icon ?? "🍽️";
}

export function hungerLabel(h: number | null): string | null {
  return HUNGER.find((x) => x.value === h)?.label ?? null;
}

/** Checks a meal form. `now` is passed in so it can be tested. */
export function parseMealInput(
  raw: { eatenAt?: unknown; meal?: unknown; place?: unknown; hunger?: unknown; note?: unknown },
  hasPhoto: boolean,
  now: Date = new Date(),
): { ok: true; data: MealInput } | { ok: false; error: string } {
  const meal = String(raw.meal ?? "");
  if (!MEAL_TYPES.some((m) => m.value === meal)) return { ok: false, error: "Pick which meal this was." };
  const eaten = new Date(String(raw.eatenAt ?? ""));
  if (Number.isNaN(eaten.getTime())) return { ok: false, error: "Pick when you ate it." };
  if (eaten.getTime() > now.getTime() + 15 * 60 * 1000) return { ok: false, error: "That time is in the future." };
  if (eaten.getTime() < now.getTime() - 14 * 24 * 60 * 60 * 1000) return { ok: false, error: "That's more than 2 weeks ago." };
  const placeRaw = String(raw.place ?? "").trim();
  const place = (PLACES as readonly string[]).includes(placeRaw) ? placeRaw : null;
  const h = Number(raw.hunger);
  const hunger = Number.isInteger(h) && h >= 1 && h <= 5 ? h : null;
  const note = String(raw.note ?? "").trim().slice(0, 1000) || null;
  if (!hasPhoto && !note) return { ok: false, error: "Add a photo, or write what you ate." };
  return { ok: true, data: { eatenAt: eaten.toISOString(), meal: meal as MealType, place, hunger, note } };
}

/** "YYYY-MM-DD" of a moment in a time zone. */
export function dayIn(iso: string, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

export function timeIn(iso: string, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" }).format(new Date(iso));
  } catch {
    return iso.slice(11, 16);
  }
}

/** Meals grouped by local day, newest day first, meals in time order within a day. */
export function groupByDay<T extends { eaten_at: string }>(logs: T[], timeZone: string): { day: string; meals: T[] }[] {
  const map = new Map<string, T[]>();
  for (const l of logs) {
    const d = dayIn(l.eaten_at, timeZone);
    if (!map.has(d)) map.set(d, []);
    map.get(d)!.push(l);
  }
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([day, meals]) => ({ day, meals: meals.sort((a, b) => a.eaten_at.localeCompare(b.eaten_at)) }));
}

/** Counts for the Today card and the coach: total, distinct days, and today's meals. */
export function logStats(logs: { eaten_at: string }[], timeZone: string, today: string) {
  const days = new Set(logs.map((l) => dayIn(l.eaten_at, timeZone)));
  return {
    total: logs.length,
    days: days.size,
    today: logs.filter((l) => dayIn(l.eaten_at, timeZone) === today).length,
  };
}

// ───────── Database ─────────

export async function listMeals(clientId: string, limit = 200): Promise<MealLog[]> {
  return db<MealLog[]>(`meal_logs?select=*&client_id=eq.${q(clientId)}&order=eaten_at.desc&limit=${limit}`);
}

export async function insertMeal(clientId: string, input: MealInput, photoPath: string | null): Promise<MealLog> {
  const rows = await db<MealLog[]>("meal_logs", {
    method: "POST",
    prefer: "return=representation",
    body: {
      client_id: clientId,
      eaten_at: input.eatenAt,
      meal: input.meal,
      place: input.place,
      hunger: input.hunger,
      note: input.note,
      photo_path: photoPath,
    },
  });
  return rows[0];
}

export async function getMeal(id: string): Promise<MealLog | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const rows = await db<MealLog[]>(`meal_logs?select=*&id=eq.${q(id)}`);
  return rows[0] ?? null;
}

export async function deleteMeal(id: string): Promise<void> {
  await db(`meal_logs?id=eq.${q(id)}`, { method: "DELETE", prefer: "return=minimal" });
}
