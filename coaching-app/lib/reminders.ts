/**
 * Daily reminders: a morning summary at 8am and an evening nudge at 7pm, in each client's own time zone.
 * Sent as phone notifications when the client has turned them on, otherwise (for the important ones) by email.
 * The hourly job (`app/api/cron/reminders`) calls runReminders(); reminder_log stops anything going out twice.
 */

import { db, q } from "./supabase";
import { loadDays, type DayTasks } from "./client-days";
import { listClients, type ClientRow } from "./clients";
import { firstName } from "./client-input";
import { sendPush, pushConfigured, type PushMessage, type PushSubscriptionKeys } from "./push";
import { reminderEmail, sendEmail } from "./email";
import { formatCallTime } from "./booking";
import { daysBetween, todayIn } from "./dates";
import { listMeals, logStats } from "./meals";
import { ONBOARDING_STEPS } from "./onboarding";

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
export function morningReminder(d: DayTasks, call: string | null = null, startingPhotos = false): Reminder | null {
  const lines: string[] = [];
  if (startingPhotos) lines.push("📸 Starting progress photos, before you eat");
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
    push: {
      title: first ? `REMINDER: ${first} today` : "REMINDER: Your plan for today",
      // The first workout is already in the title, so the body lists everything else.
      body: lines.filter((l) => !first || l !== `🏋️ ${first}`).map((l) => l.replace(/^\S+\s/, "")).join(" · ") || "Tap to open today's workout.",
      url: first ? `/train?day=${d.workouts[0].day}` : startingPhotos ? "/progress/photos/new" : "/",
      tag: "morning",
    },
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
      title: form ? `REMINDER: Don't forget your ${form.title.toLowerCase()}` : "REMINDER: Still to do today",
      body: open.map((l) => l.replace(/^\S+\s/, "")).join(" · "),
      url: form ? `/check-ins/new/${form.formId}?date=${d.date}` : "/",
      tag: "evening",
    },
  };
}

/**
 * Before the plan is live (the 3–5 days between onboarding and the kickoff call), the only job is photographing
 * meals. Morning: a nudge to log everything (plus the call if it's today). Evening: a nudge only if nothing was logged.
 */
export function foodLogReminder(kind: "morning" | "evening", loggedToday: number, kickoffToday: string | null, startingPhotos = false): Reminder | null {
  if (kind === "morning") {
    const lines: string[] = [];
    if (startingPhotos) lines.push("📸 Starting progress photos, before you eat");
    if (kickoffToday) lines.push(`📞 Kickoff call with Tyler at ${kickoffToday}`);
    lines.push("📷 Photograph everything you eat and drink today");
    return {
      lines,
      important: true,
      push: {
        title: kickoffToday ? `REMINDER: Kickoff call with Tyler at ${kickoffToday}` : "REMINDER: Photograph your meals today",
        body: kickoffToday
          ? "Keep logging your meals until then. Tyler will go over them with you."
          : "Every meal, snack and drink (besides water), before you eat. Tyler builds your plan from these.",
        url: startingPhotos ? "/progress/photos/new" : "/food/new",
        tag: "morning",
      },
    };
  }
  if (loggedToday > 0) return null;
  return {
    lines: ["📷 No meals logged today yet. Add what you ate (a photo of the leftovers or a quick note is fine)"],
    important: true,
    push: {
      title: "REMINDER: Log today's meals",
      body: "Nothing logged today yet. Add what you ate, even without a photo.",
      url: "/food/new",
      tag: "evening",
    },
  };
}

/** Days after the invite on which a client who hasn't finished onboarding gets a nudge email. */
export const ONBOARDING_NUDGE_DAYS = [1, 3, 6];

