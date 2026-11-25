import assert from "node:assert/strict";
import { GROCERY_LIST, groceryListEmail, validateGroceryListLead } from "../lib/grocery-list";

const ok = validateGroceryListLead({ name: "  David   Smith ", email: "David@Example.com", source: "Instagram" });
assert.ok(ok.ok);
if (ok.ok) {
  assert.equal(ok.data.firstName, "David");
  assert.equal(ok.data.email, "david@example.com");
  assert.equal(ok.data.source, "Instagram");
  const e = groceryListEmail(ok.data, "https://vitalfusioncoaching.com/");
  assert.ok(e.html.includes("https://vitalfusioncoaching.com/plans/fat-loss-grocery-list.pdf"));
  assert.ok(e.text.includes("Hi David,"));
}
const noSource = validateGroceryListLead({ name: "A", email: "a@b.co" });
assert.ok(noSource.ok && noSource.data.source === "Grocery List");
const bad = validateGroceryListLead({ name: "", email: "nope" });
assert.ok(!bad.ok && bad.errors.name && bad.errors.email);
const xss = validateGroceryListLead({ name: "<b>x</b>", email: "x@y.co" });
assert.ok(xss.ok && !groceryListEmail(xss.data, "https://x.co").html.includes("<b>x</b>"));
assert.equal(GROCERY_LIST.event, "grocery_list.signed_up");
console.log("Grocery list tests passed");
