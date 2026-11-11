"use server";

import { redirect } from "next/navigation";
import { requireCoach } from "@/lib/auth";
import { addEvent, getClient, type ClientRow } from "@/lib/clients";
import { parseDays } from "@/lib/calendar";
import { isIsoDate, todayIn } from "@/lib/dates";
import { addSchedule, applyDefaultSchedule, endSchedule } from "@/lib/progress";
import { getForm } from "@/lib/forms";

async function loadClient(clientId: string): Promise<ClientRow> {
  await requireCoach(`/coach/clients/${clientId}/progress`);
  const client = await getClient(clientId);
  if (!client) redirect("/coach");
  return client;
}

function back(clientId: string, tab: string, params: Record<string, string>): never {
  redirect(`/coach/clients/${clientId}/${tab}?${new URLSearchParams(params).toString()}`);
}

/** Puts weigh-ins or progress photos on the client's calendar: weekly on chosen days, every N weeks, or one date. */
export async function addScheduleAction(clientId: string, form: FormData): Promise<void> {
  const client = await loadClient(clientId);
  const rawKind = String(form.get("kind") ?? "");
  const formId = rawKind.startsWith("form:") ? rawKind.slice(5) : null;
  const theForm = formId ? await getForm(formId) : null;
  if (formId && !theForm) back(client.id, "progress", { error: "That form doesn't exist anymore." });
  const kind = theForm ? "form" : rawKind === "photos" ? "photos" : "weigh_in";
  const once = String(form.get("once") ?? "").trim();
  const today = todayIn(client.timezone);
  if (form.get("mode") === "once") {
    if (!isIsoDate(once) || once < today) back(client.id, "progress", { error: "Pick a date from today on." });
    await addSchedule({ client_id: client.id, kind, form_id: theForm?.id ?? null, days: [], every_weeks: 1, start_date: once, end_date: once, one_date: once });
  } else {
    const days = parseDays(form.getAll("days").map(String));
    if (days.length === 0) back(client.id, "progress", { error: "Pick at least one day." });
    const every = Math.max(1, Math.min(8, parseInt(String(form.get("every") ?? "1"), 10) || 1));
    await addSchedule({ client_id: client.id, kind, form_id: theForm?.id ?? null, days, every_weeks: every, start_date: today, end_date: client.end_date, one_date: null });
  }
  await addEvent(client.id, "schedule_added", { added: [theForm ? theForm.title : kind === "photos" ? "progress photos" : "weigh-ins"] });
  back(client.id, "progress", { msg: "scheduled" });
}

export async function endScheduleAction(clientId: string, scheduleId: string, tab: string): Promise<void> {
  const client = await loadClient(clientId);
  await endSchedule(scheduleId, client.id);
  back(client.id, tab === "calendar" ? "calendar" : "progress", { msg: "removed" });
}

/** Puts one workout from their program on chosen weekdays (Calendar tab). */
export async function addWorkoutAction(clientId: string, form: FormData): Promise<void> {
  const client = await loadClient(clientId);
  const day = parseInt(String(form.get("workout") ?? ""), 10);
  const days = parseDays(form.getAll("days").map(String));
  const month = String(form.get("m") ?? "");
  const keep: Record<string, string> = /^\d{4}-\d{2}$/.test(month) ? { m: month } : {};
  if (!Number.isInteger(day) || day < 0 || day > 13) back(client.id, "calendar", { ...keep, error: "Pick a workout." });
  if (days.length === 0) back(client.id, "calendar", { ...keep, error: "Pick at least one day." });
  const every = Math.max(1, Math.min(8, parseInt(String(form.get("every") ?? "1"), 10) || 1));
  const today = todayIn(client.timezone);
  await addSchedule({ client_id: client.id, kind: "workout", workout_day: day, form_id: null, days, every_weeks: every, start_date: today, end_date: client.end_date, one_date: null });
  await addEvent(client.id, "schedule_added", { added: [`workout ${day + 1}`] });
  back(client.id, "calendar", { ...keep, msg: "scheduled" });
}

/** Adds the starting setup (step goal, weigh-ins, photos) — whatever the client doesn't have yet. */
export async function applyDefaultsAction(clientId: string, tab: string): Promise<void> {
  const client = await loadClient(clientId);
  const added = await applyDefaultSchedule(client);
  back(client.id, tab === "habits" ? "habits" : "progress", { msg: added.length ? "defaults" : "nothing" });
}
