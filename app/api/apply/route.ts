import { NextResponse } from "next/server";
import { validateApplication } from "@/lib/application";
import { applicantEmail, coachEmail, sendEmail } from "@/lib/email";
import { saveApplication } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Honeypot: real people never see or fill the "company" field; bots do.
  // Pretend success so the bot moves on.
  if (body && typeof body === "object" && (body as Record<string, unknown>).company) {
    return NextResponse.json({ ok: true });
  }

  const result = validateApplication(body);
  if (!result.ok) {
    return NextResponse.json({ error: "Please fix the highlighted fields.", errors: result.errors }, { status: 422 });
  }
  const app = result.data;

  const notifyTo = process.env.NOTIFY_EMAIL;
  if (!notifyTo) {
    console.error("NOTIFY_EMAIL is not set");
    return NextResponse.json({ error: "Applications are temporarily unavailable." }, { status: 500 });
  }

  // Save and notify in parallel. The application only counts as received if at
  // least one of them succeeds, so a lead is never silently lost.
  const [saved, emailed] = await Promise.allSettled([
    saveApplication(app),
    sendEmail({ to: notifyTo, replyTo: app.email, ...coachEmail(app) }),
  ]);
  if (saved.status === "rejected") console.error("Save failed:", saved.reason);
  if (emailed.status === "rejected") console.error("Notify email failed:", emailed.reason);

  const storageOn = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  const received = emailed.status === "fulfilled" || (storageOn && saved.status === "fulfilled");
  if (!received) {
    return NextResponse.json(
      { error: "Something went wrong sending your application. Please try again in a minute." },
      { status: 502 },
    );
  }

  // Resend's test sender (onboarding@resend.dev) can only email you, so the
  // applicant email turns on once FROM_EMAIL uses your verified domain.
  const from = process.env.FROM_EMAIL || "";
  const canEmailApplicants = from !== "" && !from.includes("resend.dev");
  if (canEmailApplicants && process.env.SEND_APPLICANT_CONFIRMATION !== "false") {
    const siteUrl = process.env.SITE_URL || new URL(req.url).origin;
    await sendEmail({ to: app.email, replyTo: process.env.NOTIFY_EMAIL, ...applicantEmail(app, { siteUrl }) }).catch((e) =>
      console.error("Applicant confirmation failed:", e),
    );
  }

  return NextResponse.json({ ok: true });
}
