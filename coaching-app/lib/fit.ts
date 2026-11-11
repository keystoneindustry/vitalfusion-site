/**
 * Tightens a plan's numbers after the AI writes it: adjusts ingredient amounts (not the foods) so the perfect day
 * lands on the client's calorie, protein, carb and fat targets, and every other library meal matches the size of
 * the perfect-day meals in its group, so swaps still fit. Pure; uses the USDA/AI nutrition already on each ingredient.
 *
 * Method: least squares on relative error per macro, with a small pull toward the original amounts (so recipes stay
 * sensible) and bounds of 0.35×–3× per ingredient, solved by coordinate descent; then amounts are rounded to
 * kitchen-friendly grams and household measures are rescaled.
 */

import type { Ingredient, MealCategory, Nutrition, PlanMeal } from "./plan";
import { mealMacros, perfectDayMacros } from "./plan";

export type MacroTarget = { calories: number; protein: number; carbs: number; fat: number };
const KEYS = ["calories", "protein", "carbs", "fat"] as const;
const WEIGHT: Record<(typeof KEYS)[number], number> = { calories: 1.2, protein: 1.5, carbs: 1, fat: 1 };
const LAMBDA = 0.004;
const MIN = 0.35;
const MAX = 3;

type Var = { meal: number; ing: number; coef: number[]; base: number };

/** Multipliers for each ingredient so the weighted sum of meals hits the target. */
function solve(meals: PlanMeal[], weights: number[], target: MacroTarget): number[][] {
  const mult = meals.map((m) => m.ingredients.map(() => 1));
  const vars: Var[] = [];
  const fixed = [0, 0, 0, 0];
  meals.forEach((m, mi) =>
    m.ingredients.forEach((ing, ii) => {
      const c = KEYS.map((k) => (ing.per100 ? (ing.per100[k] * ing.grams * weights[mi]) / 100 : 0));
      if (!ing.per100 || ing.grams <= 0 || c.every((x) => x === 0)) KEYS.forEach((_, k) => (fixed[k] += c[k]));
      else vars.push({ meal: mi, ing: ii, coef: c, base: 1 });
    }),
  );
  const T = KEYS.map((k) => Math.max(1, target[k]));
  const x = vars.map(() => 1);
  const pred = () => KEYS.map((_, k) => fixed[k] + vars.reduce((a, v, i) => a + x[i] * v.coef[k], 0));
  let P = pred();
  for (let sweep = 0; sweep < 300; sweep++) {
    let moved = 0;
    for (let i = 0; i < vars.length; i++) {
      const v = vars[i];
      let A = LAMBDA;
      let B = -LAMBDA; // derivative pieces of λ(x-1)²
      for (let k = 0; k < 4; k++) {
        const w = WEIGHT[KEYS[k]] / (T[k] * T[k]);
        const rest = P[k] - x[i] * v.coef[k] - T[k];
        A += w * v.coef[k] * v.coef[k];
        B += w * v.coef[k] * rest;
      }
      const next = Math.min(MAX, Math.max(MIN, -B / A));
      if (next !== x[i]) {
        for (let k = 0; k < 4; k++) P[k] += (next - x[i]) * v.coef[k];
        moved = Math.max(moved, Math.abs(next - x[i]));
        x[i] = next;
      }
    }
    if (moved < 1e-5) break;
  }
  P = pred();
  vars.forEach((v, i) => (mult[v.meal][v.ing] = x[i]));
  return mult;
}

/** Kitchen-friendly grams: whole grams under 20 g, 5 g steps above. */
export function roundGrams(g: number): number {
  if (g <= 0) return 0;
  if (g < 20) return Math.max(1, Math.round(g));
  return Math.round(g / 5) * 5;
}

const FRACTIONS: Record<string, number> = { "¼": 0.25, "½": 0.5, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3, "⅛": 0.125 };

function nice(n: number, countable: boolean): string {
  if (countable) {
    const r = Math.max(1, Math.round(n * 2) / 2);
    const whole = Math.floor(r);
    return r - whole === 0.5 ? (whole ? `${whole}½` : "½") : String(whole);
  }
  const q = Math.max(0.25, Math.round(n * 4) / 4);
  const whole = Math.floor(q);
  const frac = q - whole;
  const f = frac === 0.25 ? "¼" : frac === 0.5 ? "½" : frac === 0.75 ? "¾" : "";
  return whole ? `${whole}${f}` : f || "¼";
}

