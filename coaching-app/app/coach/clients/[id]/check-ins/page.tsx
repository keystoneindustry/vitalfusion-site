import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCoach } from "@/lib/auth";
import { getClient } from "@/lib/clients";
import { formatDate, timeAgo } from "@/lib/dates";
import { listForms, listSubmissions } from "@/lib/forms";

export const metadata = { title: "Check-ins · Vital Fusion Coach" };

export default async function ClientCheckinsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireCoach(`/coach/clients/${id}/check-ins`);
  const client = await getClient(id);
  if (!client) notFound();
  const [subs, forms] = await Promise.all([listSubmissions(client.id), listForms(true)]);
  const title = new Map(forms.map((f) => [f.id, f.title]));
  return (
    <div style={{ maxWidth: 760 }}>
      {subs.length === 0 ? (
        <div className="card empty">
          <p style={{ margin: 0 }}>No check-ins yet. Their weekly check-in shows up here (and in your email) when they send it.</p>
        </div>
      ) : (
        <div className="res-list">
          {subs.map((s) => (
            <Link key={s.id} href={`/coach/clients/${client.id}/check-ins/${s.id}`} className="res-card">
              <span className="res-icon">{s.replied_at ? "✅" : "📝"}</span>
              <span className="res-text">
                <b>
                  {title.get(s.form_id) ?? "Form"} · {formatDate(s.due_date, false)}
                </b>
                <span className="muted small">
                  Sent {timeAgo(s.submitted_at)} · {s.replied_at ? "Replied" : <b style={{ color: "var(--warn)" }}>Needs your reply</b>}
                  {s.ai_status === "done" ? " · AI summary ready" : s.ai_status === "pending" ? " · AI summarizing…" : ""}
                </span>
              </span>
              <span className="chev" aria-hidden="true">
                ›
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
