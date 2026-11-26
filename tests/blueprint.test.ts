import assert from "node:assert/strict";
import { BLUEPRINT, blueprintEmail, validateBlueprintLead } from "../lib/blueprint";

const ok = validateBlueprintLead({ name: "  David   Smith ", email: "David@Example.com", source: "Instagram" });
assert.ok(ok.ok);
if (ok.ok) {
  assert.equal(ok.data.firstName, "David");
  assert.equal(ok.data.email, "david@example.com");
  assert.equal(ok.data.source, "Instagram");
  const e = blueprintEmail(ok.data, "https://vitalfusioncoaching.com/");
  assert.ok(e.html.includes("https://vitalfusioncoaching.com/plans/the-blueprint.pdf"));
  assert.ok(e.text.includes("Hi David,"));
}
const noSource = validateBlueprintLead({ name: "A", email: "a@b.co" });
assert.ok(noSource.ok && noSource.data.source === "Blueprint");
const bad = validateBlueprintLead({ name: "", email: "nope" });
assert.ok(!bad.ok && bad.errors.name && bad.errors.email);
const xss = validateBlueprintLead({ name: "<b>x</b>", email: "x@y.co" });
assert.ok(xss.ok && !blueprintEmail(xss.data, "https://x.co").html.includes("<b>x</b>"));
assert.equal(BLUEPRINT.event, "blueprint.signed_up");
console.log("Blueprint tests passed");
