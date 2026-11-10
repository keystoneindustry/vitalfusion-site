"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireCoach } from "@/lib/auth";
import { addEvent, getClient } from "@/lib/clients";
import { parseDays } from "@/lib/calendar";
import { todayIn } from "@/lib/dates";
import { assignHabit, createHabit, getClientHabit, getHabit, updateClientHabit, updateHabit } from "@/lib/habits";
import { addDays } from "@/lib/dates";

function str(form: FormData, key: string, max = 300): string {
  return String(form.get(key) ?? "").trim().slice(0, max);
}

function backTo(form: FormData, fallback: string, params: Record<string, string>): never {
  const raw = str(form, "back");
  const path = raw.startsWith("/coach/") ? raw.split("?")[0] : fallback;
  redirect(`${path}?${new URLSearchParams(params).toString()}`);
}

export async function createHabitAction(form: FormData): Promise<void> {
  await requireCoach("/coach/habits");
  const title = str(form, "title", 80);
  if (!title) redirect("/coach/habits?error=" + encodeURIComponent("Give the habit a name."));
  await createHabit({ title, description: str(form, "description", 300) || null, icon: str(form, "icon", 8) || "✅" });
  revalidatePath("/coach/habits");
  redirect("/coach/habits?msg=created");
}

export async function updateHabitAction(id: string, form: FormData): Promise<void> {
  await requireCoach("/coach/habits");
  const title = str(form, "title", 80);
  if (!title) redirect("/coach/habits?error=" + encodeURIComponent("The habit needs a name."));
  await updateHabit(id, { title, description: str(form, "description", 300) || null, icon: str(form, "icon", 8) || "✅" });
  redirect("/coach/habits?msg=saved");
}

export async function archiveHabitAction(id: string, archived: boolean): Promise<void> {
  await requireCoach("/coach/habits");
  await updateHabit(id, { archived });
  redirect(`/coach/habits?msg=${archived ? "archived" : "restored"}`);
}

/** Assigns a library habit to a client on chosen weekdays (from the library or the client's Habits tab). */
export async function assignHabitAction(form: FormData): Promise<void> {
  await requireCoach("/coach/habits");
  const clientId = str(form, "clientId", 40);
  const habitId = str(form, "habitId", 40);
  const [client, habit] = await Promise.all([getClient(clientId), getHabit(habitId)]);
  const fallback = client ? `/coach/clients/${client.id}/habits` : "/coach/habits";
  if (!client || !habit) backTo(form, fallback, { error: "Pick a client and a habit." });
  const days = parseDays(form.getAll("days").map(String));
  if (days.length === 0) backTo(form, fallback, { error: "Pick at least one day." });
  const startRaw = str(form, "start", 10);
  const today = todayIn(client.timezone);
  const start = /^\d{4}-\d{2}-\d{2}$/.test(startRaw) && startRaw >= addDays(today, -30) ? startRaw : today;
  const title = str(form, "customTitle", 80) || null;
  await assignHabit({ client_id: client.id, habit_id: habit.id, title, days, start_date: start });
  await addEvent(client.id, "habit_assigned", { habit: title || habit.title });
  revalidatePath(`/coach/clients/${client.id}`, "layout");
  backTo(form, fallback, { msg: "assigned" });
}

export async function updateAssignmentAction(id: string, form: FormData): Promise<void> {
  await requireCoach("/coach/habits");
  const a = await getClientHabit(id);
  if (!a) redirect("/coach");
  const days = parseDays(form.getAll("days").map(String));
  const back = `/coach/clients/${a.client_id}/habits`;
  if (days.length === 0) redirect(`${back}?error=${encodeURIComponent("Pick at least one day.")}`);
  await updateClientHabit(id, { title: str(form, "customTitle", 80) || null, days });
  redirect(`${back}?msg=saved`);
}

export async function removeAssignmentAction(id: string): Promise<void> {
  await requireCoach("/coach/habits");
  const a = await getClientHabit(id);
  if (!a) redirect("/coach");
  const client = await getClient(a.client_id);
  await updateClientHabit(id, { active: false, end_date: addDays(todayIn(client?.timezone), -1) });
  await addEvent(a.client_id, "habit_removed", { habit: a.title || a.habit?.title || "habit" });
  redirect(`/coach/clients/${a.client_id}/habits?msg=removed`);
}
