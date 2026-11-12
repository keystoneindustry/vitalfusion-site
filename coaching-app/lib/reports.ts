/**
 * Monthly progress reports. Tyler creates one per client (last 4 weeks); the numbers are worked out here,
 * the AI drafts a headline, a short message in Tyler's voice, highlights and next-month focus, Tyler edits
 * it, then sends it: the client sees it in the app (Progress → Reports) and gets an email and a push.
 */

import { db, q } from "./supabase";
import { addDays } from "./dates";
import { adherence, habitDueOn, scheduleDueOn } from "./calendar";
import { listChecks, listClientHabits } from "./habits";
import { listPhotos, listSchedules, listWeighIns, PHOTO_BUCKET } from "./progress";
import { signedUrls } from "./storage";
import { getResponse } from "./onboarding-data";
import { goalDirection, habitStreaks } from "./milestones";
import { askForJson, aiConfigured, type JsonSpec } from "./ai";
import type { ClientRow } from "./clients";

export const REPORT_DAYS = 28;

export type ReportStats = {
  goal: string;
  direction: "lose" | "gain" | null;
  weight: {
    start: number | null;
    end: number | null;
    change: number | null;
    /** Since their very first weigh-in. */
    sinceStart: number | null;
    weighIns: number;
    /** Weekly averages in the period, oldest first. */
    weeks: { week: string; avg: number }[];
  };
  habits: { done: number; due: number; pct: number | null; perfectDays: number; bestStreak: number; byHabit: { title: string; done: number; due: number }[] };
  checkins: { sent: number; due: number };
  wins: { title: string; emoji: string }[];
  photoDays: number;
};

export type Report = {
  id: string;
  client_id: string;
  period_start: string;
  period_end: string;
  stats: ReportStats;
  headline: string;
  message: string;
  highlights: string[];
  focus: string[];
  photo_before: string | null;
  photo_after: string | null;
  status: "draft" | "sent";
  ai_error: string | null;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
  seen_at: string | null;
};

const round1 = (n: number) => Math.round(n * 10) / 10;
const avg = (xs: number[]) => (xs.length ? round1(xs.reduce((a, b) => a + b, 0) / xs.length) : null);

/** Weight numbers for a period: start = first 7 days' average (else the last weigh-in before), end = last 7 days'. */
export function weightStats(all: { date: string; weight: number }[], start: string, end: string): ReportStats["weight"] {
  const sorted = [...all].sort((a, b) => (a.date < b.date ? -1 : 1));
  const inPeriod = sorted.filter((w) => w.date >= start && w.date <= end);
  const firstWeek = inPeriod.filter((w) => w.date <= addDays(start, 6)).map((w) => w.weight);
  const before = sorted.filter((w) => w.date < start).pop();
  const startW = firstWeek.length ? avg(firstWeek) : before ? before.weight : null;
  const lastWeek = inPeriod.filter((w) => w.date >= addDays(end, -6)).map((w) => w.weight);
  const endW = lastWeek.length ? avg(lastWeek) : inPeriod.length ? inPeriod[inPeriod.length - 1].weight : null;
  const weeks: { week: string; avg: number }[] = [];
  for (let w = start; w <= end; w = addDays(w, 7)) {
    const vals = inPeriod.filter((x) => x.date >= w && x.date <= addDays(w, 6)).map((x) => x.weight);
    const a = avg(vals);
    if (a !== null) weeks.push({ week: w, avg: a });
  }
  const first = sorted[0];
  return {
    start: startW,
    end: endW,
    change: startW !== null && endW !== null && inPeriod.length ? round1(endW - startW) : null,
    sinceStart: first && endW !== null && first.date < (inPeriod[0]?.date ?? end) ? round1(endW - first.weight) : null,
    weighIns: inPeriod.length,
    weeks,
  };
}

