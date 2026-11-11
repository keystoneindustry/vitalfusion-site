import Link from "next/link";
import { requireCoach } from "@/lib/auth";
import { listClients } from "@/lib/clients";
import { formatDate, timeAgo } from "@/lib/dates";
import { listForms, recentSubmissions, type Submission } from "@/lib/forms";

export const metadata = { title: "Check-ins · Vital Fusion Coach" };

/** Every client's check-ins in one place: ones waiting for a reply first, then the history. */
export default async function CoachCheckinsPage() {
  await requireCoach("/coach/check-ins");
  const [subs, clients, forms] = await Promise.all([recentSubmissions(80), listClients(), listForms(true)]);
  const name = new Map(clients.map((c) => [c.id, c.full_name]));
  const title = new Map(forms.map((f) => [f.id, f.title]));
  const waiting = subs.filter((s) => !s.replied_at).reverse(); // oldest first
  const done = subs.filter((s) => s.replied_at);

  const row = (s: Submission) => (
    <Link key={s.id} href={`/coach/clients/${s.client_id}/check-ins/${s.id}`} className="res-card">
      <span className="res-icon">{s.replied_at ? "✅" : "📝"}</span>
      <span className="res-text">
        <b>{name.get(s.client_id) ?? "Client"}</b>
        <span className="muted small">
          {title.get(s.form_id) ?? "Form"} · {formatDate(s.due_date, false)} · sent {timeAgo(s.submitted_at)}
        </span>
      </span>
      <span className="chev" aria-hidden="true">
        ›
      </span>
    </Link>
  );

  return (
    <div style={{ maxWidth: 760 }}>
      <h1 className="h1">Check-ins</h1>
      <h2 className="h2">Needs your reply{waiting.length ? ` (${waiting.length})` : ""}</h2>
      {waiting.length === 0 ? (
        <div className="card empty">
          <p style={{ margin: 0 }}>You're all caught up ✓</p>
        </div>
      ) : (
        <div className="res-list">{waiting.map(row)}</div>
      )}
      <h2 className="h2" style={{ marginTop: 24 }}>Replied</h2>
      {done.length === 0 ? (
        <p className="muted">Check-ins you've replied to show up here.</p>
      ) : (
        <div className="res-list">{done.map(row)}</div>
      )}
    </div>
  );
}
