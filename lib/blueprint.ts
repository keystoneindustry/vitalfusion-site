// Free "The Blueprint" guide (/blueprint): 3-day training split, cardio, the 1,800-calorie 9-to-5 meal plan with a
// grocery list, recovery and supplements, for men working a full-time job. Same flow as the grocery list:
// name + email, instant PDF download, a copy by email, follow-ups on day 2, 4, 7, 10 and 14 (Resend Automation
// on the event below), lead saved for the dashboard.

export const BLUEPRINT = {
  pdf: "/plans/the-blueprint.pdf",
  /** Starts the follow-up emails in Resend. */
  event: "blueprint.signed_up",
  title: "Get *The Blueprint*",
  intro: "The full training, nutrition, cardio and recovery plan for men working a full-time job. The best way to get shredded in 60 days.",
  stats: [
    { value: "3", label: "Gym days a week" },
    { value: "20 min", label: "Cardio sessions" },
    { value: "1,800", label: "Calories a day" },
  ],
  // The page shows these with the right-hand detail blurred, as a teaser.
  sections: [
    { label: "Day 1", name: "Chest, shoulders and triceps", items: [["Cable chest fly", "3 × 12"], ["Incline dumbbell bench press", "3 × 10"], ["Lateral raise", "3 × 12"], ["Machine shoulder press", "2 × 8"], ["Triceps rope extension", "4 × 12"]] },
    { label: "Day 2", name: "Back and biceps", items: [["Lat pulldown", "3 × 12"], ["Seated cable row", "3 × 10"], ["Straight-arm pulldown", "3 × 12"], ["Rear delt fly", "3 × 12"], ["Barbell biceps curl", "2 × 12"], ["Hammer curl", "2 × 12"]] },
    { label: "Day 3", name: "Legs and abs", items: [["Leg press", "3 × 10"], ["Leg extension", "3 × 10"], ["Leg curl", "3 × 10"], ["Ab circuit", "3 rounds"]] },
    { label: "Cardio", name: "The fastest way to get shredded", items: [["How often", "3 times"], ["How long", "20 min"], ["Machine and settings", "Incline 10"]] },
    { label: "Nutrition", name: "1,800-calorie meal plan", items: [["4 meals with exact amounts", "550 cal"], ["Grocery list for the week", "7 days"], ["Meal prep steps", "2 days"]] },
    { label: "Recovery", name: "Supplements and sleep", items: [["Daily supplements", "5 g a day"], ["What to take before bed", "400 mg"]] },
  ],
} as const;

