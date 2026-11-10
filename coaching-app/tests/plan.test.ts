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
import { partState, partSnapshot } from "../lib/plan";
import { strictSchema } from "../lib/ai";
import { emptyContent, sanitizeEditedMeals, sanitizeEditedTraining, sanitizePerfectDay } from "../lib/plan";
import { estimateMinutes, restMinutes, trainingBrief, trainingFacts, trainingWarnings, withTrainingNotes } from "../lib/training-brief";
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

// ───────── Training must follow their answers ─────────
const home = { goal: "Build muscle", daysPerWeek: "3", sessionLength: "45 minutes", trainWhere: "At home with little equipment", equipment: ["Dumbbells", "Resistance bands"], experience: "Some (under 1 year)", injuries: "left knee hurts on deep squats" };
const brief = trainingBrief(home);
assert.ok(brief.includes("Exactly 3 training days"));
assert.ok(brief.includes("about 45 minutes"));
assert.ok(brief.includes("ONLY use this equipment: Dumbbells, Resistance bands"));
assert.ok(brief.includes("left knee"));
assert.ok(trainingBrief({ ...home, trainWhere: "Commercial gym" }).includes("any standard gym equipment"));
assert.ok(trainingFacts(home).some((f) => f.label === "Equipment" && f.value === "Dumbbells, Resistance bands"));
assert.equal(restMinutes("90 sec"), 1.5);
assert.equal(restMinutes("2 min"), 2);
assert.equal(restMinutes("60–90s"), 1);
const shortDay = { name: "Day 1", focus: "", exercises: [{ name: "Goblet squat", sets: "3", reps: "10", rest: "60 sec", notes: "" }] };
assert.equal(estimateMinutes(shortDay), 8 + Math.round(3 * 1.75));
const longDay = { name: "Day 2", focus: "", exercises: Array.from({ length: 8 }, () => ({ name: "Dumbbell row", sets: "4", reps: "10", rest: "2 min", notes: "" })) };
const program = { overview: "", warmup: "", progression: "", notes: "", days: [shortDay, { ...longDay, exercises: [...longDay.exercises, { name: "Barbell back squat", sets: "3", reps: "5", rest: "2 min", notes: "" }] }] };
const warn = trainingWarnings(program, home);
assert.ok(warn.some((w) => w.includes("2 training days") && w.includes("3 days")));
assert.ok(warn.some((w) => w.startsWith("Day 2 looks like")));
assert.ok(warn.some((w) => w.includes("Barbell back squat") && w.includes("a barbell")));
assert.ok(!warn.some((w) => w.includes("Dumbbell row"))); // they have dumbbells
// At a commercial gym with 2 days: only the (genuinely) too-long day is flagged, not the equipment.
const gym = trainingWarnings(program, { ...home, trainWhere: "Commercial gym", daysPerWeek: "2", sessionLength: "75+ minutes" });
assert.deepEqual(gym.map((w) => w.slice(0, 16)), ["Day 2 looks like"]);
assert.equal(trainingWarnings({ ...program, days: [shortDay, shortDay] }, { ...home, trainWhere: "Commercial gym", daysPerWeek: "2" }).length, 0);
const notes = withTrainingNotes(["Check allergies", "Training: old warning"], program, home);
assert.equal(notes[0], "Check allergies");
assert.ok(!notes.includes("Training: old warning"));
assert.ok(notes.slice(1).every((x) => x.startsWith("Training: ")));

