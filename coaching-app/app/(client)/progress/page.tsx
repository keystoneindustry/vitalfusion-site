import Link from "next/link";
import { requireClient } from "@/lib/auth";

export const metadata = { title: "Progress · Vital Fusion" };

export default async function ProgressPage() {
  const { client, email } = await requireClient("/progress");
  return (
    <>
      <p className="eyebrow">Progress</p>
      <h1 className="h1">Your progress</h1>
      <p className="lead">Your weight trend, progress pictures and habit streaks will show here.</p>

      <section className="card">
        <h2 className="h2">Coming soon</h2>
        <ul className="coming" style={{ margin: 0, paddingLeft: 20 }}>
          <li>Weight trend from your weigh-ins</li>
          <li>Progress pictures side by side</li>
          <li>Habit streaks</li>
          <li>Booking a check-in call with Tyler</li>
        </ul>
      </section>

      <section className="card">
        <h2 className="h2">Your account</h2>
        <dl className="kv">
          <dt>Name</dt>
          <dd>{client.full_name}</dd>
          <dt>Email</dt>
          <dd>{email}</dd>
        </dl>
        <div className="spacer" />
        {client.onboarding_step !== "welcome" && client.onboarding_step !== "install" && client.onboarding_step !== "agreement" && (
          <>
            <a className="btn btn-ghost btn-wide" href="/agreement" target="_blank" rel="noopener noreferrer">
              My signed coaching agreement (PDF)
            </a>
            <div className="spacer" />
          </>
        )}
        <Link className="btn btn-ghost btn-wide" href="/install">
          How to add the app to your home screen
        </Link>
        <div className="spacer" />
        <form action="/auth/logout" method="post">
          <button className="btn btn-ghost btn-wide" type="submit">
            Sign out
          </button>
        </form>
      </section>
    </>
  );
}
