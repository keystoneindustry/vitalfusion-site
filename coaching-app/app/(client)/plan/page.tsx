import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { getPublishedPlan, hasContent } from "@/lib/plans";
import TargetsCard from "@/app/components/TargetsCard";
import { MealLibrary, PerfectDay } from "@/app/components/PlanViews";

export const metadata = { title: "Your nutrition plan · Vital Fusion" };

export default async function PlanPage() {
  const { client } = await requireClient("/plan");
  const published = await getPublishedPlan(client.id);
  if (!hasContent(published)) {
    return (
      <>
        <p className="eyebrow">Nutrition</p>
        <h1 className="h1">Your nutrition plan</h1>
        <div className="card empty">
          <p style={{ margin: 0 }}>Your plan arrives right after your kickoff call. Until then, keep logging your meals.</p>
        </div>
        <Link className="btn btn-wide" href="/food">
          Go to your food log
        </Link>
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
