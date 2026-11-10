import assert from "node:assert/strict";
import { checklist, nextStep, stepIndex, stepPath } from "../lib/onboarding";
import {
  checkAnswer,
  firstProblem,
  formatAnswer,
  otherKey,
  QUESTIONS,
  sanitizeAnswers,
  summarize,
  visibleQuestions,
  type Answers,
} from "../lib/onboarding-questions";
import { bookingUrl, callKind, formatCallTime } from "../lib/booking";
import { videoEmbedUrl } from "../lib/settings";
import { ageOn, signatureMatches, validateContact, validateParq } from "../lib/agreement";

// Steps
assert.equal(nextStep("welcome"), "install");
assert.equal(nextStep("kickoff"), "done");
assert.equal(stepIndex("done"), 6);
assert.equal(stepPath("agreement"), "/onboarding/agreement");
assert.equal(stepPath("done"), "/");
const cl = checklist("agreement");
assert.deepEqual(
  cl.map((s) => s.state),
  ["done", "done", "current", "locked", "locked", "locked"],
);

// Questions: goal weight only shows for fat loss / muscle gain.
const ids = (a: Answers) => visibleQuestions(a).map((q) => q.id);
assert.ok(ids({ goal: "Lose fat" }).includes("goalWeight"));
assert.ok(!ids({ goal: "Improve my health and energy" }).includes("goalWeight"));

const q = (id: string) => QUESTIONS.find((x) => x.id === id)!;
assert.equal(checkAnswer(q("goal"), {}), "Pick one.");
assert.equal(checkAnswer(q("goal"), { goal: "Other" }), "Tell us what “Other” is.");
assert.equal(checkAnswer(q("goal"), { goal: "Other", [otherKey("goal")]: "Run a marathon" }), null);
assert.equal(checkAnswer(q("height"), { height: "5,10" }), null);
assert.ok(checkAnswer(q("height"), { height: "5,14" }));
assert.ok(checkAnswer(q("weight"), { weight: "20" }));
assert.equal(checkAnswer(q("weight"), { weight: "182.5" }), null);
assert.equal(checkAnswer(q("goalWeight"), {}), null); // optional
assert.equal(checkAnswer(q("wakeTime"), { wakeTime: "06:30" }), null);
assert.equal(checkAnswer(q("equipment"), { equipment: ["Dumbbells", "Bench"] }), null);
assert.ok(checkAnswer(q("equipment"), { equipment: ["Laser cannon"] }));

assert.equal(formatAnswer(q("height"), { height: "5,10" }), "5′10″");
assert.equal(formatAnswer(q("wakeTime"), { wakeTime: "06:30" }), "6:30 a.m.");
assert.equal(formatAnswer(q("bedTime"), { bedTime: "22:15" }), "10:15 p.m.");
assert.equal(formatAnswer(q("weight"), { weight: "182" }), "182 lb");
assert.equal(formatAnswer(q("goal"), { goal: "Other", [otherKey("goal")]: "Marathon" }), "Other: Marathon");

// Sanitize drops unknown keys and bad types.
assert.deepEqual(sanitizeAnswers({ goal: "Lose fat", hack: "x", weight: 5, equipment: ["Dumbbells", 3] }), {
  goal: "Lose fat",
  equipment: ["Dumbbells"],
});

// A complete set of answers has no problems; summaries group by section.
const full: Answers = {};
for (const question of QUESTIONS) {
  if (question.kind === "choice") full[question.id] = question.options![0];
  if (question.kind === "multi") full[question.id] = [question.options![1]];
  if (question.kind === "text" || question.kind === "longtext") full[question.id] = "Something";
  if (question.kind === "number") full[question.id] = "180";
  if (question.kind === "height") full[question.id] = "5,9";
  if (question.kind === "time") full[question.id] = "07:00";
}
assert.equal(firstProblem(full), null);
const s = summarize(full);
assert.equal(s[0].section, "Your goal");
assert.ok(s.every((g) => g.items.length > 0));
assert.deepEqual(firstProblem({ ...full, weight: "" })?.message, "Enter a number.");

// Booking links
const url = new URL(bookingUrl("https://cal.com/tyler/kick-off-call", { name: "Jordan Kim", email: "j@x.co", clientId: "abc" }));
assert.equal(url.searchParams.get("name"), "Jordan Kim");
assert.equal(url.searchParams.get("metadata[clientId]"), "abc");
assert.equal(callKind("kick-off-call"), "kickoff");
assert.equal(callKind("Check In Call"), "checkin");
assert.equal(callKind("30min"), "other");
assert.equal(formatCallTime("2026-12-07T19:30:00Z", "America/New_York"), "Mon, Dec 7 at 2:30 PM EST");

// Video links
assert.equal(videoEmbedUrl("https://youtu.be/abc123"), "https://www.youtube-nocookie.com/embed/abc123?rel=0&playsinline=1");
assert.equal(videoEmbedUrl("https://www.youtube.com/watch?v=xyz"), "https://www.youtube-nocookie.com/embed/xyz?rel=0&playsinline=1");
assert.equal(videoEmbedUrl("https://vimeo.com/12345"), "https://player.vimeo.com/video/12345");
assert.equal(videoEmbedUrl("https://www.loom.com/share/abcDEF"), "https://www.loom.com/embed/abcDEF");
assert.equal(videoEmbedUrl("https://example.com/video.mp4"), null);
assert.equal(videoEmbedUrl("not a url"), null);

// Agreement checks
assert.deepEqual(Object.keys(validateContact({})).length, 7);
assert.equal(
  Object.keys(
    validateContact({
      fullName: "Jordan Kim",
      address: "1 Main St",
      email: "j@x.co",
      phone: "410 555 0199",
      dob: "1990-04-12",
      emergencyName: "Sam",
      emergencyPhone: "410-555-0100",
    }),
  ).length,
  0,
);
assert.equal(validateParq([false, false, false, false, false, false, false], ""), null);
assert.ok(validateParq([true, false, false, false, false, false, false], ""));
assert.ok(validateParq([false, null, false, false, false, false, false], ""));
assert.equal(signatureMatches("  jordan   KIM ", "Jordan Kim"), true);
assert.equal(signatureMatches("J Kim", "Jordan Kim"), false);
assert.equal(ageOn("1990-04-12", "2026-04-11"), 35);
assert.equal(ageOn("1990-04-12", "2026-04-12"), 36);

console.log("onboarding tests passed");
