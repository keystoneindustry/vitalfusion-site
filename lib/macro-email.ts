import { site } from "../content/site";
import {
  ACTIVITY_LEVELS,
  GOALS,
  OBSTACLES,
  PACES,
  TRYING_FOR,
  formatDate,
  goalDate,
  labelOf,
  mealName,
  leadRating,
  REALITY_PUNCH,
  realityContext,
  tipsFor,
  RULES,
  type MacroResults,
  type QuizInput,
} from "./macros";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export function goalSummary(q: QuizInput, r: MacroResults): string {
  if (q.goal === "lose") {
    if (r.minorAtMaintenance) return "Maintenance calories + high protein";
    return `${labelOf(PACES, q.pace)} fat loss · about ${Math.abs(r.weeklyChangeLb).toFixed(1)} lb a week`;
  }
  return q.goal === "muscle"
    ? `Build muscle · ${RULES.muscleSurplus} calories above maintenance`
    : "Maintain your weight · maintenance calories";
}

export function goalDateText(r: MacroResults, now: Date = new Date()): string {
  return r.weeksToGoal ? formatDate(goalDate(r.weeksToGoal, now)) : "";
}

const P = "margin:0 0 12px;font-size:16px;line-height:1.6;color:#d4d7dd";

/** Email to the person who took the quiz: their numbers, tips, meals, and the soft coaching bridge. */
export function macroResultsEmail(q: QuizInput, r: MacroResults, siteUrl: string): { subject: string; html: string; text: string } {
  const c = site.macroQuiz;
  const base = siteUrl.replace(/\/$/, "");
  const first = q.name.split(/\s+/)[0];
  const date = goalDateText(r);
  const tips = tipsFor(q.obstacles);
  const context = realityContext(q);
  const reality = [context, REALITY_PUNCH].filter(Boolean).join(" ");
  const applyUrl = `${base}/apply?source=macro-email`;

  const stat = (label: string, value: string, color: string) =>
    `<td align="center" style="padding:12px 4px;background:#1b1f27;border-radius:12px"><div style="font-size:24px;font-weight:800;color:${color}">${value}</div><div style="font-size:13px;color:#a9aeb8;font-weight:600">${label}</div></td>`;

  const html = `<!doctype html><html><body style="margin:0;background:#0b0d12;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
<div style="max-width:540px;margin:0 auto;padding:28px 14px">
  <div style="text-align:center;margin-bottom:18px"><img src="${base}/images/vf-logo.png" width="52" height="52" alt="${esc(site.brand)}" style="border-radius:12px"></div>
  <div style="background:#15171d;border:1px solid #2a2d35;border-radius:18px;padding:26px 20px;color:#f4f5f7">
    <h1 style="margin:0 0 14px;font-size:24px;line-height:1.25">${esc(first)}, here's your macro plan</h1>
    <div style="text-align:center;background:#18212f;border:1px solid #2c3a52;border-radius:16px;padding:20px 12px;margin:0 0 12px">
      <div style="font-size:14px;color:#a9aeb8">Eat about</div>
      <div style="font-size:48px;font-weight:900;line-height:1.1">${r.calories.toLocaleString()}</div>
      <div style="font-size:15px;color:#d4d7dd;font-weight:600">calories a day</div>
      <div style="font-size:13px;color:#a9c6e4;margin-top:8px">${esc(goalSummary(q, r))}</div>
    </div>
    <table role="presentation" width="100%" cellspacing="6" cellpadding="0" style="margin:0 0 6px"><tr>
      ${stat("Protein", `${r.protein}g`, "#8ec1e6")}${stat("Carbs", `${r.carbs}g`, "#ffe7ab")}${stat("Fat", `${r.fat}g`, "#b7d3b9")}
    </tr></table>
    <p style="${P};font-size:14px;color:#a9aeb8">Plus <strong style="color:#fff">${r.fiber}g+ of fiber</strong> a day. Your maintenance is about ${r.maintenance.toLocaleString()} calories.</p>
    ${r.minorAtMaintenance ? `<p style="${P};font-size:14px">Because you're under 18, I've kept you at maintenance calories. Focus on protein, training and healthy habits instead of dieting.</p>` : ""}
    ${date ? `<div style="border-left:4px solid #ffe7ab;background:#1b1f27;border-radius:12px;padding:14px 16px;margin:6px 0 18px"><div style="font-size:13px;color:#a9aeb8">At this pace, you could reach</div><div style="font-size:19px;font-weight:800;margin-top:2px">${q.goalWeightLb} lbs by ${esc(date)}</div><div style="font-size:13px;color:#a9aeb8;margin-top:6px">About ${r.weeksToGoal} weeks. It's an estimate, but consistency gets you there.</div></div>` : ""}
    ${
      tips.length
        ? `<h2 style="font-size:18px;margin:22px 0 10px">Based on what gets in your way</h2>${tips
            .map((t) => `<p style="${P};font-size:15px"><strong style="color:#ffe7ab">${esc(t.label)}:</strong> ${esc(t.tip)}</p>`)
            .join("")}`
        : ""
    }
    <h2 style="font-size:18px;margin:22px 0 6px">${esc(c.mealsTitle[q.goal])}</h2>
    <p style="${P};font-size:14px;color:#a9aeb8">${esc(c.mealsSub)}</p>
    ${c.meals
      .map(
        (m, i) => `<div style="background:#1b1f27;border-radius:12px;padding:14px 16px;margin:0 0 10px">
      <div style="font-size:12px;font-weight:700;color:#6a9fc6;letter-spacing:.08em;text-transform:uppercase">Meal ${i + 1}</div>
      <div style="font-size:16px;font-weight:700;margin:2px 0">${esc(mealName(m, q.goal))}</div>
      ${"detail" in m && m.detail ? `<div style="font-size:14px;color:#a9aeb8">${esc(m.detail)}</div>` : ""}
      <div style="font-size:14px;color:#d4d7dd;line-height:1.55;margin-top:6px">${m.why[q.goal].map((w) => `✓ ${esc(w)}`).join("<br>")}</div>
    </div>`,
      )
      .join("")}
    <div style="border-top:1px solid #2c3a52;margin:22px 0 0;padding-top:20px">
      ${context ? `<p style="${P};font-size:14px;color:#a9aeb8;margin-bottom:6px">${esc(context)}</p>` : ""}
      <p style="margin:0 0 4px;font-size:19px;font-weight:800;line-height:1.3;color:#f4f5f7">${esc(REALITY_PUNCH)}</p>
      <h2 style="font-size:18px;margin:16px 0 8px">${esc(c.bridgeTitle)}</h2>
      <p style="${P}">${esc(c.bridge)}</p>
      <a href="${applyUrl}" style="display:inline-block;background:#6a9fc6;color:#ffffff;font-weight:700;font-size:16px;text-decoration:none;border-radius:12px;padding:14px 22px">${esc(c.bridgeButton)}</a>
    </div>
    <p style="margin:24px 0 0;font-size:16px;line-height:1.6;color:#d4d7dd">Talk soon,<br><strong style="color:#ffe7ab">${esc(site.coachName)}</strong><br>${esc(site.brand)}</p>
  </div>
  <p style="text-align:center;color:#6b707b;font-size:11px;line-height:1.5;margin:16px 6px 0">${esc(c.disclaimer)}</p>
  <p style="text-align:center;color:#6b707b;font-size:11px;margin:8px 0 0">You're receiving this because you used the macro calculator at ${esc(base.replace(/^https?:\/\//, ""))}.</p>
</div></body></html>`;

  const text = [
    `Hi ${first},`,
    ``,
    `Your macro plan: ${r.calories} calories a day (${goalSummary(q, r)})`,
    `Protein ${r.protein}g · Carbs ${r.carbs}g · Fat ${r.fat}g · Fiber ${r.fiber}g+`,
    `Maintenance: about ${r.maintenance} calories`,
    ...(date ? [``, `At this pace you could reach ${q.goalWeightLb} lbs by ${date} (about ${r.weeksToGoal} weeks).`] : []),
    ...(tips.length ? [``, `Based on what gets in your way:`, ...tips.map((t) => `- ${t.label}: ${t.tip}`)] : []),
    ``,
    `${c.mealsTitle[q.goal]}:`,
    ...c.meals.map((m, i) => `${i + 1}. ${mealName(m, q.goal)}${"detail" in m && m.detail ? ` (${m.detail})` : ""}\n   ${m.why[q.goal].join(" · ")}`),
    ``,
    reality,
    ``,
    `${c.bridgeTitle} ${c.bridge}`,
    `Apply for 1:1 coaching: ${applyUrl}`,
    ``,
    `Talk soon,`,
    site.coachName,
    site.brand,
    ``,
    c.disclaimer,
  ].join("\n");

  return { subject: c.emailSubject, html, text };
}

/** One row of data for the coach email and the Google Sheet. */
export function leadRow(q: QuizInput, r: MacroResults, now: Date = new Date()): Record<string, string | number> {
  return {
    Timestamp: now.toLocaleString("en-US", { timeZone: "America/New_York" }),
    Name: q.name,
    Email: q.email,
    "Lead Rating": leadRating(q),
    Source: q.source,
    Sex: q.sex === "male" ? "Male" : "Female",
    Age: q.age,
    Height: `${q.heightFt}'${q.heightIn}"`,
    "Weight (lb)": q.weightLb,
    "Goal Weight (lb)": q.goalWeightLb,
    Activity: labelOf(ACTIVITY_LEVELS, q.activity),
    Goal: labelOf(GOALS, q.goal),
    Pace: q.pace ? labelOf(PACES, q.pace) : "",
    "Trying For": labelOf(TRYING_FOR, q.tryingFor),
    Obstacles: q.obstacles.map((o) => labelOf(OBSTACLES, o)).join(", "),
    Maintenance: r.maintenance,
    Calories: r.calories,
    "Protein (g)": r.protein,
    "Carbs (g)": r.carbs,
    "Fat (g)": r.fat,
    "Fiber (g)": r.fiber,
    "Goal Date": goalDateText(r, now),
  };
}

