import assert from "node:assert/strict";
import {
  adherence,
  daysLabel,
  dueKinds,
  habitDueOn,
  parseDays,
  scheduleDueOn,
  scheduleLabel,
  stepGoalFor,
  weekDates,
  weekStart,
  weekday,
  weekdayFromName,
  type HabitAssignment,
  type Schedule,
} from "../lib/calendar";
import { parseWeight, photoSets, weeklyAverages } from "../lib/progress";

// Nov 10, 2026 is a Tuesday.
assert.equal(weekday("2026-11-10"), 2);
assert.equal(weekStart("2026-11-10"), "2026-11-08");
assert.deepEqual(weekDates("2026-11-10")[0], "2026-11-08");
assert.equal(weekDates("2026-11-10").length, 7);

const habit: HabitAssignment = { id: "h1", habit_id: "x", title: null, days: [1, 3, 5], start_date: "2026-11-09", end_date: null, active: true };
assert.equal(habitDueOn(habit, "2026-11-09"), true); // Mon
assert.equal(habitDueOn(habit, "2026-11-10"), false); // Tue
assert.equal(habitDueOn(habit, "2026-11-02"), false); // before start
assert.equal(habitDueOn({ ...habit, active: false }, "2026-11-09"), false);
assert.equal(habitDueOn({ ...habit, end_date: "2026-11-10" }, "2026-11-11"), false);

const weekly: Schedule = { id: "s1", kind: "weigh_in", days: [1, 3, 5], every_weeks: 1, start_date: "2026-11-10", end_date: null, one_date: null, active: true };
assert.equal(scheduleDueOn(weekly, "2026-11-11"), true); // Wed
assert.equal(scheduleDueOn(weekly, "2026-11-09"), false); // Mon, but before start
const biweekly: Schedule = { ...weekly, id: "s2", kind: "photos", days: [0], every_weeks: 2, start_date: "2026-11-08" };
assert.equal(scheduleDueOn(biweekly, "2026-11-08"), true);
assert.equal(scheduleDueOn(biweekly, "2026-11-15"), false);
assert.equal(scheduleDueOn(biweekly, "2026-11-22"), true);
const once: Schedule = { ...weekly, id: "s3", kind: "photos", days: [], one_date: "2026-11-20" };
assert.equal(scheduleDueOn(once, "2026-11-20"), true);
assert.equal(scheduleDueOn(once, "2026-11-27"), false);
assert.deepEqual([...dueKinds([weekly, biweekly], "2026-11-22")], ["photos"]);
assert.deepEqual([...dueKinds([weekly, biweekly], "2026-11-23")], ["weigh_in"]);

assert.equal(daysLabel([0, 1, 2, 3, 4, 5, 6]), "Every day");
assert.equal(daysLabel([5, 1, 3]), "Mon, Wed, Fri");
assert.equal(daysLabel([1, 2, 3, 4, 5]), "Weekdays");
assert.equal(scheduleLabel(biweekly), "Sun, every 2 weeks");
assert.deepEqual(parseDays(["5", "1", "x", "9", "1"]), [1, 5]);
assert.deepEqual(parseDays("1,3,5"), [1, 3, 5]);
assert.equal(weekdayFromName("Sunday"), 0);
assert.equal(weekdayFromName("saturday"), 6);
assert.equal(weekdayFromName("Someday"), null);
assert.equal(stepGoalFor("Under 4,000"), 6000);
assert.equal(stepGoalFor("7,000–10,000"), 10000);
assert.equal(stepGoalFor("Not sure"), 8000);

const checks = new Set(["h1|2026-11-09", "h1|2026-11-11"]);
assert.deepEqual(adherence([habit], checks, weekDates("2026-11-10")), { done: 2, due: 3 });

assert.equal(parseWeight("182.46"), 182.5);
assert.equal(parseWeight("182,4"), 182.4);
assert.equal(parseWeight("12"), null);
assert.equal(parseWeight("abc"), null);
assert.deepEqual(
  weeklyAverages([
    { date: "2026-11-09", weight_lb: 182 },
    { date: "2026-11-11", weight_lb: 181 },
    { date: "2026-11-16", weight_lb: 180 },
  ]),
  [
    { week: "2026-11-08", avg: 181.5, count: 2 },
    { week: "2026-11-15", avg: 180, count: 1 },
  ],
);
const sets = photoSets([
  { client_id: "c", date: "2026-11-08", pose: "front", path: "a", created_at: "" },
  { client_id: "c", date: "2026-11-15", pose: "side", path: "b", created_at: "" },
  { client_id: "c", date: "2026-11-08", pose: "back", path: "c", created_at: "" },
]);
assert.equal(sets[0].date, "2026-11-15");
assert.deepEqual(sets[1].poses, { front: "a", back: "c" });

console.log("calendar tests passed");

// First weekly check-in: set up on Thursday Nov 12 2026 with Sunday as their day → starts a week out → Sunday Nov 22.
{
  const { scheduleDueOn: due } = await import("../lib/calendar");
  const s = { id: "x", kind: "form" as const, form_id: "f", days: [0], every_weeks: 1, start_date: "2026-11-19", end_date: null, one_date: null, active: true };
  assert.equal(due(s, "2026-11-15"), false, "not this Sunday");
  assert.equal(due(s, "2026-11-22"), true, "the Sunday after next");
  const same = { ...s, days: [4] }; // picked Thursday, the day they signed up
  assert.equal(due(same, "2026-11-12"), false);
  assert.equal(due(same, "2026-11-19"), true, "exactly a week later");
}
