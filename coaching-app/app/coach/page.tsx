import Link from "next/link";
import { requireCoach } from "@/lib/auth";
import { describeEvent, listClients, type ClientEvent, type ClientRow } from "@/lib/clients";
import { firstName } from "@/lib/client-input";
import { formatDate, timeAgo, todayIn } from "@/lib/dates";
import { formatCallTime } from "@/lib/booking";
import { planSummaries } from "@/lib/plans";
import { awaitingReply } from "@/lib/forms";
import { loadDays, type DayTasks } from "@/lib/client-days";
import { coachFlags } from "@/lib/coach-flags";
import { db } from "@/lib/supabase";

export const metadata = { title: "Home · Vital Fusion Coach" };

function greeting(): string {
  const h = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", hourCycle: "h23" }).format(new Date()));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

type Chip = { text: string; state: "done" | "due" | "plain" };

function chipsFor(d: DayTasks): Chip[] {
  const out: Chip[] = [];
  for (const w of d.workouts) out.push({ text: `🏋️ ${w.name}`, state: "plain" });
  for (const f of d.forms) out.push({ text: `📝 ${f.title}${f.submitted ? " ✓" : ""}`, state: f.submitted ? "done" : "due" });
  if (d.weighIn.due) out.push({ text: d.weighIn.weight !== null ? `⚖️ ${d.weighIn.weight} lb ✓` : "⚖️ Weigh-in", state: d.weighIn.weight !== null ? "done" : "due" });
  if (d.photos.due) out.push({ text: `📸 Photos${d.photos.count >= 3 ? " ✓" : d.photos.count ? ` ${d.photos.count}/3` : ""}`, state: d.photos.count >= 3 ? "done" : "due" });
  if (d.habits.length) {
    const done = d.habits.filter((h) => h.done).length;
    out.push({ text: `✅ Habits ${done}/${d.habits.length}`, state: done === d.habits.length ? "done" : "due" });
  }
  return out;
}

/** Tyler's start page: what needs him today and what each client has on today. */
export default async function CoachHome() {
  await requireCoach("/coach");
  const today = todayIn();
  const [clients, plans, unreplied, events] = await Promise.all([
    listClients(),
    planSummaries(),
    awaitingReply(),
    db<ClientEvent[]>(`client_events?select=*&order=created_at.desc&limit=12`),
  ]);
  const current = clients.filter((c) => c.stage !== "finished");
  const flags = coachFlags(current, plans, unreplied, today);
  const name = new Map(clients.map((c) => [c.id, c.full_name]));

  // Calls today (in Tyler's time zone).
  const calls: { client: ClientRow; at: string; kind: string }[] = [];
  for (const c of current) {
    if (c.kickoff_at && todayIn("America/New_York", new Date(c.kickoff_at)) === today) calls.push({ client: c, at: c.kickoff_at, kind: "Kickoff call" });
    if (c.next_call_at && todayIn("America/New_York", new Date(c.next_call_at)) === today) calls.push({ client: c, at: c.next_call_at, kind: "1-on-1 call" });
  }
  calls.sort((a, b) => a.at.localeCompare(b.at));

  // What each coached client has on today (their own time zone).
  const coached = current.filter((c) => c.onboarding_step === "done" && c.stage !== "paused");
  const todays = await Promise.all(
    coached.map(async (c) => {
      const date = todayIn(c.timezone);
      const { days } = await loadDays(c.id, [date]).catch(() => ({ days: [] as DayTasks[] }));
      return { client: c, chips: days[0] ? chipsFor(days[0]) : [] };
    }),
  );
  const recent = events.filter((e) => Date.now() - Date.parse(e.created_at) < 3 * 24 * 3600 * 1000).slice(0, 8);

  return (
    <>
      <p className="eyebrow">{formatDate(today)}</p>
      <h1 className="h1">{greeting()}, Tyler</h1>

      <div className="stat-row">
        <Link href="/coach/clients" className="stat stat-link">
          <b>{current.length}</b>
          <span>clients</span>
        </Link>
        <Link href="/coach/check-ins" className={`stat stat-link${unreplied.length ? " stat-warn" : ""}`}>
          <b>{unreplied.length}</b>
          <span>to reply</span>
        </Link>
        <div className="stat">
          <b>{calls.length}</b>
          <span>call{calls.length === 1 ? "" : "s"} today</span>
        </div>
      </div>

      <div className="detail-grid">
        <div>
          <section className="card card-accent">
            <h2 className="h2">Needs your attention</h2>
            {flags.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>Nothing right now ✓</p>
            ) : (
              <ul className="flags">
                {flags.map((f, i) => (
                  <li key={`${f.id}-${i}`}>
                    <Link href={f.href ?? `/coach/clients/${f.id}`}>{f.text}</Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {calls.length > 0 && (
            <section className="card">
              <h2 className="h2">📞 Calls today</h2>
              <ul className="flags">
                {calls.map((x) => (
                  <li key={`${x.client.id}-${x.at}`}>
                    <Link href={`/coach/clients/${x.client.id}`}>
                      <b>{formatCallTime(x.at).split(" at ")[1]}</b> · {x.kind} with {x.client.full_name}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="card">
            <h2 className="h2">Clients today</h2>
            {todays.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>No clients past onboarding yet.</p>
            ) : (
              <ul className="today-clients">
                {todays.map(({ client, chips }) => (
                  <li key={client.id}>
                    <Link href={`/coach/clients/${client.id}/calendar`}>
                      <b>{client.full_name}</b>
                      <span className="today-chips">
                        {chips.length === 0 ? (
                          <span className="muted small">Nothing scheduled</span>
                        ) : (
                          chips.map((ch) => (
                            <span key={ch.text} className={`today-chip ${ch.state}`}>
                              {ch.text}
                            </span>
                          ))
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div>
          <section className="card">
            <h2 className="h2">Recent activity</h2>
            {recent.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>Nothing in the last few days.</p>
            ) : (
              <ul className="timeline">
                {recent.map((e) => (
                  <li key={e.id}>
                    <Link href={`/coach/clients/${e.client_id}`}>
                      <b>{firstName(name.get(e.client_id) ?? "Client")}</b>: {describeEvent(e)}
                    </Link>
                    <time dateTime={e.created_at}>{timeAgo(e.created_at)}</time>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