/** Works out a report's numbers for one client and period. */
export async function buildStats(client: ClientRow, start: string, end: string): Promise<{ stats: ReportStats; photoBefore: string | null; photoAfter: string | null }> {
  const [habits, schedules, weighIns, photos, response, checkinForms, wins] = await Promise.all([
    listClientHabits(client.id, false),
    listSchedules(client.id),
    listWeighIns(client.id, 500),
    listPhotos(client.id),
    getResponse(client.id),
    db<{ id: string }[]>(`forms?select=id&kind=eq.checkin`),
    db<{ title: string; emoji: string; achieved_at: string }[]>(
      `client_milestones?select=title,emoji,achieved_at&client_id=eq.${q(client.id)}&achieved_at=gte.${start}T00:00:00Z&achieved_at=lt.${addDays(end, 1)}T12:00:00Z&order=achieved_at.asc`,
    ),
  ]);
  const dates: string[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) dates.push(d);
  const checks = habits.length ? await listChecks(client.id, start, end) : new Set<string>();
  const total = adherence(habits, checks, dates);
  const streaks = habitStreaks(habits, checks, start, end);
  const byHabit = habits
    .map((h) => ({
      title: h.title || h.habit?.title || "Habit",
      due: dates.filter((d) => habitDueOn(h, d)).length,
      done: dates.filter((d) => habitDueOn(h, d) && checks.has(`${h.id}|${d}`)).length,
    }))
    .filter((h) => h.due > 0);

  const ids = new Set(checkinForms.map((f) => f.id));
  const checkinSchedules = schedules.filter((s) => s.kind === "form" && s.form_id && ids.has(s.form_id));
  const due = dates.filter((d) => checkinSchedules.some((s) => scheduleDueOn(s, d))).length;
  const sent = ids.size
    ? (
        await db<{ id: string }[]>(
          `form_submissions?select=id&client_id=eq.${q(client.id)}&form_id=in.(${[...ids].map(q).join(",")})&due_date=gte.${start}&due_date=lte.${end}&submitted_at=not.is.null`,
        )
      ).length
    : 0;

  const goal = String(response?.answers?.goal ?? "");
  const fronts = photos.filter((p) => p.pose === "front").sort((a, b) => (a.date < b.date ? -1 : 1));
  const before = fronts[0] ?? null;
  const after = [...fronts].reverse().find((p) => p.date <= end && (!before || p.date > before.date)) ?? null;

  return {
    stats: {
      goal,
      direction: goalDirection(goal),
      weight: weightStats(weighIns.map((w) => ({ date: w.date, weight: w.weight_lb })), start, end),
      habits: { ...total, pct: total.due ? Math.round((total.done / total.due) * 100) : null, perfectDays: streaks.perfectDays, bestStreak: streaks.best, byHabit },
      checkins: { sent, due: Math.max(due, sent) },
      wins: wins.map((w) => ({ title: w.title, emoji: w.emoji })),
      photoDays: new Set(photos.filter((p) => p.date >= start && p.date <= end).map((p) => p.date)).size,
    },
    photoBefore: before?.path ?? null,
    photoAfter: after?.path ?? null,
  };
}

/** Plain lines of the numbers, for the AI and the coach email. */
export function statLines(s: ReportStats): string[] {
  const lines: string[] = [];
  const w = s.weight;
  if (w.start !== null && w.end !== null && w.change !== null)
    lines.push(`Weight: ${w.start} → ${w.end} lb (${w.change > 0 ? "+" : ""}${w.change} lb this month, ${w.weighIns} weigh-ins)`);
  else lines.push(`Weight: ${w.weighIns} weigh-ins this month (not enough to compare)`);
  if (w.sinceStart !== null) lines.push(`Since their first weigh-in: ${w.sinceStart > 0 ? "+" : ""}${w.sinceStart} lb`);
  if (s.habits.pct !== null) lines.push(`Habits: ${s.habits.done} of ${s.habits.due} done (${s.habits.pct}%), ${s.habits.perfectDays} perfect days, best streak ${s.habits.bestStreak} days`);
  for (const h of s.habits.byHabit) lines.push(`  - ${h.title}: ${h.done}/${h.due}`);
  lines.push(`Check-ins: ${s.checkins.sent} of ${s.checkins.due} sent`);
  if (s.wins.length) lines.push(`Milestones reached: ${s.wins.map((x) => x.title).join(", ")}`);
  lines.push(`Progress photo days: ${s.photoDays}`);
  return lines;
}

