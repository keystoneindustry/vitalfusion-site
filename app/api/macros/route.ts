import { NextResponse } from "next/server";
import { GOALS, calculate, labelOf, leadRating, primaryObstacle, validateQuiz } from "@/lib/macros";
import { sendResendEvent } from "@/lib/resend-events";
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

  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const siteUrl = process.env.SITE_URL || (prod ? `https://${prod}` : new URL(req.url).origin);
  const from = process.env.FROM_EMAIL || "";
  const canEmailLead = from !== "" && !from.includes("resend.dev");
  const notifyTo = process.env.NOTIFY_EMAIL;

  const obstacle = primaryObstacle(q.obstacles);
  const tasks: Promise<unknown>[] = [
    appendLeadRow(leadRow(q, r)),
    // Starts the day 2 / 4 / 7 follow-up emails in Resend Automations.
    sendResendEvent("macro_quiz.completed", q.email, {
      first_name: q.name.split(/\s+/)[0],
      goal: labelOf(GOALS, q.goal),
      obstacle_phrase: obstacle?.phrase ?? "staying consistent",
      obstacle_tip: obstacle?.tip ?? "Aim for 80%, not perfect. Hitting your protein and calories most days beats a perfect week followed by quitting.",
      lead_rating: leadRating(q),
    }),
    notifyTo ? sendEmail({ to: notifyTo, replyTo: q.email, ...coachLeadEmail(q, r) }) : Promise.resolve(),
    canEmailLead ? sendEmail({ to: q.email, replyTo: notifyTo, ...macroResultsEmail(q, r, siteUrl) }) : Promise.resolve(),
  ];
  const [sheet, sequence, coach, lead] = await Promise.allSettled(tasks);
  if (sequence.status === "rejected") console.error("Macro lead: sequence event failed:", sequence.reason);
  if (sheet.status === "rejected") console.error("Macro lead: sheet failed:", sheet.reason);
  if (coach.status === "rejected") console.error("Macro lead: coach email failed:", coach.reason);
  if (lead.status === "rejected") console.error("Macro lead: results email failed:", lead.reason);

  const emailed = canEmailLead && lead.status === "fulfilled";
  return NextResponse.json({ ok: true, emailed, results: r }, { status: emailed ? 200 : 202 });
}