/** "1 cup" × 1.5 → "1½ cups"-ish; "3 large" × 1.3 → "4 large". Unreadable measures are dropped (grams show instead). */
export function scaleHousehold(text: string, factor: number): string {
  const t = text.trim();
  if (!t || Math.abs(factor - 1) < 0.07) return t;
  const m = t.match(/^(\d+(?:\.\d+)?)?\s*(?:(\d+)\/(\d+))?\s*([¼½¾⅓⅔⅛])?\s*(.*)$/);
  if (!m || (!m[1] && !m[2] && !m[4])) return "";
  let n = 0;
  if (m[1]) n += parseFloat(m[1]);
  if (m[2] && m[3]) n += parseInt(m[2], 10) / parseInt(m[3], 10);
  if (m[4]) n += FRACTIONS[m[4]];
  if (!n) return "";
  const rest = m[5].trim();
  const countable = !/^(cups?|tbsp|tablespoons?|tsp|teaspoons?|oz|ounces?|lbs?|pounds?|ml|l|g|scoops?|handfuls?|fl)\b/i.test(rest);
  return `${nice(n * factor, countable)}${rest ? ` ${rest}` : ""}`;
}

function applyMult(meal: PlanMeal, mult: number[]): PlanMeal {
  return {
    ...meal,
    ingredients: meal.ingredients.map((ing: Ingredient, i) => {
      const f = mult[i] ?? 1;
      if (Math.abs(f - 1) < 0.02) return ing;
      const grams = roundGrams(ing.grams * f);
      return { ...ing, grams, household: scaleHousehold(ing.household, grams / Math.max(1, ing.grams)) };
    }),
  };
}

export function fitMeals(meals: PlanMeal[], weights: number[], target: MacroTarget): PlanMeal[] {
  const mult = solve(meals, weights, target);
  return meals.map((m, i) => applyMult(m, mult[i]));
}

/** Percent off target for each macro (positive = over). */
export function offBy(actual: MacroTarget, target: MacroTarget): MacroTarget {
  const p = (k: (typeof KEYS)[number]) => (target[k] > 0 ? Math.round(((actual[k] - target[k]) / target[k]) * 1000) / 10 : 0);
  return { calories: p("calories"), protein: p("protein"), carbs: p("carbs"), fat: p("fat") };
}

/**
 * 1) Fit the perfect day's meals together to the daily targets. 2) Size every other library meal like the
 * perfect-day meals of its group (or a typical share of the day when its group isn't in the perfect day).
 */
export function fitNutrition<N extends Pick<Nutrition, "meals" | "perfectDay">>(n: N, target: MacroTarget): N {
  let meals = [...n.meals];
  const servings = new Map<string, number>();
  for (const it of n.perfectDay.items) if (meals.some((m) => m.id === it.mealId)) servings.set(it.mealId, (servings.get(it.mealId) ?? 0) + it.servings);
  const dayIds = [...servings.keys()];
  if (dayIds.length) {
    const dayMeals = dayIds.map((id) => meals.find((m) => m.id === id)!);
    const fitted = fitMeals(dayMeals, dayIds.map((id) => servings.get(id)!), target);
    meals = meals.map((m) => fitted.find((f) => f.id === m.id) ?? m);
  }
  const share: Record<MealCategory, number> = { breakfast: 0.25, lunch: 0.3, dinner: 0.3, snack: 0.15 };
  const budget = (c: MealCategory): MacroTarget => {
    const inDay = dayIds.map((id) => meals.find((m) => m.id === id)!).filter((m) => m.category === c);
    if (!inDay.length) return { calories: target.calories * share[c], protein: target.protein * share[c], carbs: target.carbs * share[c], fat: target.fat * share[c] };
    const avg = (k: (typeof KEYS)[number]) => inDay.reduce((a, m) => a + mealMacros(m)[k], 0) / inDay.length;
    return { calories: avg("calories"), protein: avg("protein"), carbs: avg("carbs"), fat: avg("fat") };
  };
  meals = meals.map((m) => (servings.has(m.id) ? m : fitMeals([m], [1], budget(m.category))[0]));
  return { ...n, meals };
}

/** How far the perfect day is from the targets, e.g. for a status line. */
export function dayOffBy(n: Pick<Nutrition, "meals" | "perfectDay">, target: MacroTarget): MacroTarget {
  const d = perfectDayMacros(n);
  return offBy({ calories: d.calories, protein: d.protein, carbs: d.carbs, fat: d.fat }, target);
}