// ───────── AI draft ─────────

const SYSTEM = `You write a client's monthly progress report for Tyler Kendrick, coach at Vital Fusion Coaching. Tyler reads and edits it before the client sees it.

Write in Tyler's voice, to the client ("you"): warm, direct, specific, plain English, encouraging but honest. Use their real numbers. Never invent numbers. Celebrate effort and consistency, not only the scale. If weight moved the wrong way or adherence was low, say so kindly and turn it into one clear focus. Nothing medical.

Fields:
- headline: one short upbeat line about the month (max 70 characters), e.g. "Down 4.2 lb and 22 perfect days".
- message: 90-160 words, short paragraphs, at most one emoji, signed "– Tyler".
- highlights: 3 short wins from the numbers (max 70 characters each).
- focus: 1-2 concrete things to focus on next month (max 90 characters each).`;

const OUTPUT: JsonSpec = {
  name: "progress_report",
  schema: {
    type: "object",
    properties: {
      headline: { type: "string" },
      message: { type: "string" },
      highlights: { type: "array", items: { type: "string" } },
      focus: { type: "array", items: { type: "string" } },
    },
  },
};

type Draft = { headline: string; message: string; highlights: string[]; focus: string[] };

const clip = (s: unknown, n: number) => (typeof s === "string" ? s.trim().slice(0, n) : "");
const list = (v: unknown, max: number, n: number) => (Array.isArray(v) ? v.map((x) => clip(x, n)).filter(Boolean).slice(0, max) : []);

export function cleanDraft(raw: unknown): Draft {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return { headline: clip(r.headline, 120), message: clip(r.message, 3000), highlights: list(r.highlights, 5, 140), focus: list(r.focus, 3, 200) };
}

/** A plain draft when the AI isn't available. */
export function fallbackDraft(firstName: string, s: ReportStats): Draft {
  const highlights: string[] = [];
  if (s.weight.change !== null && s.weight.change !== 0) highlights.push(`${s.weight.change < 0 ? "Down" : "Up"} ${Math.abs(s.weight.change)} lb this month`);
  if (s.habits.pct !== null) highlights.push(`${s.habits.pct}% of habits done`);
  if (s.habits.perfectDays) highlights.push(`${s.habits.perfectDays} perfect days`);
  if (s.checkins.sent) highlights.push(`${s.checkins.sent} check-in${s.checkins.sent === 1 ? "" : "s"} sent`);
  return {
    headline: highlights[0] ?? "Your month in review",
    message: `${firstName}, here's your month in numbers. Proud of the work you're putting in. Keep stacking the small wins.\n\n– Tyler`,
    highlights: highlights.slice(0, 3),
    focus: [],
  };
}

export async function draftWithAi(client: ClientRow, s: ReportStats, start: string, end: string): Promise<Draft> {
  const recent = await db<{ due_date: string; ai_summary: { summary?: string[] } | null; coach_reply: string | null }[]>(
    `form_submissions?select=due_date,ai_summary,coach_reply&client_id=eq.${q(client.id)}&due_date=gte.${start}&due_date=lte.${end}&submitted_at=not.is.null&order=due_date.asc`,
  ).catch(() => []);
  const res = await askForJson({
    system: SYSTEM,
    content: [
      { type: "text", text: `Client: ${client.full_name}. Goal: ${s.goal || "not given"}. Their why: ${client.why || "not given"}. Report period: ${start} to ${end}.` },
      { type: "text", text: `THE MONTH'S NUMBERS\n${statLines(s).join("\n")}` },
      {
        type: "text",
        text: recent.length
          ? `CHECK-INS THIS MONTH\n${recent.map((r) => `${r.due_date}: ${(r.ai_summary?.summary ?? []).join(" ")}${r.coach_reply ? ` | Tyler replied: ${r.coach_reply.slice(0, 400)}` : ""}`).join("\n")}`
          : "No check-ins this month.",
      },
    ],
    output: OUTPUT,
    maxTokens: 4000,
    effort: "low",
    timeoutMs: 120_000,
  });
  return cleanDraft(res.data);
}

