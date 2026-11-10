import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCoach } from "@/lib/auth";
import { describeEvent, getClient, listEvents } from "@/lib/clients";
import { formatDate, timeAgo, todayIn } from "@/lib/dates";
import { checklist } from "@/lib/onboarding";
import { getResponse, latestAgreement } from "@/lib/onboarding-data";
import { summarize } from "@/lib/onboarding-questions";
import { formatCallTime } from "@/lib/booking";
import { PARQ_QUESTIONS } from "@/lib/agreement";
import { listMeals, logStats } from "@/lib/meals";
import { getOpenPlan, getPublishedPlan, hasContent, isDrafting } from "@/lib/plans";
import { macroLine, partState, partStateLabel, perfectDayMacros } from "@/lib/plan";
import { targetLine } from "@/lib/targets";

export const metadata = { title: "Client · Vital Fusion Coach" };

function stamp(ts: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(ts));
}

export default async function ClientOverview({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ invite?: string }>;
}) {
  const { id } = await params;
  const { invite } = await searchParams;
  await requireCoach(`/coach/clients/${id}`);
  const client = await getClient(id);
  if (!client) notFound();

  const [events, agreement, response, meals, open, pub] = await Promise.all([
    listEvents(client.id, 30),
    latestAgreement(client.id),
    getResponse(client.id),
    listMeals(client.id),
    getOpenPlan(client.id),
    getPublishedPlan(client.id),
  ]);
  const food = logStats(meals, client.timezone, todayIn(client.timezone));
  const work = hasContent(open) ? open : null;
  const live = hasContent(pub) ? pub : null;
  const shown = work ?? live;
  const answerGroups = response && Object.keys(response.answers || {}).length ? summarize(response.answers) : [];
  const base = `/coach/clients/${client.id}`;
  const mealsState = partState(work, live, "nutrition");
  const trainingState = partState(work, live, "training");

  return (
    <>
      {invite === "sent" && <div className="notice notice-good">Invite email sent to {client.email} ✓</div>}
      {invite === "failed" && (
        <div className="notice notice-error">
          The invite email didn't send. Check the timeline below for the reason, then try “Resend invite” on the Details tab.
        </div>
      )}

      {client.health_flag && (
        <div className="notice notice-warn">
          <b>⚠️ Answered YES on the health questions.</b> Review before building their plan, and decide whether you need a
          doctor's clearance.
          {agreement && agreement.parq_any_yes && (
            <ul style={{ margin: "8px 0 4px 18px", padding: 0 }}>
              {PARQ_QUESTIONS.filter((_, i) => agreement.parq[i]).map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
          )}
          {client.health_note && (
            <>
              <b>Their explanation:</b> {client.health_note}
            </>
          )}
        </div>
      )}

      <div className="overview-grid">
        <Link href={`${base}/food`} className="overview-card">
          <span className="ov-icon">📷</span>
          <b>Food log</b>
          <span className="muted small">
            {food.total} entr{food.total === 1 ? "y" : "ies"} · {food.days} day{food.days === 1 ? "" : "s"}
          </span>
        </Link>
        <Link href={`${base}/meals`} className={`overview-card state-${mealsState}`}>
          <span className="ov-icon">🍽️</span>
          <b>Meals</b>
          <span className="small">{isDrafting(open, "nutrition") ? "AI drafting…" : partStateLabel(mealsState)}</span>
          {shown && shown.content.meals.length > 0 && (
            <span className="muted small">
              {shown.content.meals.length} meals · {targetLine(shown.targets)}
            </span>
          )}
        </Link>
        <Link href={`${base}/training`} className={`overview-card state-${trainingState}`}>
          <span className="ov-icon">🏋️</span>
          <b>Training</b>
          <span className="small">{isDrafting(open, "training") ? "AI drafting…" : partStateLabel(trainingState)}</span>
          {shown && shown.content.training.days.length > 0 && (
            <span className="muted small">{shown.content.training.days.length} days a week</span>
          )}
        </Link>
      </div>
      {open?.error && open.status !== "drafting" && (
        <div className="notice notice-error">The last AI run didn't finish: {open.error}</div>
      )}

      <div className="detail-grid">
        <div>
          <section className="card">
            <div className="row-between">
              <h2 className="h2" style={{ margin: 0 }}>Onboarding</h2>
              <span className="muted small">
                {client.onboarding_step === "done"
                  ? `Finished ${client.onboarding_completed_at ? timeAgo(client.onboarding_completed_at) : ""}`
                  : "In progress"}
              </span>
            </div>
            <div className="spacer" />
            <ul className="checklist">
              {checklist(client.onboarding_step).map((s) => (
                <li key={s.id} className={s.state}>
                  <span className="tick" aria-hidden="true">
                    {s.state === "done" ? "✓" : ""}
                  </span>
                  <span>
                    {s.label}
                    {s.id === "agreement" && agreement && (
                      <>
                        {" · "}
                        <a href={`${base}/agreement`} target="_blank" rel="noopener noreferrer">
                          signed {formatDate(agreement.signed_at.slice(0, 10), false)} (PDF)
                        </a>
                      </>
                    )}
                    {s.id === "kickoff" && client.kickoff_at && <> · {formatCallTime(client.kickoff_at, client.timezone)}</>}
                    {s.state === "current" && <span className="muted"> · they're here</span>}
                  </span>
                </li>
              ))}
            </ul>
            {answerGroups.length > 0 && (
              <details className="answers">
                <summary>
                  {response?.submitted_at ? "Onboarding answers" : "Onboarding answers so far (not submitted yet)"}
                </summary>
                {answerGroups.map((g) => (
                  <div key={g.section}>
                    <h3>{g.section}</h3>
                    <dl>
                      {g.items.map((item) => (
                        <div key={item.prompt}>
                          <dt>{item.prompt}</dt>
                          <dd>{item.answer}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}
              </details>
            )}
          </section>

          {live && live.content.meals.length > 0 && (
            <section className="card">
              <h2 className="h2">What {client.full_name.split(" ")[0]} sees</h2>
              <dl className="kv">
                <dt>Targets</dt>
                <dd>{targetLine(live.targets)}</dd>
                <dt>Perfect day</dt>
                <dd>{macroLine(perfectDayMacros(live.content))}</dd>
                <dt>Published</dt>
                <dd>{live.published_at ? timeAgo(live.published_at) : "—"}</dd>
              </dl>
            </section>
          )}
        </div>

        <div>
          <section className="card">
            <h2 className="h2">Timeline</h2>
            {events.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>Nothing yet.</p>
            ) : (
              <ul className="timeline">
                {events.map((e) => (
                  <li key={e.id}>
                    {describeEvent(e)}
                    <time dateTime={e.created_at}>{stamp(e.created_at)}</time>
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
