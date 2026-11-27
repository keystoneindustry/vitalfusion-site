import assert from "node:assert/strict";
import { buildPeople, bySource, followUps, leadsByWeek, type CrmRow, type FunnelLead } from "../lib/crm-logic";

const f = (id: number, kind: string, email: string, at: string, extra: Partial<FunnelLead> = {}): FunnelLead => ({ id, kind, email, name: null, source: "Instagram", created_at: `${at}T12:00:00Z`, details: {}, ...extra });
const c = (email: string | null, extra: Partial<CrmRow> = {}): CrmRow => ({ id: `crm-${email}`, email, name: null, phone: null, instagram: null, status: "new", notes: null, follow_up_on: null, last_contacted_at: null, manual: false, source: null, created_at: "2026-11-20T00:00:00Z", updated_at: "2026-11-20T00:00:00Z", ...extra });
const today = "2026-11-26";

const funnel = [
  f(1, "calculator", "Ann@x.com", "2026-11-24", { name: "Ann A", details: { goal: "lose", rating: "Hot" } }),
  f(2, "meal_plan", "ann@x.com", "2026-11-25", { details: { plan: "9-to-5" }, source: "Meal Plan" }),
  f(3, "application", "bob@x.com", "2026-11-23", { name: "Bob B", source: "Main Website" }),
  f(4, "calculator", "cat@x.com", "2026-11-10", { name: "Cat C", details: { rating: "Cold" } }),
  f(5, "calculator", "dan@x.com", "2026-11-22", { name: "Dan D", details: { rating: "Warm" } }),
  f(6, "application", "eve@x.com", "2026-11-01", { name: "Eve E" }),
];
const crm = [
  c("dan@x.com", { status: "contacted", last_contacted_at: "2026-11-21T10:00:00Z" }),
  c("cat@x.com", { follow_up_on: "2026-11-25" }),
  c(null, { id: "m1", name: "DM Lead", instagram: "@dm", manual: true }),
];
const people = buildPeople(funnel, crm, ["EVE@x.com"]);
assert.equal(people.length, 6); // ann (2 signups, one person), bob, cat, dan, eve, DM lead
const ann = people.find((p) => p.key === "ann@x.com")!;
assert.equal(ann.name, "Ann A");
assert.equal(ann.activities.length, 2);
assert.equal(ann.rating, "Hot");
assert.equal(ann.goal, "Lose fat");
const eve = people.find((p) => p.key === "eve@x.com")!;
assert.equal(eve.status, "client");
assert.equal(eve.autoClient, true);
assert.equal(people.find((p) => p.key === "id:m1")!.manual, true);

const fu = followUps(people, today);
assert.deepEqual(fu.map((x) => x.person.key), ["bob@x.com", "cat@x.com", "ann@x.com", "dan@x.com"]);
assert.match(fu[0].reason, /Applied for coaching 3 days ago/);
assert.match(fu[1].reason, /due yesterday/);
assert.match(fu[2].reason, /Hot lead/);
assert.match(fu[3].reason, /reached out 5 days ago/);
// A future follow-up date hides them until then; "not a fit" and clients never show.
assert.equal(followUps(buildPeople(funnel, [c("bob@x.com", { follow_up_on: "2026-12-01" })], []), today).some((x) => x.person.key === "bob@x.com"), false);
assert.equal(followUps(buildPeople(funnel, [c("bob@x.com", { status: "not_fit" })], []), today).some((x) => x.person.key === "bob@x.com"), false);

const weeks = leadsByWeek(funnel, today, 4);
assert.deepEqual(weeks.map((w) => w.week), ["2026-11-02", "2026-11-09", "2026-11-16", "2026-11-23"]);
assert.deepEqual(weeks.map((w) => w.count), [0, 1, 1, 3]);

const src = bySource(people);
assert.equal(src.find((s) => s.source === "Instagram")!.people, 4);
assert.equal(src.find((s) => s.source === "Main Website")!.applied, 1);
console.log("crm ok");
