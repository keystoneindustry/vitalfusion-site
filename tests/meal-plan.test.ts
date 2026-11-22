import assert from "node:assert/strict";
import { mealPlanFor, validateMealPlanLead, MEAL_PLANS } from "../lib/meal-plans";
import { mealPlanEmail } from "../lib/meal-plan-email";

assert.equal(mealPlanFor("workday")?.slug, "workday");
assert.equal(mealPlanFor("everyday")?.slug, "everyday");
assert.equal(mealPlanFor("nope"), null);

const ok = validateMealPlanLead({ name: "  Sam  Lee ", email: "Sam@Example.com ", plan: "workday", source: "Instagram" });
assert.ok(ok.ok);
if (ok.ok) {
  assert.equal(ok.data.firstName, "Sam");
  assert.equal(ok.data.email, "sam@example.com");
  assert.equal(ok.data.source, "Instagram");
}
const noSource = validateMealPlanLead({ name: "A", email: "a@b.co", plan: "everyday" });
assert.ok(noSource.ok && noSource.data.source === "Meal Plan");

const bad = validateMealPlanLead({ name: "", email: "nope", plan: "x" });
assert.ok(!bad.ok);
if (!bad.ok) assert.deepEqual(Object.keys(bad.errors).sort(), ["email", "name", "plan"]);

// Events differ per plan, so each plan has its own follow-up sequence.
assert.notEqual(MEAL_PLANS.workday.event, MEAL_PLANS.everyday.event);

// Email links to the right PDF with an absolute URL and escapes the name.
if (ok.ok) {
  const e = mealPlanEmail({ ...ok.data, firstName: "<b>" }, MEAL_PLANS.workday, "https://vitalfusioncoaching.com/");
  assert.ok(e.html.includes("https://vitalfusioncoaching.com/plans/60-day-meal-plan-9-to-5.pdf"));
  assert.ok(e.html.includes("&lt;b&gt;") && !e.html.includes("Hi <b>"));
}
console.log("Meal plan tests passed");
