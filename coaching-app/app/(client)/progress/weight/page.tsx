import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { formatDate, todayIn } from "@/lib/dates";
import { scheduleLabel } from "@/lib/calendar";
import { listSchedules, listWeighIns } from "@/lib/progress";
import { WeightSummary } from "@/app/components/ProgressViews";
import ProgressTabs from "../ProgressTabs";

export const metadata = { title: "Weight · Vital Fusion" };

export default async function WeightPage() {
  const { client } = await requireClient("/progress/weight");
  const today = todayIn(client.timezone);
  const [entries, schedules] = await Promise.all([listWeighIns(client.id, 365), listSchedules(client.id)]);
  const days = schedules.filter((s) => s.kind === "weigh_in").map(scheduleLabel);
  const loggedToday = entries[0]?.date === today;

  return (
    <>
      <h1 className="h1">Your progress</h1>
      <ProgressTabs active="weight" />

      <section className="card">
        <WeightSummary entries={entries} />
        <div className="spacer" />
        {loggedToday ? (
          <p className="small muted" style={{ margin: 0 }}>
            Today: {entries[0].weight_lb} lb ✓ · <Link href="/progress/weigh-in">change</Link>
          </p>
        ) : (
          <Link className="btn btn-wide" href="/progress/weigh-in">
            ⚖️ Log today's weight
          </Link>
        )}
        {days.length > 0 && <p className="small muted" style={{ margin: "10px 0 0" }}>Your weigh-in days: {days.join(" · ")}</p>}
      </section>

      {entries.length > 0 && (
        <details className="t-section">
          <summary>
            <span aria-hidden="true">📋</span> All weigh-ins ({entries.length})
          </summary>
          <ul className="tips weigh-list">
            {entries.map((e) => (
              <li key={e.date}>
                <span>{formatDate(e.date)}</span>
                <b>{e.weight_lb} lb</b>
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}
