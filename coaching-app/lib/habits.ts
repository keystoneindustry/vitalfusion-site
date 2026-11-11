/** The coach's habit library, habits assigned to clients, and the client's daily ticks. */

import { db, q } from "./supabase";
import type { HabitAssignment } from "./calendar";

export type Habit = {
  id: string;
  title: string;
  description: string | null;
  icon: string;
  kind: "custom" | "steps" | "water";
  archived: boolean;
  created_at: string;
};

export type ClientHabit = HabitAssignment & {
  client_id: string;
  created_at: string;
  habit: Pick<Habit, "title" | "icon" | "kind" | "description"> | null;
};

export function habitTitle(h: Pick<ClientHabit, "title" | "habit">): string {
  return h.title || h.habit?.title || "Habit";
}

export async function listHabits(includeArchived = false): Promise<Habit[]> {
  return db<Habit[]>(`habits?select=*${includeArchived ? "" : "&archived=eq.false"}&order=created_at.asc`);
}

export async function getHabit(id: string): Promise<Habit | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const rows = await db<Habit[]>(`habits?select=*&id=eq.${q(id)}`);
  return rows[0] ?? null;
}

export async function stepsHabit(): Promise<Habit | null> {
  const rows = await db<Habit[]>(`habits?select=*&kind=eq.steps&order=created_at.asc&limit=1`);
  return rows[0] ?? null;
}

/** The built-in "Drink your water" habit (skipped if Tyler archived it). */
export async function waterHabit(): Promise<Habit | null> {
  const rows = await db<Habit[]>(`habits?select=*&kind=eq.water&archived=eq.false&order=created_at.asc&limit=1`);
  return rows[0] ?? null;
}

export async function createHabit(h: Pick<Habit, "title" | "description" | "icon">): Promise<Habit> {
  const rows = await db<Habit[]>("habits", { method: "POST", prefer: "return=representation", body: { ...h, kind: "custom" } });
  return rows[0];
}

export async function updateHabit(id: string, patch: Partial<Pick<Habit, "title" | "description" | "icon" | "archived">>): Promise<void> {
  await db(`habits?id=eq.${q(id)}`, { method: "PATCH", prefer: "return=minimal", body: patch });
}

/** How many clients currently have each habit. */
export async function habitUsage(): Promise<Record<string, number>> {
  const rows = await db<{ habit_id: string }[]>(`client_habits?select=habit_id&active=eq.true`);
  const out: Record<string, number> = {};
  for (const r of rows) out[r.habit_id] = (out[r.habit_id] ?? 0) + 1;
  return out;
}

export async function listClientHabits(clientId: string, activeOnly = true): Promise<ClientHabit[]> {
  return db<ClientHabit[]>(
    `client_habits?select=*,habit:habits(title,icon,kind,description)&client_id=eq.${q(clientId)}${activeOnly ? "&active=eq.true" : ""}&order=created_at.asc`,
  );
}

export async function getClientHabit(id: string): Promise<ClientHabit | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const rows = await db<ClientHabit[]>(`client_habits?select=*,habit:habits(title,icon,kind,description)&id=eq.${q(id)}`);
  return rows[0] ?? null;
}

export async function assignHabit(row: { client_id: string; habit_id: string; title: string | null; days: number[]; start_date: string }): Promise<void> {
  await db("client_habits", { method: "POST", prefer: "return=minimal", body: row });
}

export async function updateClientHabit(id: string, patch: Partial<Pick<ClientHabit, "title" | "days" | "active" | "end_date">>): Promise<void> {
  await db(`client_habits?id=eq.${q(id)}`, { method: "PATCH", prefer: "return=minimal", body: patch });
}

/** Ticks as "clientHabitId|YYYY-MM-DD" keys. */
export async function listChecks(clientId: string, from: string, to: string): Promise<Set<string>> {
  const rows = await db<{ client_habit_id: string; date: string }[]>(
    `habit_checks?select=client_habit_id,date&client_id=eq.${q(clientId)}&date=gte.${from}&date=lte.${to}`,
  );
  return new Set(rows.map((r) => `${r.client_habit_id}|${r.date}`));
}

export async function setCheck(clientHabitId: string, clientId: string, date: string, done: boolean): Promise<void> {
  if (done) {
    await db("habit_checks?on_conflict=client_habit_id,date", {
      method: "POST",
      prefer: "resolution=ignore-duplicates,return=minimal",
      body: { client_habit_id: clientHabitId, client_id: clientId, date },
    });
  } else {
    await db(`habit_checks?client_habit_id=eq.${q(clientHabitId)}&date=eq.${date}`, { method: "DELETE", prefer: "return=minimal" });
  }
}
