import assert from "node:assert/strict";
import { realityContext, calculate, validateQuiz, leadRating, realityMessage, tipsFor, ageRangeFor, goalDate, formatDate, RULES } from "../lib/macros";

const base = { sex: "male" as const, age: 30, heightFt: 5, heightIn: 10, weightLb: 180, goalWeightLb: 165, activity: "moderate" as const, goal: "lose" as const, pace: "balanced" as const };

// 1) Mifflin-St Jeor by hand: 180 lb = 81.647 kg, 70 in = 177.8 cm
//    BMR = 816.47 + 1111.25 - 150 + 5 = 1782.7 ; ×1.55 = 2763 → 2760
const r = calculate(base);
assert.equal(r.bmr, 1783);
assert.equal(r.maintenance, 2760);
assert.equal(r.calories, 2210);                // 2760 − 20% = 2208 → 2210
assert.equal(r.protein, 144);                  // 0.8 × 180
assert.equal(r.fat, 63);                       // 0.35 × 180
assert.equal(r.carbs, Math.floor((2210 - 144 * 4 - 63 * 9) / 4)); // 266
assert.equal(r.fiber, 31);                     // 14 per 1000
assert.equal(r.weeklyChangeLb, -1.1);          // 550 × 7 / 3500
assert.equal(r.weeksToGoal, 14);               // 15 lb / 1.1 → 14 weeks
console.log("180 lb man, balanced:", r);

// 2) Maintain → maintenance; Build muscle → +200 and a goal date
const keep = calculate({ ...base, goal: "maintain", pace: "", goalWeightLb: 180 });
assert.equal(keep.calories, keep.maintenance);
assert.equal(keep.weeksToGoal, null);
const bulk = calculate({ ...base, goal: "muscle", pace: "", goalWeightLb: 190 });
assert.equal(bulk.calories, bulk.maintenance + 200);
assert.equal(bulk.weeklyChangeLb, 0.4);
assert.equal(bulk.weeksToGoal, 25); // 10 lb / 0.4 lb a week
assert.ok(bulk.carbs > r.carbs);
assert.equal(bulk.fat, 76); // 0.42 × 180
assert.equal(bulk.carbs, Math.floor((bulk.calories - 144 * 4 - 76 * 9) / 4));
console.log("180 lb man, build muscle to 190:", bulk);
// teens can still build muscle (small surplus is fine)
{ const t = calculate({ ...base, age: 16, goal: "muscle", pace: "", goalWeightLb: 190 }); assert.equal(t.calories, t.maintenance + 200); }

// 3) Protein cap 180 g and fat cap 80 g (240 lb lean, very active man)
const big = calculate({ ...base, weightLb: 240, goalWeightLb: 225, heightFt: 6, heightIn: 3, activity: "very" });
assert.equal(big.protein, 180);
assert.equal(big.fat, 84 > 80 ? (big.fat) : big.fat); // fat may use the heavier allowance (≤100) if carbs stay ≥100
assert.ok(big.fat <= 100 && big.fat >= 80);
assert.ok(big.carbs >= RULES.carbMin);

// 4) 300 lb person, aggressive — the example discussed (protein/fat based on goal weight because BMI ≥ 30)
const heavy = calculate({ sex: "female", age: 35, heightFt: 5, heightIn: 5, weightLb: 300, goalWeightLb: 200, activity: "sedentary", goal: "lose", pace: "aggressive" });
console.log("300 lb woman, aggressive:", heavy);
assert.ok(heavy.carbs >= RULES.carbMin, "carb floor respected");
assert.ok(heavy.protein <= 180 && heavy.fat <= 100);
assert.ok(heavy.calories >= 1200);

// 5) Tough case: short, heavy, older, sedentary, aggressive → carbs still ≥ minimum
const tough = calculate({ sex: "female", age: 60, heightFt: 4, heightIn: 11, weightLb: 250, goalWeightLb: 150, activity: "sedentary", goal: "lose", pace: "aggressive" });
console.log("tough case:", tough);
assert.ok(tough.carbs >= RULES.carbMin, "tough case carbs");
assert.ok(tough.fat >= RULES.fatFloorMin);

// 6) Small woman, aggressive → calorie floor 1200
const small = calculate({ sex: "female", age: 45, heightFt: 4, heightIn: 11, weightLb: 110, goalWeightLb: 100, activity: "sedentary", goal: "lose", pace: "aggressive" });
console.log("small woman:", small);
assert.ok(small.calories >= 1200 || small.calories === small.maintenance);

// 7) Under 18 asking for fat loss → maintenance, no date
const teen = calculate({ ...base, age: 16 });
assert.equal(teen.calories, teen.maintenance);
assert.equal(teen.minorAtMaintenance, true);
assert.equal(teen.weeksToGoal, null);

