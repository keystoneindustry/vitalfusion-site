import Link from "next/link";
import { notFound } from "next/navigation";
import { requireClient } from "@/lib/auth";
import { formatDate } from "@/lib/dates";
import { answerLines, getForm, getSubmission, updateSubmission } from "@/lib/forms";
import { toLines } from "@/lib/plan";

export const metadata = { title: "Check-in · Vital Fusion" };

export default async function SubmissionPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ sent?: string }> }) {
  const { id } = await params;
  const { sent } = await searchParams;
  const { client } = await requireClient(`/check-ins/${id}`);
  const sub = await getSubmission(id);
  if (!sub || sub.client_id !== client.id) notFound();
  const form = await getForm(sub.form_id);
  if (sub.replied_at && !sub.reply_seen_at) await updateSubmission(sub.id, { reply_seen_at: new Date().toISOString() });

  return (
    <>
      <p className="small">
        <Link href="/check-ins">← Check-ins</Link>
      </p>
      <p className="eyebrow">{formatDate(sub.due_date)}</p>
      <h1 className="h1">{form?.title ?? "Check-in"}</h1>
      {sent && <div className="notice notice-good">Sent ✓ Tyler will read it and reply here.</div>}

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
