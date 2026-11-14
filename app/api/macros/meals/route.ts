import { NextResponse } from "next/server";
import { calculate, validateQuiz } from "@/lib/macros";
import { aiConfigured } from "@/lib/ai";
import { buildSampleDay, type SampleDay } from "@/lib/sample-day";
import { macroResultsEmail } from "@/lib/macro-email";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";
export const maxDuration = 60;

// Builds the AI sample day for the nutrition plan calculator (see lib/sample-day.ts), returns it to the
// browser, and sends the person their results email with the sample day in it. If the AI is not set
// up, is busy, or fails, the email still goes out with the 3 favourite meals instead.

// The browser sends a random requestId and retries if the connection drops (phones do this during the
// ~20 s wait). Finished days are kept briefly so a retry gets the same day the email has, and the email
// uses the requestId as its idempotency key so a retry never sends it twice.
const recentDays = new Map<string, { at: number; day: SampleDay | null; reason: string; emailed: boolean }>();
function remember(id: string, v: { day: SampleDay | null; reason: string; emailed: boolean }) {
  const now = Date.now();
  for (const [k, x] of recentDays) if (now - x.at > 15 * 60 * 1000) recentDays.delete(k);
  recentDays.set(id, { at: now, ...v });
}

// Light abuse protection: a few builds per person per hour, and a daily cap per server.
const perIp = new Map<string, number[]>();
let day = { date: "", count: 0 };
const DAILY_CAP = Number(process.env.MEAL_AI_DAILY_CAP || 300);

function allowed(ip: string): boolean {
  const now = Date.now();
  const today = new Date().toISOString().slice(0, 10);
  if (day.date !== today) day = { date: today, count: 0 };
  if (day.count >= DAILY_CAP) return false;
  const recent = (perIp.get(ip) ?? []).filter((t) => now - t < 60 * 60 * 1000);
  if (recent.length >= 4) return false;
  recent.push(now);
  perIp.set(ip, recent);
  day.count++;
  return true;
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (body && typeof body === "object" && (body as Record<string, unknown>).company) return NextResponse.json({ ok: true, day: null });

  const raw = body as Record<string, unknown>;
  const requestId = typeof raw.requestId === "string" && /^[\w-]{8,64}$/.test(raw.requestId) ? raw.requestId : "";
  const cached = requestId ? recentDays.get(requestId) : undefined;
  if (cached) return NextResponse.json({ ok: true, day: cached.day, reason: cached.reason, emailed: cached.emailed });

  const v = validateQuiz(body);
  if (!v.ok) return NextResponse.json({ error: "Invalid quiz answers.", errors: v.errors }, { status: 422 });
  const q = v.data;
  const r = calculate(q);

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  let sampleDay: SampleDay | null = null;
  let reason = "";
  if (!aiConfigured()) reason = "ai-not-configured";
  else if (!allowed(ip)) reason = "rate-limited";
  else {
    try {
      sampleDay = await buildSampleDay(q, r);
    } catch (err) {
      reason = "ai-failed";
      console.error("Sample day failed:", err);
    }
  }

  // Results email (with the sample day when we have one).
  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const siteUrl = process.env.SITE_URL || (prod ? `https://${prod}` : new URL(req.url).origin);
  const from = process.env.FROM_EMAIL || "";
  let emailed = false;
  if (from && !from.includes("resend.dev")) {
    try {
      await sendEmail({
        to: q.email,
        replyTo: process.env.NOTIFY_EMAIL,
        idempotencyKey: requestId ? `nutrition-plan-${requestId}` : undefined,
        ...macroResultsEmail(q, r, siteUrl, sampleDay),
      });
      emailed = true;
    } catch (err) {
      console.error("Macro results email failed:", err);
    }
  }

  if (requestId) remember(requestId, { day: sampleDay, reason, emailed });
  return NextResponse.json({ ok: true, day: sampleDay, reason, emailed });
}
