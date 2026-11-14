/**
 * Real nutrition numbers from the USDA FoodData Central database (free, needs USDA_API_KEY), same
 * approach as the coaching app (coaching-app/lib/food-data.ts). Lookups are cached in memory while
 * the server stays warm. If a USDA match looks wrong next to the AI's own estimate (e.g. "rice"
 * matching dry rice flour), the AI's estimate is kept.
 */
import type { DayMeal, Ingredient, Macros } from "./portion-fit";

type FdcFood = {
  fdcId: number;
  description: string;
  foodNutrients?: { nutrientId?: number; value?: number; unitName?: string }[];
};

const NUTRIENTS = { kcal: [1008, 2047, 2048], protein: [1003], fat: [1004], carbs: [1005], fiber: [1079] };

function nutrient(f: FdcFood, ids: number[]): number | null {
  for (const id of ids) {
    const hit = f.foodNutrients?.find((x) => x.nutrientId === id && typeof x.value === "number");
    if (hit && (hit.unitName ?? "").toUpperCase() !== "KJ") return hit.value!;
  }
  return null;
}

export function per100FromFdc(f: FdcFood): Macros | null {
  const protein = nutrient(f, NUTRIENTS.protein);
  const fat = nutrient(f, NUTRIENTS.fat);
  const carbs = nutrient(f, NUTRIENTS.carbs);
  if (protein === null && fat === null && carbs === null) return null;
  const kcal = nutrient(f, NUTRIENTS.kcal) ?? (protein ?? 0) * 4 + (carbs ?? 0) * 4 + (fat ?? 0) * 9;
  return { calories: kcal, protein: protein ?? 0, carbs: carbs ?? 0, fat: fat ?? 0, fiber: nutrient(f, NUTRIENTS.fiber) ?? 0 };
}

/** True when the USDA numbers are believable next to the AI's estimate for the same food. */
export function plausible(usda: Macros, estimate: Macros | null): boolean {
  if (!estimate) return true;
  const a = usda.calories;
  const b = estimate.calories;
  if (Math.abs(a - b) <= 60) return true;
  if (a <= 0 || b <= 0) return false;
  const ratio = a / b;
  return ratio >= 0.6 && ratio <= 1.6;
}

const cacheKey = (food: string) => food.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 120);
const cache = new Map<string, Macros | null>();

async function searchUsda(food: string, apiKey: string): Promise<Macros | null> {
  const url =
    `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(apiKey)}` +
    `&query=${encodeURIComponent(food)}&dataType=${encodeURIComponent("Foundation,SR Legacy")}&pageSize=5`;
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`USDA ${res.status}`);
  const data = (await res.json()) as { foods?: FdcFood[] };
  for (const f of data.foods ?? []) {
    const per100 = per100FromFdc(f);
    if (per100) return per100;
  }
  return null;
}

/** Fills in USDA numbers for every ingredient it can; keeps the AI estimate otherwise. */
export async function applyUsda(meals: DayMeal[]): Promise<DayMeal[]> {
  const apiKey = process.env.USDA_API_KEY;
  if (!apiKey) return meals;
  const keys = [...new Set(meals.flatMap((m) => m.ingredients.map((i) => cacheKey(i.food))).filter(Boolean))];
  const todo = keys.filter((k) => !cache.has(k));
  let i = 0;
  async function worker() {
    while (i < todo.length) {
      const key = todo[i++];
      try {
        cache.set(key, await searchUsda(key, apiKey!));
      } catch (err) {
        console.error("USDA lookup failed", key, err);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(5, todo.length) }, worker));
  const fix = (ing: Ingredient): Ingredient => {
    const hit = cache.get(cacheKey(ing.food));
    return hit && plausible(hit, ing.per100) ? { ...ing, per100: hit, source: "usda" } : ing;
  };
  return meals.map((m) => ({ ...m, ingredients: m.ingredients.map(fix) }));
}