export const SHEET_COLUMNS = [
  "Timestamp", "Name", "Email", "Lead Rating", "Source", "Sex", "Age", "Height",
  "Weight (lb)", "Goal Weight (lb)", "Activity", "Goal", "Pace", "Trying For", "Obstacles",
  "Maintenance", "Calories", "Protein (g)", "Carbs (g)", "Fat (g)", "Fiber (g)", "Goal Date",
] as const;

/** Notification to the coach for every new lead. */
export function coachLeadEmail(q: QuizInput, r: MacroResults): { subject: string; html: string; text: string } {
  const row = leadRow(q, r);
  const rating = row["Lead Rating"] as string;
  const emoji = rating === "Hot" ? "🔥" : rating === "Warm" ? "🌤️" : "❄️";
  const rows = Object.entries(row)
    .filter(([k]) => k !== "Timestamp")
    .map(([k, v]) => `<tr><td style="padding:6px 10px;color:#a9aeb8;font-size:14px;white-space:nowrap;vertical-align:top">${esc(k)}</td><td style="padding:6px 10px;color:#f4f5f7;font-size:14px">${esc(String(v || "—"))}</td></tr>`)
    .join("");
  const html = `<!doctype html><html><body style="margin:0;background:#111;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:24px 12px">
  <div style="border-radius:16px 16px 0 0;padding:24px;text-align:center;background:linear-gradient(135deg,#6a9fc6,#b9c8bd 55%,#f6e0a8)">
    <h1 style="margin:0;font-size:26px;color:#1a1a1a">🥗 New Macro Quiz Lead</h1>
    <p style="margin:10px 0 0;font-size:16px;color:#222;font-weight:700">${emoji} ${esc(rating)} lead · ${esc(q.source)}</p>
  </div>
  <div style="background:#26282d;border-radius:0 0 16px 16px;padding:12px 8px 20px">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${rows}</table>
    <p style="margin:16px 10px 0;color:#9aa0a6;font-size:13px">Hit reply to email ${esc(q.name)} directly.</p>
  </div>
</div></body></html>`;
  const text = Object.entries(row).map(([k, v]) => `${k}: ${v}`).join("\n");
  return { subject: `[Macro] ${emoji} New macro lead (${rating}) — ${q.name}`, html, text };
}
