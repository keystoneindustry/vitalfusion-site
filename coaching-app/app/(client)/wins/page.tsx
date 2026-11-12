import { requireClient } from "@/lib/auth";
import { formatDate, todayIn } from "@/lib/dates";
import { loadWins } from "@/lib/wins";

export const metadata = { title: "Wins & streaks · Vital Fusion" };

/** ☰ More → Wins & streaks: current streaks, milestones reached, and what's next. */
export default async function WinsPage() {
  const { client } = await requireClient("/wins");
  const today = todayIn(client.timezone);
  const wins = await loadWins(client, today);
  const reached = [...wins.stored].reverse();
  const have = new Set(wins.stored.map((m) => m.key));
  const next = wins.families.map((f) => f.find((m) => !m.reached && !have.has(m.key))).filter((m): m is NonNullable<typeof m> => !!m && !!m.progress);
  const day = (iso: string) => formatDate(todayIn(client.timezone, new Date(iso)), true);

  return (
    <>
      <h1 className="h1">Wins &amp; streaks</h1>
      <p className="lead">Small wins, stacked up. Keep the streaks alive.</p>

      <div className="streak-row">
        <div className="streak-tile">
          <span className="streak-num">🔥 {wins.streaks.current}</span>
          <span className="small">day habit streak</span>
          <span className="muted small">Best: {wins.streaks.best}</span>
        </div>
        <div className="streak-tile">
          <span className="streak-num">🗓️ {wins.checkins.current}</span>
          <span className="small">check-ins in a row</span>
          <span className="muted small">{wins.checkins.total} sent in total</span>
        </div>
      </div>
      <p className="muted small" style={{ margin: "-4px 0 16px" }}>
        A streak day = every habit on your list done that day. {wins.streaks.todayDone ? "Today's done ✓" : "Finish today's habits to keep it going."}
      </p>

      {next.length > 0 && (
        <section className="card">
          <h2 className="h2">Next up</h2>
          <ul className="next-wins">
            {next.slice(0, 5).map((m) => (
              <li key={m.key}>
                <div className="row-between">
                  <span>
                    <span aria-hidden="true">{m.emoji}</span> <b>{m.title}</b>
                  </span>
                  <span className="muted small">
                    {m.progress!.value} / {m.progress!.target} {m.progress!.unit}
                  </span>
                </div>
                <div className="win-bar" aria-hidden="true">
                  <span style={{ width: `${Math.min(100, Math.round((m.progress!.value / m.progress!.target) * 100))}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card">
        <h2 className="h2">Your wins ({reached.length})</h2>
        {reached.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>Your first one is close: tick off all of today's habits for your first perfect day.</p>
        ) : (
          <ul className="won-list">
            {reached.map((m) => (
              <li key={m.key}>
                <span className="won-emoji" aria-hidden="true">{m.emoji}</span>
                <span>
                  <b>{m.title}</b>
                  <span className="muted small">{day(m.achieved_at)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
