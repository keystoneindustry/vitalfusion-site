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
import { listSubmissions } from "@/lib/forms";
import { addDays } from "@/lib/dates";
import HabitChecklist from "./HabitChecklist";
import Notifications from "@/app/components/Notifications";
import AppTour from "./AppTour";
import { vapidPublicKey } from "@/lib/push";
import { listResources, startHere } from "@/lib/resources";
import { loadWins } from "@/lib/wins";
import WinsCelebration from "./WinsCelebration";

export const metadata = { title: "Today · Vital Fusion" };

export default async function TodayPage({ searchParams }: { searchParams: Promise<{ tour?: string }> }) {
  const { client } = await requireClient("/");
  const { tour } = await searchParams;
  const today = todayIn(client.timezone);
  const status = packageStatus(client.start_date, client.end_date, today);
  const onboarding = client.onboarding_step !== "done";
  const published = onboarding ? null : await getPublishedPlan(client.id);
  const live = hasContent(published) ? published : null;
  const plan = live && live.content.meals.length > 0 ? live : null;
  // A new meal plan or program: invite them to the tab's quick tour (once).
  const newParts = [
    plan && !client.nutrition_tour_seen_at ? { href: "/nutrition", icon: "🍽️", title: "Your meal plan is ready!", text: "Take a 1-minute tour of your Nutrition tab" } : null,
    live && live.content.training.days.length > 0 && !client.training_tour_seen_at
      ? { href: "/train", icon: "🏋️", title: "Your training program is ready!", text: "Take a 1-minute tour of your Training tab" }
      : null,
  ].filter((x): x is NonNullable<typeof x> => !!x);
  const foodLog = !onboarding && !plan ? logStats(await listMeals(client.id), client.timezone, today) : null;
  const recent = [addDays(today, -3), addDays(today, -2), addDays(today, -1), today];
  const [{ days }, subs] = onboarding
    ? [{ days: [] }, []]
    : await Promise.all([loadDays(client.id, recent), listSubmissions(client.id, 5)]);
  const day = days[days.length - 1];
  const wins = onboarding ? null : await loadWins(client, today).catch((err) => (console.error("Wins failed", err), null));
  // Forms due today, plus check-ins from the last 3 days that weren't sent yet.
  const formsDue = days.flatMap((d) => d.forms.filter((f) => d.date === today || !f.submitted).map((f) => ({ ...f, date: d.date })));
  const newReply = subs.find((x) => x.coach_reply && !x.reply_seen_at);
  // First two weeks: point them at the READ FIRST guide.
  const earlyDays = status.kind === "not_started" || (status.kind === "in_progress" && status.week <= 2);
  const resources = !onboarding ? await listResources(true).catch(() => []) : [];
  const guide = earlyDays ? startHere(resources) : null;
  // The live tour runs once, right after onboarding (or again from Settings with ?tour=1).
  const showTour = !onboarding && (!client.tour_seen_at || tour === "1");
  const tourGuide = startHere(resources);
  const callToday = client.next_call_at && todayIn(client.timezone, new Date(client.next_call_at)) === today ? client.next_call_at : null;
  const hasTasks = !!day && (day.habits.length > 0 || day.weighIn.due || day.photos.due || formsDue.length > 0 || day.workouts.length > 0 || !!callToday);

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
      <h1 className="h1">Hi {firstName(client.full_name)} 👋</h1>
      <p className="lead">{packageLine}</p>
      {!onboarding &&
        (client.why ? (
          <Link href="/why" className="why-quote" aria-label="Your why. Tap to edit it.">
            <span className="why-label">💭 Your why</span>
            <span className="why-text">“{client.why}”</span>
          </Link>
        ) : (
          <Link href="/why" className="why-quote why-empty">
            <span className="why-label">💭 Your why</span>
            <span className="why-text">Tap to add why this matters to you</span>
          </Link>
        ))}
      {showTour && <AppTour guideHref={tourGuide ? `/resources/${tourGuide.id}` : null} />}

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

      {newParts.map((p) => (
        <Link key={p.href} href={p.href} className="task-link new-part-link">
          <span className="task-icon">{p.icon}</span>
          <span className="task-text">
            <b>{p.title}</b>
            <span className="small">{p.text}</span>
          </span>
          <span className="chev" aria-hidden="true">›</span>
        </Link>
      ))}

      {wins && <WinsCelebration wins={wins.unseen.map(({ key, title, emoji }) => ({ key, title, emoji }))} />}

      {!onboarding && hasTasks && day && (
        <section className="card card-accent">
          <div className="row-between" style={{ marginBottom: 12 }}>
            <h2 className="h2" style={{ margin: 0 }}>To do today</h2>
            {wins && wins.streaks.current > 0 && (
              <Link href="/wins" className="streak-chip" aria-label={`${wins.streaks.current}-day habit streak`}>
                🔥 {wins.streaks.current}
              </Link>
            )}
          </div>
          {callToday && (
            <div className="task-link">
              <span className="task-icon">📞</span>
              <span className="task-text">
                <b>1-on-1 call with Tyler</b>
                <span className="small">{formatCallTime(callToday, client.timezone).split(" at ")[1] ?? ""}</span>
              </span>
            </div>
          )}
          {day.workouts.map((w) => (
            <Link key={w.day} href={`/train?day=${w.day}`} className="task-link">
              <span className="task-icon">🏋️</span>
              <span className="task-text">
                <b>{w.name}</b>
                <span className="small">Today's workout</span>
              </span>
              <span className="chev" aria-hidden="true">›</span>
            </Link>
          ))}
          {formsDue.map((f) => (
            <Link
              key={`${f.formId}-${f.date}`}
              href={f.submitted ? "/check-ins" : `/check-ins/new/${f.formId}?date=${f.date}`}
              className={`task-link ${f.submitted ? "done" : ""}`}
            >
              <span className="task-icon">📝</span>
              <span className="task-text">
                <b>{f.title}</b>
                <span className="small">{f.submitted ? "Sent ✓" : f.date === today ? "Due today" : "Not sent yet · you can still send it"}</span>
              </span>
              <span className="chev" aria-hidden="true">›</span>
            </Link>
          ))}
          {day.weighIn.due && (
            <Link href="/progress/weigh-in" className={`task-link ${day.weighIn.weight !== null ? "done" : ""}`}>
              <span className="task-icon">⚖️</span>
              <span className="task-text">
                <b>Weigh-in</b>
                <span className="small">{day.weighIn.weight !== null ? `Done ✓ ${day.weighIn.weight} lb` : "Due today"}</span>
              </span>
              <span className="chev" aria-hidden="true">›</span>
            </Link>
          )}
          {day.photos.due && (
            <Link href="/progress/photos/new" className={`task-link ${day.photos.count >= 3 ? "done" : ""}`}>
              <span className="task-icon">📸</span>
              <span className="task-text">
                <b>Progress photos</b>
                <span className="small">{day.photos.count >= 3 ? "Done ✓" : day.photos.count > 0 ? `${day.photos.count} of 3 taken` : "Due today"}</span>
              </span>
              <span className="chev" aria-hidden="true">›</span>
            </Link>
          )}
          {day.habits.length > 0 && <HabitChecklist key={today} date={today} items={day.habits} streak={wins?.streaks.current ?? 0} todayDone={wins?.streaks.todayDone ?? false} />}
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
          {guide && (
            <Link href={`/resources/${guide.id}`} className="task-link start-link">
              <span className="task-icon">📚</span>
              <span className="task-text">
                <b>Start here: {guide.title.replace(/^\(?read first\)?\s*[:\-–]?\s*/i, "")}</b>
                <span className="small">How weigh-ins, photos and tracking work</span>
              </span>
              <span className="chev" aria-hidden="true">›</span>
            </Link>
          )}
          <InstallCard />
          {client.reminders_enabled !== false && <Notifications vapidKey={vapidPublicKey()} compact />}
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
          {guide && (
            <Link href={`/resources/${guide.id}`} className="task-link start-link">
              <span className="task-icon">📚</span>
              <span className="task-text">
                <b>Start here: {guide.title.replace(/^\(?read first\)?\s*[:\-–]?\s*/i, "")}</b>
                <span className="small">How weigh-ins, photos and tracking work</span>
              </span>
              <span className="chev" aria-hidden="true">›</span>
            </Link>
          )}
        </>
      )}

    </>
  );
}
