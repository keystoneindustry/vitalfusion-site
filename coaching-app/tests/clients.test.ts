import assert from "node:assert/strict";
import { firstName, isStage, parseClientForm, stageLabel } from "../lib/client-input";

function form(values: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(values)) f.set(k, v);
  return f;
}

// A complete form passes, emails are lowercased and names tidied.
const ok = parseClientForm(
  form({
    fullName: "  Jordan   Kim ",
    email: "Jordan.Kim@Example.com ",
    phone: "(410) 555-0199",
    coachingWeeks: "12",
    startDate: "2026-12-01",
    endDate: "2027-02-22",
    notes: "",
  }),
);
assert.deepEqual(ok.errors, {});
assert.deepEqual(ok.input, {
  fullName: "Jordan Kim",
  email: "jordan.kim@example.com",
  phone: "(410) 555-0199",
  coachingWeeks: 12,
  startDate: "2026-12-01",
  endDate: "2027-02-22",
  notes: null,
});

// A missing end date is filled in from the start date and length.
const auto = parseClientForm(form({ fullName: "A B", email: "a@b.co", coachingWeeks: "8", startDate: "2026-12-01" }));
assert.equal(auto.input?.endDate, "2027-01-25");
assert.equal(auto.input?.phone, null);

// Problems are reported per field.
const bad = parseClientForm(
  form({ fullName: "", email: "nope", phone: "abc", coachingWeeks: "1.5", startDate: "2026-13-01", endDate: "" }),
);
assert.equal(bad.input, undefined);
assert.ok(bad.errors.fullName);
assert.ok(bad.errors.email);
assert.ok(bad.errors.phone);
assert.ok(bad.errors.coachingWeeks);
assert.ok(bad.errors.startDate);

// End date before start date is rejected.
const backwards = parseClientForm(
  form({ fullName: "A B", email: "a@b.co", coachingWeeks: "4", startDate: "2026-12-01", endDate: "2026-11-01" }),
);
assert.ok(backwards.errors.endDate);

assert.equal(isStage("active"), true);
assert.equal(isStage("vip"), false);
assert.equal(stageLabel("onboarding"), "Onboarding");
assert.equal(firstName("Jordan Kim"), "Jordan");
assert.equal(firstName(""), "there");

console.log("client form tests passed");
