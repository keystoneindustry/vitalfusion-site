import assert from "node:assert/strict";
import { aisleFor, formatWeight, groceryList, shopName, unitGrams } from "../lib/grocery";
import type { PlanMeal } from "../lib/plan";

const ing = (food: string, grams: number, household: string) => ({ food, grams, household, per100: null, source: "none" as const });
const meal = (id: string, ings: PlanMeal["ingredients"]): PlanMeal => ({ id, category: "lunch", name: id, time: "", prepMinutes: 5, ingredients: ings, instructions: "", why: "" });

assert.equal(aisleFor("Chicken breast"), "Meat & fish");
assert.equal(aisleFor("Greek yogurt, nonfat"), "Dairy & eggs");
assert.equal(aisleFor("Blueberries"), "Produce");
assert.equal(aisleFor("White rice"), "Bread, grains & pasta");
assert.equal(aisleFor("Peanut butter"), "Pantry");
assert.equal(aisleFor("Frozen mixed berries"), "Frozen");
assert.equal(shopName("Chicken breast, cooked"), "Chicken breast");
assert.deepEqual(unitGrams("3 large", 150), { each: 50, unit: "" });
assert.deepEqual(unitGrams("2 slices", 60), { each: 30, unit: "slices" });
assert.equal(unitGrams("1 cup", 180), null);
assert.equal(unitGrams("", 180), null);
assert.equal(formatWeight(1000), "1,000 g");
assert.equal(formatWeight(1012), "1,050 g");
assert.equal(formatWeight(152), "155 g");
assert.equal(formatWeight(203), "210 g");
assert.equal(formatWeight(2), "5 g");

const n = {
  meals: [
    meal("b", [ing("Eggs", 150, "3 large"), ing("Whole wheat bread", 60, "2 slices")]),
    meal("l", [ing("Chicken breast, cooked", 150, "5 oz"), ing("White rice, cooked", 180, "1 cup"), ing("Broccoli", 100, "1 cup")]),
    meal("s", [ing("Apple", 180, "1 medium")]),
  ],
  perfectDay: { note: "", items: [{ time: "7", mealId: "b", servings: 1 }, { time: "12", mealId: "l", servings: 1 }, { time: "15", mealId: "s", servings: 1 }, { time: "x", mealId: "missing", servings: 1 }] },
};
const list = groceryList(n, 7);
const get = (name: string) => list.find((i) => i.name === name)!;
assert.equal(get("Eggs").amount, "21 (2 dozen)");
assert.equal(get("Whole wheat bread").amount, "14 slices");
assert.equal(get("Apple").amount, "7");
// 150 g cooked × 7 = 1050 g cooked chicken → about 1397 g raw.
assert.equal(get("Chicken breast").amount, "1,400 g");
assert.match(get("Chicken breast").note, /1,050 g cooked = about 1,400 g raw/);
// 180 g cooked rice × 7 = 1260 g cooked → 420 g dry.
assert.equal(get("White rice").amount, "420 g");
assert.equal(get("Broccoli").amount, "700 g");
assert.ok(!list.some((i) => /\b(lb|oz)\b/.test(i.amount + i.note)), "no pounds or ounces");
assert.equal(list[0].aisle, "Produce", "sorted by store section");
assert.equal(groceryList(n, 3).find((i) => i.name === "Eggs")!.amount, "9 eggs");

console.log("grocery tests passed");
