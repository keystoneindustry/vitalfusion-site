/**
 * Daily reminders: a morning summary at 8am and an evening nudge at 7pm, in each client's own time zone.
 * Sent as phone notifications when the client has turned them on, otherwise (for the important ones) by email.
 * The hourly job (`app/api/cron/reminders`) calls runReminders(); reminder_log stops anything going out twice.
 */

import { db, q } from "./supabase";
import { todayIn } from "./dates";
import { loadDays, type DayTasks } from "./client-days";
import { listClients, type ClientRow } from "./clients";
import { firstName } from "./client-input";
import { sendPush, pushConfigured, type PushMessage, type PushSubscriptionKeys } from "./push";
import { reminderEmail, sendEmail } from "./email";
import { formatCallTime } from "./booking";

export const MORNING_HOUR = 8;
export const EVENING_HOUR = 19;

/** The hour (0–23) right now in a time zone. */
export function localHour(timeZone: string, now = new Date()): number {
  try {
    return Number(new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", hourCycle: "h23" }).format(now)) % 24;
  } catch {
    return Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", hourCycle: "h23" }).format(now)) % 24;
  }
}

/** Which reminder is due at this hour. A two-hour window lets a late or missed run catch up. */
export function reminderKind(hour: number): "morning" | "evening" | null {
  if (hour >= MORNING_HOUR && hour < MORNING_HOUR + 2) return "morning";
  if (hour >= EVENING_HOUR && hour < EVENING_HOUR + 2) return "evening";
  return null;
}

export type Reminder = { lines: string[]; push: PushMessage; important: boolean };

/** Morning: everything on today's calendar. Null on a day with nothing scheduled. */
export function morningReminder(d: DayTasks, call: string | null = null): Reminder | null {
  const lines: string[] = [];
  if (call) lines.push(`📞 1-on-1 call with Tyler at ${call}`);
  for (const w of d.workouts) lines.push(`🏋️ ${w.name}`);
  for (const f of d.forms.filter((f) => !f.submitted)) lines.push(`📝 ${f.title}`);
  if (d.weighIn.due && d.weighIn.weight === null) lines.push("⚖️ Weigh-in");
  if (d.photos.due && d.photos.count < 3) lines.push("📸 Progress photos");
  const important = lines.length > 0;
  const habits = d.habits.filter((h) => !h.done);
  if (habits.length) lines.push(habits.length === 1 ? `✅ ${habits[0].title}` : `✅ ${habits.length} habits`);
  if (lines.length === 0) return null;
  const first = d.workouts[0]?.name;
  return {
    lines,
    important,
    push: { title: first ? `Today: ${first}` : "Your plan for today", body: lines.map((l) => l.replace(/^\S+\s/, "")).join(" · "), url: "/", tag: "morning" },
  };
}

/** Evening: only what's still open. Null when everything is done. */
export function eveningReminder(d: DayTasks): Reminder | null {
  const open: string[] = [];
  for (const f of d.forms.filter((f) => !f.submitted)) open.push(`📝 ${f.title}`);
  if (d.weighIn.due && d.weighIn.weight === null) open.push("⚖️ Weigh-in");
  if (d.photos.due && d.photos.count < 3) open.push("📸 Progress photos");
  const important = d.forms.some((f) => !f.submitted);
  const habits = d.habits.filter((h) => !h.done);
  if (habits.length) open.push(habits.length === 1 ? `✅ ${habits[0].title}` : `✅ ${habits.length} habits to tick off`);
  if (open.length === 0) return null;
  const form = d.forms.find((f) => !f.submitted);
  return {
    lines: open,
    important,
    push: {
      title: form ? `Don't forget your ${form.title.toLowerCase()}` : "Still to do today",
      body: open.map((l) => l.replace(/^\S+\s/, "")).join(" · "),
      url: form ? `/check-ins/new/${form.formId}?date=${d.date}` : "/",
      tag: "evening",
    },
  };
}

type SubRow = PushSubscriptionKeys & { id: string; client_id: string };

export async function listSubscriptions(clientId: string): Promise<SubRow[]> {
  return db<SubRow[]>(`push_subscriptions?select=id,client_id,endpoint,p256dh,auth&client_id=eq.${q(clientId)}`);
}

/** Sends to every device the client turned notifications on for. True if at least one got it. */
export async function pushToClient(clientId: string, msg: PushMessage): Promise<boolean> {
  if (!pushConfigured()) return false;
  const subs = await listSubscriptions(clientId);
  let ok = false;
  for (const s of subs) {
    const r = await sendPush(s, msg);
    if (r === "ok") {
      ok = true;
      await db(`push_subscriptions?id=eq.${q(s.id)}`, { method: "PATCH", prefer: "return=minimal", body: { last_ok_at: new Date().toISOString() } });
    } else if (r === "gone") {
      await db(`push_subscriptions?id=eq.${q(s.id)}`, { method: "DELETE", prefer: "return=minimal" });
    }
  }
  return ok;
}

/** Claims today's reminder slot; false if it was already handled. */
async function claim(clientId: string, date: string, kind: "morning" | "evening"): Promise<boolean> {
  const rows = await db<unknown[]>("reminder_log?on_conflict=client_id,date,kind", {
    method: "POST",
    prefer: "resolution=ignore-duplicates,return=representation",
    body: { client_id: clientId, date, kind, channel: "none" },
  });
  return rows.length > 0;
}

async function record(clientId: string, date: string, kind: string, channel: "push" | "email" | "none", detail: string) {
  await db(`reminder_log?client_id=eq.${q(clientId)}&date=eq.${date}&kind=eq.${kind}`, {
    method: "PATCH",
    prefer: "return=minimal",
    body: { channel, detail: detail.slice(0, 300) },
  });
}

function wantsReminders(c: ClientRow): boolean {
  return c.onboarding_step === "done" && (c.stage === "active" || c.stage === "onboarding") && c.reminders_enabled !== false;
}

/** One pass of the hourly job. Returns a short summary for the logs. */
export async function runReminders(origin: string, now = new Date()): Promise<{ checked: number; sent: { client: string; kind: string; channel: string }[] }> {
  const clients = (await listClients()).filter(wantsReminders);
  const sent: { client: string; kind: string; channel: string }[] = [];
  for (const c of clients) {
    const kind = reminderKind(localHour(c.timezone, now));
    if (!kind) continue;
    const date = todayIn(c.timezone, now);
    try {
      if (!(await claim(c.id, date, kind))) continue;
      const { days } = await loadDays(c.id, [date]);
      const day = days[0];
      const call = c.next_call_at && todayIn(c.timezone, new Date(c.next_call_at)) === date ? (formatCallTime(c.next_call_at, c.timezone).split(" at ")[1] ?? null) : null;
      const r = day ? (kind === "morning" ? morningReminder(day, call) : eveningReminder(day)) : null;
      if (!r) {
        await record(c.id, date, kind, "none", "nothing due");
        continue;
      }
      if (await pushToClient(c.id, { ...r.push, url: `${origin}${r.push.url ?? "/"}` })) {
        await record(c.id, date, kind, "push", r.push.body);
        sent.push({ client: c.id, kind, channel: "push" });
      } else if (r.important) {
        await sendEmail({ to: c.email, ...reminderEmail(firstName(c.full_name), kind, r.lines, `${origin}${r.push.url ?? "/"}`) });
        await record(c.id, date, kind, "email", r.lines.join(" · "));
        sent.push({ client: c.id, kind, channel: "email" });
      } else {
        await record(c.id, date, kind, "none", "no notifications; habits only");
      }
    } catch (err) {
      console.error("Reminder failed", c.id, err);
    }
  }
  return { checked: clients.length, sent };
}

/** Sends one client's reminder right now (for testing), whatever the time. Not logged, so the real one still goes out. */
export async function sendReminderNow(clientId: string, kind: "morning" | "evening", origin: string): Promise<string> {
  const c = (await listClients()).find((x) => x.id === clientId);
  if (!c) return "no such client";
  const date = todayIn(c.timezone);
  const { days } = await loadDays(c.id, [date]);
  const call = c.next_call_at && todayIn(c.timezone, new Date(c.next_call_at)) === date ? (formatCallTime(c.next_call_at, c.timezone).split(" at ")[1] ?? null) : null;
  const r = days[0] ? (kind === "morning" ? morningReminder(days[0], call) : eveningReminder(days[0])) : null;
  if (!r) return "nothing due today";
  const ok = await pushToClient(c.id, { ...r.push, url: `${origin}${r.push.url ?? "/"}` });
  return ok ? `sent: ${r.push.title} — ${r.push.body}` : "no phone with notifications on";
}
