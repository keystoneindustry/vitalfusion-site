import { db } from "@/lib/supabase";
import { env } from "@/lib/env";
import { type ClientRow } from "@/lib/clients";
import { aiConfigured } from "@/lib/ai";
import { runDraft, startDraft } from "@/lib/plan-draft";
import { formatCallTime } from "@/lib/booking";
import { planDraftCoachEmail, sendEmail } from "@/lib/email";
import { targetLine } from "@/lib/targets";
import { hasContent } from "@/lib/plans";

/**
 * Runs once a day (vercel.json → crons). Drafts the plan for every client whose kickoff call is
 * in the next 40 hours and who doesn't have a plan yet, then emails Tyler. Clients with a YES on
 * the health questions are skipped: Tyler drafts those himself after reviewing.
 */

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const WINDOW_HOURS = 40;
const MAX_PER_RUN = 4;

export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!aiConfigured()) return Response.json({ skipped: "ANTHROPIC_API_KEY not set" });

  const now = new Date();
  const until = new Date(now.getTime() + WINDOW_HOURS * 3600 * 1000);
  const due = await db<ClientRow[]>(
    `clients?select=*&onboarding_step=eq.done&health_flag=eq.false&kickoff_at=gte.${now.toISOString()}&kickoff_at=lte.${until.toISOString()}`,
  );
  const withPlans = new Set(
    (await db<{ client_id: string }[]>(`plans?select=client_id&status=neq.archived`)).map((p) => p.client_id),
  );
  const todo = due.filter((c) => !withPlans.has(c.id)).slice(0, MAX_PER_RUN);

  const origin = env.appUrl() || new URL(request.url).origin;
  const coach = env.coachEmails()[0];
  const results = await Promise.all(
    todo.map(async (client) => {
      const started = await startDraft(client);
      if (!started.ok) return { client: client.full_name, error: started.error };
      await runDraft(started.planId, {
        notifyCoach: async (c, plan) => {
          if (!coach || !hasContent(plan)) return;
          const msg = planDraftCoachEmail({
            clientName: c.full_name,
            kickoff: c.kickoff_at ? formatCallTime(c.kickoff_at, "America/New_York") : null,
            targets: targetLine(plan.targets),
            notes: plan.content.coachNotes,
            link: `${origin}/coach/clients/${c.id}/plan`,
          });
          await sendEmail({ to: coach, ...msg });
        },
      });
      return { client: client.full_name, drafted: true };
    }),
  );
  return Response.json({ checked: due.length, results });
}