/** Morning email for a client who was invited but hasn't finished onboarding. */
export function onboardingNudge(stepLabel: string | null): Reminder {
  const lines = stepLabel
    ? [`You're on: ${stepLabel}`, "It takes about 15 minutes in total, and your answers are saved as you go"]
    : ["Open your invite email, or go to the app and sign in with your email", "Setup takes about 15–20 minutes"];
  return {
    lines,
    important: true,
    push: { title: "Finish setting up your coaching", body: lines[0], url: "/", tag: "morning" },
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

/** Clients who've taken at least one progress photo (the rest still owe their starting photos). */
async function clientsWithPhotos(): Promise<Set<string>> {
  const rows = await db<{ client_id: string }[]>("progress_photos?select=client_id").catch(() => []);
  return new Set(rows.map((r) => r.client_id));
}

/** Clients with a published plan. Before that they're in the food-log days before the kickoff call. */
async function clientsWithPlan(): Promise<Set<string>> {
  const rows = await db<{ client_id: string }[]>("plans?select=client_id&status=eq.published").catch(() => []);
  return new Set(rows.map((r) => r.client_id));
}

async function mealsLoggedToday(c: ClientRow, date: string): Promise<number> {
  const logs = await listMeals(c.id, 30).catch(() => []);
  return logStats(logs, c.timezone, date).today;
}

/** Invited (or partway through onboarding), not finished, reminders not turned off. */
function needsOnboardingNudge(c: ClientRow): boolean {
  return c.onboarding_step !== "done" && (c.stage === "invited" || c.stage === "onboarding") && !!c.invited_at && c.reminders_enabled !== false;
}

/** The reminder for one client at this slot, or null. Exported pieces are pure; this one reads the database. */
async function reminderFor(c: ClientRow, kind: "morning" | "evening", date: string, hasPlan: boolean, hasPhotos: boolean): Promise<Reminder | null> {
  if (!hasPlan) {
    // Food-log days: from onboarding to the kickoff call. Nothing after the call day (the plan is on its way).
    const callDay = c.kickoff_at ? todayIn(c.timezone, new Date(c.kickoff_at)) : null;
    if (callDay && callDay < date) return null;
    const callTime = callDay === date && c.kickoff_at ? (formatCallTime(c.kickoff_at, c.timezone).split(" at ")[1] ?? null) : null;
    const logged = kind === "evening" ? await mealsLoggedToday(c, date) : 0;
    return foodLogReminder(kind, logged, callTime, !hasPhotos);
  }
  const { days } = await loadDays(c.id, [date]);
  const day = days[0];
  if (!day) return null;
  const call = c.next_call_at && todayIn(c.timezone, new Date(c.next_call_at)) === date ? (formatCallTime(c.next_call_at, c.timezone).split(" at ")[1] ?? null) : null;
  return kind === "morning" ? morningReminder(day, call, !hasPhotos) : eveningReminder(day);
}

async function deliver(
  c: ClientRow,
  date: string,
  kind: "morning" | "evening",
  r: Reminder,
  origin: string,
  emailOpts: { subject?: string; intro?: string } = {},
): Promise<"push" | "email" | "none"> {
  if (await pushToClient(c.id, { ...r.push, url: `${origin}${r.push.url ?? "/"}` })) {
    await record(c.id, date, kind, "push", r.push.body);
    return "push";
  }
  if (r.important) {
    await sendEmail({ to: c.email, ...reminderEmail(firstName(c.full_name), kind, r.lines, `${origin}${r.push.url ?? "/"}`, emailOpts) });
    await record(c.id, date, kind, "email", r.lines.join(" · "));
    return "email";
  }
  await record(c.id, date, kind, "none", "no notifications; habits only");
  return "none";
}

export async function runReminders(origin: string, now = new Date()): Promise<{ checked: number; sent: { client: string; kind: string; channel: string }[] }> {
  const all = await listClients();
  const clients = all.filter(wantsReminders);
  const sent: { client: string; kind: string; channel: string }[] = [];
  const withPhotos = await clientsWithPhotos();
  const withPlan = await clientsWithPlan();
  for (const c of clients) {
    const kind = reminderKind(localHour(c.timezone, now));
    if (!kind) continue;
    const date = todayIn(c.timezone, now);
    try {
      if (!(await claim(c.id, date, kind))) continue;
      const hasPlan = withPlan.has(c.id);
      const r = await reminderFor(c, kind, date, hasPlan, withPhotos.has(c.id));
      if (!r) {
        await record(c.id, date, kind, "none", "nothing due");
        continue;
      }
      const opts = hasPlan ? {} : kind === "morning" ? { subject: "Photograph your meals today", intro: `Morning, ${firstName(c.full_name)}! Today's job:` } : { subject: "Log today's meals", intro: `${firstName(c.full_name)}, quick reminder:` };
      const channel = await deliver(c, date, kind, r, origin, opts);
      if (channel !== "none") sent.push({ client: c.id, kind, channel });
    } catch (err) {
      console.error("Reminder failed", c.id, err);
    }
  }

  // Invited but not finished onboarding: one morning nudge on days 1, 3 and 6 after the invite.
  for (const c of all.filter(needsOnboardingNudge)) {
    if (reminderKind(localHour(c.timezone, now)) !== "morning") continue;
    const date = todayIn(c.timezone, now);
    const day = daysBetween(todayIn(c.timezone, new Date(c.invited_at!)), date);
    if (!ONBOARDING_NUDGE_DAYS.includes(day)) continue;
    try {
      if (!(await claim(c.id, date, "morning"))) continue;
      const step = c.first_signed_in_at ? (ONBOARDING_STEPS.find((s) => s.id === c.onboarding_step)?.label ?? null) : null;
      const r = onboardingNudge(step);
      const channel = await deliver(c, date, "morning", r, origin, {
        subject: "Finish setting up your coaching app",
        intro: `Hi ${firstName(c.full_name)}, you're almost ready to start. Pick up where you left off:`,
      });
      if (channel !== "none") sent.push({ client: c.id, kind: "onboarding", channel });
    } catch (err) {
      console.error("Onboarding nudge failed", c.id, err);
    }
  }
  return { checked: clients.length, sent };
}

/** Sends one client's reminder right now (for testing), whatever the time. Not logged, so the real one still goes out. */
export async function sendReminderNow(clientId: string, kind: "morning" | "evening", origin: string): Promise<string> {
  const c = (await listClients()).find((x) => x.id === clientId);
  if (!c) return "no such client";
  const date = todayIn(c.timezone);
  const r = await reminderFor(c, kind, date, (await clientsWithPlan()).has(c.id), (await clientsWithPhotos()).has(c.id));
  if (!r) return "nothing due today";
  const ok = await pushToClient(c.id, { ...r.push, url: `${origin}${r.push.url ?? "/"}` });
  return ok ? `sent: ${r.push.title} — ${r.push.body}` : "no phone with notifications on";
}
