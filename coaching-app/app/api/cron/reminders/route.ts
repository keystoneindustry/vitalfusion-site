import { runReminders, sendReminderNow } from "@/lib/reminders";
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
  const url = new URL(request.url);
  const origin = env.appUrl() || url.origin;
  // ?client=<id>&test=morning|evening sends that client's reminder now (testing only).
  const test = url.searchParams.get("test");
  const clientId = url.searchParams.get("client");
  if ((test === "morning" || test === "evening") && clientId) return Response.json({ result: await sendReminderNow(clientId, test, origin) });
  const result = await runReminders(origin);
  return Response.json(result);
}
