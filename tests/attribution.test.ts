import assert from "node:assert/strict";
import { attributionFromSearch, cleanAttribution } from "../lib/attribution";
import { withAttribution } from "../lib/funnel";
import { sourceLabel } from "../lib/application";

const a = attributionFromSearch("?source=facebook-ad&utm_source=facebook&utm_medium=paid&utm_campaign=Fat+Loss+%7C+Leads&utm_term=Men+30-50&utm_content=Scale+reel&ad_id=1201&adset_id=77&campaign_id=5", "/macros");
assert.deepEqual(a, { src: "facebook-ad", utm_source: "facebook", utm_medium: "paid", campaign: "Fat Loss | Leads", adset: "Men 30-50", ad: "Scale reel", ad_id: "1201", adset_id: "77", campaign_id: "5", landing: "/macros" });
assert.equal(attributionFromSearch("?source=instagram"), null); // not an ad click
assert.equal(attributionFromSearch("?utm_campaign={{campaign.name}}&ad_id={{ad.id}}"), null); // unfilled placeholders
assert.equal(cleanAttribution({ ad: "<script>x</script>", junk: 1 })?.ad, "script x /script");
assert.equal(cleanAttribution("nope"), null);
assert.equal(cleanAttribution({ src: "facebook-ad" }), null); // a source tag alone isn't an ad

const saved = withAttribution({ email: "x@y.com", source: "Nutrition Plan Calculator", details: { goal: "lose" } }, { attr: a }, sourceLabel);
assert.equal(saved.source, "Facebook Ad");
assert.deepEqual(saved.details, { goal: "lose", utm_source: "facebook", utm_medium: "paid", campaign: "Fat Loss | Leads", adset: "Men 30-50", ad: "Scale reel", ad_id: "1201", adset_id: "77", campaign_id: "5", landing: "/macros" });
const plain = withAttribution({ email: "x@y.com", source: "Instagram" }, { attr: null }, sourceLabel);
assert.deepEqual(plain, { email: "x@y.com", source: "Instagram" });
console.log("Attribution tests passed");
