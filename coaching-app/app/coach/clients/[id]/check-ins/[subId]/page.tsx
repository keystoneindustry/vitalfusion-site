import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCoach } from "@/lib/auth";
import { getClient } from "@/lib/clients";
import { firstName } from "@/lib/client-input";
import { formatDate, timeAgo } from "@/lib/dates";
import { answerLines, getForm, getSubmission } from "@/lib/forms";
import { numberLines, weekNumbers } from "@/lib/checkins";
import SubmitButton from "@/app/components/SubmitButton";
import AutoRefresh from "@/app/components/AutoRefresh";
import { rerunReviewAction, sendReplyAction } from "../../checkin-actions";

export const metadata = { title: "Check-in · Vital Fusion Coach" };
export const maxDuration = 300;

export default async function CoachSubmissionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; subId: string }>;
  searchParams: Promise<{ msg?: string; error?: string }>;
}) {
  const { id, subId } = await params;
  const { msg, error } = await searchParams;
  await requireCoach(`/coach/clients/${id}/check-ins/${subId}`);
  const [client, sub] = await Promise.all([getClient(id), getSubmission(subId)]);
  if (!client || !sub || sub.client_id !== client.id) notFound();
  const [form, numbers] = await Promise.all([getForm(sub.form_id), weekNumbers(client, sub.due_date)]);
  const s = sub.ai_summary;
  const name = firstName(client.full_name);

  return (
    <>
      <p className="small">
        <Link href={`/coach/clients/${client.id}/check-ins`}>← All check-ins</Link>
      </p>
      <h2 className="h2" style={{ fontSize: 22 }}>
        {form?.title ?? "Form"} · {formatDate(sub.due_date)}
      </h2>
      <p className="muted small" style={{ marginTop: -6 }}>
        Sent {timeAgo(sub.submitted_at)}
        {sub.replied_at ? ` · you replied ${timeAgo(sub.replied_at)}${sub.reply_seen_at ? " · they've read it" : ""}` : ""}
      </p>
      {msg === "sent" && <div className="notice notice-good">Reply sent ✓ {name} got an email and sees it in the app.</div>}
      {msg === "updated" && <div className="notice notice-good">Reply updated ✓</div>}
      {error && <div className="notice notice-error">{error}</div>}

      <div className="review-grid">
        <div className="review-main">
          <section className="card">
            <h2 className="h2">📊 This week's numbers</h2>
            <ul className="tips" style={{ padding: "0 0 0 18px" }}>
              {numberLines(numbers).map((l) =>
                l.trimStart().startsWith("- ") ? (
                  <li key={l} className="sub-line">
                    {l.trim().slice(2)}
                  </li>
                ) : (
                  <li key={l}>{l}</li>
                ),
              )}
            </ul>
            <p className="small" style={{ margin: 0 }}>
              <Link href={`/coach/clients/${client.id}/progress`}>Weight & photos →</Link> · <Link href={`/coach/clients/${client.id}/habits`}>Habits →</Link>
            </p>
          </section>

          {sub.ai_status === "pending" && (
            <div className="notice notice-warn">
              <AutoRefresh />⏳ The AI is summarizing this check-in…
            </div>
          )}
          {sub.ai_status === "failed" && <div className="notice notice-error">The AI summary didn't finish: {sub.ai_error}</div>}
          {s && (
            <section className="card card-accent">
              <h2 className="h2">🧠 AI summary</h2>
              <ul className="tips" style={{ padding: "0 0 0 18px" }}>
                {s.summary.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
              {s.wins.length > 0 && (
                <>
                  <h4 className="sum-h">Wins</h4>
                  <ul className="tips" style={{ padding: "0 0 0 18px" }}>
                    {s.wins.map((l) => (
                      <li key={l}>{l}</li>
                    ))}
                  </ul>
                </>
              )}
              {s.concerns.length > 0 && (
                <>
                  <h4 className="sum-h">Watch</h4>
                  <ul className="tips" style={{ padding: "0 0 0 18px" }}>
                    {s.concerns.map((l) => (
                      <li key={l}>{l}</li>
                    ))}
                  </ul>
                </>
              )}
              {s.suggestions.length > 0 && (
                <>
                  <h4 className="sum-h">Suggested changes</h4>
                  <ul className="tips" style={{ padding: "0 0 0 18px" }}>
                    {s.suggestions.map((x) => (
                      <li key={x.change}>
                        <b>{x.change}</b> <span className="muted">· {x.reason}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="small muted" style={{ margin: 0 }}>
                    Make changes on their <Link href={`/coach/clients/${client.id}/meals`}>Meals</Link>, <Link href={`/coach/clients/${client.id}/training`}>Training</Link> or{" "}
                    <Link href={`/coach/clients/${client.id}/habits`}>Habits</Link> tab.
                  </p>
                </>
              )}
            </section>
          )}
          {form?.kind === "checkin" && sub.ai_status !== "pending" && (
            <form action={rerunReviewAction.bind(null, sub.id)} style={{ marginBottom: 14 }}>
              <SubmitButton className="btn-link small" label={s ? "Redo the AI summary" : "Get an AI summary"} pendingLabel="Starting…" />
            </form>
          )}

        </div>

        <div className="review-side">
          <section className="card card-accent" id="reply">
            <h2 className="h2">💬 {sub.replied_at ? "Your reply" : `Reply to ${name}`}</h2>
            {!sub.replied_at && s?.draftReply && <p className="small muted" style={{ marginTop: -6 }}>Drafted by the AI from their answers and numbers. Edit it, then send.</p>}
            <form action={sendReplyAction.bind(null, sub.id)}>
              <textarea name="reply" rows={12} defaultValue={sub.coach_reply ?? s?.draftReply ?? ""} placeholder={`Hey ${name}, …`} />
              <div className="spacer" />
              <SubmitButton label={sub.replied_at ? "Update reply" : `Send to ${name}`} pendingLabel="Sending…" />
              <p className="small muted center" style={{ marginBottom: 0 }}>
                {name} gets an email and sees it in the app.
              </p>
            </form>
          </section>
        </div>

        <div className="review-answers">
          <section className="card">
            <h2 className="h2">📝 {name}'s answers</h2>
            <dl className="answers-dl">
              {answerLines(sub.questions, sub.answers).map((a, i) => (
                <div key={i}>
                  {a.section && <h3 className="answers-section">{a.section}</h3>}
                  <dt>{a.prompt}</dt>
                  <dd>{a.answer}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </div>
    </>
  );
}