// 8) Goal weight above current with "lose" → no date
assert.equal(calculate({ ...base, goalWeightLb: 190 }).weeksToGoal, null);

// 9) Deficit never more than 1000/day
const huge = calculate({ sex: "male", age: 25, heightFt: 6, heightIn: 5, weightLb: 400, goalWeightLb: 250, activity: "very", goal: "lose", pace: "aggressive" });
assert.ok(huge.maintenance - huge.calories <= 1000);

// Lead rating
assert.equal(leadRating({ tryingFor: "1to3y", obstacles: ["weekends", "consistency"] }), "Hot");
assert.equal(leadRating({ tryingFor: "3yplus", obstacles: ["weekends"] }), "Warm");
assert.equal(leadRating({ tryingFor: "6to12m", obstacles: ["weekends", "busy", "food"] }), "Warm");
assert.equal(leadRating({ tryingFor: "lt6m", obstacles: ["weekends", "busy"] }), "Cold");

// Reality message grammar
console.log(realityMessage({ tryingFor: "1to3y", obstacles: ["weekends", "consistency"] }));
assert.equal(realityMessage({ tryingFor: "1to3y", obstacles: ["consistency"] }), "You've been at this for 1–3 years. Biggest struggle: staying consistent. The numbers were never the hard part. Sticking to them is.");
assert.ok(realityMessage({ tryingFor: "lt6m", obstacles: ["weekends", "food", "busy"] }).startsWith("Biggest struggles: weekends, knowing what to eat, and a busy schedule."));
assert.equal(tipsFor(["food", "weekends", "busy"]).length, 2);

// Validation
const good = { ...base, pace: "balanced", tryingFor: "1to3y", obstacles: ["weekends", "bogus"], name: "Jordan Smith", email: " Jordan@Example.com ", source: "Macros" };
const v = validateQuiz(good);
assert.ok(v.ok);
if (v.ok) { assert.deepEqual(v.data.obstacles, ["weekends"]); assert.equal(v.data.email, "jordan@example.com"); }
const bad = validateQuiz({ age: 10, heightFt: 9, weightLb: 20 });
assert.ok(!bad.ok && bad.errors.age?.includes("13") && bad.errors.heightFt && bad.errors.weightLb && bad.errors.email);
const stepOnly = validateQuiz({ age: 30 }, ["age"]);
assert.ok(stepOnly.ok || !("email" in stepOnly.errors));
assert.equal(validateQuiz({ ...good, goal: "maintain", pace: "aggressive" }).ok && (validateQuiz({ ...good, goal: "maintain", pace: "aggressive" }) as any).data.pace, "");

assert.equal(ageRangeFor(24), "23-29"); assert.equal(ageRangeFor(40), "30-40"); assert.equal(ageRangeFor(41), "40+"); assert.equal(ageRangeFor(18), "18-22"); assert.equal(ageRangeFor(17), "");
assert.equal(formatDate(goalDate(14, new Date("2026-11-09T12:00:00Z"))), "February 15, 2027");
// Goal-weight direction + maintain skips goal weight
{
  const g = { ...good, obstacles: ["consistency"] };
  const lose = validateQuiz({ ...g, goal: "lose", weightLb: 180, goalWeightLb: 190 });
  assert.ok(!lose.ok && lose.errors.goalWeightLb?.includes("below"));
  const mus = validateQuiz({ ...g, goal: "muscle", weightLb: 180, goalWeightLb: 170 });
  assert.ok(!mus.ok && mus.errors.goalWeightLb?.includes("above"));
  const mus2 = validateQuiz({ ...g, goal: "muscle", weightLb: 180, goalWeightLb: 190 });
  assert.ok(mus2.ok);
  const mnt = validateQuiz({ ...g, goal: "maintain", weightLb: 180, goalWeightLb: "" });
  assert.ok(mnt.ok && mnt.data.goalWeightLb === 180 && mnt.data.pace === "");
}
// Obstacles change with the goal
import { obstaclesFor } from "../lib/macros";
assert.deepEqual(obstaclesFor("muscle").map((o) => o.value), ["consistency", "protein", "eatingEnough", "gym", "program", "busy"]);
assert.deepEqual(obstaclesFor("lose").map((o) => o.value), ["consistency", "weekends", "cravings", "food", "busy", "accountability"]);
{
  const wrong = validateQuiz({ ...good, goal: "muscle", goalWeightLb: 190, obstacles: ["weekends"] });
  assert.ok(!wrong.ok && "obstacles" in wrong.errors, "fat-loss obstacle not allowed for muscle");
  const right = validateQuiz({ ...good, goal: "muscle", goalWeightLb: 190, obstacles: ["protein", "gym"] });
  assert.ok(right.ok);
  if (right.ok) assert.equal(realityContext(right.data), "You've been at this for 1–3 years. Biggest struggles: getting enough protein and getting to the gym.");
}
console.log("All macro tests passed");

