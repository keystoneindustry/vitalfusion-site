import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCoach } from "@/lib/auth";
import { describeEvent, getClient, listEvents } from "@/lib/clients";
import { stageLabel } from "@/lib/client-input";
import { formatDate, packageLabel, timeAgo, todayIn } from "@/lib/dates";
import { resendInviteAction, updateClientAction } from "../../actions";
import ClientForm from "../../ClientForm";
import SubmitButton from "@/app/components/SubmitButton";

export const metadata = { title: "Client · Vital Fusion Coach" };

function stamp(ts: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(ts));
}

export default async function ClientPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ invite?: string }>;
}) {
  const { id } = await params;
  const { invite } = await searchParams;
  await requireCoach(`/coach/clients/${id}`);

  const client = await getClient(id);
  if (!client) notFound();
  const events = await listEvents(client.id);
  const today = todayIn();

  const update = updateClientAction.bind(null, client.id);
  const resend = resendInviteAction.bind(null, client.id);

  return (
    <>
      <p className="small">
        <Link href="/coach">← Clients</Link>
      </p>
      <div className="row-between" style={{ alignItems: "flex-start" }}>
        <div>
          <h1 className="h1">{client.full_name}</h1>
          <p className="muted" style={{ margin: "0 0 16px" }}>
            {packageLabel(client.start_date, client.end_date, today)}
          </p>
        </div>
        <span className={`pill pill-${client.stage}`} style={{ marginTop: 8 }}>
          {stageLabel(client.stage)}
        </span>
      </div>

      {invite === "sent" && <div className="notice notice-good">Invite email sent to {client.email} ✓</div>}
      {invite === "failed" && (
        <div className="notice notice-error">
          The client was saved, but the invite email didn't send. Check the timeline below for the reason, then try
          “Resend invite.”
        </div>
      )}

      <div className="detail-grid">
        <div>
          <section className="card">
            <h2 className="h2">Details &amp; package</h2>
            <ClientForm
              action={update}
              mode="edit"
              today={today}
              defaults={{
                fullName: client.full_name,
                email: client.email,
                phone: client.phone,
                coachingWeeks: client.coaching_weeks,
                startDate: client.start_date,
                endDate: client.end_date,
                notes: client.notes,
                stage: client.stage,
              }}
            />
          </section>
        </div>

        <div>
          <section className="card">
            <h2 className="h2">App access</h2>
            <dl className="kv">
              <dt>Email</dt>
              <dd>
                <a href={`mailto:${client.email}`}>{client.email}</a>
              </dd>
              {client.phone && (
                <>
                  <dt>Phone</dt>
                  <dd>
                    <a href={`tel:${client.phone.replace(/[^\d+]/g, "")}`}>{client.phone}</a>
                  </dd>
                </>
              )}
              <dt>Invited</dt>
              <dd>{client.invited_at ? timeAgo(client.invited_at) : "Not yet"}</dd>
              <dt>First sign-in</dt>
              <dd>{client.first_signed_in_at ? formatDate(client.first_signed_in_at.slice(0, 10)) : "Not yet"}</dd>
              <dt>Last sign-in</dt>
              <dd>{client.last_seen_at ? timeAgo(client.last_seen_at) : "—"}</dd>
            </dl>
            <div className="spacer" />
            <form action={resend}>
              <SubmitButton
                className="btn btn-ghost btn-wide"
                label={client.invited_at ? "Resend invite email" : "Send invite email"}
                pendingLabel="Sending…"
              />
            </form>
          </section>

          <section className="card">
            <h2 className="h2">Timeline</h2>
            {events.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>Nothing yet.</p>
            ) : (
              <ul className="timeline">
                {events.map((e) => (
                  <li key={e.id}>
                    {describeEvent(e)}
                    <time dateTime={e.created_at}>{stamp(e.created_at)}</time>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
