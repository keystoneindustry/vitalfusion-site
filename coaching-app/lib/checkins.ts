/**
 * After a client submits a check-in (or any form): gather the week's numbers, ask the AI for a summary
 * with suggested changes and a draft reply in Tyler's voice, and email it to the coach with a
 * "[Check-in]" subject. Never throws: problems are saved on the submission.
 */

import { listSessions } from "./workouts";
import { bestOf, newRecords } from "./workout-log";
import { COACHING_PLAYBOOK } from "./playbook";
import { getResponse } from "./onboarding-data";
import { coachingDay } from "./resources";
import { askForJson, aiConfigured, type JsonSpec } from "./ai";
import { addDays, todayIn } from "./dates";
import { adherence, habitDueOn, scheduleDueOn } from "./calendar";
import { getClient, type ClientRow } from "./clients";
import { db, q } from "./supabase";
import { answerLines, cleanSummary, getForm, getSubmission, listSubmissions, updateSubmission, type CheckinSummary, type Form, type Submission } from "./forms";
import { habitTitle, listChecks, listClientHabits } from "./habits";
import { listSchedules, listWeighIns, weeklyAverages } from "./progress";
import { getPublishedPlan, hasContent } from "./plans";
import { getSettings } from "./settings";
import { checkinCoachEmail, sendEmail } from "./email";
import { targetLine } from "./targets";

export type WeekNumbers = {
  weighIns: { date: string; weight_lb: number }[];
  thisWeekAvg: number | null;
  lastWeekAvg: number | null;
  changeLb: number | null;
  habits: { title: string; done: number; due: number }[];
  habitTotal: { done: number; due: number };
  photosThisWeek: number;
  targets: string | null;
  /** Logged workouts this week (optional for older saved numbers). */
  workouts?: { logged: number; scheduled: number; lines: string[]; records: string[] };
};

