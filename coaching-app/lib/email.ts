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

function codeBlock(code: string | null): string {
  if (!code) return "";
  return `<div style="margin:22px 0 0;padding:16px;border:1px solid #2c3a52;border-radius:14px;background:#121a28;text-align:center">
      <p style="margin:0 0 6px;color:#a9c6e4;font-size:14px">Using the app from your home screen? Type this code instead:</p>
      <p style="margin:0;font-size:32px;font-weight:800;letter-spacing:0.25em;color:#ffffff;font-family:SFMono-Regular,Menlo,Consolas,monospace">${esc(code)}</p>
    </div>`;
}

function layout(
  heading: string,
  bodyHtml: string,
  buttonLabel: string,
  link: string,
  code: string | null,
  footnote: string,
): string {
  return `<!doctype html><html><body style="margin:0;background:#0b0d12;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
<div style="max-width:520px;margin:0 auto;padding:28px 16px">
  <div style="background:#15171d;border:1px solid #2a2d35;border-radius:18px;padding:32px 24px;color:#f4f5f7">
    <p style="margin:0 0 6px;color:#6a9fc6;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;font-size:12px">Vital Fusion Coaching</p>
    <h1 style="margin:0 0 16px;font-size:26px;line-height:1.2">${esc(heading)}</h1>
    <div style="color:#d4d7dd;font-size:16px;line-height:1.6">${bodyHtml}</div>
    <p style="margin:28px 0 8px;text-align:center">
      <a href="${esc(link)}" style="display:inline-block;background:#6a9fc6;color:#ffffff;font-weight:700;font-size:18px;text-decoration:none;border-radius:14px;padding:16px 32px">${esc(buttonLabel)}</a>
    </p>
    ${codeBlock(code)}
    <p style="margin:18px 0 0;color:#8d939e;font-size:13px;line-height:1.5">${esc(footnote)}</p>
  </div>
  <p style="margin:16px 0 0;text-align:center;color:#8d939e;font-size:12px">Vital Fusion Coaching LLC · 1802 Charolais Court, Bel Air, MD 21015</p>
</div></body></html>`;
}

function codeText(code: string | null): string {
  return code ? `\n\nUsing the app from your home screen? Type this code instead: ${code}` : "";
}

/** First email a new client gets when the coach adds them. */
export function inviteEmail(firstName: string, link: string, code: string | null = null) {
  const subject = "Welcome to Vital Fusion Coaching 💪 Your app is ready";
  const html = layout(
    `Welcome, ${firstName}!`,
    `<p style="margin:0 0 12px">I'm excited to start working with you. Everything for your coaching lives in the Vital Fusion app: your plan, your workouts, your check-ins and our calls.</p>
     <p style="margin:0">Tap the button below to open it. You'll set things up in a few minutes, and I'll walk you through every step.</p>
     <p style="margin:12px 0 0">– Tyler</p>`,
    "Open my coaching app",
    link,
    code,
    "The button and code sign you in, so please don't forward this email. They work once and expire in 1 hour. If they've expired, open the app and enter your email to get new ones.",
  );
  const text = `Welcome, ${firstName}!\n\nEverything for your coaching lives in the Vital Fusion app. Open it here:\n${link}${codeText(code)}\n\nThe link and code sign you in, work once and expire in 1 hour. If they've expired, open the app and enter your email to get new ones.\n\n– Tyler`;
  return { subject, html, text };
}

/** Sign-in email for someone who already has access. */
export function signInEmail(firstName: string, link: string, code: string | null = null) {
  const subject = code ? `Your Vital Fusion sign-in code: ${code}` : "Your Vital Fusion sign-in link";
  const html = layout(
    `Hi ${firstName}, here's how to sign in`,
    `<p style="margin:0">Tap the button below to sign in to your Vital Fusion coaching app${code ? ", or type the code into the app" : ""}.</p>`,
    "Sign in",
    link,
    code,
    "The link and code work once and expire in 1 hour. If you didn't ask for them, you can ignore this email.",
  );
  const text = `Hi ${firstName},\n\nSign in to your Vital Fusion coaching app here:\n${link}${codeText(code)}\n\nThe link and code work once and expire in 1 hour. If you didn't ask for them, you can ignore this email.`;
  return { subject, html, text };
}
