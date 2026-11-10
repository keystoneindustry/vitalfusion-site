import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCoach } from "@/lib/auth";
import { describeEvent, getClient, listEvents } from "@/lib/clients";
import { stageLabel } from "@/lib/client-input";
import { formatDate, packageLabel, timeAgo, todayIn } from "@/lib/dates";
import { resendInviteAction, updateClientAction } from "../../actions";
import ClientForm from "../../ClientForm";
import SubmitButton from "@/app/components/SubmitButton";
import { checklist } from "@/lib/onboarding";
import { getResponse, latestAgreement } from "@/lib/onboarding-data";
import { summarize } from "@/lib/onboarding-questions";
import { formatCallTime } from "@/lib/booking";
import { PARQ_QUESTIONS } from "@/lib/agreement";
import { listMeals, logStats } from "@/lib/meals";
import { getOpenPlan, getPublishedPlan, hasContent } from "@/lib/plans";
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

export default async function ClientPage({
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
  const [events, agreement, response, meals, openPlan, publishedPlan] = await Promise.all([
    listEvents(client.id),
    latestAgreement(client.id),
    getResponse(client.id),
    listMeals(client.id),
    getOpenPlan(client.id),
    getPublishedPlan(client.id),
  ]);
  const food = logStats(meals, client.timezone, todayIn(client.timezone));
  const planLine = hasContent(publishedPlan)
    ? `Published ${timeAgo(publishedPlan.published_at ?? publishedPlan.updated_at)} · ${targetLine(publishedPlan.targets)}${
        openPlan ? " · unpublished changes" : ""
      }`
    : openPlan?.status === "drafting"
      ? "The AI is drafting it now…"
      : hasContent(openPlan)
        ? `Draft ready to review · ${targetLine(openPlan.targets)}`
        : openPlan?.status === "failed"
          ? "The last draft didn't finish. Open to try again."
          : client.kickoff_at
            ? "Drafts automatically the day before their kickoff call."
            : "Not drafted yet.";
  const today = todayIn();
  const answerGroups = response && Object.keys(response.answers || {}).length ? summarize(response.answers) : [];

  const update = updateClientAction.bind(null, client.id);
  const resend = resendInviteAction.bind(null, client.id);

  return (
    <>
      <p className="small">
        <Link href="/coach">← Clients</Link>
      </p>
      <div className="row-between" style={{ alignItems: "flex-start" }}>
        <div>
          <h1 className="h1">{client.full_name}</h1>
          <p className="muted" style={{ margin: "0 0 16px" }}>
            {packageLabel(client.start_date, client.end_date, today)}
          </p>
        </div>
        <span className={`pill pill-${client.stage}`} style={{ marginTop: 8 }}>
          {stageLabel(client.stage)}
        </span>
      </div>

      {invite === "sent" && <div className="notice notice-good">Invite email sent to {client.email} ✓</div>}
      {invite === "failed" && (
        <div className="notice notice-error">
          The client was saved, but the invite email didn't send. Check the timeline below for the reason, then try
          “Resend invite.”
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
                    <a href={`/coach/clients/${client.id}/agreement`} target="_blank" rel="noopener noreferrer">
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

      {(client.onboarding_step === "done" || meals.length > 0 || openPlan || publishedPlan) && (
        <section className="card card-accent">
          <h2 className="h2">Food log &amp; plan</h2>
          <div className="link-list">
            <Link href={`/coach/clients/${client.id}/food`}>
              📷 Food log: {food.total} entr{food.total === 1 ? "y" : "ies"} over {food.days} day{food.days === 1 ? "" : "s"} →
            </Link>
            <Link href={`/coach/clients/${client.id}/plan`}>🧠 Plan: {planLine} →</Link>
          </div>
        </section>
      )}

      <div className="detail-grid">
        <div>
          <section className="card">
            <h2 className="h2">Details &amp; package</h2>
            <ClientForm
              action={update}
              mode="edit"
              today={today}
              defaults={{
                fullName: client.full_name,
                email: client.email,
                phone: client.phone,
                coachingWeeks: client.coaching_weeks,
                startDate: client.start_date,
                endDate: client.end_date,
                notes: client.notes,
                stage: client.stage,
              }}
            />
          </section>
        </div>

        <div>
          <section className="card">
            <h2 className="h2">App access</h2>
            <dl className="kv">
              <dt>Email</dt>
              <dd>
                <a href={`mailto:${client.email}`}>{client.email}</a>
              </dd>
              {client.phone && (
                <>
                  <dt>Phone</dt>
                  <dd>
                    <a href={`tel:${client.phone.replace(/[^\d+]/g, "")}`}>{client.phone}</a>
                  </dd>
                </>
              )}
              <dt>Invited</dt>
              <dd>{client.invited_at ? timeAgo(client.invited_at) : "Not yet"}</dd>
              <dt>First sign-in</dt>
              <dd>{client.first_signed_in_at ? formatDate(client.first_signed_in_at.slice(0, 10)) : "Not yet"}</dd>
              <dt>Last sign-in</dt>
              <dd>{client.last_seen_at ? timeAgo(client.last_seen_at) : "—"}</dd>
            </dl>
            <div className="spacer" />
            <form action={resend}>
              <SubmitButton
                className="btn btn-ghost btn-wide"
                label={client.invited_at ? "Resend invite email" : "Send invite email"}
                pendingLabel="Sending…"
              />
            </form>
          </section>

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
