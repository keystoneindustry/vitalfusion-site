
// Standalone Legal form without the health questions: sections renumber II–VII and no dangling PAR-Q reference.
{
  const { agreementSections: secs } = await import("../lib/agreement");
  const pkg = { billing: "package" as const, coachingWeeks: 12, startDate: "2026-12-01", endDate: "2027-02-22" };
  const without = secs(pkg, { withParq: false });
  const assertMod = await import("node:assert/strict");
  assertMod.deepEqual(without.map((s) => s.number), ["II", "III", "IV", "V", "VI", "VII"]);
  assertMod.ok(without.find((s) => s.id === "health")!.paragraphs[0].includes("disclosed to the Coach in writing"));
  assertMod.deepEqual(secs(pkg).map((s) => s.number), ["III", "IV", "V", "VI", "VII", "VIII"]);
  assertMod.ok(secs(pkg).find((s) => s.id === "health")!.paragraphs[0].includes("disclosed in this Agreement"));
  console.log("legal sections ok");
}
