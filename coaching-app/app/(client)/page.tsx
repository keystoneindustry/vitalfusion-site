import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { firstName } from "@/lib/client-input";
import { formatDate, packageStatus, todayIn } from "@/lib/dates";
import { checklist, stepPath } from "@/lib/onboarding";
import { formatCallTime } from "@/lib/booking";
import InstallCard from "./InstallCard";

export const metadata = { title: "Today · Vital Fusion" };

export default async function TodayPage() {
  const { client } = await requireClient("/");
  const today = todayIn(client.timezone);
  const status = packageStatus(client.start_date, client.end_date, today);
  const onboarding = client.onboarding_step !== "done";

  let packageLine = "Your coaching dates will show here.";
  if (status.kind === "not_started")
    packageLine = `Your ${status.totalWeeks}-week coaching starts ${formatDate(client.start_date, false)}${
      status.daysUntilStart === 1 ? " (tomorrow)" : ` (in ${status.daysUntilStart} days)`
    }.`;
  if (status.kind === "in_progress")
    packageLine = `Week ${status.week} of ${status.totalWeeks} · ${status.daysLeft} day${status.daysLeft === 1 ? "" : "s"} left`;
  if (status.kind === "ended") packageLine = `Your coaching package ended ${formatDate(client.end_date, false)}.`;

  return (
    <>
      <p className="eyebrow">Today</p>
      <h1 className="h1">Hi {firstName(client.full_name)} 👋</h1>
      <p className="lead">{packageLine}</p>

      {onboarding ? (
        <section className="card card-accent">
          <h2 className="h2">Let's get you set up</h2>
          <ul className="checklist">
            {checklist(client.onboarding_step).map((s) => (
              <li key={s.id} className={s.state}>
                <span className="tick" aria-hidden="true">
                  {s.state === "done" ? "✓" : ""}
                </span>
                {s.state === "current" ? <Link href={s.path}>{s.label}</Link> : <span>{s.label}</span>}
              </li>
            ))}
          </ul>
          <Link className="btn btn-wide" href={stepPath(client.onboarding_step)}>
            {client.onboarding_step === "welcome" ? "Start →" : "Continue →"}
          </Link>
        </section>
      ) : (
        <>
          <InstallCard />
          <section className="card card-accent">
            <h2 className="h2">You're all set up ✅</h2>
            {client.kickoff_at ? (
              <p className="coming" style={{ marginTop: 0 }}>
                Kickoff call: <b>{formatCallTime(client.kickoff_at, client.timezone)}</b> on Google Meet.
              </p>
            ) : (
              <p className="coming" style={{ marginTop: 0 }}>Your kickoff call time will show here once it's confirmed.</p>
            )}
            <p className="coming" style={{ marginBottom: 0 }}>
              <b>Until your call:</b> take a photo of every meal and snack, with the time and a quick note. Meal logging in the
              app is coming very soon. For now, keep the photos on your phone.
            </p>
          </section>
        </>
      )}

      <section className="card">
        <h2 className="h2">Your coaching</h2>
        <dl className="kv">
          <dt>Start</dt>
          <dd>{formatDate(client.start_date)}</dd>
          <dt>End</dt>
          <dd>{formatDate(client.end_date)}</dd>
          <dt>Length</dt>
          <dd>{client.coaching_weeks ? `${client.coaching_weeks} weeks` : "—"}</dd>
        </dl>
      </section>

      <p className="center small muted">
        <Link href="/progress">Settings &amp; sign out</Link>
      </p>
    </>
  );
}
