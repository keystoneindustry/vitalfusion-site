import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { stepIndex } from "@/lib/onboarding";
import { formatDate } from "@/lib/dates";
import SignOutButton from "@/app/components/SignOutButton";
import Notifications from "@/app/components/Notifications";
import { vapidPublicKey } from "@/lib/push";

export const metadata = { title: "Settings · Vital Fusion" };

export default async function SettingsPage() {
  const { client, email } = await requireClient("/settings");
  const signed = stepIndex(client.onboarding_step) > stepIndex("agreement");
  return (
    <>
      <h1 className="h1">Settings</h1>

      <section className="card">
        <h2 className="h2">Your account</h2>
        <dl className="kv">
          <dt>Name</dt>
          <dd>{client.full_name}</dd>
          <dt>Email</dt>
          <dd>{email}</dd>
          <dt>Coaching</dt>
          <dd>
            {client.start_date ? `${formatDate(client.start_date, false)} – ${formatDate(client.end_date)}` : "—"}
            {client.coaching_weeks ? ` (${client.coaching_weeks} weeks)` : ""}
          </dd>
        </dl>
        <p className="small muted" style={{ marginBottom: 0 }}>
          Need to change something? Email Tyler at <a href="mailto:tyler@vitalfusioncoaching.com">tyler@vitalfusioncoaching.com</a>.
        </p>
      </section>

      <Notifications vapidKey={vapidPublicKey()} remindersOn={client.reminders_enabled !== false} />

      <section className="card">
        <h2 className="h2">Documents &amp; app</h2>
        {signed && (
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
        <SignOutButton />
      </section>
    </>
  );
}