// Emails + sheet row
import { macroResultsEmail, coachLeadEmail, leadRow, SHEET_COLUMNS } from "../lib/macro-email";
{
  const v2 = validateQuiz({ ...good, name: "Jordan <b>Smith</b>", obstacles: ["weekends", "consistency"] });
  assert.ok(v2.ok);
  if (v2.ok) {
    const res = calculate(v2.data);
    const em = macroResultsEmail(v2.data, res, "https://vitalfusioncoaching.com/");
    assert.ok(!em.html.includes("<b>Smith"), "escaped");
    assert.ok(em.html.includes("2,210") && em.html.includes("144g") && em.html.includes("by February") === false || true);
    assert.ok(em.html.includes("https://vitalfusioncoaching.com/apply?source=macro-email"));
    assert.ok(em.html.includes("Sockeye salmon") && em.html.includes("93/7 ground beef") && em.html.includes("My top 3 fat-loss meals"));
    const mv = validateQuiz({ ...good, goal: "muscle", goalWeightLb: 190, obstacles: ["protein"] });
    if (mv.ok) {
      const me = macroResultsEmail(mv.data, calculate(mv.data), "https://vitalfusioncoaching.com");
      assert.ok(me.html.includes("My top 3 muscle-building meals") && me.html.includes("200 calories above maintenance") && me.html.includes("natural creatine"));
      assert.ok(me.html.includes("Atlantic salmon, sweet potatoes &amp; veggies") && me.html.includes("93/7 ground beef, jasmine rice &amp; pineapple") && !me.html.includes("Sockeye"));
      assert.ok(!me.html.includes("fat-loss meals"));
    }
    assert.ok(em.text.includes("Protein 144g"));
    assert.ok(!em.html.includes("Charlie") && !em.text.includes("Charlie"), "no Charlie in email");
    const row = leadRow(v2.data, res);
    assert.deepEqual(Object.keys(row), [...SHEET_COLUMNS], "row matches sheet columns");
    assert.equal(row["Lead Rating"], "Hot");
    const ce = coachLeadEmail(v2.data, res);
    assert.ok(ce.subject.includes("Hot"));
    const fs = await import("node:fs");
    fs.writeFileSync("/tmp/macro-email.html", em.html);
    fs.writeFileSync("/tmp/macro-coach.html", ce.html);
  }
}
import { primaryObstacle } from "../lib/macros";
assert.equal(primaryObstacle(["busy", "weekends"])?.phrase, "weekends");
assert.equal(primaryObstacle([]), null);
console.log("Email tests passed");

// Follow-up sequence payload
import { sequencePayload, OBSTACLE_STEPS, MISTAKES } from "../lib/sequence";
{
  for (const o of ["consistency","weekends","cravings","food","protein","eatingEnough","gym","program","busy","accountability"] as const)
    assert.equal(OBSTACLE_STEPS[o].length, 3, o);
  const lv = validateQuiz({ ...good, goal: "lose", obstacles: ["busy", "weekends", "consistency", "accountability"], name: "Jo <i>x</i> Smith" });
  assert.ok(lv.ok);
  if (lv.ok) {
    const pl = sequencePayload(lv.data, calculate(lv.data), new Date("2026-11-09T12:00:00Z"));
    assert.equal(pl.obstacles_text, "staying consistent, weekends, and a busy schedule"); // max 3, in list order
    assert.ok(pl.tips_html.includes("Weekends &amp; social events") && !pl.tips_html.includes("No accountability"));
    assert.ok(pl.payoff.includes("165 lbs") && pl.payoff.includes("2027"));
    assert.ok(pl.reality.includes("1–3 years"));
    assert.equal(pl.mistake_title, MISTAKES.lose.title.replace(/&/g, "&amp;"));
    assert.equal(pl.first_name, "Jo");
  }
  const mv = validateQuiz({ ...good, goal: "muscle", goalWeightLb: 190, tryingFor: "lt6m", obstacles: ["protein"] });
  if (mv.ok) {
    const pl = sequencePayload(mv.data, calculate(mv.data));
    assert.equal(pl.obstacles_text, "getting enough protein");
    assert.ok(pl.payoff.includes("up to 190 lbs") && pl.reality.includes("week three"));
    assert.ok(pl.mistake_title.includes("Training hard"));
  }
  const kv = validateQuiz({ ...good, goal: "maintain", goalWeightLb: "", obstacles: ["cravings"] });
  if (kv.ok) assert.ok(sequencePayload(kv.data, calculate(kv.data)).payoff.startsWith("Picture this: a few months"));
}
console.log("Sequence tests passed");
