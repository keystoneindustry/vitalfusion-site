import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { formatDate } from "@/lib/dates";
import { listReports } from "@/lib/reports";
import ProgressTabs from "../ProgressTabs";

export const metadata = { title: "Reports · Vital Fusion" };

/** Progress → Reports: monthly progress reports from Tyler. */
export default async function ReportsPage() {
  const { client } = await requireClient("/progress/reports");
  const reports = await listReports(client.id, true);
  return (
    <>
      <h1 className="h1">Progress</h1>
      <ProgressTabs active="reports" />
      {reports.length === 0 ? (
        <div className="card empty">
          <p style={{ margin: 0 }}>Every month Tyler sends you a progress report: your numbers, your wins and what to focus on next. Your first one shows up here.</p>
        </div>
      ) : (
        <section className="card">
          {reports.map((r) => (
            <Link key={r.id} href={`/progress/reports/${r.id}`} className="report-row">
              <span>
                <b>{r.headline || "Your month in review"}</b>
                <br />
                <span className="muted small">
                  {formatDate(r.period_start, false)} – {formatDate(r.period_end)}
                </span>
              </span>
              {!r.seen_at ? <span className="pill pill-invited">New</span> : <span className="chev" aria-hidden="true">›</span>}
            </Link>
          ))}
        </section>
      )}
    </>
  );
}
