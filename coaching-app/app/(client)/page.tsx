import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { firstName } from "@/lib/client-input";
import { formatDate, packageStatus, todayIn } from "@/lib/dates";
import { checklist, stepPath } from "@/lib/onboarding";
import { formatCallTime } from "@/lib/booking";
import InstallCard from "./InstallCard";
import { listMeals, logStats } from "@/lib/meals";
import { getPublishedPlan, hasContent } from "@/lib/plans";
import TargetsCard from "@/app/components/TargetsCard";
import { loadDays } from "@/lib/client-days";
import { getWater } from "@/lib/progress";
import { listSubmissions } from "@/lib/forms";
import { addDays } from "@/lib/dates";
import HabitChecklist from "./HabitChecklist";
import WaterTracker from "./WaterTracker";

export const metadata = { title: "Today · Vital Fusion" };

export default async function TodayPage() {
  const { client } = await requireClient("/");
  const today = todayIn(client.timezone);
  const status = packageStatus(client.start_date, client.end_date, today);
  const onboarding = client.onboarding_step !== "done";
  const published = onboarding ? null : await getPublishedPlan(client.id);
  const live = hasContent(published) ? published : null;
  const plan = live && live.content.meals.length > 0 ? live : null;
  const trainingLive = !!live && live.content.training.days.length > 0;
  const foodLog = !onboarding && !plan ? logStats(await listMeals(client.id), client.timezone, today) : null;
  const recent = [addDays(today, -3), addDays(today, -2), addDays(today, -1), today];
  const [{ days }, water, subs] = onboarding
    ? [{ days: [] }, 0, []]
    : await Promise.all([loadDays(client.id, recent), getWater(client.id, today), listSubmissions(client.id, 5)]);
  const day = days[days.length - 1];
  // Forms due today, plus check-ins from the last 3 days that weren't sent yet.
  const formsDue = days.flatMap((d) => d.forms.filter((f) => d.date === today || !f.submitted).map((f) => ({ ...f, date: d.date })));
  const newReply = subs.find((x) => x.coach_reply && !x.reply_seen_at);
  const hasTasks = !!day && (day.habits.length > 0 || day.weighIn.due || day.photos.due || formsDue.length > 0);
  const waterGoal = plan?.targets.waterOz ?? 0;

  let packageLine = "Your coaching dates will show here.";
  if (status.kind === "not_started")
    packageLine = `Your ${status.totalWeeks}-week coaching starts ${formatDate(client.start_date, false)}${
      status.daysUntilStart === 1 ? " (tomorrow)" : ` (in ${status.daysUntilStart} days)`
    }.`;
  if (status.kind === "in_progress")
    packageLine = `Week ${status.week} of ${status.totalWeeks} · ${status.daysLeft} day${status.daysLeft === 1 ? "" : "s"} left`;
  if (status.kind === "ended") packageLine = `Your coaching package ended ${formatDate(client.end_date, false)}.`;

  return (
    <>
      <p className="eyebrow">Today</p>
      <h1 className="h1">Hi {firstName(client.full_name)} 👋</h1>
      <p className="lead">{packageLine}</p>

      {newReply && (
        <Link href={`/check-ins/${newReply.id}`} className="task-link reply-link">
          <span className="task-icon">💬</span>
          <span className="task-text">
            <b>Tyler replied to your check-in</b>
            <span className="small">Tap to read it</span>
          </span>
          <span className="chev" aria-hidden="true">›</span>
        </Link>
      )}

      {!onboarding && (hasTasks || waterGoal > 0) && day && (
        <section className="card card-accent">
          <h2 className="h2">Today</h2>
          {formsDue.map((f) => (
            <Link
              key={`${f.formId}-${f.date}`}
              href={f.submitted ? "/check-ins" : `/check-ins/new/${f.formId}?date=${f.date}`}
              className={`task-link ${f.submitted ? "done" : ""}`}
            >
              <span className="task-icon">📝</span>
              <span className="task-text">
                <b>{f.title}</b>
                <span className="small">{f.submitted ? "Sent ✓" : f.date === today ? "Due today · tap to fill it in" : "Overdue · tap to fill it in"}</span>
              </span>
              <span className="chev" aria-hidden="true">›</span>
            </Link>
          ))}
          {day.weighIn.due && (
            <Link href="/progress/weigh-in" className={`task-link ${day.weighIn.weight !== null ? "done" : ""}`}>
              <span className="task-icon">⚖️</span>
              <span className="task-text">
                <b>Weigh-in</b>
                <span className="small">{day.weighIn.weight !== null ? `Done ✓ ${day.weighIn.weight} lb` : "Due today · tap to log your weight"}</span>
              </span>
              <span className="chev" aria-hidden="true">›</span>
            </Link>
          )}
          {day.photos.due && (
            <Link href="/progress/photos/new" className={`task-link ${day.photos.count >= 3 ? "done" : ""}`}>
              <span className="task-icon">📸</span>
              <span className="task-text">
                <b>Progress photos</b>
                <span className="small">{day.photos.count >= 3 ? "Done ✓" : `Due today · ${day.photos.count}/3 taken · tap to take them`}</span>
              </span>
              <span className="chev" aria-hidden="true">›</span>
            </Link>
          )}
          {day.habits.length > 0 && <HabitChecklist key={today} date={today} items={day.habits} />}
          {waterGoal > 0 && <WaterTracker date={today} initialOz={water} goalOz={waterGoal} />}
        </section>
      )}

      {onboarding ? (
        <section className="card card-accent">
          <h2 className="h2">Let's get you set up</h2>
          <ul className="checklist">
            {checklist(client.onboarding_step).map((s) => (
              <li key={s.id} className={s.state}>
                <span className="tick" aria-hidden="true">
                  {s.state === "done" ? "✓" : ""}
                </span>
                {s.state === "current" ? <Link href={s.path}>{s.label}</Link> : <span>{s.label}</span>}
              </li>
            ))}
          </ul>
          <Link className="btn btn-wide" href={stepPath(client.onboarding_step)}>
            {client.onboarding_step === "welcome" ? "Start →" : "Continue →"}
          </Link>
        </section>
      ) : plan ? (
        <>
          <TargetsCard targets={plan.targets} />
          <section className="card">
            <h2 className="h2">Your plan</h2>
            <div className="link-list">
              <Link href="/nutrition">🍽️ Your meals and perfect day →</Link>
              {trainingLive ? <Link href="/train">🏋️ Your training program →</Link> : <span className="muted small">Your training program is on its way.</span>}
            </div>
          </section>
          <InstallCard />
        </>
      ) : (
        <>
          <InstallCard />
          <section className="card card-accent">
            <h2 className="h2">📷 Your food log</h2>
            <p className="coming" style={{ marginTop: 0 }}>
              Until your kickoff call, take a photo of everything you eat and drink. Eat like you normally do, so Tyler can
              build your plan around your real life.
            </p>
            {foodLog && (
              <div className="stat-row">
                <div className="stat">
                  <b>{foodLog.today}</b>
                  <span>today</span>
                </div>
                <div className="stat">
                  <b>{foodLog.days}</b>
                  <span>day{foodLog.days === 1 ? "" : "s"}</span>
                </div>
                <div className="stat">
                  <b>{foodLog.total}</b>
                  <span>total</span>
                </div>
              </div>
            )}
            <Link className="btn btn-wide" href="/food/new">
              📷 Log a meal
            </Link>
            <p className="center small" style={{ margin: "12px 0 0" }}>
              <Link href="/food">See your food log</Link>
            </p>
          </section>
          <section className="card">
            <h2 className="h2">Kickoff call</h2>
            {client.kickoff_at ? (
              <p className="coming" style={{ margin: 0 }}>
                <b>{formatCallTime(client.kickoff_at, client.timezone)}</b> on Google Meet. Your plan goes live right after it.
              </p>
            ) : (
              <p className="coming" style={{ margin: 0 }}>Your kickoff call time will show here once it's confirmed.</p>
            )}
          </section>
        </>
      )}

      <section className="card">
        <h2 className="h2">Your coaching</h2>
        <dl className="kv">
          <dt>Start</dt>
          <dd>{formatDate(client.start_date)}</dd>
          <dt>End</dt>
          <dd>{formatDate(client.end_date)}</dd>
          <dt>Length</dt>
          <dd>{client.coaching_weeks ? `${client.coaching_weeks} weeks` : "—"}</dd>
        </dl>
      </section>

      <p className="center small muted">
        <Link href="/settings">Settings &amp; sign out</Link>
      </p>
    </>
  );
}
