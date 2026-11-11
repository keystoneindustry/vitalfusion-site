import Link from "next/link";
import { notFound } from "next/navigation";
import { requireClient } from "@/lib/auth";
import { formatDate } from "@/lib/dates";
import { answerLines, getForm, getSubmission, updateSubmission } from "@/lib/forms";
import { toLines } from "@/lib/plan";
import { getSettings } from "@/lib/settings";
import { bookingUrl, formatCallTime } from "@/lib/booking";
import { addDays, todayIn } from "@/lib/dates";

export const metadata = { title: "Check-in · Vital Fusion" };

export default async function SubmissionPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ sent?: string }> }) {
  const { id } = await params;
  const { sent } = await searchParams;
  const { client } = await requireClient(`/check-ins/${id}`);
  const sub = await getSubmission(id);
  if (!sub || sub.client_id !== client.id) notFound();
  const [form, settings] = await Promise.all([getForm(sub.form_id), getSettings()]);
  const today = todayIn(client.timezone);
  // The optional weekly 1-on-1 call: offered on this week's check-in.
  const recent = sub.due_date >= addDays(today, -6);
  const upcomingCall = client.next_call_at && Date.parse(client.next_call_at) > Date.now() ? client.next_call_at : null;
  const callLink = settings.checkin_link ? bookingUrl(settings.checkin_link, { name: client.full_name, email: client.email, clientId: client.id }) : null;
  if (sub.replied_at && !sub.reply_seen_at) await updateSubmission(sub.id, { reply_seen_at: new Date().toISOString() });

  return (
    <>
      <p className="small">
        <Link href="/check-ins">← Check-ins</Link>
      </p>
      <p className="eyebrow">{formatDate(sub.due_date)}</p>
      <h1 className="h1">{form?.title ?? "Check-in"}</h1>
      {sent && <div className="notice notice-good">Sent ✓ Tyler will read it and reply here.</div>}

      {form?.kind === "checkin" && recent && (upcomingCall || callLink) && (
        <section className="card card-accent">
          <h2 className="h2">📞 1-on-1 call (optional)</h2>
          {upcomingCall ? (
            <p style={{ margin: 0 }}>
              You're booked: <b>{formatCallTime(upcomingCall, client.timezone)}</b>. Need to change it? Use the link in your booking email.
            </p>
          ) : (
            <>
              <p className="coming" style={{ marginTop: 0 }}>Want to talk this week through with Tyler? Pick a time that works for you.</p>
              <a className="btn btn-wide" href={callLink!} target="_blank" rel="noopener noreferrer">
                Book a call
              </a>
            </>
          )}
        </section>
      )}

      {sub.coach_reply ? (
        <section className="card card-accent reply">
          <h2 className="h2">💬 Tyler's reply</h2>
          {toLines(sub.coach_reply.replace(/\n\s*\n/g, "\n")).map((l, i) => (
            <p key={i}>{l}</p>
          ))}
        </section>
      ) : (
        <section className="card">
          <p style={{ margin: 0 }}>⏳ Waiting for Tyler's reply. You'll get an email when it's here.</p>
          {!sub.replied_at && (
            <p className="small" style={{ margin: "8px 0 0" }}>
              <Link href={`/check-ins/new/${sub.form_id}?date=${sub.due_date}`}>Change your answers</Link>
            </p>
          )}
        </section>
      )}

      <details className="t-section" open={!sub.coach_reply}>
        <summary>
          <span aria-hidden="true">📝</span> Your answers
        </summary>
        <dl className="answers-dl">
          {answerLines(sub.questions, sub.answers).map((a, i) => (
            <div key={i}>
              {a.section && <h3 className="answers-section">{a.section}</h3>}
              <dt>{a.prompt}</dt>
              <dd>{a.answer}</dd>
            </div>
          ))}
        </dl>
      </details>
    </>
  );
}
