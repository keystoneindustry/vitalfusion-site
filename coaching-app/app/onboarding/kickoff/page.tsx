import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { bookingUrl, formatCallTime } from "@/lib/booking";
import { onboardingPage } from "../guard";
import StepHeader from "../StepHeader";
import { kickoffSelfReport } from "../actions";
import SubmitButton from "@/app/components/SubmitButton";

export const metadata = { title: "Book your kickoff call · Vital Fusion" };

export default async function KickoffPage() {
  const { client, isCurrent } = await onboardingPage("kickoff", "/onboarding/kickoff");
  const { kickoff_link } = await getSettings();
  const url = bookingUrl(kickoff_link, { name: client.full_name, email: client.email, clientId: client.id });

  if (client.kickoff_at) {
    return (
      <>
        <StepHeader step="kickoff" title="Your kickoff call is booked 🎉" />
        <section className="card card-accent">
          <p className="coming" style={{ marginTop: 0 }}>
            <b>{formatCallTime(client.kickoff_at, client.timezone)}</b> on Google Meet. The link is in your calendar invite.
          </p>
          <p className="coming">Until then, photograph your meals so Tyler can see how you eat now.</p>
          <Link className="btn btn-wide" href="/">
            Go to my app →
          </Link>
        </section>
      </>
    );
  }

  return (
    <>
      <StepHeader
        step="kickoff"
        title="Book your kickoff call"
        lead="Last step! Pick a time with Tyler at least 4 days out. That gives you a few days to photograph your meals first."
      />
      <section className="card card-accent">
        <ul className="coming" style={{ marginTop: 0, paddingLeft: 20 }}>
          <li>A video call on Google Meet</li>
          <li>You'll go over your meals, goals and schedule together</li>
          <li>Your full training and nutrition plan arrives right after</li>
        </ul>
        <a className="btn btn-wide" href={url} target="_blank" rel="noopener noreferrer">
          📅 Pick a time
        </a>
        <p className="muted small" style={{ margin: "12px 0 0" }}>
          Opens Tyler's booking page with your name and email filled in. Come back here when you're done.
        </p>
      </section>

      {isCurrent && (
        <form action={kickoffSelfReport}>
          <SubmitButton className="btn btn-ghost btn-wide" label="I've booked my call ✓" pendingLabel="Finishing…" />
        </form>
      )}
    </>
  );
}
