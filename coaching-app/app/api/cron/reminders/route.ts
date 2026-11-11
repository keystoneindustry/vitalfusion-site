import { runReminders } from "@/lib/reminders";
import { env } from "@/lib/env";

/**
 * Hourly: sends the 8am / 7pm reminders for every client whose local time it is.
 * Called by Supabase pg_cron (or Vercel Cron) with "Authorization: Bearer <REMINDERS_SECRET or CRON_SECRET>".
 */

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const auth = request.headers.get("authorization") ?? "";
  const ok = [process.env.REMINDERS_SECRET, process.env.CRON_SECRET].some((s) => s && auth === `Bearer ${s}`);
  if (!ok) return new Response("Unauthorized", { status: 401 });
  const origin = env.appUrl() || new URL(request.url).origin;
  const result = await runReminders(origin);
  return Response.json(result);
}
