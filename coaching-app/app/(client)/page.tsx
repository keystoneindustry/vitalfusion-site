import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { firstName } from "@/lib/client-input";
import { formatDate, packageStatus, todayIn } from "@/lib/dates";
import InstallCard from "./InstallCard";

export const metadata = { title: "Today · Vital Fusion" };

export default async function TodayPage() {
  const { client } = await requireClient("/");
  const today = todayIn(client.timezone);
  const status = packageStatus(client.start_date, client.end_date, today);

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

      <InstallCard />

      {client.stage === "onboarding" || client.stage === "invited" ? (
        <section className="card card-accent">
          <h2 className="h2">Your onboarding starts here</h2>
          <p className="coming" style={{ marginTop: 0 }}>
            Very soon this screen will walk you through getting set up, one step at a time:
          </p>
          <ol className="steps">
            <li>A short welcome video from Tyler and a quick tour of the app</li>
            <li>Your coaching agreement and health questions</li>
            <li>Your onboarding questions: goals, schedule, training and food</li>
            <li>Booking your kickoff call</li>
          </ol>
          <p className="muted small">Nothing to do yet. Tyler will let you know as soon as it's ready.</p>
        </section>
      ) : (
        <section className="card">
          <h2 className="h2">Today's plan</h2>
          <p className="coming" style={{ margin: 0 }}>
            Your daily targets, habits and workout will appear here once Tyler publishes your plan.
          </p>
        </section>
      )}

      <section className="card">
        <div className="row-between">
          <h2 className="h2" style={{ margin: 0 }}>Your coaching</h2>
        </div>
        <div className="spacer" />
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
