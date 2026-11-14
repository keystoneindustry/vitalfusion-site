import assert from "node:assert/strict";
import { calculate, validateQuiz } from "../lib/macros";
import { avoidClashes, foodsLine } from "../lib/foods";
import { fitDay, dayMacros, scaleHousehold, roundGrams, type DayMeal } from "../lib/portion-fit";
import { buildSampleDay, promptText } from "../lib/sample-day";
import { macroResultsEmail, leadRow, SHEET_COLUMNS } from "../lib/macro-email";
import { safeFallbackMeals } from "../lib/fallback-meals";

// ── Quiz validation keeps known foods, drops junk, trims typed notes
const v = validateQuiz({
  goal: "lose", pace: "balanced", sex: "male", age: 30, heightFt: 5, heightIn: 10, weightLb: 200, goalWeightLb: 180,
  activity: "moderate", tryingFor: "1to3y", obstacles: ["consistency"],
  likes: ["Chicken", "Rice", "Berries", "Not a food <script>"], likesOther: "  sushi <b>rolls</b> ",
  avoid: ["Fish & seafood", "Nope"], avoidOther: "mushrooms",
  name: "John Doe", email: "john@example.com",
});
assert.ok(v.ok, "quiz valid");
if (!v.ok) throw new Error();
const q = v.data;
assert.deepEqual(q.likes, ["Chicken", "Rice", "Berries"]);
assert.equal(q.likesOther, "sushi rolls");
assert.deepEqual(q.avoid, ["Fish & seafood"]);
const r = calculate(q);
assert.equal(r.protein, 180); // 0.9 × 200 = 180 (cap 180)
assert.ok(r.fat >= 40);

// ── Avoid check
assert.deepEqual(avoidClashes(["Grilled salmon bowl"], ["Fish & seafood"]), ["Fish & seafood"]);
assert.deepEqual(avoidClashes(["Peanut butter toast", "almond milk"], ["Dairy"]), []);
assert.deepEqual(avoidClashes(["Greek yogurt bowl"], ["Dairy"]), ["Dairy"]);
assert.deepEqual(avoidClashes(["Chicken stir fry"], ["Vegetarian (no meat)"]), ["Vegetarian (no meat)"]);
assert.equal(foodsLine(["Chicken", "Rice"], "sushi"), "Chicken, Rice, sushi");

// Fallback meals drop the salmon meal for someone who avoids fish
assert.ok(safeFallbackMeals({ goal: "lose", avoid: ["Fish & seafood"] }).every((m) => !/salmon/i.test(m.name)));
assert.equal(safeFallbackMeals({ goal: "lose", avoid: [] }).length, 3);

// ── Portion fitting (same as the coaching app)
assert.equal(roundGrams(13.4), 13);
assert.equal(roundGrams(147), 145);
assert.equal(scaleHousehold("1 cup", 1.5), "1½ cup");
assert.equal(scaleHousehold("2 large", 1.6), "3 large");
assert.equal(scaleHousehold("1/2 cup", 2), "1 cup");
assert.equal(scaleHousehold("1 1/2 cups", 1.5), "2¼ cups");
assert.equal(scaleHousehold("1/3 cup", 1.5), "½ cup");
{ const { tidyHousehold } = await import("../lib/portion-fit"); assert.equal(tidyHousehold("1/2 cup"), "½ cup"); assert.equal(tidyHousehold("1 1/2 cups"), "1½ cups"); }
{ const { plausible } = await import("../lib/usda");
  const est = { calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0 };
  assert.ok(plausible({ calories: 170, protein: 30, carbs: 0, fat: 4, fiber: 0 }, est));
  assert.ok(!plausible({ calories: 190, protein: 15, carbs: 10, fat: 9, fiber: 0 }, est), "low-protein match rejected"); }
