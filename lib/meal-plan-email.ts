// The "here's your meal plan" email, sent right away by /api/meal-plan (the follow-ups after it live
// in Resend Automations). Same look as the calculator sequence emails: white card on light grey,
// Arial, blue button, footer with the address.
import type { MealPlan, MealPlanLead } from "./meal-plans";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

const P = "margin-top:0;margin-bottom:16px;font-family:Arial, Helvetica, sans-serif;font-size:16px;line-height:24px;color:#1f2328;";

export function mealPlanEmail(lead: MealPlanLead, plan: MealPlan, siteUrl: string): { subject: string; html: string; text: string } {
  const base = siteUrl.replace(/\/$/, "");
  const pdfUrl = `${base}${plan.pdf}`;
  const name = esc(lead.firstName || "there");
  const steps = [
    "Shop this week with the list on page 6.",
    "Prep twice: Sunday and Wednesday (page 5 has the steps).",
    "Eat the same four meals every day, and keep lifting.",
  ];
  const subject = "Your 60-day meal plan is here 💪";
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
<p style="${P}">Here's your 60-Day Belly Fat Meal Plan: <strong>${esc(plan.name)}</strong>. It has the exact amounts for every meal, a prep schedule, simple swaps and a shopping list.</p>
<table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;"><tr><td bgcolor="#5a8bb3" style="background-color:#5a8bb3;border-radius:10px;">
<a href="${pdfUrl}" style="display:inline-block;padding-top:14px;padding-bottom:14px;padding-left:24px;padding-right:24px;font-family:Arial, Helvetica, sans-serif;font-size:16px;line-height:20px;font-weight:bold;color:#ffffff;text-decoration:none;">Download my meal plan (PDF) &rarr;</a>
</td></tr></table>
<p style="margin-top:0;margin-bottom:8px;font-family:Arial, Helvetica, sans-serif;font-size:16px;line-height:24px;color:#1f2328;font-weight:bold;">Start here:</p>
${steps.map((s, i) => `<p style="margin-top:0;margin-bottom:8px;font-family:Arial, Helvetica, sans-serif;font-size:16px;line-height:24px;color:#1f2328;">${i + 1}. ${esc(s)}</p>`).join("\n")}
<p style="margin-top:16px;margin-bottom:16px;font-family:Arial, Helvetica, sans-serif;font-size:16px;line-height:24px;color:#1f2328;">I'll check in with you in a couple of days to see how it's going. If you have a question before then, just hit reply. I read every one.</p>
<p style="margin-top:0;margin-bottom:0;font-family:Arial, Helvetica, sans-serif;font-size:16px;line-height:24px;color:#1f2328;">Tyler</p>
</td></tr>
<tr><td align="center" style="padding-top:16px;padding-bottom:0;padding-left:12px;padding-right:12px;">
<p style="margin-top:0;margin-bottom:0;font-family:Arial, Helvetica, sans-serif;font-size:12px;line-height:18px;color:#8d939e;">Vital Fusion Coaching &middot; 1802 Charolais Court, Bel Air, MD 21015<br>You're getting this because you asked for the free 60-day meal plan at vitalfusioncoaching.com.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
  const text = [
    `Hi ${lead.firstName || "there"},`,
    "",
    `Here's your 60-Day Belly Fat Meal Plan: ${plan.name}. It has the exact amounts for every meal, a prep schedule, simple swaps and a shopping list.`,
    "",
    `Download my meal plan (PDF): ${pdfUrl}`,
    "",
    "Start here:",
    ...steps.map((s, i) => `${i + 1}. ${s}`),
    "",
    "I'll check in with you in a couple of days to see how it's going. If you have a question before then, just hit reply. I read every one.",
    "",
    "Tyler",
    "",
    "Vital Fusion Coaching · 1802 Charolais Court, Bel Air, MD 21015",
    "You're getting this because you asked for the free 60-day meal plan at vitalfusioncoaching.com.",
  ].join("\n");
  return { subject, html, text };
}

/** Short heads-up to the coach for each new meal plan lead. */
export function coachMealPlanEmail(lead: MealPlanLead, plan: MealPlan): { subject: string; html: string; text: string } {
  const subject = `New meal plan lead: ${lead.name} (${plan.name})`;
  const lines = [`Name: ${lead.name}`, `Email: ${lead.email}`, `Plan: ${plan.name}`, `Source: ${lead.source}`];
  const html = `<div style="font-family:Arial, Helvetica, sans-serif;font-size:15px;line-height:22px;color:#1f2328">${lines.map((l) => `<p style="margin:0 0 6px">${esc(l)}</p>`).join("")}<p style="margin:12px 0 0;color:#8d939e">They got the PDF and are in the ${esc(plan.name)} follow-up emails.</p></div>`;
  return { subject, html, text: lines.join("\n") };
}
