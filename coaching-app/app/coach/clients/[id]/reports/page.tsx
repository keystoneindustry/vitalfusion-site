import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCoach } from "@/lib/auth";
import { getClient } from "@/lib/clients";
import { firstName } from "@/lib/client-input";
import { addDays, formatDate, todayIn } from "@/lib/dates";
import { listReports, REPORT_DAYS, reportDue } from "@/lib/reports";
import SubmitButton from "@/app/components/SubmitButton";
import { createReportAction } from "../report-actions";

export const metadata = { title: "Reports · Vital Fusion Coach" };
export const maxDuration = 300;

/** Monthly progress reports for one client. */
export default async function ClientReportsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireCoach(`/coach/clients/${id}/reports`);
  const client = await getClient(id);
  if (!client) notFound();
  const reports = await listReports(client.id);
  const today = todayIn(client.timezone);
  const lastSent = reports.find((r) => r.status === "sent");
  const due = reportDue(client, lastSent?.period_end ?? null, today);
  const draft = reports.find((r) => r.status === "draft");
  const end = addDays(today, -1);

  return (
    <>
      <section className="card card-accent">
        <h2 className="h2">📊 Monthly progress report</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          A summary of {firstName(client.full_name)}'s last {REPORT_DAYS / 7} weeks ({formatDate(addDays(end, -(REPORT_DAYS - 1)), false)} – {formatDate(end, false)}): weight trend,
          habits, check-ins, wins and before/after photos. The AI drafts the message in your voice; you edit it, then send it to their app.
        </p>
        {due && <p className="notice notice-warn" style={{ margin: "0 0 12px" }}>A report is due{lastSent ? ` (last one covered up to ${formatDate(lastSent.period_end, false)})` : ""}.</p>}
        {draft ? (
          <Link className="btn btn-wide" href={`/coach/clients/${client.id}/reports/${draft.id}`}>
            Open the draft
          </Link>
        ) : (
          <form action={createReportAction.bind(null, client.id)}>
            <SubmitButton label="Create this month's report" pendingLabel="Adding up the numbers…" />
          </form>
        )}
      </section>

      <section className="card">
        <h2 className="h2">All reports</h2>
        {reports.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>No reports yet.</p>
        ) : (
          reports.map((r) => (
            <Link key={r.id} href={`/coach/clients/${client.id}/reports/${r.id}`} className="report-row">
              <span>
                <b>
                  {formatDate(r.period_start, false)} – {formatDate(r.period_end)}
                </b>
                <br />
                <span className="muted small">{r.headline || "Drafting…"}</span>
              </span>
              <span className={`pill ${r.status === "sent" ? "pill-active" : "pill-invited"}`}>
                {r.status === "sent" ? (r.seen_at ? "Sent · seen" : "Sent") : "Draft"}
              </span>
            </Link>
          ))
        )}
      </section>
    </>
  );
}
