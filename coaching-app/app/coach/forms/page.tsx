import Link from "next/link";
import { requireCoach } from "@/lib/auth";
import { listForms } from "@/lib/forms";
import SubmitButton from "@/app/components/SubmitButton";
import { archiveFormAction, createFormAction } from "./actions";

export const metadata = { title: "Forms · Vital Fusion Coach" };

const MESSAGES: Record<string, string> = { archived: "Archived.", restored: "Restored ✓" };

export default async function FormsPage({ searchParams }: { searchParams: Promise<{ msg?: string; error?: string }> }) {
  await requireCoach("/coach/forms");
  const { msg, error } = await searchParams;
  const forms = await listForms(true);
  const active = forms.filter((f) => !f.archived).sort((a, b) => (a.kind === "checkin" ? -1 : b.kind === "checkin" ? 1 : 0));
  const archived = forms.filter((f) => f.archived);

  return (
    <div style={{ maxWidth: 760 }}>
      <h1 className="h1">Forms</h1>
      <p className="lead">The weekly check-in and any other forms you want clients to fill in.</p>
      {msg && MESSAGES[msg] && <div className="notice notice-good">{MESSAGES[msg]}</div>}
      {error && <div className="notice notice-error">{error}</div>}

      {active.map((f) => (
        <Link key={f.id} href={`/coach/forms/${f.id}`} className="res-card" style={{ marginBottom: 10 }}>
          <span className="res-icon">{f.kind === "checkin" ? "📝" : "📋"}</span>
          <span className="res-text">
            <b>{f.title}</b>
            <span className="muted small">
              {f.questions.length} question{f.questions.length === 1 ? "" : "s"}
              {f.kind === "checkin" ? " · goes on every client's check-in day" : " · schedule it from a client's Progress tab"}
            </span>
          </span>
          <span className="chev" aria-hidden="true">
            ›
          </span>
        </Link>
      ))}

      <section className="card card-accent" style={{ marginTop: 16 }}>
        <h2 className="h2">+ New form</h2>
        <form action={createFormAction} className="row" style={{ gap: 8 }}>
          <input name="title" placeholder="e.g. Monthly review" maxLength={100} required style={{ flex: 1 }} />
          <SubmitButton className="btn btn-sm" label="Create" pendingLabel="Creating…" />
        </form>
      </section>

      {archived.length > 0 && (
        <details className="card">
          <summary className="summary-link">Archived forms ({archived.length})</summary>
          {archived.map((f) => (
            <div key={f.id} className="row-between" style={{ marginTop: 10 }}>
              <span>📋 {f.title}</span>
              <form action={archiveFormAction.bind(null, f.id, false)}>
                <SubmitButton className="btn-link small" label="Restore" pendingLabel="…" />
              </form>
            </div>
          ))}
        </details>
      )}
    </div>
  );
}
