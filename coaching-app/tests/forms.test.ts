import assert from "node:assert/strict";
import { answerLines, checkAnswers, cleanSummary, sanitizeQuestions, splitMulti, type FormQuestion } from "../lib/form-schema";
import { numberLines } from "../lib/checkins";

const qs: FormQuestion[] = [
  { id: "cal", type: "number", prompt: "Days on calories", min: 0, max: 7, required: true },
  { id: "energy", type: "scale", prompt: "Energy", required: true },
  { id: "dig", type: "choice", prompt: "Digestion", options: ["Great", "OK", "Not great"], required: true },
  { id: "travel", type: "yesno", prompt: "Traveling next week?", required: false },
  { id: "q", type: "longtext", prompt: "Questions", required: false },
];

const good = checkAnswers(qs, { cal: "5", energy: "7", dig: "OK", q: "  Can I swap rice for potatoes?  " });
assert.ok(good.ok);
if (good.ok) {
  assert.equal(good.answers.q, "Can I swap rice for potatoes?");
  assert.equal(good.answers.travel, undefined);
}
const missing = checkAnswers(qs, { cal: "5", dig: "OK" });
assert.ok(!missing.ok && missing.id === "energy");
assert.equal(checkAnswers(qs, { cal: "8", energy: "7", dig: "OK" }).ok, false); // over max
assert.equal(checkAnswers(qs, { cal: "5", energy: "11", dig: "OK" }).ok, false);
assert.equal(checkAnswers(qs, { cal: "5", energy: "7", dig: "Amazing" }).ok, false);
assert.equal(checkAnswers(qs, { cal: "5", energy: "7", dig: "OK", travel: "Maybe" }).ok, false);

assert.deepEqual(answerLines(qs, { cal: "5", energy: "7", dig: "OK" }).slice(0, 2), [
  { prompt: "Days on calories", answer: "5" },
  { prompt: "Energy", answer: "7/10" },
]);
assert.equal(answerLines(qs, {})[4].answer, "—");

const sq = sanitizeQuestions([
  { type: "scale", prompt: "  Sleep quality " },
  { type: "choice", prompt: "Mood", options: ["Good", " ", "Bad", "Good"] },
  { type: "weird", prompt: "Anything else?", required: false },
  { id: "x", type: "number", prompt: "Steps", min: "0", max: "50000" },
  { id: "x", type: "text", prompt: "Same id" },
]);
assert.ok(sq.ok);
if (sq.ok) {
  assert.equal(sq.questions[0].prompt, "Sleep quality");
  assert.equal(sq.questions[0].id, "sleepquality");
  assert.deepEqual(sq.questions[1].options, ["Good", "Bad"]);
  assert.equal(sq.questions[2].type, "text");
  assert.equal(sq.questions[2].required, false);
  assert.equal(sq.questions[3].max, 50000);
  assert.notEqual(sq.questions[4].id, "x"); // ids stay unique
}
assert.equal(sanitizeQuestions([{ type: "choice", prompt: "Pick", options: ["Only one"] }]).ok, false);
assert.equal(sanitizeQuestions([{ type: "text", prompt: "" }]).ok, false);
assert.equal(sanitizeQuestions([]).ok, false);

const sum = cleanSummary({ summary: ["a", "", 5], suggestions: [{ change: "Cut 100 kcal", reason: "flat 2 weeks" }, { reason: "no change" }], draftReply: " Hi " });
assert.deepEqual(sum.summary, ["a", "5"]);
assert.equal(sum.suggestions.length, 1);
assert.equal(sum.draftReply, "Hi");
assert.deepEqual(sum.wins, []);

const lines = numberLines({
  weighIns: [],
  thisWeekAvg: 181.2,
  lastWeekAvg: 182,
  changeLb: -0.8,
  habits: [{ title: "Walk 10,000 steps", done: 5, due: 7 }],
  habitTotal: { done: 5, due: 7 },
  photosThisWeek: 1,
  targets: "2,180 kcal · 168P · 210C · 72F",
});
assert.ok(lines.some((l) => l.includes("181.2") && l.includes("-0.8")));
assert.ok(lines.some((l) => l.includes("5/7 done (71%)")));
assert.equal(numberLines({ weighIns: [], thisWeekAvg: null, lastWeekAvg: null, changeLb: null, habits: [], habitTotal: { done: 0, due: 0 }, photosThisWeek: 0, targets: null })[0], "Weight: no weigh-ins in the last 7 days");

console.log("forms tests passed");

// "Pick any": sent one per line, saved as "A, B" in option order; unknown picks dropped.
const mq: FormQuestion = { id: "macros", type: "multi", prompt: "Macros you struggled with", options: ["Protein", "Carbs", "Fat"], required: true };
const multi = checkAnswers([mq], { macros: "Fat\nProtein\nPizza" });
assert.ok(multi.ok && multi.answers.macros === "Protein, Fat");
assert.deepEqual(splitMulti(mq, "Protein, Fat"), ["Protein", "Fat"]);
assert.equal(checkAnswers([mq], { macros: "Pizza" }).ok, false);
assert.equal(checkAnswers([{ ...mq, required: false }], { macros: "" }).ok, true);
const sm = sanitizeQuestions([{ type: "multi", prompt: "Pick", options: ["A", "B"], section: "  Nutrition " }]);
assert.ok(sm.ok && sm.questions[0].section === "Nutrition" && sm.questions[0].options?.length === 2);
assert.equal(sanitizeQuestions([{ type: "multi", prompt: "Pick", options: ["A"] }]).ok, false);
