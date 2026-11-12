import Link from "next/link";

/** Their local hour (0–23). */
export function localHour(tz: string | null | undefined, now = new Date()): number {
  try {
    return Number(new Intl.DateTimeFormat("en-US", { timeZone: tz || "America/New_York", hour: "numeric", hourCycle: "h23" }).format(now));
  } catch {
    return now.getHours();
  }
}

/**
 * "Take your starting progress photos": shown at the end of onboarding and on Today until they've taken
 * their first set. Asks for them first thing in the morning, fasted, so later photos compare fairly.
 */
export default function StartingPhotos({ timezone, compact = false }: { timezone: string | null; compact?: boolean }) {
  const morning = localHour(timezone) < 11;
  return (
    <section className={`card start-photos${compact ? " start-photos-compact" : ""}`}>
      <h2 className="h2">📸 Your starting photos</h2>
      <p className="coming" style={{ marginTop: 0 }}>
        Your “before” pictures: front, side and back. They're your starting point, so you can see how far you've come.
      </p>
      <ul className="tips start-photo-tips">
        <li>
          <b>First thing in the morning</b>, after the bathroom
        </li>
        <li>
          <b>Fasted</b>: before you eat or drink anything
        </li>
        <li>Fitted clothes or swimwear, same spot and good light</li>
      </ul>
      {morning ? (
        <Link className="btn btn-wide" href="/progress/photos/new">
          Take them now →
        </Link>
      ) : (
        <>
          <p className="notice notice-warn" style={{ margin: "0 0 12px" }}>
            ⏰ Do these <b>tomorrow morning</b> before breakfast. You'll get a reminder.
          </p>
          <Link className="btn btn-ghost btn-wide" href="/progress/photos/new">
            I haven't eaten yet: take them now
          </Link>
        </>
      )}
      <p className="muted small" style={{ margin: "10px 0 0" }}>Only you and Tyler ever see your photos.</p>
    </section>
  );
}
