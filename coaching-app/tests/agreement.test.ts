import assert from "node:assert/strict";
import { agreementSections } from "../lib/agreement";

// Standalone Legal form without the health questions: sections renumber II–VII and no dangling PAR-Q reference.
const pkg = { billing: "package" as const, coachingWeeks: 12, startDate: "2026-12-01", endDate: "2027-02-22" };
const without = agreementSections(pkg, { withParq: false });
assert.deepEqual(without.map((s) => s.number), ["II", "III", "IV", "V", "VI", "VII"]);
assert.ok(without.find((s) => s.id === "health")!.paragraphs[0].includes("disclosed to the Coach in writing"));
assert.deepEqual(agreementSections(pkg).map((s) => s.number), ["III", "IV", "V", "VI", "VII", "VIII"]);
assert.ok(agreementSections(pkg).find((s) => s.id === "health")!.paragraphs[0].includes("disclosed in this Agreement"));
console.log("legal sections ok");
