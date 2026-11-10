import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { listMeals, logStats, MEAL_PHOTO_BUCKET } from "@/lib/meals";
import { signedUrls } from "@/lib/storage";
import { todayIn } from "@/lib/dates";
import { formatCallTime } from "@/lib/booking";
import MealDays from "@/app/components/MealDays";
import { deleteMealAction } from "./actions";

export const metadata = { title: "Food log · Vital Fusion" };

export default async function FoodLogPage({ searchParams }: { searchParams: Promise<{ logged?: string }> }) {
  const { client } = await requireClient("/food");
  const { logged } = await searchParams;
  const meals = await listMeals(client.id);
  const urls = await signedUrls(
    MEAL_PHOTO_BUCKET,
    meals.map((m) => m.photo_path || ""),
  ).catch(() => ({}) as Record<string, string>);
  const stats = logStats(meals, client.timezone, todayIn(client.timezone));

  return (
    <>
      <p className="eyebrow">Food log</p>
      <h1 className="h1">What you're eating</h1>
      <p className="lead">
        Photograph everything you eat and drink (besides water) until your kickoff call
        {client.kickoff_at ? ` on ${formatCallTime(client.kickoff_at, client.timezone)}` : ""}. Eat like you normally
        do: Tyler builds your plan around your real life.
      </p>

      {logged && <div className="notice notice-good">Saved ✓ Keep them coming.</div>}

      <div className="stat-row">
        <div className="stat">
          <b>{stats.today}</b>
          <span>today</span>
        </div>
        <div className="stat">
          <b>{stats.days}</b>
          <span>day{stats.days === 1 ? "" : "s"} logged</span>
        </div>
        <div className="stat">
          <b>{stats.total}</b>
          <span>total</span>
        </div>
      </div>

      <Link className="btn btn-wide" href="/food/new" style={{ marginBottom: 16 }}>
        📷 Log a meal
      </Link>

      {meals.length === 0 ? (
        <div className="card empty">
          <p style={{ margin: 0 }}>Nothing logged yet. Your first meal shows up here.</p>
        </div>
      ) : (
        <MealDays meals={meals} urls={urls} timeZone={client.timezone} onDelete={deleteMealAction} />
      )}
    </>
  );
}
