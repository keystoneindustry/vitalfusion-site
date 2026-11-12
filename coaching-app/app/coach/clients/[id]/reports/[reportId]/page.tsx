import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCoach } from "@/lib/auth";
import { getClient } from "@/lib/clients";
import { firstName } from "@/lib/client-input";
import { formatDate, timeAgo } from "@/lib/dates";
import { getReport, isWriting, reportPhotos, statLines } from "@/lib/reports";
import ReportView from "@/app/components/ReportView";
import AutoRefresh from "@/app/components/AutoRefresh";
import SubmitButton from "@/app/components/SubmitButton";
import { deleteReportAction, redraftReportAction, saveReportAction } from "../../report-actions";

export const metadata = { title: "Report · Vital Fusion Coach" };
export const maxDuration = 300;

export default async function CoachReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; reportId: string }>;
  searchParams: Promise<{ msg?: string; error?: string }>;
}) {
  const { id, reportId } = await params;
  const { msg, error } = await searchParams;
  await requireCoach(`/coach/clients/${id}/reports/${reportId}`);
  const [client, report] = await Promise.all([getClient(id), getReport(reportId)]);
  if (!client || !report || report.client_id !== client.id) notFound();
  const photos = await reportPhotos(report);
  const writing = isWriting(report);
  const name = firstName(client.full_name);

  return (
    <>
      <p className="small">
        <Link href={`/coach/clients/${client.id}/reports`}>← All reports</Link>
      </p>
      <h2 className="h2" style={{ fontSize: 22 }}>
        Report · {formatDate(report.period_start, false)} – {formatDate(report.period_end)}
      </h2>
      <p className="muted small" style={{ marginTop: -6 }}>
        {report.status === "sent" ? `Sent ${timeAgo(report.sent_at)}${report.seen_at ? ` · ${name} has seen it` : ` · ${name} hasn't opened it yet`}` : "Draft · only you can see it"}
      </p>
      {msg === "sent" && <div className="notice notice-good">Sent ✓ {name} got an email and a notification, and sees it under Progress → Reports.</div>}
      {msg === "updated" && <div className="notice notice-good">Updated ✓ {name} sees the new version.</div>}
      {msg === "saved" && <div className="notice notice-good">Saved ✓</div>}
      {error && <div className="notice notice-error">{error}</div>}
      {report.ai_error && <div className="notice notice-warn">The AI draft didn't work ({report.ai_error}), so this is a simple starter. Edit it, or try the AI again.</div>}

      {writing ? (
        <section className="card">
          <AutoRefresh seconds={4} />
          <p style={{ margin: 0 }}>✍️ The AI is writing the draft from {name}'s numbers. This takes about 20 seconds…</p>
        </section>
      ) : (
        <div className="review-grid">
          <div className="review-main">
            <form action={saveReportAction.bind(null, report.id)} className="card">
              <h2 className="h2">Edit</h2>
              <div className="field">
                <label htmlFor="headline">Headline</label>
                <input id="headline" name="headline" defaultValue={report.headline} maxLength={120} />
              </div>
              <div className="field">
                <label htmlFor="message">Your message</label>
                <textarea id="message" name="message" defaultValue={report.message} rows={9} maxLength={3000} />
              </div>
              <div className="field">
                <label htmlFor="highlights">Highlights (one per line)</label>
                <textarea id="highlights" name="highlights" defaultValue={report.highlights.join("\n")} rows={4} />
              </div>
              <div className="field">
                <label htmlFor="focus">Focus for next month (one per line)</label>
                <textarea id="focus" name="focus" defaultValue={report.focus.join("\n")} rows={3} />
              </div>
              {(report.photo_before || report.photo_after) && (
                <label className="row small check-row" style={{ marginBottom: 14 }}>
                  <input type="checkbox" name="noPhotos" style={{ width: "auto" }} /> Leave the before/after photos out
                </label>
              )}
              <div className="row" style={{ flexWrap: "wrap" }}>
                <button className="btn" type="submit" name="intent" value="send">
                  {report.status === "sent" ? "Save and update" : `Send to ${name}`}
                </button>
                <button className="btn btn-ghost" type="submit" name="intent" value="save">
                  Save
                </button>
              </div>
            </form>
            {report.status === "draft" && (
              <div className="row" style={{ gap: 18 }}>
                <form action={redraftReportAction.bind(null, report.id)}>
                  <SubmitButton className="btn-link" label="↻ Recount and redraft with AI" pendingLabel="Starting…" />
                </form>
                <form action={deleteReportAction.bind(null, report.id)}>
                  <SubmitButton className="btn-link" label="Delete draft" pendingLabel="Deleting…" />
                </form>
              </div>
            )}
            <details className="answers" style={{ marginTop: 14 }}>
              <summary>The numbers behind it</summary>
              <ul className="tips">
                {statLines(report.stats).map((l) => (
                  <li key={l}>{l.trim()}</li>
                ))}
              </ul>
            </details>
          </div>
          <div>
            <p className="eyebrow" style={{ marginTop: 18 }}>What {name} sees</p>
            <ReportView report={report} before={photos.before} after={photos.after} />
          </div>
        </div>
      )}
    </>
  );
}
