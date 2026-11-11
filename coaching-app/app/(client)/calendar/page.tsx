import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { addDays, isIsoDate, todayIn } from "@/lib/dates";
import { WEEKDAYS_LONG, weekDates, weekStart } from "@/lib/calendar";
import { loadDays } from "@/lib/client-days";
import { formatCallTime } from "@/lib/booking";

export const metadata = { title: "Calendar · Vital Fusion" };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function short(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}`;
}

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ w?: string }> }) {
  const { client } = await requireClient("/calendar");
  const { w } = await searchParams;
  const today = todayIn(client.timezone);
  const start = w && isIsoDate(w) ? weekStart(w) : weekStart(today);
  const dates = weekDates(start);
  const { days } = await loadDays(client.id, dates);
  const kickoffDay = client.kickoff_at ? todayIn(client.timezone, new Date(client.kickoff_at)) : null;
  const empty = days.every((d) => !d.habits.length && !d.weighIn.due && !d.photos.due && !d.forms.length) && !(kickoffDay && dates.includes(kickoffDay));

  return (
    <>
      <p className="eyebrow">Calendar</p>
      <div className="row-between" style={{ marginBottom: 12 }}>
        <h1 className="h1" style={{ margin: 0 }}>
          {short(dates[0])} – {short(dates[6])}
        </h1>
      </div>
      <div className="week-nav">
        <Link className="btn btn-ghost btn-sm" href={`/calendar?w=${addDays(start, -7)}`}>
          ‹ Last week
        </Link>
        {start !== weekStart(today) && (
          <Link className="btn btn-ghost btn-sm" href="/calendar">
            This week
          </Link>
        )}
        <Link className="btn btn-ghost btn-sm" href={`/calendar?w=${addDays(start, 7)}`}>
          Next week ›
        </Link>
      </div>

      {empty && (
        <div className="card empty">
          <p style={{ margin: 0 }}>Nothing scheduled this week yet. Tyler adds your habits, weigh-ins and photos when your plan starts.</p>
        </div>
      )}

      {!empty &&
        days.map((d, i) => {
          const isToday = d.date === today;
          const past = d.date < today;
          const items: { icon: string; text: string; state: "done" | "missed" | "due"; href?: string }[] = [];
          if (kickoffDay === d.date && client.kickoff_at) items.push({ icon: "📞", text: `Kickoff call · ${formatCallTime(client.kickoff_at, client.timezone).split(" at ")[1] ?? ""}`, state: "due" });
          if (d.weighIn.due || d.weighIn.weight !== null)
            items.push({ icon: "⚖️", text: d.weighIn.weight !== null ? `Weigh-in · ${d.weighIn.weight} lb` : "Weigh-in", state: d.weighIn.weight !== null ? "done" : past ? "missed" : "due", href: isToday ? "/progress/weigh-in" : undefined });
          for (const f of d.forms)
            items.push({
              icon: "📝",
              text: f.title,
              state: f.submitted ? "done" : past ? "missed" : "due",
              href: f.submitted ? "/check-ins" : isToday || (past && d.date >= addDays(today, -3)) ? `/check-ins/new/${f.formId}?date=${d.date}` : undefined,
            });
          if (d.photos.due) items.push({ icon: "📸", text: "Progress photos", state: d.photos.count >= 3 ? "done" : past ? "missed" : "due", href: isToday ? "/progress/photos/new" : undefined });
          for (const h of d.habits) items.push({ icon: h.icon, text: h.title, state: h.done ? "done" : past ? "missed" : "due" });
          return (
            <section key={d.date} className={`cal-day ${isToday ? "today" : ""} ${past ? "past" : ""}`}>
              <div className="cal-head">
                <b>{isToday ? "Today" : WEEKDAYS_LONG[i]}</b>
                <span className="muted small">{short(d.date)}</span>
              </div>
              {items.length === 0 ? (
                <p className="muted small" style={{ margin: 0 }}>Rest day. Nothing scheduled.</p>
              ) : (
                <ul className="cal-items">
                  {items.map((it, k) => (
                    <li key={k} className={it.state}>
                      <span className="cal-state" aria-hidden="true">
                        {it.state === "done" ? "✓" : it.state === "missed" ? "✕" : ""}
                      </span>
                      {it.href ? (
                        <Link href={it.href}>
                          {it.icon} {it.text} ›
                        </Link>
                      ) : (
                        <span>
                          {it.icon} {it.text}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {isToday && items.length > 0 && (
                <Link className="small" href="/">
                  Tick these off on Today →
                </Link>
              )}
            </section>
          );
        })}
    </>
  );
}
