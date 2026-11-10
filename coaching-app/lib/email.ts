import { env } from "./env";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type Attachment = { filename: string; content: Uint8Array };

export async function sendEmail(msg: {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: Attachment[];
  replyTo?: string;
}): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.resendApiKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env.fromEmail(),
      to: [msg.to],
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
      ...(msg.replyTo || env.replyTo() ? { reply_to: msg.replyTo || env.replyTo() } : {}),
      ...(msg.attachments?.length
        ? {
            attachments: msg.attachments.map((a) => ({
              filename: a.filename,
              content: Buffer.from(a.content).toString("base64"),
            })),
          }
        : {}),
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

/** Plain card email without a button (notices to the coach and receipts). */
function card(heading: string, bodyHtml: string, footnote = ""): string {
  return `<!doctype html><html><body style="margin:0;background:#0b0d12;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:28px 16px">
  <div style="background:#15171d;border:1px solid #2a2d35;border-radius:18px;padding:28px 22px;color:#f4f5f7">
    <p style="margin:0 0 6px;color:#6a9fc6;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;font-size:12px">Vital Fusion Coaching</p>
    <h1 style="margin:0 0 14px;font-size:22px;line-height:1.25">${esc(heading)}</h1>
    <div style="color:#d4d7dd;font-size:15px;line-height:1.6">${bodyHtml}</div>
    ${footnote ? `<p style="margin:18px 0 0;color:#8d939e;font-size:13px;line-height:1.5">${esc(footnote)}</p>` : ""}
  </div>
  <p style="margin:16px 0 0;text-align:center;color:#8d939e;font-size:12px">Vital Fusion Coaching LLC · 1802 Charolais Court, Bel Air, MD 21015</p>
</div></body></html>`;
}

function button(label: string, link: string): string {
  return `<p style="margin:22px 0 4px"><a href="${esc(link)}" style="display:inline-block;background:#6a9fc6;color:#ffffff;font-weight:700;font-size:16px;text-decoration:none;border-radius:12px;padding:13px 24px">${esc(label)}</a></p>`;
}

/** Receipt to the client with their signed agreement attached. */
export function agreementClientEmail(firstName: string) {
  return {
    subject: "Your signed Vital Fusion coaching agreement",
    html: card(
      `Thanks, ${firstName}!`,
      `<p style="margin:0 0 12px">Your coaching agreement is signed. A copy is attached for your records, and you can find it any time in the app under Progress.</p>
       <p style="margin:0">Next up: your onboarding questions, so I can build your plan around your life.</p>
       <p style="margin:12px 0 0">– Tyler</p>`,
    ),
    text: `Thanks, ${firstName}!\n\nYour coaching agreement is signed. A copy is attached for your records, and you can find it any time in the app under Progress.\n\nNext up: your onboarding questions.\n\n– Tyler`,
  };
}

/** Notice to the coach when a client signs. Flags any "yes" on the health questions. */
export function agreementCoachEmail(opts: { clientName: string; parqYes: string[]; explanation: string; link: string }) {
  const flagged = opts.parqYes.length > 0;
  const subject = flagged
    ? `⚠️ ${opts.clientName} signed and answered YES on the health questions`
    : `✅ ${opts.clientName} signed their coaching agreement`;
  const flagHtml = flagged
    ? `<div style="margin:0 0 14px;padding:12px 14px;border:1px solid #5a4a26;border-radius:12px;background:#211b0e;color:#ffe2a8">
         <b>Answered YES to:</b><ul style="margin:6px 0 6px 18px;padding:0">${opts.parqYes.map((q) => `<li>${esc(q)}</li>`).join("")}</ul>
         <b>Their explanation:</b> ${esc(opts.explanation || "—")}
         <p style="margin:8px 0 0">Their plan is on hold until you review this. Decide whether you need a doctor's clearance.</p>
       </div>`
    : "";
  return {
    subject,
    html: card(
      subject.replace(/^(⚠️|✅) /, ""),
      `${flagHtml}<p style="margin:0">The signed agreement is attached and saved on their profile.</p>${button("Open their profile", opts.link)}`,
    ),
    text: `${subject}\n\n${
      flagged ? `Answered YES to:\n- ${opts.parqYes.join("\n- ")}\nExplanation: ${opts.explanation || "-"}\nTheir plan is on hold until you review this.\n\n` : ""
    }The signed agreement is attached and saved on their profile:\n${opts.link}`,
  };
}