// ───────── Database ─────────

export async function listReports(clientId: string, sentOnly = false): Promise<Report[]> {
  return db<Report[]>(`progress_reports?select=*&client_id=eq.${q(clientId)}${sentOnly ? "&status=eq.sent" : ""}&order=period_end.desc,created_at.desc`);
}

export async function getReport(id: string): Promise<Report | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const rows = await db<Report[]>(`progress_reports?select=*&id=eq.${q(id)}`);
  return rows[0] ?? null;
}

export async function updateReport(id: string, patch: Partial<Omit<Report, "id" | "client_id" | "created_at">>): Promise<void> {
  await db(`progress_reports?id=eq.${q(id)}`, { method: "PATCH", prefer: "return=minimal", body: { ...patch, updated_at: new Date().toISOString() } });
}

export async function deleteReport(id: string): Promise<void> {
  await db(`progress_reports?id=eq.${q(id)}&status=eq.draft`, { method: "DELETE", prefer: "return=minimal" });
}

/** Creates a draft for the last 4 weeks (ending `end`) with its numbers; the AI fills the words afterwards. */
export async function createReport(client: ClientRow, end: string): Promise<Report> {
  const start = addDays(end, -(REPORT_DAYS - 1));
  const { stats, photoBefore, photoAfter } = await buildStats(client, start, end);
  const rows = await db<Report[]>("progress_reports", {
    method: "POST",
    prefer: "return=representation",
    body: { client_id: client.id, period_start: start, period_end: end, stats, photo_before: photoBefore, photo_after: photoAfter, status: "draft" },
  });
  return rows[0];
}

/** Fills a draft's words (runs after the page responds). Never throws. */
export async function fillReport(client: ClientRow, report: Report): Promise<void> {
  const first = client.full_name.split(" ")[0] || "there";
  try {
    const draft = aiConfigured() ? await draftWithAi(client, report.stats, report.period_start, report.period_end) : fallbackDraft(first, report.stats);
    await updateReport(report.id, { ...draft, ai_error: null });
  } catch (err) {
    console.error("Report draft failed", err);
    await updateReport(report.id, { ...fallbackDraft(first, report.stats), ai_error: err instanceof Error ? err.message.slice(0, 300) : "The AI draft failed." }).catch(() => {});
  }
}

/** True while the AI is still writing a fresh draft. */
export function isWriting(r: Report): boolean {
  return r.status === "draft" && !r.message && !r.ai_error;
}

/** Monthly report due: coaching started at least 4 weeks ago and nothing sent in the last 4 weeks. */
export function reportDue(client: Pick<ClientRow, "start_date" | "stage">, lastSentEnd: string | null, today: string): boolean {
  if (client.stage !== "active" || !client.start_date) return false;
  if (client.start_date > addDays(today, -(REPORT_DAYS - 1))) return false;
  return !lastSentEnd || lastSentEnd <= addDays(today, -REPORT_DAYS);
}

/** Signed links and dates for a report's before/after photos. */
export async function reportPhotos(r: Report): Promise<{ before: { url: string; date: string } | null; after: { url: string; date: string } | null }> {
  const paths = [r.photo_before, r.photo_after].filter((p): p is string => !!p);
  if (!paths.length) return { before: null, after: null };
  const [urls, rows] = await Promise.all([
    signedUrls(PHOTO_BUCKET, paths).catch(() => ({}) as Record<string, string>),
    db<{ path: string; date: string }[]>(`progress_photos?select=path,date&path=in.(${paths.map((p) => `"${p.replace(/"/g, "")}"`).join(",")})`).catch(() => []),
  ]);
  const one = (p: string | null) => {
    if (!p || !urls[p]) return null;
    return { url: urls[p], date: rows.find((x) => x.path === p)?.date ?? "" };
  };
  return { before: one(r.photo_before), after: one(r.photo_after) };
}
