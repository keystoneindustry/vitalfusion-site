import { NextResponse } from "next/server";
import { calculate, leadRating, validateQuiz } from "@/lib/macros";
import { sequencePayload } from "@/lib/sequence";
import { sendResendEvent, addToCalculatorSegment } from "@/lib/resend-events";
import { recordFunnelLead } from "@/lib/funnel";
import { coachLeadEmail, leadRow, macroResultsEmail } from "@/lib/macro-email";
import { sendEmail } from "@/lib/email";
import { appendLeadRow } from "@/lib/sheets";

export const runtime = "nodejs";

// Macro quiz submission: email the person their results, notify the coach,
// and add a row to the Google Sheet. Results are also shown on screen by the
// browser, so a failure here never hides someone's numbers.
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Honeypot: real people never fill the hidden "company" field.
  if (body && typeof body === "object" && (body as Record<string, unknown>).company) {
    return NextResponse.json({ ok: true });
  }

  const v = validateQuiz(body);
  if (!v.ok) return NextResponse.json({ error: "Please fix the highlighted fields.", errors: v.errors }, { status: 422 });
  const q = v.data;
  const r = calculate(q);
  // The browser asks /api/macros/meals for the AI sample day at the same time; that route sends the
  // results email (with the sample day). Old clients without it still get the email from here.
  const mealsPending = (body as Record<string, unknown>).mealsPending === true;

  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const siteUrl = process.env.SITE_URL || (prod ? `https://${prod}` : new URL(req.url).origin);
  const from = process.env.FROM_EMAIL || "";
  const canEmailLead = from !== "" && !from.includes("resend.dev");
  const notifyTo = process.env.NOTIFY_EMAIL;

  const tasks: Promise<unknown>[] = [
    appendLeadRow(leadRow(q, r)),
    // Starts the day 2 / 4 / 7 follow-up emails in Resend Automations (content: lib/sequence.ts).
    sendResendEvent("macro_quiz.completed", q.email, sequencePayload(q, r)),
    notifyTo ? sendEmail({ to: notifyTo, replyTo: q.email, ...coachLeadEmail(q, r) }) : Promise.resolve(),
    canEmailLead && !mealsPending ? sendEmail({ to: q.email, replyTo: notifyTo, ...macroResultsEmail(q, r, siteUrl) }) : Promise.resolve(),
    // Adds them to the "Nutrition Plan Calculator" segment in Resend (for manual Broadcasts).
    addToCalculatorSegment(q.email, q.name.trim().split(/\s+/)[0] || ""),
    // Saved for the dashboard's conversion tracking (lead → application → client).
    recordFunnelLead("calculator", { email: q.email, name: q.name, source: q.source, details: { goal: q.goal, rating: leadRating(q) } }),
  ];
  const [sheet, sequence, coach, lead, segment, funnel] = await Promise.allSettled(tasks);
  if (sequence.status === "rejected") console.error("Macro lead: sequence event failed:", sequence.reason);
  if (sheet.status === "rejected") console.error("Macro lead: sheet failed:", sheet.reason);
  if (coach.status === "rejected") console.error("Macro lead: coach email failed:", coach.reason);
  if (lead.status === "rejected") console.error("Macro lead: results email failed:", lead.reason);
  if (segment.status === "rejected") console.error("Macro lead: segment add failed:", segment.reason);
  if (funnel.status === "rejected") console.error("Macro lead: funnel save failed:", funnel.reason);

  const emailed = mealsPending ? true : canEmailLead && lead.status === "fulfilled";
  return NextResponse.json({ ok: true, emailed, results: r }, { status: emailed ? 200 : 202 });
}
