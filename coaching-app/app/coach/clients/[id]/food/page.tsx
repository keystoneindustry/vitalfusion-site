import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCoach } from "@/lib/auth";
import { getClient } from "@/lib/clients";
import { listMeals, logStats, MEAL_PHOTO_BUCKET } from "@/lib/meals";
import { signedUrls } from "@/lib/storage";
import { todayIn } from "@/lib/dates";
import MealDays from "@/app/components/MealDays";

export const metadata = { title: "Food log · Vital Fusion Coach" };

export default async function CoachFoodPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireCoach(`/coach/clients/${id}/food`);
  const client = await getClient(id);
  if (!client) notFound();
  const meals = await listMeals(client.id);
  const urls = await signedUrls(
    MEAL_PHOTO_BUCKET,
    meals.map((m) => m.photo_path || ""),
  ).catch(() => ({}) as Record<string, string>);
  const stats = logStats(meals, client.timezone, todayIn(client.timezone));
  return (
    <div style={{ maxWidth: 680 }}>
      <p className="small">
        <Link href={`/coach/clients/${client.id}`}>← {client.full_name}</Link>
      </p>
      <h1 className="h1">{client.full_name}'s food log</h1>
      <p className="lead">
        {stats.total} entr{stats.total === 1 ? "y" : "ies"} over {stats.days} day{stats.days === 1 ? "" : "s"}. Tap a photo to
        open it full size.
      </p>
      <p>
        <Link className="btn btn-sm" href={`/coach/clients/${client.id}/plan`}>
          Go to their plan →
        </Link>
      </p>
      {meals.length === 0 ? (
        <div className="card empty">
          <p style={{ margin: 0 }}>Nothing logged yet.</p>
        </div>
      ) : (
        <MealDays meals={meals} urls={urls} timeZone={client.timezone} />
      )}
    </div>
  );
}
