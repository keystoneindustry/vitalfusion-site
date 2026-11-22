import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { sourceLabel } from "@/lib/application";
import { MEAL_PLANS, mealPlanFor } from "@/lib/meal-plans";
import MealPlanForm from "./MealPlanForm";

// Hidden pages: only reachable by link (Instagram "comment PLAN" via ManyChat →
// /plan/workday?source=instagram or /plan/everyday?source=instagram).
// Not in the menu, and search engines are told not to list them.
export const metadata: Metadata = {
  title: "Free 60-Day Meal Plan | Vital Fusion Coaching",
  description: "Four meals a day, about 1,800 calories and 160g+ protein, with the exact amounts for everything.",
  robots: { index: false, follow: false },
};

export function generateStaticParams() {
  return Object.keys(MEAL_PLANS).map((slug) => ({ slug }));
}
export const dynamicParams = false;

export default async function MealPlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ source?: string | string[] }>;
}) {
  const { slug } = await params;
  const plan = mealPlanFor(slug);
  if (!plan) notFound();
  const { source } = await searchParams;
  const tag = Array.isArray(source) ? source[0] : source;
  // ?source=instagram → "Instagram". No source → "Meal Plan".
  return <MealPlanForm plan={plan} source={tag ? sourceLabel(tag) : "Meal Plan"} />;
}
