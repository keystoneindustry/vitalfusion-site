import assert from "node:assert/strict";
import { byDay, toCalls } from "../lib/cal";

const now = new Date("2026-11-27T20:00:00Z"); // 3pm Eastern
const calls = toCalls(
  [
    { uid: "b", title: "Check In Call between Tyler Kendrick and John Doe", status: "accepted", start: "2026-11-28T15:00:00Z", end: "2026-11-28T15:20:00Z", attendees: [{ name: "John Doe", email: "j@x.com" }], meetingUrl: "https://meet.example/abc" },
    { uid: "a", title: "Strategy Session between Tyler Kendrick and Ann", status: "accepted", start: "2026-11-27T22:00:00Z", end: "2026-11-27T22:30:00Z", attendees: [{ name: "Ann" }], location: "integrations:daily" },
    { uid: "old", title: "Past", status: "accepted", start: "2026-11-27T10:00:00Z", end: "2026-11-27T10:30:00Z", attendees: [] },
    { uid: "x", title: "Cancelled", status: "cancelled", start: "2026-11-29T15:00:00Z", attendees: [] },
    { uid: "bad", title: "No time" },
  ],
  now,
);
assert.deepEqual(calls.map((c) => c.uid), ["a", "b"]);
assert.equal(calls[1].title, "Check In Call");
assert.equal(calls[1].who, "John Doe");
assert.equal(calls[1].link, "https://meet.example/abc");
assert.equal(calls[0].link, null); // not a web link
const days = byDay(calls);
assert.deepEqual(days.map((d) => d.day), ["2026-11-27", "2026-11-28"]);
assert.equal(days[0].calls[0].time, "5:00 PM");
assert.equal(days[1].calls[0].time, "10:00 AM");
console.log("cal ok");
