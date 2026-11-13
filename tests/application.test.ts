import assert from "node:assert/strict";
import { validateApplication, sourceLabel } from "../lib/application";
import { applicantEmail, coachEmail, sendEmail, youTubeId } from "../lib/email";
import { site } from "../content/site";
import { saveApplication } from "../lib/store";

const good = {
  ageRange: "23-29", fitnessLevel: "intermediate", helpAreas: ["diet", "training", "diet", "bogus"], otherArea: "should be dropped",
  goal: "Lose 15 lbs <script>alert(1)</script>", whyNow: "New year, new me",
  fullName: "Tyler Kendrick", email: "TKendrick1802@Gmail.com ", phone: "(443) 800-4593",
  instagram: "@@tyler.k", source: "Instagram",
};

const r = validateApplication(good);
assert.ok(r.ok);
if (r.ok) {
  assert.deepEqual(r.data.helpAreas, ["diet", "training"]);
  assert.equal(r.data.otherArea, "", "otherArea ignored unless Other is picked");
  assert.equal(r.data.email, "tkendrick1802@gmail.com");
  assert.equal(r.data.instagram, "@tyler.k");
  const e = coachEmail(r.data);
  assert.ok(!e.html.includes("<script>"), "HTML must be escaped");
  assert.ok(e.html.includes("&lt;script&gt;"));
  assert.ok(e.html.includes("Source: Instagram"));
  assert.ok(e.html.includes("Diet/Nutrition, Training"));
  assert.ok(e.html.includes('href="tel:4438004593"'));
  const fs = await import("node:fs");
  fs.writeFileSync("/tmp/email-preview.html", e.html);
}

const bad = validateApplication({ helpAreas: [], email: "nope", phone: "123", instagram: "bad handle!" });
assert.ok(!bad.ok);
if (!bad.ok) {
  for (const k of ["ageRange", "fitnessLevel", "helpAreas", "goal", "whyNow", "fullName", "email", "phone", "instagram"])
    assert.ok(k in bad.errors, `expected error for ${k}`);
}
assert.ok(!validateApplication(null).ok);
const needOther = validateApplication({ ...good, helpAreas: ["other"], otherArea: "" });
assert.ok(!needOther.ok && "otherArea" in needOther.errors, "Other requires text");
const withOther = validateApplication({ ...good, helpAreas: ["diet", "other"], otherArea: "Sleep & stress" });
assert.ok(withOther.ok);
if (withOther.ok) assert.ok(coachEmail(withOther.data).html.includes("Other (Sleep &amp; stress)"));
assert.ok(validateApplication({ ...good, instagram: "" }).ok);
assert.equal(validateApplication({ ...good, source: "" }).ok && (validateApplication({ ...good, source: "" }) as any).data.source, "Main Website");

assert.equal(sourceLabel(null), "Main Website");
assert.equal(sourceLabel("instagram"), "Instagram");
assert.equal(sourceLabel("tiktok_bio"), "Tiktok Bio");
assert.equal(sourceLabel("<b>x</b>"), "Bxb");

// sendEmail / saveApplication with mocked fetch
const calls: { url: string; init: any }[] = [];
globalThis.fetch = (async (url: string, init: any) => { calls.push({ url, init }); return new Response("{}", { status: 200 }); }) as any;
process.env.RESEND_API_KEY = "re_test";
await sendEmail({ to: "coach@example.com", subject: "s", html: "h", text: "t", replyTo: "a@b.co" });
const body = JSON.parse(calls[0].init.body);
assert.equal(calls[0].url, "https://api.resend.com/emails");
assert.equal(body.reply_to, "a@b.co");
assert.deepEqual(body.to, ["coach@example.com"]);

await saveApplication((r as any).data); // storage disabled → no call
assert.equal(calls.length, 1);
process.env.SUPABASE_URL = "https://x.supabase.co/";
process.env.SUPABASE_SERVICE_ROLE_KEY = "srk";
await saveApplication((r as any).data);
assert.equal(calls[1].url, "https://x.supabase.co/rest/v1/applications");
assert.deepEqual(JSON.parse(calls[1].init.body).help_areas, ["diet", "training"]);

globalThis.fetch = (async () => new Response("bad", { status: 403 })) as any;
await assert.rejects(sendEmail({ to: "x@y.co", subject: "s", html: "h", text: "t" }), /Resend error 403/);

// Applicant email + YouTube links
for (const u of ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "https://youtu.be/dQw4w9WgXcQ?si=abc", "https://youtube.com/shorts/dQw4w9WgXcQ", "https://m.youtube.com/watch?feature=share&v=dQw4w9WgXcQ"])
  assert.equal(youTubeId(u), "dQw4w9WgXcQ", u);
if (r.ok) {
  const e = applicantEmail(r.data, { siteUrl: "https://example.vercel.app/" });
  assert.ok(e.html.includes("Hi Tyler,"));
  assert.ok(e.html.includes('href="https://example.vercel.app/next-steps"'));
  assert.ok(e.text.includes("https://example.vercel.app/next-steps"));
  assert.ok(!e.html.includes("youtube") && !e.html.includes("coach-photo"), "no photo/video in email");
  const fs = await import("node:fs"); fs.writeFileSync("/tmp/applicant-email.html", e.html);
}

console.log("All tests passed");
