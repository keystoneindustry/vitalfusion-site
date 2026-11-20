import assert from "node:assert/strict";
import { eveningReminder, localHour, morningReminder, reminderKind } from "../lib/reminders";
import type { DayTasks } from "../lib/client-days";

// 13:00 UTC = 8am New York (EST) and 5am Los Angeles.
const t = new Date("2026-11-11T13:00:00Z");
assert.equal(localHour("America/New_York", t), 8);
assert.equal(localHour("America/Los_Angeles", t), 5);
assert.equal(reminderKind(8), "morning");
assert.equal(reminderKind(9), "morning");
assert.equal(reminderKind(10), null);
assert.equal(reminderKind(19), "evening");
assert.equal(reminderKind(7), null);

const day: DayTasks = {
  date: "2026-11-11",
  habits: [
    { id: "h1", title: "Walk 7,000 steps", icon: "👟", description: null, done: true },
    { id: "h2", title: "Drink 90 oz of water", icon: "💧", description: null, done: false },
  ],
  weighIn: { due: true, weight: null },
  photos: { due: false, count: 0 },
  forms: [{ formId: "f1", title: "Weekly check-in", isCheckin: true, submitted: false }],
  workouts: [{ day: 0, name: "Full body A" }],
};
const m = morningReminder(day, "2:00 PM EST")!;
assert.equal(m.push.title, "REMINDER: Full body A today");
assert.ok(m.push.body.includes("Weekly check-in") && m.push.body.includes("Weigh-in") && m.push.body.includes("call with Tyler"));
assert.ok(m.important);
assert.ok(!m.push.body.includes("Full body A"));
assert.equal(m.push.url, "/train?day=0");
assert.equal(morningReminder({ ...day, habits: [], weighIn: { due: false, weight: null }, forms: [] })!.push.body, "Tap to open today's workout.");
const e = eveningReminder(day)!;
assert.equal(e.push.title, "REMINDER: Don't forget your weekly check-in");
assert.equal(e.push.url, "/check-ins/new/f1?date=2026-11-11");
assert.ok(e.important);
// Everything done → no evening nudge; nothing scheduled → no morning summary.
const done: DayTasks = { ...day, habits: day.habits.map((h) => ({ ...h, done: true })), weighIn: { due: true, weight: 180 }, forms: [{ ...day.forms[0], submitted: true }] };
assert.equal(eveningReminder(done), null);
assert.equal(morningReminder({ ...day, habits: [], weighIn: { due: false, weight: null }, forms: [], workouts: [] }), null);
// Habits only: a push, but not important enough for an email.
const habitsOnly = morningReminder({ ...day, weighIn: { due: false, weight: null }, forms: [], workouts: [] })!;
assert.equal(habitsOnly.important, false);
console.log("reminder tests passed");

// Starting progress photos lead the morning reminder until they're taken, and the tap opens the camera page.
{
  const { morningReminder: mr } = await import("../lib/reminders");
  const empty = { date: "2026-11-13", workouts: [], forms: [], weighIn: { due: false, weight: null }, photos: { due: false, count: 0 }, habits: [] } as unknown as Parameters<typeof mr>[0];
  const r = mr(empty, null, true)!;
  assert.equal(r.lines[0], "📸 Starting progress photos, before you eat");
  assert.equal(r.important, true);
  assert.equal(r.push.url, "/progress/photos/new");
  assert.equal(mr(empty, null, false), null);
}

// Food-log days (before the plan is live)
import { foodLogReminder, onboardingNudge, ONBOARDING_NUDGE_DAYS } from "../lib/reminders";
const fm = foodLogReminder("morning", 0, null)!;
assert.ok(fm.important && fm.push.url === "/food/new" && fm.lines.some((l) => l.includes("Photograph everything")));
const fc = foodLogReminder("morning", 0, "2:00 PM EST", true)!;
assert.ok(fc.push.title.includes("Kickoff call") && fc.lines[0].includes("Starting progress photos") && fc.push.url === "/progress/photos/new");
assert.equal(foodLogReminder("evening", 2, null), null);
const fe = foodLogReminder("evening", 0, null)!;
assert.ok(fe.important && fe.push.url === "/food/new");
assert.ok(onboardingNudge("Book your kickoff call").lines[0].includes("Book your kickoff call"));
assert.ok(onboardingNudge(null).lines[0].includes("invite"));
assert.deepEqual(ONBOARDING_NUDGE_DAYS, [1, 3, 6]);

// Kickoff time typed in Eastern
import { zonedTimeToIso, isoToZonedInput } from "../lib/booking";
assert.equal(zonedTimeToIso("2026-11-24T14:30"), "2026-11-24T19:30:00.000Z"); // EST = UTC-5
assert.equal(zonedTimeToIso("2026-07-01T09:00"), "2026-07-01T13:00:00.000Z"); // EDT = UTC-4
assert.equal(zonedTimeToIso("2026-02-30T09:00"), null);
assert.equal(zonedTimeToIso("nope"), null);
assert.equal(isoToZonedInput("2026-11-24T19:30:00.000Z"), "2026-11-24T14:30");
assert.equal(isoToZonedInput("2026-11-25T04:30:00.000Z"), "2026-11-24T23:30");
console.log("reminders ok (incl. food-log, onboarding nudges, kickoff time)");
