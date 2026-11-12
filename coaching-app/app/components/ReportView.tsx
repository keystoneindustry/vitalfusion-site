import { formatDate } from "@/lib/dates";
import type { Report } from "@/lib/reports";

type Photo = { url: string; date: string } | null;

function change(n: number | null): string {
  if (n === null) return "–";
  return `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n)} lb`;
}

/** Tiny line of the weekly weight averages. */
function WeightLine({ weeks }: { weeks: { week: string; avg: number }[] }) {
  if (weeks.length < 2) return null;
  const w = 300;
  const h = 70;
  const vals = weeks.map((x) => x.avg);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const pts = weeks.map((x, i) => [8 + (i * (w - 16)) / (weeks.length - 1), 8 + ((max - x.avg) / span) * (h - 16)]);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="report-line" role="img" aria-label={`Weekly average weight: ${weeks.map((x) => `${x.avg} lb`).join(", ")}`}>
      <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r="4" fill="var(--gold)" />
      ))}
    </svg>
  );
}

/** A monthly progress report, as the client sees it (also the coach's preview). */
export default function ReportView({ report, before, after }: { report: Report; before: Photo; after: Photo }) {
  const s = report.stats;
  const good = s.weight.change !== null && (s.direction === "lose" ? s.weight.change < 0 : s.direction === "gain" ? s.weight.change > 0 : false);
  return (
    <article className="report">
      <p className="eyebrow">
        {formatDate(report.period_start, false)} – {formatDate(report.period_end, false)}
      </p>
      <h2 className="report-headline">{report.headline || "Your month in review"}</h2>

      <div className="report-stats">
        <div className="report-stat">
          <b className={good ? "good" : ""}>{change(s.weight.change)}</b>
          <span>weight this month</span>
        </div>
        <div className="report-stat">
          <b>{s.habits.pct !== null ? `${s.habits.pct}%` : "–"}</b>
          <span>habits done</span>
        </div>
        <div className="report-stat">
          <b>{s.habits.perfectDays}</b>
          <span>perfect days</span>
        </div>
        <div className="report-stat">
          <b>
            {s.checkins.sent}/{s.checkins.due || s.checkins.sent}
          </b>
          <span>check-ins sent</span>
        </div>
      </div>

      {s.weight.weeks.length >= 2 && (
        <section className="report-block">
          <h3>Weekly average weight</h3>
          <WeightLine weeks={s.weight.weeks} />
          <p className="muted small" style={{ margin: "4px 0 0" }}>
            {s.weight.start} lb → {s.weight.end} lb
            {s.weight.sinceStart !== null ? ` · ${change(s.weight.sinceStart)} since you started` : ""}
          </p>
        </section>
      )}

      {(before || after) && (
        <section className="report-block">
          <h3>Then and now</h3>
          <div className="report-photos">
            {[before, after].map((p, i) =>
              p ? (
                <figure key={i}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt={i === 0 ? "Starting photo" : "Latest photo"} loading="lazy" />
                  <figcaption>{formatDate(p.date)}</figcaption>
                </figure>
              ) : null,
            )}
          </div>
        </section>
      )}

      {report.highlights.length > 0 && (
        <section className="report-block">
          <h3>Highlights</h3>
          <ul className="report-list">
            {report.highlights.map((h, i) => (
              <li key={i}>✅ {h}</li>
            ))}
          </ul>
        </section>
      )}

      {s.wins.length > 0 && (
        <section className="report-block">
          <h3>Wins unlocked</h3>
          <div className="chips">
            {s.wins.map((w, i) => (
              <span key={i} className="pill">
                {w.emoji} {w.title}
              </span>
            ))}
          </div>
        </section>
      )}

      {report.message && (
        <section className="report-block report-message">
          <h3>From Tyler</h3>
          <p>{report.message}</p>
        </section>
      )}

      {report.focus.length > 0 && (
        <section className="report-block">
          <h3>Focus for next month</h3>
          <ul className="report-list">
            {report.focus.map((f, i) => (
              <li key={i}>🎯 {f}</li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