/** Notice to the coach with the client's onboarding answers. */
export function onboardingAnswersCoachEmail(opts: {
  clientName: string;
  link: string;
  groups: { section: string; items: { prompt: string; answer: string }[] }[];
}) {
  const subject = `📝 ${opts.clientName} finished their onboarding questions`;
  const html = card(
    `${opts.clientName} finished their onboarding questions`,
    `${opts.groups
      .map(
        (g) => `<h2 style="margin:18px 0 6px;font-size:15px;color:#6a9fc6;text-transform:uppercase;letter-spacing:0.06em">${esc(g.section)}</h2>
        ${g.items
          .map(
            (i) => `<p style="margin:0 0 8px"><span style="color:#8d939e">${esc(i.prompt)}</span><br>${esc(i.answer).replace(/\n/g, "<br>")}</p>`,
          )
          .join("")}`,
      )
      .join("")}${button("Open their profile", opts.link)}`,
  );
  const text = `${opts.clientName} finished their onboarding questions\n\n${opts.groups
    .map((g) => `${g.section.toUpperCase()}\n${g.items.map((i) => `${i.prompt}\n${i.answer}`).join("\n\n")}`)
    .join("\n\n")}\n\n${opts.link}`;
  return { subject, html, text };
}

/** Notice to the coach when a kickoff call is booked. */
export function kickoffBookedCoachEmail(opts: { clientName: string; when: string; link: string }) {
  const subject = `📅 ${opts.clientName} booked their kickoff call: ${opts.when}`;
  return {
    subject,
    html: card(
      `${opts.clientName} booked their kickoff call`,
      `<p style="margin:0">${esc(opts.when)}. They'll photograph their meals until then, and their plan draft will be ready before the call.</p>${button("Open their profile", opts.link)}`,
    ),
    text: `${opts.clientName} booked their kickoff call: ${opts.when}\n\n${opts.link}`,
  };
}

/** Notice to the coach when the AI has drafted a plan. */
export function planDraftCoachEmail(opts: { clientName: string; kickoff: string | null; targets: string; link: string; notes: string[] }) {
  const subject = `🧠 Plan draft ready for ${opts.clientName}${opts.kickoff ? ` (kickoff ${opts.kickoff})` : ""}`;
  const notes = opts.notes.length
    ? `<p style="margin:14px 0 6px"><b>Double-check before publishing:</b></p><ul style="margin:0 0 0 18px;padding:0">${opts.notes
        .map((n) => `<li>${esc(n)}</li>`)
        .join("")}</ul>`
    : "";
  return {
    subject,
    html: card(
      `${opts.clientName}'s plan draft is ready`,
      `<p style="margin:0">The AI drafted their nutrition plan and training program from their onboarding answers and food log.${
        opts.kickoff ? ` Their kickoff call is ${esc(opts.kickoff)}.` : ""
      }</p><p style="margin:12px 0 0"><b>Targets:</b> ${esc(opts.targets)}</p>${notes}${button("Review the draft", opts.link)}`,
      "Nothing goes to the client until you publish it.",
    ),
    text: `${subject}\n\nTargets: ${opts.targets}\n${opts.notes.length ? `\nDouble-check:\n- ${opts.notes.join("\n- ")}\n` : ""}\nReview it: ${opts.link}\n\nNothing goes to the client until you publish it.`,
  };
}

/** To the client when their plan is published. */
export function planPublishedClientEmail(firstName: string, link: string) {
  const subject = "Your Vital Fusion plan is ready 🎉";
  return {
    subject,
    html: card(
      `${firstName}, your plan is live!`,
      `<p style="margin:0 0 12px">Your daily targets, your meal plan and your training program are now in the app.</p>
       <p style="margin:0">Start with the Today tab: it shows your numbers for the day. Your meals are under Nutrition and your workouts under Training.</p>
       <p style="margin:12px 0 0">– Tyler</p>${button("Open my plan", link)}`,
    ),
    text: `${firstName}, your plan is live!\n\nYour daily targets, meal plan and training program are now in the app. Start with the Today tab; your meals are under Nutrition and your workouts under Training.\n\n${link}\n\n– Tyler`,
  };
}
