// Free "Fat Loss Grocery List" guide (/grocery-list). Instagram "comment LIST" → ManyChat DM →
// this page. Same flow as the meal plans: name + email, instant PDF download, a copy by email,
// follow-ups on day 2, 4 and 7 (Resend Automation on the event below), lead saved for the dashboard.

export const GROCERY_LIST = {
  pdf: "/plans/fat-loss-grocery-list.pdf",
  /** Starts the follow-up emails in Resend. */
  event: "grocery_list.signed_up",
  title: "Get my *Fat Loss* Grocery List",
  intro: "Exactly what to buy each week, what to pick when you're standing in the aisle, and 12 simple meals to make with it, each with calories and macros.",
  stats: [
    { value: "5", label: "Sections" },
    { value: "12", label: "Sample meals" },
    { value: "1", label: "Trip a week" },
  ],
  // The page shows these with the items blurred, as a teaser.
  sections: [
    { name: "Proteins", pick: "Pick 3", blur: "Salmon", items: ["1 lean protein", "1 fattier protein", "1 quick protein"] },
    { name: "Carbs", pick: "Pick 3", blur: "Potato", items: ["Main carb", "Secondary carb", "Fun carb"] },
    { name: "Fruit, veggies and fats", pick: "Pick 5–7", blur: "Berries", items: ["1 high-fiber fruit + 1 other", "2–3 veggies", "1–2 fats"] },
    { name: "12 sample meals", pick: "With macros", blur: "450 cal", items: ["3 breakfasts", "3 lunches", "3 dinners", "3 snacks and treats"] },
  ],
} as const;

export type GroceryListLead = { name: string; firstName: string; email: string; source: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateGroceryListLead(raw: unknown): { ok: true; data: GroceryListLead } | { ok: false; errors: { name?: string; email?: string } } {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const name = str(r.name).replace(/\s+/g, " ").slice(0, 80);
  const email = str(r.email).toLowerCase().slice(0, 200);
  const errors: { name?: string; email?: string } = {};
  if (!name) errors.name = "Please enter your first name.";
  if (!EMAIL_RE.test(email)) errors.email = "Please enter a valid email.";
  if (Object.keys(errors).length) return { ok: false, errors };
  const source = str(r.source).slice(0, 60) || "Grocery List";
  return { ok: true, data: { name, firstName: name.split(" ")[0], email, source } };
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

const P = "margin-top:0;margin-bottom:16px;font-family:Arial, Helvetica, sans-serif;font-size:16px;line-height:24px;color:#1f2328;";
const FOOT = "You're getting this because you asked for the free Fat Loss Grocery List at vitalfusioncoaching.com.";

/** The "here's your grocery list" email, sent right away by /api/grocery-list. */
export function groceryListEmail(lead: GroceryListLead, siteUrl: string): { subject: string; html: string; text: string } {
  const pdfUrl = `${siteUrl.replace(/\/$/, "")}${GROCERY_LIST.pdf}`;
  const name = esc(lead.firstName || "there");
  const steps = [
    "Pick your foods from each section on page 2 before you shop.",
    "Buy it all in one trip for the week.",
    "Choose a breakfast, lunch, dinner and snack from the sample meals.",
  ];
  const subject = "Your Fat Loss Grocery List is here 🛒";
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
<p style="${P}">Here's your Fat Loss Grocery List. It has everything to buy each week, my picks when you can't decide, and 12 sample meals with calories and macros.</p>
<table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;"><tr><td bgcolor="#5a8bb3" style="background-color:#5a8bb3;border-radius:10px;">
<a href="${pdfUrl}" style="display:inline-block;padding-top:14px;padding-bottom:14px;padding-left:24px;padding-right:24px;font-family:Arial, Helvetica, sans-serif;font-size:16px;line-height:20px;font-weight:bold;color:#ffffff;text-decoration:none;">Download my grocery list (PDF) &rarr;</a>
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
    "Here's your Fat Loss Grocery List. It has everything to buy each week, my picks when you can't decide, and 12 sample meals with calories and macros.",
    "",
    `Download my grocery list (PDF): ${pdfUrl}`,
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

/** Short heads-up to the coach for each new grocery list lead. */
export function coachGroceryListEmail(lead: GroceryListLead): { subject: string; html: string; text: string } {
  const subject = `New grocery list lead: ${lead.name}`;
  const lines = [`Name: ${lead.name}`, `Email: ${lead.email}`, `Source: ${lead.source}`];
  const html = `<div style="font-family:Arial, Helvetica, sans-serif;font-size:15px;line-height:22px;color:#1f2328">${lines.map((l) => `<p style="margin:0 0 6px">${esc(l)}</p>`).join("")}<p style="margin:12px 0 0;color:#8d939e">They got the Fat Loss Grocery List and are in its follow-up emails.</p></div>`;
  return { subject, html, text: lines.join("\n") };
}
