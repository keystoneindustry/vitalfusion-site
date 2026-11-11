/** Things that need Tyler's attention, for the coach Home page. */

import { daysBetween, formatDate, renewalDue, timeAgo } from "./dates";
import type { ClientRow } from "./clients";
import type { planSummaries } from "./plans";
import type { awaitingReply } from "./forms";

export type Flag = { id: string; text: string; href?: string };

export function coachFlags(
  current: ClientRow[],
  plans: Awaited<ReturnType<typeof planSummaries>>,
  unreplied: Awaited<ReturnType<typeof awaitingReply>>,
  today: string,
): Flag[] {
  const flags: Flag[] = [];
  for (const c of current) {
    if (c.health_flag) {
      flags.push({ id: c.id, text: `⚠️ ${c.full_name} answered YES on the health questions: review before their plan` });
    }
    if (c.stage === "invited" && c.invited_at && !c.first_signed_in_at && daysBetween(c.invited_at.slice(0, 10), today) >= 3) {
      flags.push({ id: c.id, text: `${c.full_name} hasn't opened their invite (sent ${timeAgo(c.invited_at)})` });
    }
    if (c.stage === "invited" && !c.invited_at) {
      flags.push({ id: c.id, text: `${c.full_name} hasn't been sent an invite yet` });
    }
    const waiting = unreplied.filter((x) => x.client_id === c.id);
    if (waiting.length) {
      flags.push({
        id: c.id,
        text: `📝 ${c.full_name} sent ${waiting.length === 1 ? "a check-in" : `${waiting.length} check-ins`}: reply`,
        href: waiting.length === 1 ? `/coach/clients/${c.id}/check-ins/${waiting[0].id}` : `/coach/clients/${c.id}/check-ins`,
      });
    }
    const mine = plans.filter((p) => p.client_id === c.id);
    const isPublished = mine.some((p) => p.status === "published");
    const open = mine.find((p) => p.status !== "published");
    if (open?.error && open.status !== "drafting") {
      flags.push({ id: c.id, text: `${c.full_name}'s AI draft didn't finish: try again`, href: `/coach/clients/${c.id}/meals` });
    } else if (open?.status === "draft" && !isPublished) {
      flags.push({ id: c.id, text: `🧠 ${c.full_name}'s plan draft is ready to review`, href: `/coach/clients/${c.id}/meals` });
    }
    if (c.kickoff_at && Date.parse(c.kickoff_at) < Date.now() && !isPublished && c.onboarding_step === "done") {
      flags.push({
        id: c.id,
        text: `📞 ${c.full_name} had their kickoff call: publish their plan`,
        href: `/coach/clients/${c.id}/meals`,
      });
    }
    if (renewalDue(c.end_date, today) && c.stage !== "paused") {
      flags.push({ id: c.id, text: `${c.full_name}'s package ends ${formatDate(c.end_date, false)}: renewal coming up` });
    }
  }

  return flags;
}
