/**
 * Real nutrition numbers from the USDA FoodData Central database (free, needs USDA_API_KEY).
 * Each food name is looked up once and cached in the `food_cache` table. If the USDA match looks
 * wrong next to the AI's own estimate (e.g. "rice" matching dry rice flour), the estimate is kept.
 */

import { db, q } from "./supabase";
import type { Ingredient, Macros, PlanMeal } from "./plan";

type CacheRow = { query: string; fdc_id: number | null; description: string | null; per100: Macros | null };

type FdcFood = {
  fdcId: number;
  description: string;
  dataType?: string;
  foodNutrients?: { nutrientId?: number; nutrientNumber?: string; value?: number; unitName?: string }[];
};

const NUTRIENTS = { kcal: [1008, 2047, 2048], protein: [1003], fat: [1004], carbs: [1005], fiber: [1079] };

function nutrient(f: FdcFood, ids: number[]): number | null {
  for (const id of ids) {
    const hit = f.foodNutrients?.find((x) => x.nutrientId === id && typeof x.value === "number");
    if (hit && (hit.unitName ?? "").toUpperCase() !== "KJ") return hit.value!;
  }
  return null;
}

/** Per-100 g numbers from a USDA search result, or null when it has no usable data. */
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

export function cacheKey(food: string): string {
  return food.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 120);
}

async function searchUsda(food: string, apiKey: string): Promise<{ fdcId: number; description: string; per100: Macros } | null> {
  const url =
    `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(apiKey)}` +
    `&query=${encodeURIComponent(food)}&dataType=${encodeURIComponent("Foundation,SR Legacy")}&pageSize=5`;
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`USDA ${res.status}`);
  const data = (await res.json()) as { foods?: FdcFood[] };
  for (const f of data.foods ?? []) {
    const per100 = per100FromFdc(f);
    if (per100) return { fdcId: f.fdcId, description: f.description, per100 };
  }
  return null;
}

/** Looks up many foods at once (cached), a few at a time. Returns key → result (null = not found). */
async function lookupAll(foods: string[]): Promise<Map<string, CacheRow | null>> {
  const out = new Map<string, CacheRow | null>();
  const keys = [...new Set(foods.map(cacheKey).filter(Boolean))];
  if (keys.length === 0) return out;

  const cached = await db<CacheRow[]>(`food_cache?select=*&query=in.(${keys.map((k) => `"${k.replace(/"/g, "")}"`).map(q).join(",")})`).catch(
    () => [] as CacheRow[],
  );
  for (const row of cached) out.set(row.query, row.per100 ? row : null);

  const apiKey = process.env.USDA_API_KEY;
  const todo = keys.filter((k) => !out.has(k));
  if (!apiKey || todo.length === 0) return out;

  const fresh: CacheRow[] = [];
  let i = 0;
  async function worker() {
    while (i < todo.length) {
      const key = todo[i++];
      try {
        const hit = await searchUsda(key, apiKey!);
        const row: CacheRow = { query: key, fdc_id: hit?.fdcId ?? null, description: hit?.description ?? null, per100: hit?.per100 ?? null };
        fresh.push(row);
        out.set(key, hit ? row : null);
      } catch (err) {
        console.error("USDA lookup failed", key, err);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(5, todo.length) }, worker));
  if (fresh.length) {
    await db("food_cache?on_conflict=query", { method: "POST", prefer: "resolution=merge-duplicates,return=minimal", body: fresh }).catch(
      (err) => console.error("food_cache save failed", err),
    );
  }
  return out;
}

/** Fills in USDA numbers for every ingredient it can; keeps the AI estimate otherwise. */
export async function applyUsda(meals: PlanMeal[]): Promise<{ meals: PlanMeal[]; usdaAvailable: boolean }> {
  const usdaAvailable = !!process.env.USDA_API_KEY;
  const all = meals.flatMap((m) => m.ingredients.map((i) => i.food));
  const found = await lookupAll(all);
  const fix = (i: Ingredient): Ingredient => {
    const hit = found.get(cacheKey(i.food));
    if (hit?.per100 && plausible(hit.per100, i.source === "usda" ? null : i.per100)) {
      return { ...i, per100: hit.per100, source: "usda", usdaName: hit.description ?? undefined };
    }
    return i;
  };
  return { meals: meals.map((m) => ({ ...m, ingredients: m.ingredients.map(fix) })), usdaAvailable };
}

/** For coach edits: per-100 g numbers for one food, from the cache or USDA. */
export async function lookupFood(food: string): Promise<CacheRow | null> {
  const found = await lookupAll([food]);
  return found.get(cacheKey(food)) ?? null;
}
