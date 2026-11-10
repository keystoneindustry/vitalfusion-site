import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { formatDate, todayIn } from "@/lib/dates";
import { listWeighIns } from "@/lib/progress";
import WeighInForm from "../../WeighInForm";

export const metadata = { title: "Weigh-in · Vital Fusion" };

export default async function WeighInPage() {
  const { client } = await requireClient("/progress/weigh-in");
  const today = todayIn(client.timezone);
  const entries = await listWeighIns(client.id, 5);
  const todays = entries.find((e) => e.date === today);

  return (
    <>
      <p className="small">
        <Link href="/progress">← Progress</Link>
      </p>
      <h1 className="h1">⚖️ Weigh-in</h1>
      <ul className="tips" style={{ padding: "0 0 0 20px", marginBottom: 16 }}>
        <li>First thing in the morning, after the bathroom.</li>
        <li>Before eating or drinking, same scale every time.</li>
        <li>One number doesn't matter. The weekly average does.</li>
      </ul>
      <section className="card card-accent">
        {todays ? (
          <>
            <p style={{ margin: 0 }}>
              <b>Today: {todays.weight_lb} lb ✓</b>
            </p>
            <p className="small muted">Weighed in wrong? Enter it again to replace it.</p>
          </>
        ) : (
          <p style={{ margin: "0 0 10px" }}>
            <b>Today's weight</b>
          </p>
        )}
        <WeighInForm date={today} last={entries[0]?.weight_lb ?? null} />
      </section>
      {entries.length > 0 && (
        <section className="card">
          <h2 className="h2">Recent</h2>
          <dl className="kv">
            {entries.map((e) => (
              <div key={e.date} style={{ display: "contents" }}>
                <dt>{formatDate(e.date, false)}</dt>
                <dd>{e.weight_lb} lb</dd>
              </div>
            ))}
          </dl>
          <p className="small" style={{ marginBottom: 0 }}>
            <Link href="/progress">See your trend →</Link>
          </p>
        </section>
      )}
    </>
  );
}
