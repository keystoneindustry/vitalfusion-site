import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { stepIndex } from "@/lib/onboarding";
import { formatDate } from "@/lib/dates";

export const metadata = { title: "Settings · Vital Fusion" };

export default async function SettingsPage() {
  const { client, email } = await requireClient("/settings");
  const signed = stepIndex(client.onboarding_step) > stepIndex("agreement");
  return (
    <>
      <p className="eyebrow">Settings</p>
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
        <form action="/auth/logout" method="post">
          <button className="btn btn-ghost btn-wide" type="submit">
            Sign out
          </button>
        </form>
      </section>
    </>
  );
}
