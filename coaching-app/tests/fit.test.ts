import assert from "node:assert/strict";
import { dayOffBy, fitNutrition, roundGrams, scaleHousehold } from "../lib/fit";
import type { PlanMeal } from "../lib/plan";

const ing = (food: string, grams: number, household: string, c: number, p: number, cb: number, f: number) => ({ food, grams, household, per100: { calories: c, protein: p, carbs: cb, fat: f, fiber: 1 }, source: "usda" as const });
const meal = (id: string, category: PlanMeal["category"], ings: PlanMeal["ingredients"]): PlanMeal => ({ id, category, name: id, time: "", prepMinutes: 5, ingredients: ings, instructions: "", why: "" });
const meals: PlanMeal[] = [
  meal("b1", "breakfast", [ing("Greek yogurt", 200, "¾ cup", 59, 10, 3.6, 0.4), ing("Blueberries", 100, "2/3 cup", 57, 0.7, 14, 0.3), ing("Granola", 40, "⅓ cup", 470, 10, 64, 20)]),
  meal("b2", "breakfast", [ing("Eggs", 100, "2 large", 143, 12.6, 0.7, 9.5), ing("Toast", 60, "2 slices", 250, 12, 43, 3.5)]),
  meal("l1", "lunch", [ing("Chicken breast", 120, "4 oz", 165, 31, 0, 3.6), ing("Rice", 150, "¾ cup", 130, 2.7, 28, 0.3), ing("Olive oil", 5, "1 tsp", 884, 0, 0, 100)]),
  meal("d1", "dinner", [ing("Salmon", 120, "4 oz", 208, 20, 0, 13), ing("Potatoes", 150, "1 medium", 77, 2, 17, 0.1), ing("Green beans", 100, "1 cup", 31, 1.8, 7, 0.2)]),
  meal("s1", "snack", [ing("Apple", 150, "1 medium", 52, 0.3, 14, 0.2), ing("Peanut butter", 16, "1 tbsp", 588, 25, 20, 50)]),
];
const n = { meals, perfectDay: { note: "", items: [{ time: "7", mealId: "b1", servings: 1 }, { time: "12", mealId: "l1", servings: 1 }, { time: "15", mealId: "s1", servings: 1 }, { time: "18", mealId: "d1", servings: 1 }] } };
const target = { calories: 2000, protein: 160, carbs: 200, fat: 62 };
const before = dayOffBy(n, target);
assert.ok(Math.abs(before.calories) > 10, `starts off target (${JSON.stringify(before)})`);
const fitted = fitNutrition(n, target);
const after = dayOffBy(fitted, target);
for (const k of ["calories", "protein", "carbs", "fat"] as const) assert.ok(Math.abs(after[k]) <= 4, `${k} within 4% (got ${after[k]}%)`);
// Foods stay the same; only amounts change, rounded.
assert.deepEqual(fitted.meals.map((m) => m.ingredients.map((i) => i.food)), meals.map((m) => m.ingredients.map((i) => i.food)));
assert.ok(fitted.meals.every((m) => m.ingredients.every((i) => i.grams < 20 || i.grams % 5 === 0)));
// The other breakfast gets sized like the perfect-day breakfast.
assert.equal(roundGrams(123), 125);
assert.equal(roundGrams(7.4), 7);
assert.equal(scaleHousehold("1 cup", 1.5), "1½ cup");
assert.equal(scaleHousehold("2 large", 1.6), "3 large");
assert.equal(scaleHousehold("¾ cup", 2), "1½ cup");
assert.equal(scaleHousehold("4 oz", 1.02), "4 oz");
assert.equal(scaleHousehold("a handful", 2), "");
console.log("fit tests passed", JSON.stringify({ before, after }));
