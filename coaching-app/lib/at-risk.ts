/**
 * At-risk alerts for Tyler: active clients who've gone quiet (not opening the app, not logging anything,
 * no habits ticked, missed check-ins). Shown on the coach Home and Clients pages, and emailed to Tyler once a
 * day ("[At risk] …") from the hourly reminders job.
 */

import { db, q } from "./supabase";
import { addDays, daysBetween, todayIn } from "./dates";
import { habitDueOn, scheduleDueOn } from "./calendar";
import { listChecks, listClientHabits } from "./habits";
import { listSchedules } from "./progress";
import { listClients, type ClientRow } from "./clients";
import { getSettings } from "./settings";
import { atRiskDigestEmail, sendEmail } from "./email";

export type RiskLevel = "high" | "watch";
export type Risk = { clientId: string; name: string; level: RiskLevel; reasons: string[]; lastSeen: string | null };

export type RiskInput = {
  today: string;
  /** Day they last opened the app (their time zone), or null if never. */
  lastSeenDay: string | null;
  /** Most recent day they logged anything: habit tick, weigh-in, check-in, photo or meal. */
  lastLoggedDay: string | null;
  /** Habit-days due over the last 3 days (not counting today) and how many were ticked. */
  habitsDue3: number;
  habitsDone3: number;
  /** Check-ins due more than 3 days ago (latest first) and whether each was sent. */
  recentCheckins: { due: string; sent: boolean }[];
  /** Day coaching (or the live app) started; brand-new clients get a few days' grace. */
  startedDay: string | null;
};

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

/** Pure rules. "high" = reach out now; "watch" = starting to slip. */
export function assessRisk(x: RiskInput): { level: RiskLevel | null; reasons: string[] } {
  if (x.startedDay && daysBetween(x.startedDay, x.today) < 3) return { level: null, reasons: [] };
  const reasons: string[] = [];
  let high = false;
  let watch = false;

  const away = x.lastSeenDay ? daysBetween(x.lastSeenDay, x.today) : null;
  if (away === null) {
    reasons.push("Hasn't opened the app yet");
    high = true;
  } else if (away >= 7) {
    reasons.push(`Hasn't opened the app in ${plural(away, "day")}`);
    high = true;
  } else if (away >= 3) {
    reasons.push(`Hasn't opened the app in ${plural(away, "day")}`);
    watch = true;
  }

  const quiet = x.lastLoggedDay ? daysBetween(x.lastLoggedDay, x.today) : null;
  if (quiet === null) {
    if (away !== null) {
      reasons.push("Hasn't logged anything yet");
      watch = true;
    }
  } else if (quiet >= 7) {
    reasons.push(`Nothing logged in ${plural(quiet, "day")}`);
    high = true;
  } else if (quiet >= 3) {
    reasons.push(`Nothing logged in ${plural(quiet, "day")}`);
    watch = true;
  }

  if (x.habitsDue3 >= 3 && x.habitsDone3 === 0 && !(quiet !== null && quiet >= 3)) {
    reasons.push("No habits ticked in the last 3 days");
    watch = true;
  }

  const [last, before] = x.recentCheckins;
  if (last && !last.sent) {
    if (before && !before.sent) {
      reasons.push("Missed the last 2 check-ins");
      high = true;
    } else {
      reasons.push("Missed their last check-in");
      watch = true;
    }
  }

  return { level: high ? "high" : watch ? "watch" : null, reasons };
}

/** Clients the alerts apply to: active, onboarding finished. */
export function watched(c: ClientRow): boolean {
  return c.stage === "active" && !!c.onboarding_completed_at;
}

const day = (iso: string, tz: string | null) => todayIn(tz ?? undefined, new Date(iso));
const latest = (a: string | null, b: string | null) => (!a ? b : !b ? a : a > b ? a : b);

