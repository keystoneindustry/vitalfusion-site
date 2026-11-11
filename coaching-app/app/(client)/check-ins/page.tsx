import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { formatDate } from "@/lib/dates";
import { listForms, listSubmissions } from "@/lib/forms";

export const metadata = { title: "Check-ins · Vital Fusion" };

export default async function CheckinsPage() {
  const { client } = await requireClient("/check-ins");
  const [subs, forms] = await Promise.all([listSubmissions(client.id), listForms(true)]);
  const title = new Map(forms.map((f) => [f.id, f.title]));
  return (
    <>
      <p className="eyebrow">Check-ins</p>
      <h1 className="h1">Your check-ins</h1>
      <p className="program-intro">Your weekly check-ins and Tyler's replies. New ones show up on Today on your check-in day.</p>
      {subs.length === 0 ? (
        <div className="card empty">
          <p style={{ margin: 0 }}>No check-ins yet.</p>
        </div>
      ) : (
        <div className="res-list">
          {subs.map((s) => (
            <Link key={s.id} href={`/check-ins/${s.id}`} className="res-card">
              <span className="res-icon">{s.coach_reply ? "💬" : "📝"}</span>
              <span className="res-text">
                <b>{title.get(s.form_id) ?? "Check-in"}</b>
                <span className="muted small">
                  {formatDate(s.due_date, false)} · {s.coach_reply ? (s.reply_seen_at ? "Tyler replied" : <b style={{ color: "var(--gold)" }}>New reply from Tyler</b>) : "Waiting for Tyler"}
                </span>
              </span>
              <span className="chev" aria-hidden="true">
                ›
              </span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