/** Plain-English lines for the email and the AI. */
export function numberLines(n: WeekNumbers): string[] {
  const out: string[] = [];
  if (n.targets) out.push(`Targets: ${n.targets}`);
  if (n.thisWeekAvg !== null) {
    out.push(
      `Weight: ${n.thisWeekAvg} lb average over the last 7 days${
        n.lastWeekAvg !== null ? ` (week before: ${n.lastWeekAvg} lb, change ${n.changeLb! > 0 ? "+" : ""}${n.changeLb} lb)` : ""
      }`,
    );
  } else out.push("Weight: no weigh-ins in the last 7 days");
  if (n.habitTotal.due > 0) {
    out.push(`Habits: ${n.habitTotal.done}/${n.habitTotal.due} done (${Math.round((n.habitTotal.done / n.habitTotal.due) * 100)}%)`);
    for (const h of n.habits) out.push(`  - ${h.title}: ${h.done}/${h.due}`);
  }
  out.push(`Progress photos in the last 7 days: ${n.photosThisWeek}`);
  if (n.workouts && (n.workouts.logged > 0 || n.workouts.scheduled > 0)) {
    out.push(`Workouts logged: ${n.workouts.logged}${n.workouts.scheduled ? ` (${n.workouts.scheduled} on their calendar; logging is optional, so fewer logs doesn't always mean missed workouts)` : ""}`);
    for (const l of n.workouts.lines) out.push(`  - ${l}`);
    if (n.workouts.records.length) out.push(`New personal records: ${n.workouts.records.join("; ")}`);
  }
  return out;
}

export async function weekNumbers(client: ClientRow, endDate: string): Promise<WeekNumbers> {
  const from = addDays(endDate, -6);
  const prevFrom = addDays(endDate, -13);
  const dates = Array.from({ length: 7 }, (_, i) => addDays(from, i));
  const [weighIns, habits, checks, photos, plan, sessions, schedules] = await Promise.all([
    listWeighIns(client.id, 40),
    listClientHabits(client.id, false),
    listChecks(client.id, from, endDate),
    db<{ date: string }[]>(`progress_photos?select=date&client_id=eq.${q(client.id)}&date=gte.${from}&date=lte.${endDate}`),
    getPublishedPlan(client.id),
    listSessions(client.id, 300).catch(() => []),
    listSchedules(client.id).catch(() => []),
  ]);
  const weekSessions = sessions.filter((s) => s.date >= from && s.date <= endDate).sort((a, b) => (a.date < b.date ? -1 : 1));
  const older = sessions.filter((s) => s.date < from);
  const records = weekSessions.flatMap((s, i) => newRecords([...older, ...weekSessions.slice(0, i)], s).map((r) => `${r.name} ${r.best.label}`));
  const scheduled = dates.reduce((n, d) => n + schedules.filter((s) => s.kind === "workout" && scheduleDueOn(s, d)).length, 0);
  const avg = (list: { weight_lb: number }[]) =>
    list.length ? Math.round((list.reduce((a, w) => a + w.weight_lb, 0) / list.length) * 10) / 10 : null;
  const thisWeek = weighIns.filter((w) => w.date >= from && w.date <= endDate);
  const lastWeek = weighIns.filter((w) => w.date >= prevFrom && w.date < from);
  const thisAvg = avg(thisWeek);
  const lastAvg = avg(lastWeek);
  const habitRows = habits
    .map((h) => {
      const due = dates.filter((d) => habitDueOn(h, d)).length;
      const done = dates.filter((d) => habitDueOn(h, d) && checks.has(`${h.id}|${d}`)).length;
      return { title: habitTitle(h), done, due };
    })
    .filter((h) => h.due > 0);
  return {
    weighIns: thisWeek.map((w) => ({ date: w.date, weight_lb: w.weight_lb })),
    thisWeekAvg: thisAvg,
    lastWeekAvg: lastAvg,
    changeLb: thisAvg !== null && lastAvg !== null ? Math.round((thisAvg - lastAvg) * 10) / 10 : null,
    habits: habitRows,
    habitTotal: adherence(habits, checks, dates),
    photosThisWeek: new Set(photos.map((p) => p.date)).size,
    targets: hasContent(plan) ? targetLine(plan.targets) : null,
    workouts: {
      logged: weekSessions.length,
      scheduled,
      lines: weekSessions.map((s) => {
        const top = s.exercises
          .map((e) => ({ e, b: bestOf(e.sets, e.kind) }))
          .filter((x) => x.b)
          .slice(0, 4)
          .map((x) => `${x.e.name} ${x.b!.label}`);
        return `${s.date} ${s.workout_name}${top.length ? `: ${top.join(", ")}` : " (marked done, no numbers)"}`;
      }),
      records,
    },
  };
}

// ───────── AI ─────────

const SYSTEM = `You help Tyler Kendrick, coach at Vital Fusion Coaching, review a client's weekly check-in. Tyler reads your notes and edits the reply before the client sees it.

${COACHING_PLAYBOOK}

Write:
- summary: 3-5 short bullet lines for Tyler (what happened this week, with numbers).
- wins and concerns: short lines.
- suggestions: concrete changes for Tyler to consider, each with a short reason. Empty if nothing should change.
- draftReply: the reply to the client in Tyler's voice: warm and detailed, specific to their answers and numbers, explains the why, plain English, short paragraphs, 120-220 words, at most one emoji, signed "– Tyler". Answer any question they asked (except flagged topics: say Tyler will follow up).`;

const OUTPUT: JsonSpec = {
  name: "checkin_review",
  schema: {
    type: "object",
    properties: {
      summary: { type: "array", items: { type: "string" } },
      wins: { type: "array", items: { type: "string" } },
      concerns: { type: "array", items: { type: "string" } },
      suggestions: { type: "array", items: { type: "object", properties: { change: { type: "string" }, reason: { type: "string" } } } },
      draftReply: { type: "string" },
    },
  },
};

async function aiReview(client: ClientRow, form: Form, sub: Submission, numbers: WeekNumbers, previous: Submission | null): Promise<CheckinSummary> {
  const lines = answerLines(sub.questions.length ? sub.questions : form.questions, sub.answers);
  const [response, weighIns] = await Promise.all([getResponse(client.id).catch(() => null), listWeighIns(client.id, 60).catch(() => [])]);
  const goal = String(response?.answers?.goal ?? "").trim();
  const day = coachingDay(client.start_date, client.end_date, sub.due_date);
  const week = client.start_date && day < 100000 && sub.due_date >= client.start_date ? Math.floor(day / 7) + 1 : null;
  const avgs = weeklyAverages(weighIns.filter((w) => w.date <= sub.due_date)).slice(-4);
  const res = await askForJson({
    system: SYSTEM,
    content: [
      { type: "text", text: `Client: ${client.full_name}${client.billing === "monthly" ? ", monthly coaching (ongoing)" : client.coaching_weeks ? `, ${client.coaching_weeks}-week package` : ""}. Check-in date: ${sub.due_date}.${week ? ` Coaching week ${week}.` : ""}${goal ? ` Goal: ${goal}.` : ""}` },
      ...(avgs.length >= 2
        ? [{ type: "text" as const, text: `WEEKLY AVERAGE WEIGHT (oldest → newest, week starting)\n${avgs.map((a) => `- ${a.week}: ${a.avg} lb (${a.count} weigh-ins)`).join("\n")}` }]
        : []),
      { type: "text", text: `THIS WEEK'S NUMBERS\n${numberLines(numbers).join("\n")}` },
      { type: "text", text: `THEIR ANSWERS\n${lines.map((l) => `${l.section ? `[${l.section}]\n` : ""}- ${l.prompt}: ${l.answer}`).join("\n")}` },
      previous
        ? {
            type: "text",
            text: `LAST CHECK-IN (${previous.due_date})\n${answerLines(previous.questions, previous.answers)
              .map((l) => `- ${l.prompt}: ${l.answer}`)
              .join("\n")}${previous.coach_reply ? `\nTyler's reply then: ${previous.coach_reply}` : ""}`,
          }
        : { type: "text", text: "This is their first check-in." },
    ],
    output: OUTPUT,
    maxTokens: 8000,
    effort: "low",
    timeoutMs: 120_000,
  });
  return cleanSummary(res.data);
}

/** Runs after a submission is saved: AI review (for check-ins) then the email to the coach. */
export async function processSubmission(submissionId: string, origin: string): Promise<void> {
  const sub = await getSubmission(submissionId);
  if (!sub) return;
  const [client, form] = await Promise.all([getClient(sub.client_id), getForm(sub.form_id)]);
  if (!client || !form) return;
  const numbers = await weekNumbers(client, sub.due_date > todayIn(client.timezone) ? todayIn(client.timezone) : sub.due_date);
  let summary: CheckinSummary | null = null;

  if (form.kind === "checkin" && aiConfigured()) {
    try {
      const previous = (await listSubmissions(client.id, 5)).find((x) => x.id !== sub.id && x.form_id === sub.form_id && x.due_date < sub.due_date) ?? null;
      summary = await aiReview(client, form, sub, numbers, previous);
      await updateSubmission(sub.id, { ai_status: "done", ai_summary: summary, ai_error: null });
    } catch (err) {
      console.error("Check-in AI review failed", err);
      await updateSubmission(sub.id, { ai_status: "failed", ai_error: err instanceof Error ? err.message.slice(0, 300) : "AI review failed" }).catch(() => undefined);
    }
  }

  try {
    const settings = await getSettings();
    const msg = checkinCoachEmail({
      clientName: client.full_name,
      formTitle: form.title,
      isCheckin: form.kind === "checkin",
      date: sub.due_date,
      numbers: numberLines(numbers),
      summary,
      answers: answerLines(sub.questions.length ? sub.questions : form.questions, sub.answers),
      link: `${origin}/coach/clients/${client.id}/check-ins/${sub.id}`,
    });
    await sendEmail({ to: settings.checkin_email || "tyler@vitalfusioncoaching.com", ...msg, replyTo: client.email });
  } catch (err) {
    console.error("Check-in email failed", err);
  }
}

/** Re-runs the AI review for one submission (coach button). */
export async function rerunReview(submissionId: string): Promise<void> {
  const sub = await getSubmission(submissionId);
  if (!sub) return;
  const [client, form] = await Promise.all([getClient(sub.client_id), getForm(sub.form_id)]);
  if (!client || !form) return;
  try {
    const numbers = await weekNumbers(client, sub.due_date);
    const previous = (await listSubmissions(client.id, 5)).find((x) => x.id !== sub.id && x.form_id === sub.form_id && x.due_date < sub.due_date) ?? null;
    const summary = await aiReview(client, form, sub, numbers, previous);
    await updateSubmission(sub.id, { ai_status: "done", ai_summary: summary, ai_error: null });
  } catch (err) {
    await updateSubmission(sub.id, { ai_status: "failed", ai_error: err instanceof Error ? err.message.slice(0, 300) : "AI review failed" }).catch(() => undefined);
  }
}