/** Works out who's at risk right now. Highest risk first. */
export async function loadAtRisk(clients: ClientRow[]): Promise<Risk[]> {
  const list = clients.filter(watched);
  if (!list.length) return [];
  const ids = list.map((c) => q(c.id)).join(",");
  const since = new Date(Date.now() - 30 * 864e5).toISOString();
  const [checks, weighIns, subs, photos, meals, checkinForms] = await Promise.all([
    db<{ client_id: string; created_at: string }[]>(`habit_checks?select=client_id,created_at&client_id=in.(${ids})&created_at=gte.${since}&order=created_at.desc`),
    db<{ client_id: string; created_at: string }[]>(`weigh_ins?select=client_id,created_at&client_id=in.(${ids})&created_at=gte.${since}`),
    db<{ client_id: string; form_id: string; due_date: string; submitted_at: string | null }[]>(
      `form_submissions?select=client_id,form_id,due_date,submitted_at&client_id=in.(${ids})&submitted_at=not.is.null&submitted_at=gte.${since}`,
    ),
    db<{ client_id: string; created_at: string }[]>(`progress_photos?select=client_id,created_at&client_id=in.(${ids})&created_at=gte.${since}`),
    db<{ client_id: string; created_at: string }[]>(`meal_logs?select=client_id,created_at&client_id=in.(${ids})&created_at=gte.${since}`),
    db<{ id: string }[]>(`forms?select=id&kind=eq.checkin`),
  ]);
  const checkinIds = new Set(checkinForms.map((f) => f.id));

  const out: Risk[] = [];
  for (const c of list) {
    const tz = c.timezone;
    const today = todayIn(tz ?? undefined);
    let logged: string | null = null;
    for (const rows of [checks, weighIns, photos, meals]) {
      for (const r of rows) if (r.client_id === c.id) logged = latest(logged, day(r.created_at, tz));
    }
    const sent = subs.filter((s) => s.client_id === c.id);
    for (const s of sent) if (s.submitted_at) logged = latest(logged, day(s.submitted_at, tz));

    // Habits over the last 3 full days.
    const [habits, schedules] = await Promise.all([listClientHabits(c.id, false), listSchedules(c.id)]);
    const d3 = addDays(today, -3);
    const recentChecks = habits.length ? await listChecks(c.id, d3, addDays(today, -1)) : new Set<string>();
    let due3 = 0;
    let done3 = 0;
    for (let d = d3; d < today; d = addDays(d, 1)) {
      for (const h of habits) {
        if (!habitDueOn(h, d)) continue;
        due3++;
        if (recentChecks.has(`${h.id}|${d}`)) done3++;
      }
    }

    // Check-ins due 4–35 days ago, latest first.
    const checkinSchedules = schedules.filter((s) => s.kind === "form" && s.form_id && checkinIds.has(s.form_id));
    const sentDue = new Set(sent.filter((s) => checkinIds.has(s.form_id)).map((s) => s.due_date));
    const recentCheckins: { due: string; sent: boolean }[] = [];
    for (let d = addDays(today, -4); d >= addDays(today, -35) && recentCheckins.length < 2; d = addDays(d, -1)) {
      if (checkinSchedules.some((s) => scheduleDueOn(s, d))) recentCheckins.push({ due: d, sent: sentDue.has(d) });
    }

    const started = [c.onboarding_completed_at ? day(c.onboarding_completed_at, tz) : null, c.start_date].filter(Boolean).sort().pop() ?? null;
    const r = assessRisk({
      today,
      lastSeenDay: c.last_seen_at ? day(c.last_seen_at, tz) : null,
      lastLoggedDay: logged,
      habitsDue3: due3,
      habitsDone3: done3,
      recentCheckins,
      startedDay: started,
    });
    if (r.level) out.push({ clientId: c.id, name: c.full_name, level: r.level, reasons: r.reasons, lastSeen: c.last_seen_at });
  }
  return out.sort((a, b) => (a.level === b.level ? a.name.localeCompare(b.name) : a.level === "high" ? -1 : 1));
}

/** Hour (Eastern time) the daily at-risk email goes out. */
export const DIGEST_HOUR = 9;

/**
 * Once a day at 9am Eastern: emails Tyler the list of at-risk clients (nothing if no one is).
 * Called from the hourly reminders job; `at_risk_digest_log` makes sure it only goes once a day.
 */
export async function sendAtRiskDigest(origin: string, now = new Date()): Promise<{ sent: boolean; clients: number }> {
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", hourCycle: "h23" }).format(now));
  if (hour < DIGEST_HOUR || hour > DIGEST_HOUR + 2) return { sent: false, clients: 0 };
  const today = todayIn("America/New_York", now);
  const claimed = await db<{ day: string }[]>("at_risk_digest_log?on_conflict=day", {
    method: "POST",
    prefer: "resolution=ignore-duplicates,return=representation",
    body: { day: today },
  });
  if (!claimed.length) return { sent: false, clients: 0 };
  const risks = await loadAtRisk(await listClients());
  await db(`at_risk_digest_log?day=eq.${today}`, { method: "PATCH", prefer: "return=minimal", body: { clients: risks.length } });
  if (!risks.length) return { sent: false, clients: 0 };
  const settings = await getSettings();
  await sendEmail({ to: settings.checkin_email || "tyler@vitalfusioncoaching.com", ...atRiskDigestEmail(risks, `${origin}/coach`) });
  return { sent: true, clients: risks.length };
}
