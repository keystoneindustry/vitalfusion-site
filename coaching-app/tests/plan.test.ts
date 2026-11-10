import assert from "node:assert/strict";
import { activityFromAnswers, computeTargets, goalFromAnswer, inputsFromAnswers, waterGoalOz } from "../lib/targets";
import { groupByDay, logStats, parseMealInput } from "../lib/meals";
import {
  cleanNutrition,
  cleanTraining,
  closeness,
  exercisesToText,
  ingredientMacros,
  ingredientsToText,
  macroLine,
  mealMacros,
  parseExerciseLines,
  parseIngredientLines,
  perfectDayMacros,
  servingsLabel,
} from "../lib/plan";
import { per100FromFdc, plausible } from "../lib/food-data";
import { calculate } from "../lib/macros";

// ───────── Targets ─────────
assert.equal(goalFromAnswer("Lose fat"), "lose");
assert.equal(goalFromAnswer("Build muscle"), "muscle");
assert.equal(goalFromAnswer("Improve my health and energy"), "maintain");
assert.equal(activityFromAnswers("3", "4,000–7,000"), "light");
assert.equal(activityFromAnswers("4", "7,000–10,000"), "moderate");
assert.equal(activityFromAnswers("6", "10,000+"), "very");
assert.equal(activityFromAnswers("2", "Under 4,000"), "sedentary");
assert.equal(waterGoalOz(100), 64);
assert.equal(waterGoalOz(180), 88);
assert.equal(waterGoalOz(400), 128);

const answers = {
  goal: "Lose fat",
  sex: "Female",
  height: "5,6",
  weight: "180",
  goalWeight: "150",
  daysPerWeek: "4",
  steps: "4,000–7,000",
};
const { inputs, missing } = inputsFromAnswers(answers, 34);
assert.deepEqual(missing, []);
assert.equal(inputs.sex, "female");
assert.equal(inputs.heightFt, 5);
assert.equal(inputs.heightIn, 6);
assert.equal(inputs.pace, "balanced");
assert.equal(inputs.activity, "moderate");
const t = computeTargets(inputs);
const quiz = calculate(inputs);
// Same numbers as the macro quiz.
assert.equal(t.calories, quiz.calories);
assert.equal(t.protein, quiz.protein);
assert.equal(t.fat, quiz.fat);
assert.equal(t.carbs, quiz.carbs);
assert.ok(t.calories < t.maintenance);
assert.equal(inputsFromAnswers({}, null).missing.length, 4);
// Under 18 asking for fat loss stays at maintenance.
const teen = computeTargets(inputsFromAnswers(answers, 16).inputs);
assert.equal(teen.calories, teen.maintenance);
assert.ok(teen.notes.length > 0);

// ───────── Meal log ─────────
const now = new Date("2026-11-12T18:00:00Z");
assert.equal(parseMealInput({ meal: "lunch", eatenAt: "2026-11-12T17:00:00Z" }, true, now).ok, true);
assert.equal(parseMealInput({ meal: "lunch", eatenAt: "2026-11-12T17:00:00Z" }, false, now).ok, false); // no photo, no note
assert.equal(parseMealInput({ meal: "lunch", eatenAt: "2026-11-12T17:00:00Z", note: "turkey sandwich" }, false, now).ok, true);
assert.equal(parseMealInput({ meal: "brunch", eatenAt: "2026-11-12T17:00:00Z" }, true, now).ok, false);
assert.equal(parseMealInput({ meal: "dinner", eatenAt: "2026-11-13T18:00:00Z" }, true, now).ok, false); // future
const parsed = parseMealInput({ meal: "snack", eatenAt: "2026-11-12T15:00:00Z", place: "Work", hunger: "4", note: " " }, true, now);
assert.ok(parsed.ok && parsed.data.place === "Work" && parsed.data.hunger === 4 && parsed.data.note === null);
const weird = parseMealInput({ meal: "snack", eatenAt: "2026-11-12T15:00:00Z", place: "Moon", hunger: "9" }, true, now);
assert.ok(weird.ok && weird.data.place === null && weird.data.hunger === null);

const logs = [
  { id: "a", eaten_at: "2026-11-12T03:30:00Z" }, // Nov 11, 10:30 PM in New York
  { id: "b", eaten_at: "2026-11-12T13:00:00Z" },
  { id: "c", eaten_at: "2026-11-12T12:00:00Z" },
];
const days = groupByDay(logs, "America/New_York");
assert.deepEqual(
  days.map((d) => [d.day, d.meals.map((m) => m.id)]),
  [
    ["2026-11-12", ["c", "b"]],
    ["2026-11-11", ["a"]],
  ],
);
assert.deepEqual(logStats(logs, "America/New_York", "2026-11-12"), { total: 3, days: 2, today: 2 });

