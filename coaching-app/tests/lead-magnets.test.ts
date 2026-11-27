import assert from "node:assert/strict";
import { buildMagnets, countBySubject, emailSteps, waitDays, type Automation } from "../lib/lead-magnets";

assert.equal(waitDays("2 days"), 2);
assert.equal(waitDays("1 week"), 7);
assert.equal(waitDays("12 hours"), 0.5);
assert.equal(waitDays("soon"), null);

// The real shape of the calculator follow-up in Resend.
const workflow = [
  { key: "trigger", type: "trigger", config: { eventName: "macro_quiz.completed" }, next: "already_started" },
  { key: "already_started", type: "condition", config: {}, branches: { condition_met: null, condition_not_met: "save_contact" } },
  { key: "save_contact", type: "contact_update", config: {}, next: "wait_1" },
  { key: "wait_1", type: "wait_for_event", config: { timeout: "2 days", eventName: "coaching.applied" }, branches: { event_received: null, timeout: "send_email_1" } },
  { key: "send_email_1", type: "send_email", config: { subject: "Email one" }, next: "wait_2" },
  { key: "wait_2", type: "wait_for_event", config: { timeout: "2 days" }, branches: { event_received: null, timeout: "send_email_2" } },
  { key: "send_email_2", type: "send_email", config: { subject: "Email two" }, next: "wait_3" },
  { key: "wait_3", type: "wait_for_event", config: { timeout: "3 days" }, branches: { event_received: null, timeout: "send_email_3" } },
  { key: "send_email_3", type: "send_email", config: { subject: "Email three" }, next: null },
];
const parsed = emailSteps(workflow);
assert.equal(parsed.trigger, "macro_quiz.completed");
assert.deepEqual(parsed.steps, [{ day: 2, subject: "Email one" }, { day: 4, subject: "Email two" }, { day: 7, subject: "Email three" }]);
assert.deepEqual(emailSteps(null), { trigger: null, steps: [] });

const counts = countBySubject([
  { subject: "Email one", last_event: "delivered" },
  { subject: "Email one", last_event: "bounced" },
  { subject: "Email one", last_event: "opened" },
  { subject: "Email one", last_event: "scheduled" },
  { subject: "Your nutrition plan 💪", last_event: "delivered" },
]);
assert.deepEqual(counts.get("Email one"), { sent: 3, delivered: 2, bounced: 1, opened: 1, clicked: 0 });

const autos: Automation[] = [
  { id: "a1", name: "Nutrition plan follow-up", status: "enabled", trigger_event: "macro_quiz.completed", steps: parsed.steps, runs: { total: 5, running: 2, completed: 3, stopped: 0 }, created_at: null },
  { id: "a2", name: "TEST", status: "disabled", trigger_event: "test.event", steps: [], runs: {}, created_at: null },
  { id: "a3", name: "Meal plan – Everyday", status: "enabled", trigger_event: "meal_plan_everyday.requested", steps: [], runs: {}, created_at: null },
  { id: "a4", name: "Meal plan – 9-to-5", status: "enabled", trigger_event: "meal_plan_workday.requested", steps: [], runs: {}, created_at: null },
];
const funnel = [
  { kind: "calculator", email: "A@x.com", created_at: "2026-11-25T00:00:00Z", details: {} },
  { kind: "calculator", email: "a@x.com", created_at: "2026-11-01T00:00:00Z", details: {} },
  { kind: "meal_plan", email: "b@x.com", created_at: "2026-11-24T00:00:00Z", details: { plan: "workday" } },
];
const { magnets, other } = buildMagnets(funnel, autos, counts, "2026-11-19T00:00:00Z");
const calc = magnets.find((m) => m.magnet.id === "calculator")!;
assert.equal(calc.signups, 2);
assert.equal(calc.people, 1);
assert.equal(calc.signups7, 1);
assert.equal(calc.delivery.delivered, 1);
assert.equal(calc.automations[0].emails[0].delivered, 2);
const meal = magnets.find((m) => m.magnet.id === "meal_plan")!;
assert.deepEqual(meal.automations.map((a) => a.id), ["a4", "a3"]); // in the order of the plans
assert.equal(meal.versions[0].signups, 1);
assert.deepEqual(other.map((a) => a.id), ["a2"]);
console.log("lead magnets ok");