const per = (cal: number, p: number, c: number, f: number) => ({ calories: cal, protein: p, carbs: c, fat: f, fiber: 0 });
const meals: DayMeal[] = [
  { category: "breakfast", name: "Oats", time: "7 AM", instructions: "", why: "", ingredients: [
    { food: "rolled oats, dry", grams: 60, household: "¾ cup", per100: per(379, 13, 68, 6.5), source: "usda" },
    { food: "egg, whole", grams: 100, household: "2 large", per100: per(143, 12.6, 0.7, 9.5), source: "usda" } ] },
  { category: "lunch", name: "Chicken rice", time: "12 PM", instructions: "", why: "", ingredients: [
    { food: "chicken breast, cooked", grams: 150, household: "5 oz", per100: per(165, 31, 0, 3.6), source: "usda" },
    { food: "white rice, cooked", grams: 150, household: "1 cup", per100: per(130, 2.7, 28, 0.3), source: "usda" },
    { food: "olive oil", grams: 10, household: "2 tsp", per100: per(884, 0, 0, 100), source: "usda" } ] },
  { category: "dinner", name: "Turkey potatoes", time: "6 PM", instructions: "", why: "", ingredients: [
    { food: "ground turkey, cooked", grams: 150, household: "5 oz", per100: per(203, 27, 0, 10), source: "usda" },
    { food: "potato, baked", grams: 200, household: "1 medium", per100: per(93, 2.5, 21, 0.1), source: "usda" } ] },
  { category: "snack", name: "Berries", time: "3 PM", instructions: "", why: "", ingredients: [
    { food: "strawberries, raw", grams: 150, household: "1 cup", per100: per(32, 0.7, 7.7, 0.3), source: "usda" } ] },
];
const target = { calories: r.calories, protein: r.protein, carbs: r.carbs, fat: r.fat };
const fitted = fitDay(meals, target);
const tot = dayMacros(fitted);
const pctOff = (a: number, b: number) => Math.abs(a - b) / b;
assert.ok(pctOff(tot.calories, target.calories) < 0.05, `calories ${Math.round(tot.calories)} vs ${target.calories}`);
assert.ok(pctOff(tot.protein, target.protein) < 0.08, `protein ${Math.round(tot.protein)} vs ${target.protein}`);
console.log("Fitted day:", Math.round(tot.calories), "cal", Math.round(tot.protein), "P", Math.round(tot.carbs), "C", Math.round(tot.fat), "F", "target", target);

// ── Prompt carries their foods and targets
const pt = promptText(q, r);
assert.ok(pt.includes("Chicken, Rice, Berries") && pt.includes("Fish & seafood") && pt.includes(`${r.calories} calories`));

// ── Full build with the AI + USDA faked
const realFetch = globalThis.fetch;
let aiCalls = 0;
const aiMeals = (withFish: boolean) => ({
  meals: [
    { category: "breakfast", name: "Berry oat bowl", time: "7:00 AM", instructions: "Cook oats.\nTop with berries.", why: "Fiber and slow carbs.",
      ingredients: [{ food: "rolled oats, dry", grams: 60, household: "¾ cup", calories: 227, protein: 8, carbs: 41, fat: 4, fiber: 6 },
                    { food: "blueberries, raw", grams: 100, household: "⅔ cup", calories: 57, protein: 1, carbs: 14, fat: 0, fiber: 2 }] },
    { category: "lunch", name: withFish ? "Salmon rice bowl" : "Chicken rice bowl", time: "12:30 PM", instructions: "Cook rice.\nSlice chicken.", why: "Lean protein you love.",
      ingredients: [{ food: withFish ? "salmon, cooked" : "chicken breast, cooked", grams: 170, household: "6 oz", calories: 280, protein: 52, carbs: 0, fat: 6, fiber: 0 },
                    { food: "white rice, cooked", grams: 200, household: "1¼ cup", calories: 260, protein: 5, carbs: 56, fat: 1, fiber: 1 }] },
    { category: "dinner", name: "Turkey potato skillet", time: "6:30 PM", instructions: "Brown turkey.\nAdd potatoes.", why: "Filling and easy.",
      ingredients: [{ food: "ground turkey, cooked", grams: 170, household: "6 oz", calories: 345, protein: 46, carbs: 0, fat: 17, fiber: 0 },
                    { food: "potato, baked", grams: 250, household: "1 large", calories: 232, protein: 6, carbs: 53, fat: 0, fiber: 5 },
                    { food: "olive oil", grams: 10, household: "2 tsp", calories: 88, protein: 0, carbs: 0, fat: 10, fiber: 0 }] },
    { category: "snack", name: "Apple and turkey slices", time: "3:00 PM", instructions: "Slice and eat.", why: "Quick protein.",
      ingredients: [{ food: "apple, raw", grams: 180, household: "1 medium", calories: 94, protein: 0, carbs: 25, fat: 0, fiber: 4 },
                    { food: "turkey breast, deli", grams: 85, household: "3 oz", calories: 90, protein: 15, carbs: 3, fat: 1, fiber: 0 }] },
  ],
});
globalThis.fetch = (async (url: string | URL) => {
  const u = String(url);
  if (u.includes("api.anthropic.com")) {
    aiCalls++;
    // First answer sneaks in salmon; the retry must leave it out.
    const body = aiMeals(aiCalls === 1);
    return new Response(JSON.stringify({ content: [{ type: "text", text: JSON.stringify(body) }], stop_reason: "end_turn" }), { status: 200 });
  }
  if (u.includes("api.nal.usda.gov")) return new Response(JSON.stringify({ foods: [] }), { status: 200 });
  throw new Error("unexpected fetch " + u);
}) as typeof fetch;
process.env.ANTHROPIC_API_KEY = "test";
process.env.USDA_API_KEY = "test";
const day = await buildSampleDay(q, r);
globalThis.fetch = realFetch;
assert.equal(aiCalls, 2, "retried after the AI used an avoided food");
assert.equal(day.meals.length, 4);
assert.ok(!JSON.stringify(day).toLowerCase().includes("salmon"));
assert.ok(pctOff(day.totals.calories, r.calories) < 0.05, `day ${day.totals.calories} vs ${r.calories}`);
assert.ok(pctOff(day.totals.protein, r.protein) < 0.1, `protein ${day.totals.protein} vs ${r.protein}`);
assert.ok(day.meals[0].items[0].amount.includes("g)"));
assert.deepEqual(day.meals[0].instructions, ["Cook oats.", "Top with berries."]);
console.log("Sample day:", day.totals, day.meals.map((m) => `${m.name}: ${m.items.map((i) => `${i.amount} ${i.food}`).join(", ")}`));

