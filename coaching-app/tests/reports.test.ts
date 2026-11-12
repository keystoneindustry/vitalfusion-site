import assert from "node:assert/strict";
import { cleanDraft, fallbackDraft, reportDue, statLines, weightStats, type ReportStats } from "../lib/reports";

const w = [
  { date: "2026-10-01", weight: 205 },
  { date: "2026-10-15", weight: 200 },
  { date: "2026-10-16", weight: 199 },
  { date: "2026-10-25", weight: 198 },
  { date: "2026-11-08", weight: 196 },
  { date: "2026-11-10", weight: 195 },
];
const s = weightStats(w, "2026-10-15", "2026-11-11");
assert.equal(s.start, 199.5, "first week's average");
assert.equal(s.end, 195.5, "last week's average");
assert.equal(s.change, -4);
assert.equal(s.sinceStart, -9.5, "from the very first weigh-in");
assert.equal(s.weighIns, 5);
assert.equal(s.weeks[0].avg, 199.5);
// No weigh-ins in the first week: falls back to the last one before the period.
assert.equal(weightStats(w, "2026-10-17", "2026-11-11").start, 199);
assert.equal(weightStats([], "2026-10-15", "2026-11-11").change, null);

const active = { stage: "active" as const, start_date: "2026-09-01" };
assert.equal(reportDue(active, null, "2026-11-12"), true);
assert.equal(reportDue(active, "2026-11-01", "2026-11-12"), false);
assert.equal(reportDue(active, "2026-10-14", "2026-11-12"), true);
assert.equal(reportDue({ stage: "active", start_date: "2026-11-01" }, null, "2026-11-12"), false, "not 4 weeks in yet");
assert.equal(reportDue({ stage: "paused", start_date: "2026-09-01" }, null, "2026-11-12"), false);

const d = cleanDraft({ headline: " Down 4 lb ", message: "Great month.", highlights: ["a", "", 3, "b"], focus: "nope" });
assert.deepEqual(d, { headline: "Down 4 lb", message: "Great month.", highlights: ["a", "b"], focus: [] });

const stats: ReportStats = {
  goal: "Lose fat",
  direction: "lose",
  weight: s,
  habits: { done: 40, due: 50, pct: 80, perfectDays: 12, bestStreak: 6, byHabit: [{ title: "Steps", done: 20, due: 28 }] },
  checkins: { sent: 3, due: 4 },
  wins: [{ title: "7-day habit streak", emoji: "⚡" }],
  photoDays: 2,
};
const f = fallbackDraft("Jamie", stats);
assert.equal(f.headline, "Down 4 lb this month");
assert.ok(f.message.includes("– Tyler"));
const lines = statLines(stats).join("\n");
assert.match(lines, /199\.5 → 195\.5 lb \(-4 lb this month, 5 weigh-ins\)/);
assert.match(lines, /80%/);
assert.match(lines, /3 of 4 sent/);

console.log("report tests passed");
