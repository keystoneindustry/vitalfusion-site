/**
 * Portion fitting, copied from the coaching app (coaching-app/lib/fit.ts): after the AI writes the
 * sample day, ingredient amounts (not the foods) are adjusted so the day lands on the person's
 * calorie, protein, carb and fat targets. Least squares on relative error per macro, with a small
 * pull toward the AI's amounts (so recipes stay sensible) and bounds of 0.5×–2× per ingredient.
 * Amounts are then rounded to kitchen-friendly grams and household measures are rescaled.
 */

export type Macros = { calories: number; protein: number; carbs: number; fat: number; fiber: number };
export type MacroTarget = { calories: number; protein: number; carbs: number; fat: number };

export type Ingredient = {
  food: string;
  grams: number;
  household: string;
  /** Nutrition per 100 g. */
  per100: Macros | null;
  source: "usda" | "ai" | "none";
};

export type DayMeal = {
  category: "breakfast" | "lunch" | "dinner" | "snack";
  name: string;
  time: string;
  ingredients: Ingredient[];
  instructions: string;
  why: string;
};

export const ZERO: Macros = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
const KEYS = ["calories", "protein", "carbs", "fat"] as const;
const WEIGHT: Record<(typeof KEYS)[number], number> = { calories: 1.2, protein: 1.5, carbs: 1, fat: 1 };
const LAMBDA = 0.004;
const MIN = 0.5;
const MAX = 2;

export function ingredientMacros(i: Ingredient): Macros {
  if (!i.per100) return { ...ZERO };
  const f = i.grams / 100;
  return {
    calories: i.per100.calories * f,
    protein: i.per100.protein * f,
    carbs: i.per100.carbs * f,
    fat: i.per100.fat * f,
    fiber: i.per100.fiber * f,
  };
}

export function sumMacros(list: Macros[]): Macros {
  return list.reduce(
    (a, m) => ({ calories: a.calories + m.calories, protein: a.protein + m.protein, carbs: a.carbs + m.carbs, fat: a.fat + m.fat, fiber: a.fiber + m.fiber }),
    { ...ZERO },
  );
}

export function mealMacros(m: Pick<DayMeal, "ingredients">): Macros {
  return sumMacros(m.ingredients.map(ingredientMacros));
}

export function dayMacros(meals: Pick<DayMeal, "ingredients">[]): Macros {
  return sumMacros(meals.map(mealMacros));
}

type Var = { meal: number; ing: number; coef: number[] };