// ── Email shows the sample day; sheet row has the foods
const em = macroResultsEmail(q, r, "https://vitalfusioncoaching.com", day);
assert.ok(em.html.includes("Your sample day") && em.html.includes("Chicken rice bowl") && !em.html.includes("Sockeye"));
assert.ok(em.text.includes("Your sample day"));
const emNoDay = macroResultsEmail(q, r, "https://vitalfusioncoaching.com", null);
assert.ok(!emNoDay.html.includes("Sockeye"), "fish-free fallback");
const row = leadRow(q, r);
assert.deepEqual(Object.keys(row), [...SHEET_COLUMNS]);
assert.equal(row["Favorite Foods"], "Chicken, Rice, Berries, sushi rolls");
assert.equal(row["Foods Avoided"], "Fish & seafood, mushrooms");
console.log("Sample day tests passed");

// ── Follow-up emails: favourite foods line + no avoided foods in examples
{
  const { sequencePayload } = await import("../lib/sequence");
  const { tipsFor } = await import("../lib/macros");
  const { fillFoods } = await import("../lib/foods");
  const veg = validateQuiz({ ...{ goal: "muscle", sex: "female", age: 28, heightFt: 5, heightIn: 5, weightLb: 140, goalWeightLb: 150, activity: "moderate", tryingFor: "1to3y" },
    obstacles: ["protein", "eatingEnough", "busy"], likes: ["Rice", "Bananas"], likesOther: "burritos", avoid: ["Vegetarian (no meat)", "Dairy"], name: "Amy Lee", email: "amy@example.com" });
  assert.ok(veg.ok);
  if (veg.ok) {
    const pl = sequencePayload(veg.data, calculate(veg.data));
    assert.ok(pl.foods_line.includes("you love rice, bananas, and burritos"), pl.foods_line);
    assert.ok(!/chicken|lean meat|Greek yogurt|milk|jerky|beef/i.test(pl.tips_html), pl.tips_html);
    const tips = tipsFor(veg.data.obstacles, veg.data.avoid).map((t) => t.tip).join(" ");
    assert.ok(!/yogurt|lean meat|milk|chicken/i.test(tips), tips);
    console.log("Veg/dairy-free tips:", tips);
  }
  assert.equal(fillFoods("Lean on easy wins: {protein:4}."), "Lean on easy wins: Greek yogurt, eggs, lean meat and rotisserie chicken.");
  assert.ok(sequencePayload(q, r).foods_line.includes("chicken, rice, berries"));
  console.log("Sequence food tests passed");
}
