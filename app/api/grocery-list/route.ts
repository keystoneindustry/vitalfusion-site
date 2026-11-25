import { NextResponse } from "next/server";
import { GROCERY_LIST, coachGroceryListEmail, groceryListEmail, validateGroceryListLead } from "@/lib/grocery-list";
import { sendEmail } from "@/lib/email";
import { sendResendEvent } from "@/lib/resend-events";
import { recordFunnelLead } from "@/lib/funnel";

export const runtime = "nodejs";

// Free Fat Loss Grocery List request (/grocery-list). The page shows the PDF download straight away, so
// nothing here can block it. This route: emails them the PDF, starts the follow-up emails (Resend
// Automation on `grocery_list.signed_up`), saves the lead for the dashboard and lets the coach know.
// No Resend segment: the plan's 3 segments are used (General covers them).
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

  const v = validateGroceryListLead(body);
  if (!v.ok) return NextResponse.json({ error: "Please fix the highlighted fields.", errors: v.errors }, { status: 422 });
  const lead = v.data;

  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const siteUrl = process.env.SITE_URL || (prod ? `https://${prod}` : new URL(req.url).origin);
  const from = process.env.FROM_EMAIL || "";
  const canEmailLead = from !== "" && !from.includes("resend.dev");
  const notifyTo = process.env.NOTIFY_EMAIL;
  const day = new Date().toISOString().slice(0, 10);

  const [delivery, sequence, funnel, coach] = await Promise.allSettled([
    canEmailLead
      ? sendEmail({ to: lead.email, replyTo: notifyTo, idempotencyKey: `grocery-list-${lead.email}-${day}`, ...groceryListEmail(lead, siteUrl) })
      : Promise.resolve("skipped"),
    // Follow-ups on day 2, 4 and 7 (content and timing live in Resend).
    sendResendEvent(GROCERY_LIST.event, lead.email, { first_name: lead.firstName }),
    // Saved for the dashboard's conversion tracking (lead → application → client).
    recordFunnelLead("grocery_list", { email: lead.email, name: lead.name, source: lead.source }),
    notifyTo ? sendEmail({ to: notifyTo, replyTo: lead.email, ...coachGroceryListEmail(lead) }) : Promise.resolve("skipped"),
  ]);
  if (delivery.status === "rejected") console.error("Grocery list: PDF email failed:", delivery.reason);
  if (sequence.status === "rejected") console.error("Grocery list: sequence event failed:", sequence.reason);
  if (funnel.status === "rejected") console.error("Grocery list: funnel save failed:", funnel.reason);
  if (coach.status === "rejected") console.error("Grocery list: coach email failed:", coach.reason);

  const emailed = canEmailLead && delivery.status === "fulfilled";
  return NextResponse.json({ ok: true, emailed, pdf: GROCERY_LIST.pdf });
}
