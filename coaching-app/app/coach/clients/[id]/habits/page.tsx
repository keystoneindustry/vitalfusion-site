import { notFound } from "next/navigation";
import { requireCoach } from "@/lib/auth";
import { getClient } from "@/lib/clients";
import { firstName } from "@/lib/client-input";
import { addDays, todayIn } from "@/lib/dates";
import { adherence, daysLabel, habitDueOn, WEEKDAYS } from "@/lib/calendar";
import { habitTitle, listChecks, listClientHabits, listHabits } from "@/lib/habits";
import SubmitButton from "@/app/components/SubmitButton";
import DayChips from "@/app/components/DayChips";
import { assignHabitAction, removeAssignmentAction, updateAssignmentAction } from "../../../habits/actions";
import { applyDefaultsAction } from "../progress-actions";

export const metadata = { title: "Habits · Vital Fusion Coach" };

const MESSAGES: Record<string, string> = {
  assigned: "Habit added ✓",
  saved: "Saved ✓",
  removed: "Removed. Their past ticks are kept.",
  defaults: "Starting setup added ✓",
  nothing: "They already have the starting setup.",
};

export default async function ClientHabitsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ msg?: string; error?: string }> }) {
  const { id } = await params;
  const { msg, error } = await searchParams;
  await requireCoach(`/coach/clients/${id}/habits`);
  const client = await getClient(id);
  if (!client) notFound();
  const today = todayIn(client.timezone);
  const from = addDays(today, -13);
  const dates = Array.from({ length: 14 }, (_, i) => addDays(from, i));
  const [assigned, library, checks] = await Promise.all([listClientHabits(client.id), listHabits(), listChecks(client.id, from, today)]);
  const week = adherence(assigned, checks, dates.slice(7));
  const name = firstName(client.full_name);

  return (
    <>
      {msg && MESSAGES[msg] && <div className="notice notice-good">{MESSAGES[msg]}</div>}
      {error && <div className="notice notice-error">{error}</div>}
      <div className="detail-grid">
        <div>
          <section className="card">
            <div className="row-between">
              <h2 className="h2" style={{ margin: 0 }}>{name}'s habits</h2>
              {week.due > 0 && (
                <span className="muted small">
                  Last 7 days: {week.done}/{week.due} ({Math.round((week.done / week.due) * 100)}%)
                </span>
              )}
            </div>
            {assigned.length === 0 ? (
              <>
                <p className="muted">No habits yet. Every client starts with a step goal.</p>
                <form action={applyDefaultsAction.bind(null, client.id, "habits")}>
                  <SubmitButton className="btn btn-sm" label="Add the starting setup" pendingLabel="Adding…" />
                </form>
              </>
            ) : (
              <div className="habit-rows">
                {assigned.map((h) => (
                  <div key={h.id} className="habit-row">
                    <div className="habit-head">
                      <span className="habit-icon">{h.habit?.icon ?? "✅"}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <b>{habitTitle(h)}</b>
                        <span className="muted small" style={{ display: "block" }}>{daysLabel(h.days)}</span>
                      </div>
                    </div>
                    <div className="check-grid" aria-label="Last 14 days">
                      {dates.map((d) => {
                        const due = habitDueOn(h, d);
                        const done = checks.has(`${h.id}|${d}`);
                        return (
                          <span key={d} className={`cg ${done ? "done" : due ? (d < today ? "missed" : "due") : "off"}`} title={d}>
                            {WEEKDAYS[new Date(`${d}T00:00:00Z`).getUTCDay()][0]}
                          </span>
                        );
                      })}
                    </div>
                    <details className="edit-box">
                      <summary className="summary-link small">Change</summary>
                      <form action={updateAssignmentAction.bind(null, h.id)} style={{ marginTop: 10 }}>
                        <div className="field">
                          <label>What they see</label>
                          <input name="customTitle" defaultValue={h.title ?? ""} placeholder={h.habit?.title} maxLength={80} />
                        </div>
                        <div className="field">
                          <label>Days</label>
                          <DayChips selected={h.days} />
                        </div>
                        <SubmitButton className="btn btn-ghost btn-sm" label="Save" pendingLabel="Saving…" />
                      </form>
                      <form action={removeAssignmentAction.bind(null, h.id)} style={{ marginTop: 8 }}>
                        <SubmitButton className="btn-link small" label="Remove from their plan" pendingLabel="Removing…" />
                      </form>
                    </details>
                  </div>
                ))}
              </div>
            )}
            <p className="small muted" style={{ marginBottom: 0 }}>
              <span className="cg done">✓</span> done <span className="cg missed">M</span> missed <span className="cg off">·</span> not due
            </p>
          </section>
        </div>
        <div>
          <section className="card card-accent">
            <h2 className="h2">+ Add a habit</h2>
            <form action={assignHabitAction}>
              <input type="hidden" name="clientId" value={client.id} />
              <input type="hidden" name="back" value={`/coach/clients/${client.id}/habits`} />
              <div className="field">
                <label>From your library</label>
                <select name="habitId" required defaultValue="">
                  <option value="" disabled>
                    Pick a habit
                  </option>
                  {library.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.icon} {h.title}
                    </option>
                  ))}
                </select>
                <span className="hint">
                  Need a new one? <a href="/coach/habits">Add it to your library</a>.
                </span>
              </div>
              <div className="field">
                <label>Days</label>
                <DayChips selected={[0, 1, 2, 3, 4, 5, 6]} />
              </div>
              <div className="field">
                <label>Their version (optional)</label>
                <input name="customTitle" maxLength={80} placeholder="e.g. Walk 9,000 steps" />
              </div>
              <SubmitButton label="Add habit" pendingLabel="Adding…" />
            </form>
          </section>
        </div>
      </div>
    </>
  );
}
