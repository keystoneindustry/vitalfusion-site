import assert from "node:assert/strict";
import {
  bestOf,
  cleanExercises,
  exerciseHistory,
  exerciseKind,
  formatSet,
  lastTime,
  newRecords,
  personalRecords,
  plannedSetCount,
  recordMilestone,
  timeUnit,
} from "../lib/workout-log";

assert.equal(exerciseKind("8–12"), "reps");
assert.equal(exerciseKind("30–45 sec"), "time");
assert.equal(exerciseKind("20s"), "time");
assert.equal(exerciseKind("1 min"), "time");
assert.equal(timeUnit("1–2 min"), "min");
assert.equal(timeUnit("30 sec"), "sec");
assert.equal(plannedSetCount("3"), 3);
assert.equal(plannedSetCount("3–4"), 4);
assert.equal(plannedSetCount(""), 3);
assert.equal(plannedSetCount("25"), 10);

const clean = cleanExercises([
  { name: " Back squat ", kind: "reps", sets: [{ weight: "135.3", reps: "10" }, { weight: "", reps: "" }, { weight: 145, reps: 8 }] },
  { name: "Plank", kind: "time", sets: [{ seconds: "45" }, { seconds: -3 }] },
  { name: "Push-up", kind: "reps", sets: [] },
  { name: "", sets: [{ reps: 5 }] },
  "junk",
]);
assert.equal(clean.length, 3);
assert.deepEqual(clean[0], { name: "Back squat", kind: "reps", sets: [{ weight: 135.5, reps: 10, seconds: null }, { weight: 145, reps: 8, seconds: null }] });
assert.deepEqual(clean[1].sets, [{ weight: null, reps: null, seconds: 45 }]);
assert.deepEqual(clean[2].sets, []);

assert.equal(formatSet({ weight: 135, reps: 10, seconds: null }, "reps"), "135 lb × 10");
assert.equal(formatSet({ weight: null, reps: 12, seconds: null }, "reps"), "Bodyweight × 12");
assert.equal(formatSet({ weight: null, reps: null, seconds: 45 }, "time"), "45 sec");
assert.equal(formatSet({ weight: null, reps: null, seconds: 120 }, "time"), "2 min");

const s = (date: string, day: number, sets: [number | null, number][], name = "Back squat") => ({
  id: date, client_id: "c", date, workout_day: day, workout_name: "", created_at: "", updated_at: "",
  exercises: [{ name, kind: "reps" as const, sets: sets.map(([weight, reps]) => ({ weight, reps, seconds: null })) }],
});
const a = s("2026-11-20", 0, [[135, 10], [135, 9]]);
const b = s("2026-11-23", 0, [[145, 8], [145, 8]]);
assert.deepEqual(lastTime([a, b], "back squat", { date: "2026-11-27", workout_day: 0 })?.sets[0], { weight: 145, reps: 8, seconds: null });
assert.equal(lastTime([a, b], "Back Squat", { date: "2026-11-23", workout_day: 0 })?.date, "2026-11-20"); // not itself
assert.equal(lastTime([a], "Deadlift", { date: "2026-11-27", workout_day: 0 }), null);

assert.equal(bestOf(b.exercises[0].sets, "reps")?.label, "145 lb × 8");
assert.equal(bestOf([{ weight: null, reps: 12, seconds: null }, { weight: null, reps: 15, seconds: null }], "reps")?.value, 15);

// First time logged = starting point, not a PR; beating it is.
assert.deepEqual(newRecords([], a), []);
const prs = newRecords([a], b);
assert.equal(prs.length, 1);
assert.equal(prs[0].best.label, "145 lb × 8");
assert.deepEqual(newRecords([a, b], s("2026-11-27", 0, [[145, 8]])), []); // tie isn't a PR
assert.equal(newRecords([a, b], s("2026-11-27", 0, [[145, 9]])).length, 1); // more reps at the same weight is
const m = recordMilestone(prs[0]);
assert.equal(m.key, "pr:back-squat:weight:145x8");
assert.equal(m.title, "New PR: Back squat, 145 lb × 8");

assert.equal(personalRecords([a, b])[0].best.value, 145);
assert.deepEqual(exerciseHistory([b, a], "Back squat").map((p) => p.best.value), [135, 145]);
console.log("workout log ok");
