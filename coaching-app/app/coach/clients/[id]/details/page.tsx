import { notFound } from "next/navigation";
import { requireCoach } from "@/lib/auth";
import { getClient } from "@/lib/clients";
import { formatDate, timeAgo, todayIn } from "@/lib/dates";
import { resendInviteAction, updateClientAction } from "../../../actions";
import ClientForm from "../../../ClientForm";
import SubmitButton from "@/app/components/SubmitButton";

export const metadata = { title: "Details · Vital Fusion Coach" };

export default async function ClientDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireCoach(`/coach/clients/${id}/details`);
  const client = await getClient(id);
  if (!client) notFound();
  const update = updateClientAction.bind(null, client.id);
  const resend = resendInviteAction.bind(null, client.id);

  return (
    <div className="detail-grid">
      <div>
        <section className="card">
          <h2 className="h2">Details &amp; package</h2>
          <ClientForm
            action={update}
            mode="edit"
            today={todayIn()}
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
      </div>
    </div>
  );
}
