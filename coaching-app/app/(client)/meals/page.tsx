import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { getPublishedPlan, hasContent } from "@/lib/plans";
import { toLines } from "@/lib/plan";
import { MealLibrary } from "@/app/components/PlanViews";

export const metadata = { title: "Meal library · Vital Fusion" };

/** Every meal in their plan, by type. Lives under ☰ More; the Nutrition tab keeps targets + perfect day. */
export default async function MealsPage() {
  const { client } = await requireClient("/meals");
  const published = await getPublishedPlan(client.id);
  const live = hasContent(published) && published.content.meals.length > 0 ? published : null;
  return (
    <>
      <h1 className="h1">Meal library</h1>
      {!live ? (
        <div className="card empty">
          <p style={{ margin: 0 }}>Your meals show up here right after your kickoff call.</p>
        </div>
      ) : (
        <>
          <p className="program-intro">Swap any meal in your <Link href="/nutrition">perfect day</Link> for another in the same group. They all fit your numbers.</p>
          <MealLibrary meals={live.content.meals} />
          {live.content.insights.easingIn && (
            <details className="t-section">
              <summary>
                <span aria-hidden="true">🪜</span> Easing in
              </summary>
              <ul className="tips">
                {toLines(live.content.insights.easingIn).map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </>
  );
}
