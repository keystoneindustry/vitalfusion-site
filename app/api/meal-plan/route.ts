import { NextResponse } from "next/server";
import { mealPlanFor, validateMealPlanLead } from "@/lib/meal-plans";
import { coachMealPlanEmail, mealPlanEmail } from "@/lib/meal-plan-email";
import { sendEmail } from "@/lib/email";
import { addToSegment, MEAL_PLAN_SEGMENT_ID, sendResendEvent } from "@/lib/resend-events";
import { recordFunnelLead } from "@/lib/funnel";

export const runtime = "nodejs";

// Free 60-day meal plan request (/plan/workday, /plan/everyday). The page shows the PDF download
// straight away, so nothing here can block it. This route: emails them the PDF, starts that plan's
// follow-up emails (Resend Automation, event `plan.event`), adds them to the meal plan segment,
// saves the lead for the dashboard and lets the coach know.
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

  const v = validateMealPlanLead(body);
  if (!v.ok) return NextResponse.json({ error: "Please fix the highlighted fields.", errors: v.errors }, { status: 422 });
  const lead = v.data;
  const plan = mealPlanFor(lead.plan)!;

  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const siteUrl = process.env.SITE_URL || (prod ? `https://${prod}` : new URL(req.url).origin);
  const from = process.env.FROM_EMAIL || "";
  const canEmailLead = from !== "" && !from.includes("resend.dev");
  const notifyTo = process.env.NOTIFY_EMAIL;
  const day = new Date().toISOString().slice(0, 10);

  const [delivery, sequence, segment, funnel, coach] = await Promise.allSettled([
    canEmailLead
      ? sendEmail({ to: lead.email, replyTo: notifyTo, idempotencyKey: `meal-plan-${plan.slug}-${lead.email}-${day}`, ...mealPlanEmail(lead, plan, siteUrl) })
      : Promise.resolve("skipped"),
    // Follow-ups on day 2, 5 and 8 (content and timing live in Resend).
    sendResendEvent(plan.event, lead.email, { first_name: lead.firstName, plan: plan.slug, plan_name: plan.name }),
    addToSegment(MEAL_PLAN_SEGMENT_ID, lead.email, lead.firstName),
    // Saved for the dashboard's conversion tracking (lead → application → client).
    recordFunnelLead("meal_plan", { email: lead.email, name: lead.name, source: lead.source, details: { plan: plan.slug } }),
    notifyTo ? sendEmail({ to: notifyTo, replyTo: lead.email, ...coachMealPlanEmail(lead, plan) }) : Promise.resolve("skipped"),
  ]);
  if (delivery.status === "rejected") console.error("Meal plan: PDF email failed:", delivery.reason);
  if (sequence.status === "rejected") console.error("Meal plan: sequence event failed:", sequence.reason);
  if (segment.status === "rejected") console.error("Meal plan: segment add failed:", segment.reason);
  if (funnel.status === "rejected") console.error("Meal plan: funnel save failed:", funnel.reason);
  if (coach.status === "rejected") console.error("Meal plan: coach email failed:", coach.reason);

  const emailed = canEmailLead && delivery.status === "fulfilled";
  return NextResponse.json({ ok: true, emailed, pdf: plan.pdf });
}
