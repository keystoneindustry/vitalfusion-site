import assert from "node:assert/strict";
import { assessRisk, type RiskInput } from "../lib/at-risk";

const base: RiskInput = { today: "2026-11-12", lastSeenDay: "2026-11-12", lastLoggedDay: "2026-11-12", habitsDue3: 6, habitsDone3: 5, recentCheckins: [{ due: "2026-11-07", sent: true }], startedDay: "2026-10-01" };
assert.deepEqual(assessRisk(base), { level: null, reasons: [] }, "active client is fine");

let r = assessRisk({ ...base, lastSeenDay: "2026-11-08", lastLoggedDay: "2026-11-08" });
assert.equal(r.level, "watch");
assert.deepEqual(r.reasons, ["Hasn't opened the app in 4 days", "Nothing logged in 4 days"]);

r = assessRisk({ ...base, lastSeenDay: "2026-11-01", lastLoggedDay: "2026-10-30" });
assert.equal(r.level, "high");
assert.match(r.reasons[0], /11 days/);

r = assessRisk({ ...base, habitsDone3: 0 });
assert.equal(r.level, "watch");
assert.deepEqual(r.reasons, ["No habits ticked in the last 3 days"]);

r = assessRisk({ ...base, recentCheckins: [{ due: "2026-11-07", sent: false }, { due: "2026-10-31", sent: true }] });
assert.deepEqual(r, { level: "watch", reasons: ["Missed their last check-in"] });
r = assessRisk({ ...base, recentCheckins: [{ due: "2026-11-07", sent: false }, { due: "2026-10-31", sent: false }] });
assert.deepEqual(r, { level: "high", reasons: ["Missed the last 2 check-ins"] });

assert.equal(assessRisk({ ...base, lastSeenDay: null, lastLoggedDay: null }).level, "high");
assert.equal(assessRisk({ ...base, lastSeenDay: null, lastLoggedDay: null, startedDay: "2026-11-11" }).level, null, "grace period for new clients");

console.log("at-risk tests passed");
