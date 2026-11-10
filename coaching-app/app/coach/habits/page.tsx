import { requireCoach } from "@/lib/auth";
import { listClients } from "@/lib/clients";
import { habitUsage, listHabits } from "@/lib/habits";
import SubmitButton from "@/app/components/SubmitButton";
import DayChips from "@/app/components/DayChips";
import { archiveHabitAction, assignHabitAction, createHabitAction, updateHabitAction } from "./actions";

export const metadata = { title: "Habits · Vital Fusion Coach" };

const MESSAGES: Record<string, string> = {
  created: "Habit added to your library ✓",
  saved: "Saved ✓",
  archived: "Archived. Clients who have it keep it until you remove it from them.",
  restored: "Restored ✓",
  assigned: "Assigned ✓",
};

const ICONS = ["👟", "🚶", "💧", "😴", "🥗", "🍎", "🥩", "🧘", "📵", "☀️", "📖", "✅"];

export default async function HabitsPage({ searchParams }: { searchParams: Promise<{ msg?: string; error?: string }> }) {
  await requireCoach("/coach/habits");
  const { msg, error } = await searchParams;
  const [habits, usage, clients] = await Promise.all([listHabits(true), habitUsage(), listClients()]);
  const active = habits.filter((h) => !h.archived);
  const archived = habits.filter((h) => h.archived);
  const current = clients.filter((c) => c.stage !== "finished");

  return (
    <div style={{ maxWidth: 760 }}>
      <h1 className="h1">Habit library</h1>
      <p className="lead">Build a habit once, then give it to any client on the days you choose.</p>
      {msg && MESSAGES[msg] && <div className="notice notice-good">{MESSAGES[msg]}</div>}
      {error && <div className="notice notice-error">{error}</div>}

      {active.map((h) => (
        <section key={h.id} className="card habit-card">
          <div className="habit-head">
            <span className="habit-icon">{h.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <b>{h.title}</b>
              {h.description && <p className="muted small" style={{ margin: "2px 0 0" }}>{h.description}</p>}
            </div>
            <span className="muted small">
              {usage[h.id] ?? 0} client{(usage[h.id] ?? 0) === 1 ? "" : "s"}
            </span>
          </div>
          <details className="edit-box">
            <summary className="summary-link small">Give it to a client</summary>
            {current.length === 0 ? (
              <p className="muted small">No current clients yet.</p>
            ) : (
              <form action={assignHabitAction} style={{ marginTop: 10 }}>
                <input type="hidden" name="habitId" value={h.id} />
                <input type="hidden" name="back" value="/coach/habits" />
                <div className="field">
                  <label>Client</label>
                  <select name="clientId" required defaultValue="">
                    <option value="" disabled>
                      Pick a client
                    </option>
                    {current.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.full_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Days</label>
                  <DayChips selected={[0, 1, 2, 3, 4, 5, 6]} />
                </div>
                <div className="field">
                  <label>Their version (optional)</label>
                  <input name="customTitle" placeholder={h.kind === "steps" ? "e.g. Walk 9,000 steps" : `e.g. ${h.title}`} />
                  <span className="hint">What they see, if it should be more specific than “{h.title}”.</span>
                </div>
                <SubmitButton className="btn btn-sm" label="Assign" pendingLabel="Assigning…" />
              </form>
            )}
          </details>
          <details className="edit-box">
            <summary className="summary-link small">Edit</summary>
            <form action={updateHabitAction.bind(null, h.id)} style={{ marginTop: 10 }}>
              <div className="grid-icon">
                <div className="field">
                  <label>Icon</label>
                  <input name="icon" defaultValue={h.icon} maxLength={8} />
                </div>
                <div className="field">
                  <label>Name</label>
                  <input name="title" defaultValue={h.title} required maxLength={80} />
                </div>
              </div>
              <div className="field">
                <label>Short explanation (clients see this)</label>
                <input name="description" defaultValue={h.description ?? ""} maxLength={300} />
              </div>
              <div className="row">
                <SubmitButton className="btn btn-ghost btn-sm" label="Save" pendingLabel="Saving…" />
              </div>
            </form>
            {h.kind !== "steps" && (
              <form action={archiveHabitAction.bind(null, h.id, true)} style={{ marginTop: 8 }}>
                <SubmitButton className="btn-link small" label="Archive this habit" pendingLabel="Archiving…" />
              </form>
            )}
          </details>
        </section>
      ))}

      <section className="card card-accent">
        <h2 className="h2">+ New habit</h2>
        <form action={createHabitAction}>
          <div className="grid-icon">
            <div className="field">
              <label htmlFor="new-icon">Icon</label>
              <input id="new-icon" name="icon" defaultValue="✅" maxLength={8} list="habit-icons" />
              <datalist id="habit-icons">
                {ICONS.map((i) => (
                  <option key={i} value={i} />
                ))}
              </datalist>
            </div>
            <div className="field">
              <label htmlFor="new-title">Name</label>
              <input id="new-title" name="title" required maxLength={80} placeholder="e.g. Protein at every meal" />
            </div>
          </div>
          <div className="field">
            <label htmlFor="new-desc">Short explanation (clients see this)</label>
            <input id="new-desc" name="description" maxLength={300} placeholder="e.g. A palm-size portion of protein at breakfast, lunch and dinner." />
          </div>
          <SubmitButton label="Add to library" pendingLabel="Adding…" />
        </form>
      </section>

      {archived.length > 0 && (
        <details className="card">
          <summary className="summary-link">Archived habits ({archived.length})</summary>
          {archived.map((h) => (
            <div key={h.id} className="row-between" style={{ marginTop: 10 }}>
              <span>
                {h.icon} {h.title}
              </span>
              <form action={archiveHabitAction.bind(null, h.id, false)}>
                <SubmitButton className="btn-link small" label="Restore" pendingLabel="Restoring…" />
              </form>
            </div>
          ))}
        </details>
      )}
    </div>
  );
}
