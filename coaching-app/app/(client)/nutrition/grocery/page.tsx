import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { getPublishedPlan, hasContent } from "@/lib/plans";
import GroceryList from "./GroceryList";

export const metadata = { title: "Grocery list · Vital Fusion" };

/** Nutrition → Grocery list: the perfect day's ingredients for a few days, grouped by store section. */
export default async function GroceryPage() {
  const { client } = await requireClient("/nutrition/grocery");
  const published = await getPublishedPlan(client.id);
  const live = hasContent(published) && published.content.meals.length > 0 ? published : null;
  return (
    <>
      <p className="small" style={{ margin: "0 0 8px" }}>
        <Link href="/nutrition">‹ Nutrition</Link>
      </p>
      <h1 className="h1">🛒 Grocery list</h1>
      {!live ? (
        <div className="card empty">
          <p style={{ margin: 0 }}>Your grocery list shows up here once your meal plan is ready.</p>
        </div>
      ) : (
        <>
          <p className="lead" style={{ marginBottom: 14 }}>Everything for your perfect day of eating. Tick items off as you shop.</p>
          <GroceryList nutrition={{ meals: live.content.meals, perfectDay: live.content.perfectDay }} storageKey={`vf-grocery-${live.id}`} />
        </>
      )}
    </>
  );
}
