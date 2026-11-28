import { byDay, CAL_BOOKINGS_URL, type CallsResult } from "@/lib/cal";
import { todayIn, addDays } from "@/lib/dates";

/** Upcoming calls from Cal.com, grouped by day, with a link to Cal.com's own schedule. Shared by Home and Business. */
export default function CallSchedule({ result, limit = 8, setup = false }: { result: CallsResult; limit?: number; setup?: boolean }) {
  const today = todayIn();
  const tomorrow = addDays(today, 1);
  const shown = result.calls.slice(0, limit);
  const days = byDay(shown);
  return (
    <section className="card">
      <div className="legal-head">
        <h2 className="h2" style={{ margin: 0 }}>📅 Upcoming calls</h2>
        <a className="small" href={CAL_BOOKINGS_URL} target="_blank" rel="noopener noreferrer">
          Open Cal.com ↗
        </a>
      </div>
      {!result.connected ? (
        setup ? (
          <>
            <p style={{ margin: "10px 0 8px" }}>Your schedule lives in Cal.com: tap “Open Cal.com” above. To show the calls right here, one-time setup (about 2 minutes):</p>
            <ol className="setup-steps">
              <li>In Cal.com, open <b>Settings → Developer → API keys → Add</b>. Name it “Coach portal”, set it to never expire, and copy the key.</li>
              <li>In Vercel, open the <b>vitalfusion-app</b> project → <b>Settings → Environment Variables</b>. Add <code>CAL_API_KEY</code> with the key as its value, for Production.</li>
              <li>Tell Claude “Cal key added” and it will redeploy so your calls show up here and on Home.</li>
            </ol>
          </>
        ) : (
          <p className="muted" style={{ margin: "10px 0 0" }}>Tap “Open Cal.com” for your schedule. Setup steps to show it here are on the Business tab.</p>
        )
      ) : result.error ? (
        <p className="notice notice-warn" style={{ margin: "10px 0 0" }}>Couldn't load your calls from Cal.com just now ({result.error}). Use “Open Cal.com” above.</p>
      ) : days.length === 0 ? (
        <p className="muted" style={{ margin: "10px 0 0" }}>No calls booked.</p>
      ) : (
        <div className="call-days">
          {days.map((d) => (
            <div key={d.day}>
              <p className="call-day">{d.day === today ? "Today" : d.day === tomorrow ? "Tomorrow" : d.label}</p>
              <ul className="call-list">
                {d.calls.map((c) => (
                  <li key={c.uid}>
                    <span className="call-time">{c.time}</span>
                    <span className="call-text">
                      <b>{c.who}</b>
                      <span>{c.title}</span>
                    </span>
                    {c.link && (
                      <a className="btn btn-ghost btn-sm" href={c.link} target="_blank" rel="noopener noreferrer">
                        Join
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {result.calls.length > shown.length && <p className="small muted" style={{ margin: "8px 0 0" }}>+ {result.calls.length - shown.length} more in Cal.com</p>}
        </div>
      )}
    </section>
  );
}
