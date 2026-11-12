import assert from "node:assert/strict";
import { checkinStreak, goalDirection, habitStreaks, milestoneFamilies, weightChange } from "../lib/milestones";
import type { HabitAssignment } from "../lib/calendar";

const everyDay: HabitAssignment = { id: "h1", habit_id: "x", title: null, days: [0, 1, 2, 3, 4, 5, 6], start_date: "2026-11-01", end_date: null, active: true };
const weekdays: HabitAssignment = { id: "h2", habit_id: "y", title: null, days: [1, 2, 3, 4, 5], start_date: "2026-11-01", end_date: null, active: true };
const ticks = (pairs: [string, string][]) => new Set(pairs.map(([h, d]) => `${h}|${d}`));

// Nov 1 2026 is a Sunday. h1 every day Nov 1–5, h2 weekdays Nov 2–5 → 5 perfect days.
let s = habitStreaks([everyDay, weekdays], ticks([["h1", "2026-11-01"], ["h1", "2026-11-02"], ["h2", "2026-11-02"], ["h1", "2026-11-03"], ["h2", "2026-11-03"], ["h1", "2026-11-04"], ["h2", "2026-11-04"], ["h1", "2026-11-05"], ["h2", "2026-11-05"]]), "2026-11-01", "2026-11-06");
assert.equal(s.current, 5, "unfinished today doesn't break the streak");
assert.equal(s.todayDone, false);
assert.equal(s.best, 5);
// A missed day resets the current streak but keeps the best.
s = habitStreaks([everyDay], ticks([["h1", "2026-11-01"], ["h1", "2026-11-02"], ["h1", "2026-11-03"], ["h1", "2026-11-05"]]), "2026-11-01", "2026-11-05");
assert.equal(s.current, 1, "the missed Nov 4 reset it; Nov 5 starts again");
assert.equal(s.best, 3);
assert.equal(s.todayDone, true);
assert.equal(s.perfectDays, 4);
// Days with nothing due are skipped.
s = habitStreaks([weekdays], ticks([["h2", "2026-11-06"], ["h2", "2026-11-09"]]), "2026-11-06", "2026-11-09");
assert.equal(s.current, 2, "the weekend doesn't break a weekday streak");

// Check-ins: a late one inside 3 days doesn't break it, an older miss does.
assert.deepEqual(checkinStreak(["2026-10-18", "2026-10-25", "2026-11-01", "2026-11-08"], new Set(["2026-10-25", "2026-11-01"]), "2026-11-09"), { current: 2, total: 2 });
assert.equal(checkinStreak(["2026-10-18", "2026-10-25", "2026-11-01"], new Set(["2026-10-18", "2026-11-01"]), "2026-11-09").current, 1);

assert.equal(weightChange([{ date: "2026-11-01", weight: 200 }, { date: "2026-11-08", weight: 195 }, { date: "2026-11-09", weight: 194 }, { date: "2026-11-10", weight: 193 }]), -6);
assert.equal(weightChange([{ date: "2026-11-01", weight: 200 }]), null);

assert.equal(goalDirection("Lose fat"), "lose");
assert.equal(goalDirection("Build muscle"), "gain");
assert.equal(goalDirection("Maintain my weight and get fitter"), null);

const fam = milestoneFamilies({
  streaks: { current: 8, best: 8, perfectDays: 8, totalTicks: 20, todayDone: true },
  checkins: { current: 1, total: 1 },
  weighInCount: 3,
  weightChange: -5.2,
  direction: "lose",
  hasPhotos: true,
  week: 3,
  totalWeeks: 12,
  finished: false,
}).flat();
const reached = fam.filter((m) => m.reached).map((m) => m.key);
for (const k of ["streak_3", "streak_7", "perfect_day_1", "checkins_1", "photos_1", "lost_5"]) assert.ok(reached.includes(k), k);
for (const k of ["streak_14", "lost_10", "halfway", "month_1"]) assert.ok(!reached.includes(k), k);
assert.equal(new Set(fam.map((m) => m.key)).size, fam.length, "keys are unique");

console.log("milestone tests passed");
