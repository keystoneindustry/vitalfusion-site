import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCoach } from "@/lib/auth";
import { getClient } from "@/lib/clients";
import { firstName } from "@/lib/client-input";
import { addDays, formatDate, isIsoDate, todayIn } from "@/lib/dates";
import { WEEKDAYS, scheduleLabel, weekStart } from "@/lib/calendar";
import { loadDays, workoutName, type DayTasks } from "@/lib/client-days";
import { getOpenPlan, getPublishedPlan, hasContent } from "@/lib/plans";
import { formatCallTime } from "@/lib/booking";
import DayChips from "@/app/components/DayChips";
import SubmitButton from "@/app/components/SubmitButton";
import { addWorkoutAction, endScheduleAction } from "../progress-actions";

export const metadata = { title: "Calendar · Vital Fusion Coach" };

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function shiftMonth(ym: string, n: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

type Item = { icon: string; text: string; state: "done" | "missed" | "due" | "plain" };

function itemsFor(d: DayTasks, today: string, extra: Item[]): Item[] {
  const past = d.date < today;
  const out: Item[] = [...extra];
  for (const w of d.workouts) out.push({ icon: "🏋️", text: w.name, state: "plain" });
  if (d.weighIn.due || d.weighIn.weight !== null)
    out.push({ icon: "⚖️", text: d.weighIn.weight !== null ? `Weigh-in · ${d.weighIn.weight} lb` : "Weigh-in", state: d.weighIn.weight !== null ? "done" : past ? "missed" : "due" });
  if (d.photos.due) out.push({ icon: "📸", text: `Progress photos${d.photos.count ? ` · ${d.photos.count}/3` : ""}`, state: d.photos.count >= 3 ? "done" : past ? "missed" : "due" });
  for (const f of d.forms) out.push({ icon: "📝", text: f.title, state: f.submitted ? "done" : past ? "missed" : "due" });
  for (const h of d.habits) out.push({ icon: h.icon, text: h.title, state: h.done ? "done" : past ? "missed" : "due" });
  return out;
}

/** One client's month: everything on their calendar, plus putting workouts on chosen days. */
export default async function ClientCalendarPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ m?: string; d?: string; msg?: string; error?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  await requireCoach(`/coach/clients/${id}/calendar`);
  const client = await getClient(id);
  if (!client) notFound();
  const name = firstName(client.full_name);
  const today = todayIn(client.timezone);
  const month = sp.m && /^\d{4}-\d{2}$/.test(sp.m) ? sp.m : today.slice(0, 7);
  const first = `${month}-01`;
  const gridStart = weekStart(first);
  const nextMonthFirst = `${shiftMonth(month, 1)}-01`;
  const dates: string[] = [];
  for (let d = gridStart; d < nextMonthFirst || dates.length % 7 !== 0; d = addDays(d, 1)) dates.push(d);
  const selected = sp.d && isIsoDate(sp.d) ? sp.d : today.startsWith(month) ? today : first;

  const [{ days, schedules }, pub, open] = await Promise.all([loadDays(client.id, dates), getPublishedPlan(client.id), getOpenPlan(client.id)]);
  // Workouts come from the live program, or the draft if nothing is live yet.
  const program = hasContent(pub) && pub.content.training?.days?.length ? pub.content.training.days : hasContent(open) ? (open.content.training?.days ?? []) : [];
  const workoutSchedules = schedules.filter((s) => s.kind === "workout");
  const kickoffDay = client.kickoff_at ? todayIn(client.timezone, new Date(client.kickoff_at)) : null;
  const callDay = client.next_call_at ? todayIn(client.timezone, new Date(client.next_call_at)) : null;
  const extras = (date: string): Item[] => [
    ...(callDay === date && client.next_call_at ? [{ icon: "📞", text: `1-on-1 call · ${formatCallTime(client.next_call_at, client.timezone).split(" at ")[1] ?? ""}`, state: "plain" as const }] : []),
    ...(kickoffDay === date && client.kickoff_at ? [{ icon: "📞", text: `Kickoff call · ${formatCallTime(client.kickoff_at, client.timezone).split(" at ")[1] ?? ""}`, state: "plain" as const }] : []),
  ];
  const sel = days.find((d) => d.date === selected);
  const selItems = sel ? itemsFor(sel, today, extras(sel.date)) : [];
  const href = (q: Record<string, string>) => `/coach/clients/${client.id}/calendar?${new URLSearchParams(q).toString()}`;
  const [y, m] = month.split("-").map(Number);

  return (
    <>
      {sp.msg === "scheduled" && <div className="notice notice-good">Added to {name}'s calendar ✓</div>}
      {sp.msg === "removed" && <div className="notice notice-good">Removed ✓</div>}
      {sp.error && <div className="notice notice-error">{sp.error}</div>}

      <div className="detail-grid">
        <div>
          <section className="card">
            <div className="month-head">
              <Link className="btn btn-ghost btn-sm" href={href({ m: shiftMonth(month, -1) })} aria-label="Previous month">
                ‹
              </Link>
              <h2 className="h2" style={{ margin: 0 }}>
                {MONTHS[m - 1]} {y}
              </h2>
              <Link className="btn btn-ghost btn-sm" href={href({ m: shiftMonth(month, 1) })} aria-label="Next month">
                ›
              </Link>
            </div>
            <div className="month-grid" role="grid">
              {WEEKDAYS.map((w) => (
                <span key={w} className="month-dow">
                  {w.slice(0, 1)}
                </span>
              ))}
              {days.map((d) => {
                const items = itemsFor(d, today, extras(d.date));
                const marks = items.filter((it) => !d.habits.some((h) => h.icon === it.icon && h.title === it.text));
                const habitsDue = d.habits.length;
                const habitsDone = d.habits.filter((h) => h.done).length;
                return (
                  <Link
                    key={d.date}
                    href={href({ m: month, d: d.date })}
                    className={`month-cell${d.date.startsWith(month) ? "" : " other"}${d.date === today ? " today" : ""}${d.date === selected ? " selected" : ""}`}
                    aria-label={formatDate(d.date, false)}
                  >
                    <span className="month-num">{Number(d.date.slice(8))}</span>
                    <span className="month-marks">
                      {marks.slice(0, 4).map((it, k) => (
                        <span key={k} className={`mark mark-${it.state}`}>
                          {it.icon}
                        </span>
                      ))}
                    </span>
                    {habitsDue > 0 && d.date <= today && <span className={`month-habits${habitsDone === habitsDue ? " all" : ""}`}>{habitsDone}/{habitsDue}</span>}
                  </Link>
                );
              })}
            </div>
            <p className="small muted" style={{ margin: "10px 0 0" }}>
              🏋️ workout · ⚖️ weigh-in · 📸 photos · 📝 check-in · 📞 call · 2/3 = habits done
            </p>
          </section>

          <section className="card">
            <h2 className="h2">{selected === today ? "Today" : formatDate(selected, false)}</h2>
            {selItems.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>Nothing scheduled.</p>
            ) : (
              <ul className="cal-items">
                {selItems.map((it, k) => (
                  <li key={k} className={it.state}>
                    <span className="cal-state" aria-hidden="true">
                      {it.state === "done" ? "✓" : it.state === "missed" ? "✕" : ""}
                    </span>
                    <span>
                      {it.icon} {it.text}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div>
          <section className="card card-accent">
            <h2 className="h2">🏋️ Workout days</h2>
            {program.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>
                Build {name}'s program on the <Link href={`/coach/clients/${client.id}/training`}>Training</Link> tab first. Then put each workout on the days they
                should do it.
              </p>
            ) : (
              <>
                {workoutSchedules.length === 0 ? (
                  <p className="muted small" style={{ marginTop: -4 }}>No workouts on {name}'s calendar yet.</p>
                ) : (
                  <ul className="flags">
                    {workoutSchedules.map((s) => (
                      <li key={s.id} className="row-between">
                        <span>
                          <b>{workoutName(program, s.workout_day ?? 0)}</b> · {scheduleLabel(s)}
                        </span>
                        <form action={endScheduleAction.bind(null, client.id, s.id, "calendar")}>
                          <SubmitButton className="btn-link small" label="Remove" pendingLabel="…" />
                        </form>
                      </li>
                    ))}
                  </ul>
                )}
                <form action={addWorkoutAction.bind(null, client.id)} style={{ marginTop: 12 }}>
                  <input type="hidden" name="m" value={month} />
                  <div className="field">
                    <label htmlFor="wk">Workout</label>
                    <select id="wk" name="workout" defaultValue="0">
                      {program.map((_, i) => (
                        <option key={i} value={i}>
                          {i + 1}. {workoutName(program, i)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>On</label>
                    <DayChips selected={[]} />
                    <select name="every" defaultValue="1" style={{ marginTop: 8 }}>
                      <option value="1">Every week</option>
                      <option value="2">Every 2 weeks</option>
                    </select>
                  </div>
                  <SubmitButton className="btn btn-sm" label="Add to calendar" pendingLabel="Adding…" />
                </form>
                <p className="small muted" style={{ marginBottom: 0 }}>
                  {name} sees it on Today and their Calendar, and tapping it opens that workout. Weigh-ins, photos and check-ins are set on the{" "}
                  <Link href={`/coach/clients/${client.id}/progress`}>Progress</Link> tab.
                </p>
              </>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
