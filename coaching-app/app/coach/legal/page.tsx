import { requireCoach } from "@/lib/auth";
import { coachingSummary } from "@/lib/client-input";
import { formatDate, timeAgo, todayIn } from "@/lib/dates";
import { listLegalRequests } from "@/lib/legal";
import { appOrigin } from "@/lib/origin";
import { sendLegalAction } from "./actions";
import LegalForm from "./LegalForm";
import LegalRowActions from "./LegalRow";

export const metadata = { title: "Legal · Vital Fusion" };

/** Coach → Legal: email the coaching agreement to someone who isn't an app client, and keep the signed PDFs. */
export default async function LegalPage() {
  await requireCoach("/coach/legal");
  const [rows, origin] = await Promise.all([listLegalRequests(), appOrigin()]);
  const waiting = rows.filter((r) => r.status === "sent");
  const signed = rows.filter((r) => r.status === "signed");

  return (
    <>
      <h1 className="h1">Legal</h1>
      <p className="lead" style={{ marginTop: -4 }}>
        Send the coaching agreement to a new client who isn't using this app. They sign online and you both get the PDF.
      </p>

      <section className="card">
        <h2 className="h2" style={{ marginTop: 0 }}>Send an agreement</h2>
        <LegalForm action={sendLegalAction} today={todayIn()} />
      </section>

      <h2 className="h2">Waiting for a signature{waiting.length ? ` (${waiting.length})` : ""}</h2>
      {waiting.length === 0 ? (
        <p className="muted">Nobody right now.</p>
      ) : (
        <div className="legal-list">
          {waiting.map((r) => (
            <section key={r.id} className="card legal-item">
              <div className="legal-head">
                <b>{r.full_name}</b>
                <span className="pill pill-invited">{r.opened_at ? "Opened, not signed" : "Not opened yet"}</span>
              </div>
              <p className="small muted">
                {r.email} · {coachingSummary(r)}
                {r.include_parq ? "" : " · no health questions"}
                <br />
                Sent {timeAgo(r.last_sent_at)}
              </p>
              <LegalRowActions id={r.id} signed={false} link={`${origin}/sign/${r.token}`} name={r.full_name} />
            </section>
          ))}
        </div>
      )}

      <h2 className="h2">Signed{signed.length ? ` (${signed.length})` : ""}</h2>
      {signed.length === 0 ? (
        <p className="muted">Signed agreements will show here.</p>
      ) : (
        <div className="legal-list">
          {signed.map((r) => (
            <section key={r.id} className="card legal-item">
              <div className="legal-head">
                <b>{r.full_name}</b>
                <span className="pill pill-active">Signed {formatDate((r.signed_at ?? "").slice(0, 10))}</span>
              </div>
              <p className="small muted">
                {r.email} · {coachingSummary(r)}
              </p>
              {r.parq_any_yes && <p className="notice notice-warn">⚠️ Answered YES on the health questions: {r.parq_explanation || "no explanation given"}</p>}
              <LegalRowActions id={r.id} signed link="" name={r.full_name} />
            </section>
          ))}
        </div>
      )}
    </>
  );
}
