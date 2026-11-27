import Link from "next/link";
import { requireCoach } from "@/lib/auth";
import { formatCallTime } from "@/lib/booking";
import { listClients, type ClientRow } from "@/lib/clients";
import { coachFlags } from "@/lib/coach-flags";
import { loadPeople } from "@/lib/crm";
import { followUps } from "@/lib/crm-logic";
import { addDays, daysBetween, formatDate, todayIn } from "@/lib/dates";
import { awaitingReply } from "@/lib/forms";
import { listLegalRequests } from "@/lib/legal";
import { planSummaries } from "@/lib/plans";
import { loadAtRisk } from "@/lib/at-risk";
import { followerHistory, latestSnapshot } from "@/lib/social";
import { loadRevenue, money } from "@/lib/stripe";

export const metadata = { title: "Home · Vital Fusion" };

function greeting(): string {
  const h = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", hourCycle: "h23" }).format(new Date()));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

type Todo = { icon: string; title: string; note: string; href: string };

/** Home base: what needs Tyler today across leads, legal and the coaching app, plus how the business is running. */
export default async function HomeBase() {
  await requireCoach("/coach");
  const today = todayIn();
  const safe = <T,>(p: Promise<T>, fallback: T, what: string) =>
    p.catch((err) => {
      console.error(`Home: ${what} failed`, err);
      return fallback;
    });

  const [{ people, funnel }, legal, clients, plans, unreplied, snap, history, revenue] = await Promise.all([
    safe(loadPeople(), { people: [], funnel: [] }, "leads"),
    safe(listLegalRequests(), [], "legal"),
    safe(listClients(), [] as ClientRow[], "clients"),
    safe(planSummaries(), [] as Awaited<ReturnType<typeof planSummaries>>, "plans"),
    safe(awaitingReply(), [] as Awaited<ReturnType<typeof awaitingReply>>, "check-ins"),
    safe(latestSnapshot(), null, "social"),
    safe(followerHistory(8), [], "followers"),
    safe(loadRevenue(), null, "revenue"),
  ]);
  const current = clients.filter((c) => c.stage !== "finished");
  const flags = coachFlags(current, plans, unreplied, today);
  const risks = await safe(loadAtRisk(current), [], "at-risk");
  const due = followUps(people, today);
  const waiting = legal.filter((l) => l.status === "sent");
  const stale = waiting.filter((l) => daysBetween(l.last_sent_at.slice(0, 10), today) >= 2);
  const name = new Map(clients.map((c) => [c.id, c.full_name]));

  const calls: { who: string; at: string; kind: string; id: string }[] = [];
  for (const c of current) {
    if (c.kickoff_at && todayIn("America/New_York", new Date(c.kickoff_at)) === today) calls.push({ who: c.full_name, at: c.kickoff_at, kind: "Kickoff call", id: c.id });
    if (c.next_call_at && todayIn("America/New_York", new Date(c.next_call_at)) === today) calls.push({ who: c.full_name, at: c.next_call_at, kind: "1-on-1 call", id: c.id });
  }
  calls.sort((a, b) => a.at.localeCompare(b.at));

  // Today's list, most important first.
  const todos: Todo[] = [];
  for (const c of calls) todos.push({ icon: "📞", title: `${c.kind} with ${c.who}`, note: formatCallTime(c.at).split(" at ")[1] ?? "Today", href: `/coach/clients/${c.id}` });
  for (const d of due.slice(0, 6)) {
    todos.push({ icon: d.priority === 0 ? "🔥" : "💬", title: `Follow up with ${d.person.name}`, note: d.reason, href: `/coach/crm?show=followup#lead-${d.person.key.replace(/[^a-z0-9]/gi, "-")}` });
  }
  if (due.length > 6) todos.push({ icon: "💬", title: `${due.length - 6} more to follow up with`, note: "See the full list in your CRM", href: "/coach/crm?show=followup" });
  for (const s of unreplied.slice(0, 4)) todos.push({ icon: "📝", title: `Reply to ${name.get(s.client_id) ?? "a client"}'s check-in`, note: `Sent ${formatDate(s.due_date, false)}`, href: "/coach/check-ins" });
  for (const l of stale) todos.push({ icon: "✍️", title: `${l.full_name} hasn't signed their agreement`, note: `${l.opened_at ? "Opened it" : "Hasn't opened it"} · sent ${daysBetween(l.last_sent_at.slice(0, 10), today)} days ago. Resend or text them the link.`, href: "/coach/legal" });
  for (const r of risks.slice(0, 3)) todos.push({ icon: "🚨", title: `Check in with ${r.name}`, note: r.reasons.join(" · "), href: `/coach/clients/${r.clientId}` });
  const otherFlags = Math.max(0, flags.length - new Set(unreplied.map((u) => u.client_id)).size);
  if (otherFlags > 0) todos.push({ icon: "⚑", title: `${otherFlags} thing${otherFlags === 1 ? "" : "s"} to look at in the coaching app`, note: "Plans to review, onboarding, renewals", href: "/coach/app" });

  // How the business is running.
  const weekAgo = addDays(today, -7);
  const twoWeeksAgo = addDays(today, -14);
  const day = (iso: string) => iso.slice(0, 10);
  const leadsThis = funnel.filter((f) => day(f.created_at) > weekAgo).length;
  const leadsPrev = funnel.filter((f) => day(f.created_at) > twoWeeksAgo && day(f.created_at) <= weekAgo).length;
  const appsThis = funnel.filter((f) => f.kind === "application" && day(f.created_at) > weekAgo).length;
  const followers = snap?.account.followers;
  const followerChange = typeof followers === "number" && history.length > 1 ? followers - history[0].followers : null;
  const diff = leadsThis - leadsPrev;

  return (
    <>
      <p className="eyebrow">{formatDate(today)}</p>
      <h1 className="h1">{greeting()}, Tyler</h1>

      <section className="card card-accent">
        <h2 className="h2" style={{ marginTop: 0 }}>Do today</h2>
        {todos.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>You're all caught up ✓</p>
        ) : (
          <ul className="do-list">
            {todos.map((t, i) => (
              <li key={i}>
                <Link href={t.href}>
                  <span className="do-ico" aria-hidden="true">{t.icon}</span>
                  <span className="do-text">
                    <b>{t.title}</b>
                    <span>{t.note}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2 className="h2" style={{ marginTop: 0 }}>How the business is running</h2>
        <div className="kpi-grid">
          <Link href="/coach/crm" className="kpi" style={{ textDecoration: "none" }}>
            <b>{leadsThis}</b>
            <span>new leads, last 7 days</span>
            <em className={diff > 0 ? "up" : diff < 0 ? "down" : ""}>{diff === 0 ? "same as the week before" : `${diff > 0 ? "+" : ""}${diff} vs the week before`}</em>
          </Link>
          <Link href="/coach/crm?show=all" className="kpi" style={{ textDecoration: "none" }}>
            <b>{appsThis}</b>
            <span>applications, last 7 days</span>
            <em>{due.length} lead{due.length === 1 ? "" : "s"} to follow up</em>
          </Link>
          <Link href="/coach/business" className="kpi" style={{ textDecoration: "none" }}>
            <b>{revenue ? money(revenue.thisMonth) : "–"}</b>
            <span>revenue this month</span>
            <em>{revenue ? `${money(revenue.lastMonth)} last month` : "Connect Stripe on the Business tab"}</em>
          </Link>
          <Link href="/coach/social" className="kpi" style={{ textDecoration: "none" }}>
            <b>{typeof followers === "number" ? followers.toLocaleString("en-US") : "–"}</b>
            <span>Instagram followers</span>
            <em className={followerChange === null ? "" : followerChange >= 0 ? "up" : "down"}>
              {followerChange === null ? `${(snap?.account.views ?? 0).toLocaleString("en-US")} views in 28 days` : `${followerChange >= 0 ? "+" : ""}${followerChange} this week`}
            </em>
          </Link>
        </div>
      </section>

      <div className="section-links">
        <Link href="/coach/app">
          <b>Coaching app</b>
          <span>{current.length} client{current.length === 1 ? "" : "s"} · {unreplied.length} check-in{unreplied.length === 1 ? "" : "s"} to reply</span>
        </Link>
        <Link href="/coach/crm">
          <b>CRM</b>
          <span>{people.filter((p) => p.status !== "client" && p.status !== "not_fit").length} open leads</span>
        </Link>
        <Link href="/coach/legal">
          <b>Legal</b>
          <span>{waiting.length} waiting for a signature</span>
        </Link>
        <Link href="/coach/business">
          <b>Business</b>
          <span>Revenue, leads, conversion</span>
        </Link>
        <Link href="/coach/social">
          <b>Social media</b>
          <span>Instagram numbers and best posts</span>
        </Link>
      </div>
    </>
  );
}