export type BlueprintLead = { name: string; firstName: string; email: string; source: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateBlueprintLead(raw: unknown): { ok: true; data: BlueprintLead } | { ok: false; errors: { name?: string; email?: string } } {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const name = str(r.name).replace(/\s+/g, " ").slice(0, 80);
  const email = str(r.email).toLowerCase().slice(0, 200);
  const errors: { name?: string; email?: string } = {};
  if (!name) errors.name = "Please enter your first name.";
  if (!EMAIL_RE.test(email)) errors.email = "Please enter a valid email.";
  if (Object.keys(errors).length) return { ok: false, errors };
  const source = str(r.source).slice(0, 60) || "Blueprint";
  return { ok: true, data: { name, firstName: name.split(" ")[0], email, source } };
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

const P = "margin-top:0;margin-bottom:16px;font-family:Arial, Helvetica, sans-serif;font-size:16px;line-height:24px;color:#1f2328;";
const FOOT = "You're getting this because you asked for The Blueprint at vitalfusioncoaching.com.";

/** The "here's The Blueprint" email, sent right away by /api/blueprint. */
export function blueprintEmail(lead: BlueprintLead, siteUrl: string): { subject: string; html: string; text: string } {
  const pdfUrl = `${siteUrl.replace(/\/$/, "")}${BLUEPRINT.pdf}`;
  const name = esc(lead.firstName || "there");
  const steps = [
    "Do Day 1 in the next 48 hours. It's on page 3.",
    "Buy the week's groceries from the list on page 8.",
    "Pick the 3 to 4 days you'll do your 20 minutes of cardio.",
  ];
  const subject = "The Blueprint is here 💪";
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>Vital Fusion Coaching</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f4f5f7" style="background-color:#f4f5f7;">
<tr><td align="center" style="padding-top:24px;padding-bottom:24px;padding-left:12px;padding-right:12px;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
<tr><td bgcolor="#ffffff" style="background-color:#ffffff;border-radius:12px;padding-top:28px;padding-bottom:28px;padding-left:24px;padding-right:24px;">
<p style="${P}">Hi ${name},</p>
<p style="${P}">Here's The Blueprint. It has your 3-day training split, cardio, the 1,800-calorie meal plan with a grocery list, and what to take for recovery and sleep.</p>
<table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;"><tr><td bgcolor="#5a8bb3" style="background-color:#5a8bb3;border-radius:10px;">
<a href="${pdfUrl}" style="display:inline-block;padding-top:14px;padding-bottom:14px;padding-left:24px;padding-right:24px;font-family:Arial, Helvetica, sans-serif;font-size:16px;line-height:20px;font-weight:bold;color:#ffffff;text-decoration:none;">Download The Blueprint (PDF) &rarr;</a>
</td></tr></table>
<p style="margin-top:0;margin-bottom:8px;font-family:Arial, Helvetica, sans-serif;font-size:16px;line-height:24px;color:#1f2328;font-weight:bold;">Start here:</p>
${steps.map((s, i) => `<p style="margin-top:0;margin-bottom:8px;font-family:Arial, Helvetica, sans-serif;font-size:16px;line-height:24px;color:#1f2328;">${i + 1}. ${esc(s)}</p>`).join("\n")}
<p style="margin-top:16px;margin-bottom:16px;font-family:Arial, Helvetica, sans-serif;font-size:16px;line-height:24px;color:#1f2328;">I'll check in with you in a couple of days. If you have a question before then, just hit reply. I read every one.</p>
<p style="margin-top:0;margin-bottom:0;font-family:Arial, Helvetica, sans-serif;font-size:16px;line-height:24px;color:#1f2328;">Tyler</p>
</td></tr>
<tr><td align="center" style="padding-top:16px;padding-bottom:0;padding-left:12px;padding-right:12px;">
<p style="margin-top:0;margin-bottom:0;font-family:Arial, Helvetica, sans-serif;font-size:12px;line-height:18px;color:#8d939e;">Vital Fusion Coaching &middot; 1802 Charolais Court, Bel Air, MD 21015<br>${FOOT}</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
  const text = [
    `Hi ${lead.firstName || "there"},`,
    "",
    "Here's The Blueprint. It has your 3-day training split, cardio, the 1,800-calorie meal plan with a grocery list, and what to take for recovery and sleep.",
    "",
    `Download The Blueprint (PDF): ${pdfUrl}`,
    "",
    "Start here:",
    ...steps.map((s, i) => `${i + 1}. ${s}`),
    "",
    "I'll check in with you in a couple of days. If you have a question before then, just hit reply. I read every one.",
    "",
    "Tyler",
    "",
    "Vital Fusion Coaching · 1802 Charolais Court, Bel Air, MD 21015",
    FOOT,
  ].join("\n");
  return { subject, html, text };
}

/** Short heads-up to the coach for each new Blueprint lead. */
export function coachBlueprintEmail(lead: BlueprintLead): { subject: string; html: string; text: string } {
  const subject = `New blueprint lead: ${lead.name}`;
  const lines = [`Name: ${lead.name}`, `Email: ${lead.email}`, `Source: ${lead.source}`];
  const html = `<div style="font-family:Arial, Helvetica, sans-serif;font-size:15px;line-height:22px;color:#1f2328">${lines.map((l) => `<p style="margin:0 0 6px">${esc(l)}</p>`).join("")}<p style="margin:12px 0 0;color:#8d939e">They got The Blueprint and are in its follow-up emails.</p></div>`;
  return { subject, html, text: lines.join("\n") };
}