// ───────── Cleaning AI output ─────────
const raw = {
  welcome: "Here's your plan!",
  insights: { summary: "Eats late", usualFoods: ["eggs", 5, ""], estimatedCalories: "2400" },
  callAgenda: ["Ask about weekends"],
  coachNotes: [],
  meals: [
    {
      category: "breakfast",
      name: "Egg scramble",
      time: "7:00 AM",
      prepMinutes: 10,
      instructions: "Scramble.",
      why: "Protein early.",
      ingredients: [
        { food: "egg, whole", grams: 150, household: "3 eggs", calories: 215, protein: 19, carbs: 1, fat: 14 },
        { food: "bread", grams: -5, household: "", calories: 10 }, // dropped: bad grams
      ],
    },
    { category: "snack", name: "Greek yogurt", time: "3 PM", ingredients: [{ food: "greek yogurt, nonfat, plain", grams: 200, household: "1 cup", calories: 120, protein: 20, carbs: 7, fat: 0 }] },
    { category: "dinner", name: "No ingredients", ingredients: [] }, // dropped
    { category: "dessert", name: "Odd category", ingredients: [{ food: "apple", grams: 180, household: "1", calories: 94, protein: 0, carbs: 25, fat: 0 }] },
  ],
  perfectDay: {
    note: "Example day",
    items: [
      { time: "7:00 AM", mealName: "egg scramble", servings: 1 },
      { time: "3:00 PM", mealName: "Greek yogurt", servings: 2 },
      { time: "8:00 PM", mealName: "Missing meal", servings: 1 },
    ],
  },
};
const n = cleanNutrition(raw);
assert.equal(n.meals.length, 3);
assert.equal(n.meals[0].ingredients.length, 1);
assert.equal(n.meals[2].category, "lunch"); // unknown category falls back
assert.deepEqual(n.insights.usualFoods, ["eggs", "5"]);
assert.equal(n.insights.estimatedCalories, 2400);
assert.equal(n.perfectDay.items.length, 2);
assert.equal(n.perfectDay.items[1].servings, 2);
// Per-100 g numbers reproduce the AI's amount.
assert.equal(Math.round(ingredientMacros(n.meals[0].ingredients[0]).calories), 215);
assert.equal(Math.round(mealMacros(n.meals[0]).protein), 19);
const day = perfectDayMacros(n);
assert.equal(Math.round(day.calories), 215 + 240);
assert.equal(Math.round(day.protein), 19 + 40);
assert.equal(macroLine(day), "455 kcal · 59P · 15C · 14F");
assert.equal(closeness(1900, 2000), "on");
assert.equal(closeness(1820, 2000), "near");
assert.equal(closeness(1500, 2000), "off");
assert.equal(servingsLabel(1), "");
assert.equal(servingsLabel(0.5), "half a serving");
assert.equal(servingsLabel(1.5), "1½ servings");

const tr = cleanTraining({
  overview: "3 days",
  days: [
    { name: "Day 1 – Full body", focus: "Strength", exercises: [{ name: "Goblet squat", sets: 3, reps: "8–10", rest: "90 sec" }, { sets: 3 }] },
    { name: "Day 2", exercises: [] }, // dropped: no exercises
  ],
});
assert.equal(tr.days.length, 1);
assert.equal(tr.days[0].exercises.length, 1);
assert.equal(tr.days[0].exercises[0].sets, "3");

// ───────── Edit formats ─────────
const text = ingredientsToText(n.meals[0].ingredients);
assert.equal(text, "150 g | egg, whole | 3 eggs");
const back = parseIngredientLines(`${text}\n120g white rice, cooked | 3/4 cup\n\n`);
assert.ok(back.ok);
if (back.ok) {
  assert.deepEqual(back.items[0], { grams: 150, food: "egg, whole", household: "3 eggs" });
  assert.deepEqual(back.items[1], { grams: 120, food: "white rice, cooked", household: "3/4 cup" });
}
assert.equal(parseIngredientLines("some rice").ok, false);
assert.equal(parseIngredientLines("").ok, false);

const ex = exercisesToText(tr.days[0].exercises);
assert.equal(ex, "Goblet squat | 3 | 8–10 | 90 sec");
const exBack = parseExerciseLines(`${ex} | keep chest up\nPlank | 3 | 30 sec`);
assert.ok(exBack.ok);
if (exBack.ok) {
  assert.equal(exBack.items[0].notes, "keep chest up");
  assert.equal(exBack.items[1].reps, "30 sec");
  assert.equal(exBack.items[1].rest, "");
}

// ───────── USDA ─────────
const fdc = {
  fdcId: 1,
  description: "Rice, white, cooked",
  foodNutrients: [
    { nutrientId: 1008, value: 130, unitName: "KCAL" },
    { nutrientId: 1003, value: 2.7, unitName: "G" },
    { nutrientId: 1004, value: 0.3, unitName: "G" },
    { nutrientId: 1005, value: 28.2, unitName: "G" },
    { nutrientId: 1079, value: 0.4, unitName: "G" },
  ],
};
assert.deepEqual(per100FromFdc(fdc), { calories: 130, protein: 2.7, carbs: 28.2, fat: 0.3, fiber: 0.4 });
// No energy listed: worked out from protein, carbs and fat.
assert.equal(per100FromFdc({ fdcId: 2, description: "x", foodNutrients: [{ nutrientId: 1003, value: 10 }, { nutrientId: 1004, value: 10 }] })!.calories, 130);
assert.equal(per100FromFdc({ fdcId: 3, description: "x", foodNutrients: [] }), null);
const est = { calories: 130, protein: 3, carbs: 28, fat: 0, fiber: 0 };
assert.equal(plausible({ ...est, calories: 365 }, est), false); // dry rice flour vs cooked rice
assert.equal(plausible({ ...est, calories: 150 }, est), true);
assert.equal(plausible({ ...est, calories: 30 }, { ...est, calories: 20 }), true); // small foods: small gap is fine
assert.equal(plausible({ ...est, calories: 365 }, null), true);

console.log("plan tests passed");
