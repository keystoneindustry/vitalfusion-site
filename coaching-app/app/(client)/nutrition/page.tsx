import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { getPublishedPlan, hasContent } from "@/lib/plans";
import TargetsCard from "@/app/components/TargetsCard";
import { listMeals, logStats } from "@/lib/meals";
import { todayIn } from "@/lib/dates";
import { formatCallTime } from "@/lib/booking";
import { MealLibrary, PerfectDay } from "@/app/components/PlanViews";

export const metadata = { title: "Nutrition · Vital Fusion" };

export default async function NutritionPage() {
  const { client } = await requireClient("/nutrition");
  const published = await getPublishedPlan(client.id);
  if (!hasContent(published) || published.content.meals.length === 0) {
    const onboarding = client.onboarding_step !== "done";
    const stats = onboarding ? null : logStats(await listMeals(client.id), client.timezone, todayIn(client.timezone));
    return (
      <>
        <p className="eyebrow">Nutrition</p>
        <h1 className="h1">Your nutrition plan</h1>
        <p className="lead">
          Your daily targets, your perfect day and a meal library built around foods you like arrive right after your kickoff
          call{client.kickoff_at ? ` (${formatCallTime(client.kickoff_at, client.timezone)})` : ""}.
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
      <p className="eyebrow">Nutrition</p>
      <h1 className="h1">Your nutrition plan</h1>
      {content.welcome && <p className="lead">{content.welcome}</p>}
      <TargetsCard targets={targets} />
      <section className="card">
        <h2 className="h2">Your perfect day</h2>
        <PerfectDay nutrition={content} targets={targets} showTotals={false} />
      </section>
      <section className="card">
        <h2 className="h2">Your meal library</h2>
        <p className="coming" style={{ marginTop: 0 }}>
          Swap any meal for another one in the same group. They're built to fit your numbers.
        </p>
        <MealLibrary meals={content.meals} />
      </section>
      {content.insights.easingIn && (
        <section className="card">
          <h2 className="h2">Easing in</h2>
          <p className="coming" style={{ margin: 0 }}>{content.insights.easingIn}</p>
        </section>
      )}
    </>
  );
}
