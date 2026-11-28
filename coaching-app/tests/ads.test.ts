import assert from "node:assert/strict";
import { adsReport, costPer, stageOf, UNTRACKED_KEY } from "../lib/ads";
import { buildPeople, type CrmRow, type FunnelLead } from "../lib/crm-logic";

const f = (id: number, kind: string, email: string, at: string, source: string, details: Record<string, unknown> = {}): FunnelLead => ({ id, kind, email, name: email.split("@")[0], source, created_at: `${at}T12:00:00Z`, details });
const ad1 = { campaign: "Fat loss", adset: "Men 30-50", ad: "Scale reel", ad_id: "101" };
const funnel = [
  f(1, "calculator", "a@x.com", "2026-11-20", "Facebook Ad", ad1),
  f(2, "application", "a@x.com", "2026-11-22", "Main Website"), // applied later: still ad 101
  f(3, "calculator", "b@x.com", "2026-11-21", "Facebook Ad", ad1),
  f(4, "meal_plan", "c@x.com", "2026-11-21", "Facebook Ad", { campaign: "Fat loss", ad: "Meal plan carousel", ad_id: "102" }),
  f(5, "calculator", "albert@x.com", "2026-11-15", "Facebook Ad"), // before per-ad tracking
  f(6, "calculator", "ig@x.com", "2026-11-15", "Instagram"), // organic: not in the report
  f(7, "calculator", "d@x.com", "2026-11-23", "Facebook Ad", ad1),
];
const crm: CrmRow[] = [{ id: "1", email: "d@x.com", name: null, phone: null, instagram: null, status: "talking", notes: null, follow_up_on: null, last_contacted_at: null, manual: false, source: null, created_at: "2026-11-23T00:00:00Z", updated_at: "2026-11-23T00:00:00Z" }];
const people = buildPeople(funnel, crm, ["b@x.com"]); // b became a client
const a = people.find((p) => p.email === "a@x.com")!;
assert.deepEqual(a.ad, { adId: "101", ad: "Scale reel", adset: "Men 30-50", campaign: "Fat loss" });
assert.equal(a.firstSource, "Facebook Ad");
assert.equal(stageOf(a, new Set()), "qualified");
assert.equal(stageOf(people.find((p) => p.email === "albert@x.com")!, new Set(["albert@x.com"])), "booked");

const { rows, total } = adsReport(
  people,
  [
    { day: "2026-11-20", ad_id: "101", ad_name: "Scale reel", adset_name: "Men 30-50", campaign_name: "Fat loss", spend: "30.00", impressions: 1000, clicks: 40 },
    { day: "2026-11-21", ad_id: "101", ad_name: "Scale reel", adset_name: "Men 30-50", campaign_name: "Fat loss", spend: 30, impressions: 900, clicks: 35 },
    { day: "2026-11-21", ad_id: "103", ad_name: "No leads yet", adset_name: null, campaign_name: "Fat loss", spend: 12.5, impressions: 300, clicks: 4 },
  ],
  ["albert@x.com"],
);
assert.deepEqual(rows.map((r) => r.key), ["id:101", "id:102", "id:103", UNTRACKED_KEY]);
const r101 = rows[0];
assert.deepEqual([r101.leads, r101.qualified, r101.booked, r101.clients, r101.spend, r101.clicks], [3, 3, 1, 1, 60, 75]); // a applied, d talking, b client
assert.equal(rows[1].spend, null);
assert.deepEqual([rows[2].leads, rows[2].spend], [0, 12.5]);
assert.deepEqual([rows[3].leads, rows[3].booked], [1, 1]);
assert.deepEqual([total.leads, total.qualified, total.booked, total.clients, total.spend], [5, 4, 2, 1, 72.5]);
assert.equal(costPer(60, 3), "$20.00");
assert.equal(costPer(null, 3), "–");
assert.equal(costPer(60, 0), "–");
console.log("ads ok");
