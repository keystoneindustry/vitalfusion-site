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
