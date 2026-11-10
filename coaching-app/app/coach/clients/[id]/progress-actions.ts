"use server";

import { redirect } from "next/navigation";
import { requireCoach } from "@/lib/auth";
import { addEvent, getClient, type ClientRow } from "@/lib/clients";
import { parseDays } from "@/lib/calendar";
import { isIsoDate, todayIn } from "@/lib/dates";
import { addSchedule, applyDefaultSchedule, endSchedule } from "@/lib/progress";

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
  const kind = form.get("kind") === "photos" ? "photos" : "weigh_in";
  const once = String(form.get("once") ?? "").trim();
  const today = todayIn(client.timezone);
  if (form.get("mode") === "once") {
    if (!isIsoDate(once) || once < today) back(client.id, "progress", { error: "Pick a date from today on." });
    await addSchedule({ client_id: client.id, kind, days: [], every_weeks: 1, start_date: once, end_date: once, one_date: once });
  } else {
    const days = parseDays(form.getAll("days").map(String));
    if (days.length === 0) back(client.id, "progress", { error: "Pick at least one day." });
    const every = Math.max(1, Math.min(8, parseInt(String(form.get("every") ?? "1"), 10) || 1));
    await addSchedule({ client_id: client.id, kind, days, every_weeks: every, start_date: today, end_date: client.end_date, one_date: null });
  }
  await addEvent(client.id, "schedule_added", { added: [kind === "photos" ? "progress photos" : "weigh-ins"] });
  back(client.id, "progress", { msg: "scheduled" });
}

export async function endScheduleAction(clientId: string, scheduleId: string): Promise<void> {
  const client = await loadClient(clientId);
  await endSchedule(scheduleId, client.id);
  back(client.id, "progress", { msg: "removed" });
}

/** Adds the starting setup (step goal, weigh-ins, photos) — whatever the client doesn't have yet. */
export async function applyDefaultsAction(clientId: string, tab: string): Promise<void> {
  const client = await loadClient(clientId);
  const added = await applyDefaultSchedule(client);
  back(client.id, tab === "habits" ? "habits" : "progress", { msg: added.length ? "defaults" : "nothing" });
}
