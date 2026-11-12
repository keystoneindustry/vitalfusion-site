import assert from "node:assert/strict";
import { cleanHistory, readAnswer, systemPrompt, HISTORY_MESSAGES, MAX_QUESTION_CHARS } from "../lib/assistant";

// History: drops junk, merges repeats, starts and ends with the client.
assert.deepEqual(cleanHistory("nope"), []);
assert.deepEqual(cleanHistory([{ role: "user", text: "  hi  " }]), [{ role: "user", text: "hi" }]);
assert.deepEqual(
  cleanHistory([{ role: "assistant", text: "hello" }, { role: "system", text: "x" }, { role: "user", text: "a" }, { role: "user", text: "b" }]),
  [{ role: "user", text: "b" }],
);
assert.deepEqual(cleanHistory([{ role: "user", text: "q" }, { role: "assistant", text: "a" }]), [], "must end with a question");
const long = Array.from({ length: 30 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", text: `m${i}` }));
long.push({ role: "user", text: "last" });
const h = cleanHistory(long);
assert.ok(h.length <= HISTORY_MESSAGES);
assert.equal(h[0].role, "user");
assert.equal(h[h.length - 1].text, "last");
assert.equal(cleanHistory([{ role: "user", text: "x".repeat(5000) }])[0].text.length, MAX_QUESTION_CHARS);

// Answer: text joined, citations become distinct sources.
const a = readAnswer([
  { type: "server_tool_use" },
  { type: "text", text: "Get the **grilled nuggets**.", citations: [{ url: "https://www.chick-fil-a.com/nutrition", title: "Nutrition" }] },
  { type: "text", text: "\n\n\n- 8 count: 130 kcal", citations: [{ url: "https://www.chick-fil-a.com/nutrition", title: "Nutrition" }] },
]);
assert.equal(a.text, "Get the **grilled nuggets**.\n\n- 8 count: 130 kcal");
assert.deepEqual(a.sources, [{ url: "https://www.chick-fil-a.com/nutrition", title: "Nutrition" }]);

// Prompt carries the client's targets and restrictions.
const p = systemPrompt({ firstName: "John", goal: "Lose fat", targets: { calories: 2100, protein: 180, carbs: 200, fat: 65, fiber: 30 }, allergies: "Nuts", dietStyle: "", foodsAvoid: "mushrooms", foodsLove: "" }, "2026-11-12");
assert.ok(p.includes("2100 kcal, 180 g protein"));
assert.ok(p.includes("Allergies / intolerances: Nuts"));
assert.ok(p.includes("mushrooms"));
assert.ok(systemPrompt({ firstName: "", goal: "", targets: null, allergies: "", dietStyle: "", foodsAvoid: "", foodsLove: "" }, "x").includes("not set yet"));

console.log("assistant tests passed");

// Spend estimate: Sonnet $2 / $10 per million tokens, $0.01 per web search.
import { estimateCost } from "../lib/ai";
assert.equal(estimateCost("claude-sonnet-5-5", 1_000_000, 0), 2);
assert.equal(estimateCost("claude-sonnet-5-5", 10_000, 1_000, 2), 0.05);
assert.equal(estimateCost("unknown-model", 0, 1_000_000), 10);
console.log("spend estimate tests passed");
