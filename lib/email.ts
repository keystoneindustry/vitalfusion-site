import { FITNESS_LEVELS, HELP_AREAS, labelFor, type Application } from "./application";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const SHORT_LEVEL: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

function row(label: string, value: string): string {
  return `<p style="margin:0 0 8px"><strong style="color:#fff">${esc(label)}:</strong> ${value}</p>`;
}

function section(emoji: string, title: string, body: string): string {
  return `
  <h2 style="margin:28px 0 10px;font-size:18px;color:#6fa3c8">${emoji} ${esc(title)}</h2>
  <div style="background:#1b1d22;border-left:4px solid #6fa3c8;border-radius:8px;padding:16px 18px;color:#e6e6e6;font-size:15px;line-height:1.5">${body}</div>`;
}

/** Notification email sent to the coach. Mirrors the current Emergent email. */
export function coachEmail(a: Application): { subject: string; html: string; text: string } {
  const level = SHORT_LEVEL[a.fitnessLevel] ?? a.fitnessLevel;
  const areas = a.helpAreas.map((h) => labelFor(HELP_AREAS, h)).join(", ");
  const phoneHref = a.phone.replace(/[^\d+]/g, "");
  const igHandle = a.instagram.replace(/^@/, "");

  const html = `<!doctype html><html><body style="margin:0;background:#111;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:24px 12px">
  <div style="border-radius:16px 16px 0 0;padding:32px 24px;text-align:center;background:linear-gradient(135deg,#6a9fc6,#b9c8bd 55%,#f6e0a8)">
    <h1 style="margin:0;font-size:30px;line-height:1.15;color:#1a1a1a">💪 New Coaching Application</h1>
    <p style="margin:10px 0 16px;color:#222;font-size:16px">Vital Fusion Coaching</p>
    <span style="display:inline-block;background:#3a2c0b;color:#fff;font-weight:700;border-radius:999px;padding:8px 18px;font-size:14px">📍 Source: ${esc(a.source)}</span>
  </div>
  <div style="background:#26282d;border-radius:0 0 16px 16px;padding:8px 24px 28px">
    ${section(
      "👤",
      "Personal Information",
      row("Name", esc(a.fullName)) +
        row("Email", `<a href="mailto:${esc(a.email)}" style="color:#7fb2ff">${esc(a.email)}</a>`) +
        row("Phone", `<a href="tel:${esc(phoneHref)}" style="color:#7fb2ff">${esc(a.phone)}</a>`) +
        row(
          "Instagram",
          igHandle
            ? `<a href="https://instagram.com/${esc(igHandle)}" style="color:#7fb2ff">${esc(a.instagram)}</a>`
            : "—",
        ) +
        row("Age Range", esc(a.ageRange)),
    )}
    ${section("🎯", "Fitness Profile", row("Fitness Level", esc(level)) + row("Areas Needing Help", esc(areas)))}
    ${section("🚀", "6-12 Month Goal", esc(a.goal).replace(/\n/g, "<br>"))}
    ${section("🔥", "Why Now", esc(a.whyNow).replace(/\n/g, "<br>"))}
    <p style="margin:24px 0 0;color:#9aa0a6;font-size:13px">Hit reply to email ${esc(a.fullName)} directly.</p>
  </div>
</div></body></html>`;

  const text = [
    `New Coaching Application — Source: ${a.source}`,
    ``,
    `Name: ${a.fullName}`,
    `Email: ${a.email}`,
    `Phone: ${a.phone}`,
    `Instagram: ${a.instagram || "—"}`,
    `Age Range: ${a.ageRange}`,
    `Fitness Level: ${labelFor(FITNESS_LEVELS, a.fitnessLevel)}`,
    `Areas Needing Help: ${areas}`,
    ``,
    `6-12 Month Goal:`,
    a.goal,
    ``,
    `Why Now:`,
    a.whyNow,
  ].join("\n");

  return { subject: `💪 New Coaching Application — ${a.fullName}`, html, text };
}

/** Optional "we got it" email to the applicant. */
export function applicantEmail(a: Application): { subject: string; html: string; text: string } {
  const first = a.fullName.split(/\s+/)[0];
  const text = `Hi ${first},\n\nThanks for applying for coaching with Vital Fusion. We'll review your information and see if one-on-one coaching is the right fit for your goals, then reach out soon to schedule your consultation call.\n\n— Vital Fusion Coaching`;
  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#222;max-width:520px">${esc(text).replace(/\n/g, "<br>")}</div>`;
  return { subject: "We got your coaching application", html, text };
}

/** Sends through Resend's REST API (no SDK needed). */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set");
  const from = process.env.FROM_EMAIL || "Vital Fusion Coaching <onboarding@resend.dev>";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
    }),
  });
  if (!res.ok) {
    throw new Error(`Resend error ${res.status}: ${await res.text()}`);
  }
}