// ───────── Saving the builders ─────────
const content = emptyContent();
assert.equal(content.meals.length, 0);
assert.equal(content.training.days.length, 0);
const edited = sanitizeEditedMeals([
  {
    id: "abc123",
    category: "breakfast",
    name: "Oats",
    ingredients: [
      { food: "rolled oats, dry", grams: 60, household: "2/3 cup", per100: { calories: 379, protein: 13, carbs: 68, fat: 6.5, fiber: 10 }, source: "usda" },
      { food: "banana", grams: 100, household: "1 small", per100: null, source: "none" },
      { food: "", grams: 0 }, // empty row is skipped
    ],
  },
  { id: "abc123", category: "nope", name: "Copy with same id", ingredients: [{ food: "apple", grams: 150 }] },
]);
assert.ok(edited.ok);
if (edited.ok) {
  assert.equal(edited.meals[0].ingredients.length, 2);
  assert.equal(edited.meals[0].ingredients[0].source, "usda");
  assert.equal(edited.meals[0].ingredients[1].per100, null);
  assert.equal(edited.meals[0].ingredients[1].source, "none");
  assert.notEqual(edited.meals[1].id, "abc123"); // duplicate ids get a new one
  assert.equal(edited.meals[1].category, "lunch");
  const pd = sanitizePerfectDay({ note: "x", items: [{ time: "7 AM", mealId: "abc123", servings: 1.3 }, { mealId: "gone" }] }, edited.meals);
  assert.equal(pd.items.length, 1);
  assert.equal(pd.items[0].servings, 1.25);
}
assert.equal(sanitizeEditedMeals([{ name: "", ingredients: [{ food: "x", grams: 1 }] }]).ok, false);
assert.equal(sanitizeEditedMeals([{ name: "Empty", ingredients: [] }]).ok, false);
assert.equal(sanitizeEditedMeals([{ name: "Huge", ingredients: [{ food: "rice", grams: 5000 }] }]).ok, false);
const tOk = sanitizeEditedTraining({ overview: "o", days: [{ name: "Day 1", exercises: [{ name: "Push-up", sets: "3", reps: "10", rest: "60 sec" }, { name: "" }] }] });
assert.ok(tOk.ok && tOk.training.days[0].exercises.length === 1);
assert.equal(sanitizeEditedTraining({ days: [{ name: "Day 1", exercises: [] }] }).ok, false);

// ───────── Meals and workouts publish separately ─────────
const tg = { calories: 2000, protein: 150, carbs: 200, fat: 60, fiber: 28, waterOz: 88 };
const withMeals = { content: { ...emptyContent(), meals: n.meals }, targets: tg };
const withBoth = { content: { ...withMeals.content, training: tr }, targets: tg };
assert.equal(partState(null, null, "nutrition"), "empty");
assert.equal(partState(withMeals, null, "nutrition"), "draft");
assert.equal(partState(withMeals, null, "training"), "empty");
assert.equal(partState(withBoth, withMeals, "nutrition"), "live");
assert.equal(partState(withBoth, withMeals, "training"), "draft");
assert.equal(partState({ ...withBoth, targets: { ...tg, calories: 1900 } }, withBoth, "nutrition"), "changed"); // new targets count
assert.equal(partState({ ...withBoth, targets: { ...tg, calories: 1900 } }, withBoth, "training"), "live");
assert.equal(partState(null, withBoth, "training"), "live");
assert.notEqual(partSnapshot(withBoth, "training"), partSnapshot(withBoth, "nutrition"));

// ───────── Structured output schemas ─────────
const strict = strictSchema({
  type: "object",
  properties: { a: { type: "string" }, list: { type: "array", items: { type: "object", properties: { x: { type: "number" } } } } },
}) as Record<string, any>;
assert.deepEqual(strict.required, ["a", "list"]);
assert.equal(strict.additionalProperties, false);
assert.deepEqual(strict.properties.list.items.required, ["x"]);
assert.equal(strict.properties.list.items.additionalProperties, false);
assert.equal(strict.properties.a.additionalProperties, undefined);

// ───────── Meal slots from the AI's analysis ─────────
const { normalizeSlots, budgets } = await import("../lib/plan-draft");
const tgt = computeTargets(inputsFromAnswers(answers, 34).inputs);
const slots = normalizeSlots(
  [
    { category: "Breakfast", time: "7:00 AM", calories: 400, protein: 30, carbs: 40, fat: 12 },
    { category: "lunch", time: "12:30 PM", calories: 500, protein: 40, carbs: 50, fat: 15 },
    { category: "snack", time: "3:30 PM", calories: 200, protein: 20, carbs: 20, fat: 5 },
    { category: "dinner", time: "7:00 PM", calories: 600, protein: 45, carbs: 55, fat: 20 },
    { category: "dessert", time: "9 PM", calories: 300 }, // unknown group: dropped
  ],
  tgt,
);
assert.equal(slots.length, 4);
assert.equal(slots[0].category, "breakfast");
// Scaled so the day adds up to the targets (within rounding).
assert.ok(Math.abs(slots.reduce((a, x) => a + x.calories, 0) - tgt.calories) <= 2);
assert.ok(Math.abs(slots.reduce((a, x) => a + x.protein, 0) - tgt.protein) <= 2);
assert.equal(normalizeSlots([], tgt).length, 4); // falls back to a typical day
const sizes = budgets(slots, tgt);
assert.equal(sizes.lunch.calories, slots[1].calories);
assert.ok(sizes.breakfast.calories > 0 && sizes.snack.calories < sizes.dinner.calories);

console.log("plan tests passed");