function solve(meals: DayMeal[], target: MacroTarget, lo = MIN, hi = MAX): number[][] {
  const mult = meals.map((m) => m.ingredients.map(() => 1));
  const vars: Var[] = [];
  const fixed = [0, 0, 0, 0];
  meals.forEach((m, mi) =>
    m.ingredients.forEach((ing, ii) => {
      const c = KEYS.map((k) => (ing.per100 ? (ing.per100[k] * ing.grams) / 100 : 0));
      if (!ing.per100 || ing.grams <= 0 || c.every((x) => x === 0)) KEYS.forEach((_, k) => (fixed[k] += c[k]));
      else vars.push({ meal: mi, ing: ii, coef: c });
    }),
  );
  const T = KEYS.map((k) => Math.max(1, target[k]));
  const x = vars.map(() => 1);
  const P = KEYS.map((_, k) => fixed[k] + vars.reduce((a, v, i) => a + x[i] * v.coef[k], 0));
  for (let sweep = 0; sweep < 300; sweep++) {
    let moved = 0;
    for (let i = 0; i < vars.length; i++) {
      const v = vars[i];
      let A = LAMBDA;
      let B = -LAMBDA;
      for (let k = 0; k < 4; k++) {
        const w = WEIGHT[KEYS[k]] / (T[k] * T[k]);
        const rest = P[k] - x[i] * v.coef[k] - T[k];
        A += w * v.coef[k] * v.coef[k];
        B += w * v.coef[k] * rest;
      }
      const next = Math.min(hi, Math.max(lo, -B / A));
      if (next !== x[i]) {
        for (let k = 0; k < 4; k++) P[k] += (next - x[i]) * v.coef[k];
        moved = Math.max(moved, Math.abs(next - x[i]));
        x[i] = next;
      }
    }
    if (moved < 1e-5) break;
  }
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

/** Reads the number at the start of a household measure: "1/2 cup", "1 1/2 cups", "1½ cup", "2 large". */
function parseQty(t: string): { n: number; rest: string } | null {
  let m = t.match(/^(?:(\d+)\s+)?(\d+)\s*\/\s*(\d+)\s*(.*)$/);
  if (m) {
    const den = parseInt(m[3], 10);
    if (!den) return null;
    return { n: (m[1] ? parseInt(m[1], 10) : 0) + parseInt(m[2], 10) / den, rest: m[4] };
  }
  m = t.match(/^(\d+(?:\.\d+)?)?\s*([¼½¾⅓⅔⅛])?\s*(.*)$/);
  if (!m || (!m[1] && !m[2])) return null;
  return { n: (m[1] ? parseFloat(m[1]) : 0) + (m[2] ? FRACTIONS[m[2]] : 0), rest: m[3] };
}

/** "1 cup" × 1.5 → "1½ cup"; "1/2 cup" × 2 → "1 cup"; "3 large" × 1.3 → "4 large". Unreadable measures are dropped. */
export function scaleHousehold(text: string, factor: number): string {
  const t = text.trim();
  if (!t || Math.abs(factor - 1) < 0.07) return t;
  const q = parseQty(t);
  if (!q || !q.n) return "";
  const rest = q.rest.trim();
  const countable = !/^(cups?|tbsp|tablespoons?|tsp|teaspoons?|oz|ounces?|lbs?|pounds?|ml|l|g|scoops?|handfuls?|fl)\b/i.test(rest);
  return `${nice(q.n * factor, countable)}${rest ? ` ${rest}` : ""}`;
}

/** Shows "1/2 cup" as "½ cup" even when an amount wasn't resized. */
export function tidyHousehold(text: string): string {
  return text
    .replace(/(\d+)\s+1\/2(?!\d)/g, "$1½").replace(/(\d+)\s+1\/4(?!\d)/g, "$1¼").replace(/(\d+)\s+3\/4(?!\d)/g, "$1¾")
    .replace(/(\d+)\s+1\/3(?!\d)/g, "$1⅓").replace(/(\d+)\s+2\/3(?!\d)/g, "$1⅔")
    .replace(/(?<!\d)1\/2(?!\d)/g, "½").replace(/(?<!\d)1\/4(?!\d)/g, "¼").replace(/(?<!\d)3\/4(?!\d)/g, "¾")
    .replace(/(?<!\d)1\/3(?!\d)/g, "⅓").replace(/(?<!\d)2\/3(?!\d)/g, "⅔").replace(/(?<!\d)1\/8(?!\d)/g, "⅛");
}

function applyMult(meals: DayMeal[], mult: number[][]): DayMeal[] {
  return meals.map((meal, mi) => ({
    ...meal,
    ingredients: meal.ingredients.map((ing, i) => {
      const f = mult[mi][i] ?? 1;
      if (Math.abs(f - 1) < 0.02) return ing;
      const grams = roundGrams(ing.grams * f);
      return { ...ing, grams, household: scaleHousehold(ing.household, grams / Math.max(1, ing.grams)) };
    }),
  }));
}

/** Typical share of the day per meal, so no single meal ends up huge. */
export const MEAL_SHARE: Record<DayMeal["category"], number> = { breakfast: 0.25, lunch: 0.3, dinner: 0.3, snack: 0.15 };

/**
 * Resizes ingredient amounts so the day hits the targets. First each meal is fitted to its share of
 * the day (shares re-scaled to the meals present), then the whole day gets a final small adjustment
 * (each ingredient may move only -25% to +35%), so meals stay balanced.
 */
export function fitDay(meals: DayMeal[], target: MacroTarget): DayMeal[] {
  const total = meals.reduce((a, m) => a + (MEAL_SHARE[m.category] ?? 0.25), 0) || 1;
  const perMeal = meals.map((m) => {
    const f = (MEAL_SHARE[m.category] ?? 0.25) / total;
    const t = { calories: target.calories * f, protein: target.protein * f, carbs: target.carbs * f, fat: target.fat * f };
    return applyMult([m], solve([m], t))[0];
  });
  return applyMult(perMeal, solve(perMeal, target, 0.75, 1.35));
}
