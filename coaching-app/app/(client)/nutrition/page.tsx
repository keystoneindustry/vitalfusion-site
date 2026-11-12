import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { getPublishedPlan, hasContent } from "@/lib/plans";
import TargetsCard from "@/app/components/TargetsCard";
import { toLines } from "@/lib/plan";
import { listMeals, logStats } from "@/lib/meals";
import { todayIn } from "@/lib/dates";
import { formatCallTime } from "@/lib/booking";
import { PerfectDay } from "@/app/components/PlanViews";
import TrackingApps from "@/app/components/TrackingApps";
import { findGuide, listResources } from "@/lib/resources";
import FeatureTour from "../FeatureTour";
import { NUTRITION_TOUR } from "../tour-steps";

export const metadata = { title: "Nutrition · Vital Fusion" };

export default async function NutritionPage({ searchParams }: { searchParams: Promise<{ tour?: string }> }) {
  const { client } = await requireClient("/nutrition");
  const { tour } = await searchParams;
  const published = await getPublishedPlan(client.id);
  if (!hasContent(published) || published.content.meals.length === 0) {
    const onboarding = client.onboarding_step !== "done";
    const stats = onboarding ? null : logStats(await listMeals(client.id), client.timezone, todayIn(client.timezone));
    return (
      <>
        <h1 className="h1">Your nutrition plan</h1>
        <p className="lead">
          Your daily calorie and macro targets and your perfect day of eating arrive right after your kickoff call{client.kickoff_at ? ` (${formatCallTime(client.kickoff_at, client.timezone)})` : ""}.
        </p>
        {onboarding ? (
          <div className="card empty">
            <p style={{ margin: 0 }}>Finish setting up first. Your checklist is on the Today tab.</p>
          </div>
        ) : (
          <section className="card card-accent">
            <h2 className="h2">📷 Until then: your food log</h2>
            <p className="coming" style={{ marginTop: 0 }}>
              Take a photo of everything you eat and drink. Eat like you normally do, so Tyler can build your plan around your
              real life.
            </p>
            {stats && (
              <p className="small muted">
                {stats.today} logged today · {stats.total} in total
              </p>
            )}
            <Link className="btn btn-wide" href="/food/new">
              📷 Log a meal
            </Link>
            <p className="center small" style={{ margin: "12px 0 0" }}>
              <Link href="/food">See your food log</Link>
            </p>
          </section>
        )}
      </>
    );
  }
  const { content, targets } = published;
  return (
    <>
      <h1 className="h1">Your nutrition</h1>
      {content.welcome && <p className="program-intro">{toLines(content.welcome).slice(0, 2).join(" ")}</p>}
      <div data-tour="n-targets">
        <TargetsCard targets={targets} />
      </div>

      <div data-tour="n-perfect">
        <h2 className="section-title">Your perfect day</h2>
        <PerfectDay nutrition={content} targets={targets} showTotals={false} />
      </div>
      <Link href="/nutrition/grocery" className="task-link grocery-link" data-tour="n-grocery">
        <span className="task-icon">🛒</span>
        <span className="task-text">
          <b>Grocery list</b>
          <span className="small">Everything for your perfect day, for 3, 5 or 7 days</span>
        </span>
        <span className="chev" aria-hidden="true">›</span>
      </Link>

      {(!client.nutrition_tour_seen_at || tour === "1") && (
        <FeatureTour
          tour="nutrition"
          label="Nutrition tour"
          steps={NUTRITION_TOUR}
          finish={{ title: "🥗 You're ready to eat for your goal", text: "Start with your perfect day, grab what's on your grocery list, and log your food in your tracking app. You can take this tour again in ☰ More → Settings." }}
        />
      )}
      <div data-tour="n-tracking">
        <TrackingApps guideId={findGuide(await listResources(true).catch(() => []), /track(ing)?\s+(your\s+)?calories/i)?.id} />
      </div>
    </>
  );
}
