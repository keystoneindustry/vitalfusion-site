"use server";

import { redirect } from "next/navigation";
import { requireCoach } from "@/lib/auth";
import { addEvent, getClient, type ClientRow } from "@/lib/clients";
import { parseDays, type Schedule } from "@/lib/calendar";
import { addDays, isIsoDate, todayIn } from "@/lib/dates";
import { assignHabit, getClientHabit, getHabit, updateClientHabit } from "@/lib/habits";
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

export async function endScheduleAction(clientId: string, scheduleId: string, tab: string): Promise<void> {
  const client = await loadClient(clientId);
  await endSchedule(scheduleId, client.id);
  back(client.id, tab === "calendar" ? "calendar" : "progress", { msg: "removed" });
}

/**
 * Adds anything to a client's calendar from the Calendar tab: a workout from their program, weigh-ins,
 * progress photos, a form (e.g. the weekly check-in) or a habit — on chosen weekdays, or once on a date.
 */
export async function addToCalendarAction(clientId: string, form: FormData): Promise<void> {
  const client = await loadClient(clientId);
  const month = String(form.get("m") ?? "");
  const keep: Record<string, string> = /^\d{4}-\d{2}$/.test(month) ? { m: month } : {};
  const fail = (error: string): never => back(client.id, "calendar", { ...keep, error });
  const what = String(form.get("what") ?? "");
  const today = todayIn(client.timezone);
  const once = form.get("mode") === "once";
  const date = String(form.get("once") ?? "").trim();
  const days = parseDays(form.getAll("days").map(String));
  const every = Math.max(1, Math.min(8, parseInt(String(form.get("every") ?? "1"), 10) || 1));
  if (once && (!isIsoDate(date) || date < today)) fail("Pick a date from today on.");
  if (!once && days.length === 0) fail("Pick at least one day.");

  if (what.startsWith("habit:")) {
    const habit = await getHabit(what.slice(6));
    if (!habit) fail("That habit doesn't exist anymore.");
    if (once) fail("Habits repeat on weekdays. Pick the days instead of one date.");
    const title = String(form.get("customTitle") ?? "").trim().slice(0, 80) || null;
    await assignHabit({ client_id: client.id, habit_id: habit!.id, title, days, start_date: today });
    await addEvent(client.id, "habit_assigned", { habit: title || habit!.title });
    back(client.id, "calendar", { ...keep, msg: "scheduled" });
  }

  let kind: Schedule["kind"];
  let formId: string | null = null;
  let workoutDay: number | null = null;
  let label: string;
  if (what.startsWith("workout:")) {
    workoutDay = parseInt(what.slice(8), 10);
    if (!Number.isInteger(workoutDay) || workoutDay < 0 || workoutDay > 13) fail("Pick a workout.");
    kind = "workout";
    label = `workout ${workoutDay! + 1}`;
  } else if (what.startsWith("form:")) {
    const f = await getForm(what.slice(5));
    if (!f) fail("That form doesn't exist anymore.");
    kind = "form";
    formId = f!.id;
    label = f!.title;
  } else if (what === "photos" || what === "weigh_in") {
    kind = what;
    label = what === "photos" ? "progress photos" : "weigh-ins";
  } else {
    fail("Pick what to add.");
  }
  await addSchedule({
    client_id: client.id,
    kind: kind!,
    form_id: formId,
    workout_day: workoutDay,
    days: once ? [] : days,
    every_weeks: once ? 1 : every,
    start_date: once ? date : today,
    end_date: once ? date : client.end_date,
    one_date: once ? date : null,
  });
  await addEvent(client.id, "schedule_added", { added: [label!] });
  back(client.id, "calendar", { ...keep, msg: "scheduled" });
}

/** Takes a habit off their calendar (from the Calendar tab). */
export async function removeHabitAction(clientId: string, assignmentId: string): Promise<void> {
  const client = await loadClient(clientId);
  const a = await getClientHabit(assignmentId);
  if (!a || a.client_id !== client.id) back(client.id, "calendar", { error: "That habit isn't on their calendar." });
  await updateClientHabit(a!.id, { active: false, end_date: addDays(todayIn(client.timezone), -1) });
  await addEvent(client.id, "habit_removed", { habit: a!.title || a!.habit?.title || "habit" });
  back(client.id, "calendar", { msg: "removed" });
}

/** Adds the starting setup (step goal, weigh-ins, photos) — whatever the client doesn't have yet. */
export async function applyDefaultsAction(clientId: string, tab: string): Promise<void> {
  const client = await loadClient(clientId);
  const added = await applyDefaultSchedule(client);
  back(client.id, tab === "habits" ? "habits" : "calendar", { msg: added.length ? "defaults" : "nothing" });
}
