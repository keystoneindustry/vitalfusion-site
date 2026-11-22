// The two free "60-Day Belly Fat Burning Meal Plan" lead magnets (reel #024, "comment PLAN" via ManyChat).
// Each has its own hidden page (/plan/workday, /plan/everyday), its own PDF in public/plans/,
// and its own follow-up sequence in Resend Automations (started by `event`).
// Amounts per meal live only in the PDFs; the pages show the meals with the amounts hidden.

export type MealPlanSlug = "workday" | "everyday";

export type MealPlan = {
  slug: MealPlanSlug;
  /** Shown on the page, in emails and the dashboard. */
  name: string;
  title: string;
  intro: string;
  pdf: string;
  /** Resend event that starts this plan's follow-up emails. */
  event: string;
  stats: { label: string; value: string }[];
  meals: { label: string; name: string; foods: string[] }[];
};

const STATS = [
  { label: "Calories", value: "~1,800" },
  { label: "Protein", value: "160g+" },
  { label: "Fiber", value: "30g+" },
];

export const MEAL_PLANS: Record<MealPlanSlug, MealPlan> = {
  workday: {
    slug: "workday",
    name: "The 9-to-5 Plan",
    title: "Get your free *60-day* meal plan",
    intro: "Four meals built around a workday, with the exact amounts for everything. Enter your name and email and it's yours right away.",
    pdf: "/plans/60-day-meal-plan-9-to-5.pdf",
    event: "meal_plan_workday.requested",
    stats: STATS,
    meals: [
      { label: "Meal 1", name: "Overnight oats", foods: ["Oats", "Protein powder", "Chia seeds", "Kiwi", "Almond butter"] },
      { label: "Meal 2", name: "Desk lunch", foods: ["Chicken breast", "White rice", "Veggies"] },
      { label: "Meal 3", name: "Dinner", foods: ["Lean ground beef", "Sweet potato", "Veggies"] },
      { label: "Meal 4", name: "Greek yogurt bowl", foods: ["Greek yogurt", "Berries", "Honey"] },
    ],
  },
  everyday: {
    slug: "everyday",
    name: "The Everyday Plan",
    title: "Get your free *60-day* meal plan",
    intro: "Four meals of real food, with the exact amounts for everything. Enter your name and email and it's yours right away.",
    pdf: "/plans/60-day-meal-plan-everyday.pdf",
    event: "meal_plan_everyday.requested",
    stats: STATS,
    meals: [
      { label: "Meal 1", name: "Eggs & avocado toast", foods: ["Eggs", "Egg whites", "Avocado", "Sourdough", "Kiwi"] },
      { label: "Meal 2", name: "Chicken burrito bowl", foods: ["Chicken breast", "Rice", "Peppers & onions", "Lettuce", "Salsa"] },
      { label: "Meal 3", name: "Salmon & potatoes", foods: ["Salmon", "Potatoes", "Veggies"] },
      { label: "Meal 4", name: "Greek yogurt bowl", foods: ["Greek yogurt", "Berries", "Honey"] },
    ],
  },
};

export function mealPlanFor(slug: string): MealPlan | null {
  return slug === "workday" || slug === "everyday" ? MEAL_PLANS[slug] : null;
}

export type MealPlanLead = { name: string; firstName: string; email: string; plan: MealPlanSlug; source: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Checks the form. Name and a real-looking email are required; source is the ?source= label. */
export function validateMealPlanLead(raw: unknown): { ok: true; data: MealPlanLead } | { ok: false; errors: { name?: string; email?: string; plan?: string } } {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const name = str(r.name).replace(/\s+/g, " ").slice(0, 80);
  const email = str(r.email).toLowerCase().slice(0, 200);
  const plan = str(r.plan);
  const errors: { name?: string; email?: string; plan?: string } = {};
  if (!name) errors.name = "Please enter your first name.";
  if (!EMAIL_RE.test(email)) errors.email = "Please enter a valid email.";
  if (!mealPlanFor(plan)) errors.plan = "Unknown plan.";
  if (Object.keys(errors).length) return { ok: false, errors };
  const source = str(r.source).slice(0, 60) || "Meal Plan";
  return { ok: true, data: { name, firstName: name.split(" ")[0], email, plan: plan as MealPlanSlug, source } };
}
