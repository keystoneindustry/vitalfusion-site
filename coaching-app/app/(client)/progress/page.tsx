import Link from "next/link";
import { requireClient } from "@/lib/auth";

export const metadata = { title: "Progress · Vital Fusion" };

export default async function ProgressPage() {
  await requireClient("/progress");
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

      <p className="center small muted">
        <Link href="/settings">Account, agreement &amp; sign out are in Settings</Link>
      </p>
    </>
  );
}
