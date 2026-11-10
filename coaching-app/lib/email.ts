import { env } from "./env";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendEmail(msg: { to: string; subject: string; html: string; text: string }): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.resendApiKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env.fromEmail(),
      to: [msg.to],
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
      ...(env.replyTo() ? { reply_to: env.replyTo() } : {}),
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Resend error ${res.status}: ${await res.text()}`);
}

function layout(heading: string, bodyHtml: string, buttonLabel: string, link: string, footnote: string): string {
  return `<!doctype html><html><body style="margin:0;background:#0b0d12;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
<div style="max-width:520px;margin:0 auto;padding:28px 16px">
  <div style="background:#15171d;border:1px solid #2a2d35;border-radius:18px;padding:32px 24px;color:#f4f5f7">
    <p style="margin:0 0 6px;color:#6a9fc6;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;font-size:12px">Vital Fusion Coaching</p>
    <h1 style="margin:0 0 16px;font-size:26px;line-height:1.2">${esc(heading)}</h1>
    <div style="color:#d4d7dd;font-size:16px;line-height:1.6">${bodyHtml}</div>
    <p style="margin:28px 0 8px;text-align:center">
      <a href="${esc(link)}" style="display:inline-block;background:#6a9fc6;color:#ffffff;font-weight:700;font-size:18px;text-decoration:none;border-radius:14px;padding:16px 32px">${esc(buttonLabel)}</a>
    </p>
    <p style="margin:18px 0 0;color:#8d939e;font-size:13px;line-height:1.5">${esc(footnote)}</p>
  </div>
  <p style="margin:16px 0 0;text-align:center;color:#8d939e;font-size:12px">Vital Fusion Coaching LLC · 1802 Charolais Court, Bel Air, MD 21015</p>
</div></body></html>`;
}

/** First email a new client gets when the coach adds them. */
export function inviteEmail(firstName: string, link: string) {
  const subject = "Welcome to Vital Fusion Coaching 💪 Your app is ready";
  const html = layout(
    `Welcome, ${firstName}!`,
    `<p style="margin:0 0 12px">I'm excited to start working with you. Everything for your coaching lives in the Vital Fusion app: your plan, your workouts, your check-ins and our calls.</p>
     <p style="margin:0">Tap the button below to open it. You'll set things up in a few minutes, and I'll walk you through every step.</p>
     <p style="margin:12px 0 0">– Tyler</p>`,
    "Open my coaching app",
    link,
    "This button signs you in, so please don't forward this email. It works once and expires in 1 hour. If it has expired, open the app and enter your email to get a new one.",
  );
  const text = `Welcome, ${firstName}!\n\nEverything for your coaching lives in the Vital Fusion app. Open it here:\n${link}\n\nThis link signs you in, works once and expires in 1 hour. If it has expired, open the app and enter your email to get a new one.\n\n– Tyler`;
  return { subject, html, text };
}

/** Sign-in email for someone who already has access. */
export function signInEmail(firstName: string, link: string) {
  const subject = "Your Vital Fusion sign-in link";
  const html = layout(
    `Hi ${firstName}, here's your sign-in link`,
    `<p style="margin:0">Tap the button below to sign in to your Vital Fusion coaching app.</p>`,
    "Sign in",
    link,
    "This link works once and expires in 1 hour. If you didn't ask for it, you can ignore this email.",
  );
  const text = `Hi ${firstName},\n\nSign in to your Vital Fusion coaching app here:\n${link}\n\nThis link works once and expires in 1 hour. If you didn't ask for it, you can ignore this email.`;
  return { subject, html, text };
}
