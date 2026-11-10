import assert from "node:assert/strict";
import {
  addDays,
  daysBetween,
  endDateFromWeeks,
  formatDate,
  isIsoDate,
  packageLabel,
  packageStatus,
  renewalDue,
  timeAgo,
  todayIn,
} from "../lib/dates";

assert.equal(isIsoDate("2026-12-01"), true);
assert.equal(isIsoDate("2026-02-30"), false);
assert.equal(isIsoDate("12/01/2026"), false);

assert.equal(addDays("2026-12-31", 1), "2027-01-01");
assert.equal(addDays("2028-02-28", 1), "2028-02-29"); // leap year
assert.equal(daysBetween("2026-12-01", "2027-02-22"), 83);

// A 12-week package starting Dec 1 runs 84 days and ends Feb 22.
assert.equal(endDateFromWeeks("2026-12-01", 12), "2027-02-22");
assert.equal(endDateFromWeeks("2026-11-10", 1), "2026-11-16");

assert.equal(formatDate("2026-12-01"), "Dec 1, 2026");
assert.equal(formatDate("2027-02-22", false), "Feb 22");
assert.equal(formatDate(null), "—");

assert.deepEqual(packageStatus("2026-12-01", "2027-02-22", "2026-11-26"), {
  kind: "not_started",
  daysUntilStart: 5,
  totalWeeks: 12,
});
assert.deepEqual(packageStatus("2026-12-01", "2027-02-22", "2026-12-01"), {
  kind: "in_progress",
  week: 1,
  totalWeeks: 12,
  daysLeft: 83,
});
assert.deepEqual(packageStatus("2026-12-01", "2027-02-22", "2026-12-08"), {
  kind: "in_progress",
  week: 2,
  totalWeeks: 12,
  daysLeft: 76,
});
assert.deepEqual(packageStatus("2026-12-01", "2027-02-22", "2027-02-22"), {
  kind: "in_progress",
  week: 12,
  totalWeeks: 12,
  daysLeft: 0,
});
assert.equal(packageStatus("2026-12-01", "2027-02-22", "2027-02-25").kind, "ended");
assert.equal(packageStatus(null, null, "2026-12-01").kind, "no_dates");

assert.equal(packageLabel("2026-12-01", "2027-02-22", "2026-11-30"), "Starts tomorrow");
assert.equal(packageLabel("2026-12-01", "2027-02-22", "2027-01-05"), "Week 6 of 12");
assert.equal(packageLabel("2026-12-01", "2027-02-22", "2027-03-01"), "Ended Feb 22");

assert.equal(renewalDue("2027-02-22", "2027-02-08"), true); // 14 days out
assert.equal(renewalDue("2027-02-22", "2027-02-07"), false); // 15 days out
assert.equal(renewalDue("2027-02-22", "2027-02-23"), false); // already ended

const now = new Date("2026-11-10T15:00:00Z");
assert.equal(timeAgo("2026-11-10T14:59:30Z", now), "just now");
assert.equal(timeAgo("2026-11-10T13:00:00Z", now), "2 hours ago");
assert.equal(timeAgo("2026-11-09T12:00:00Z", now), "yesterday");
assert.equal(timeAgo(null, now), "never");

// 11 p.m. in New York is already the next day in UTC.
assert.equal(todayIn("America/New_York", new Date("2026-11-11T03:30:00Z")), "2026-11-10");

console.log("dates tests passed");
