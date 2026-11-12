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

/** The app's sign-in page, from any link into the app (for "link expired" notes). */
function loginUrl(link: string): string {
  try {
    return `${new URL(link).origin}/login`;
  } catch {
    return "the app";
  }
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
    `The button and code sign you in, so please don't forward this email. They work once and expire in 1 hour. If they've expired, go to ${loginUrl(link)} and enter your email to get new ones.`,
  );
  const text = `Welcome, ${firstName}!\n\nEverything for your coaching lives in the Vital Fusion app. Open it here:\n${link}${codeText(code)}\n\nThe link and code sign you in, work once and expire in 1 hour. If they've expired, go to ${loginUrl(link)} and enter your email to get new ones.\n\n– Tyler`;
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
      `<p style="margin:0 0 12px">Your coaching agreement is signed. A copy is attached for your records, and you can find it any time in the app under ☰ More → Settings.</p>
       <p style="margin:0">Next up: your onboarding questions, so I can build your plan around your life.</p>
       <p style="margin:12px 0 0">– Tyler</p>`,
    ),
    text: `Thanks, ${firstName}!\n\nYour coaching agreement is signed. A copy is attached for your records, and you can find it any time in the app under ☰ More → Settings.\n\nNext up: your onboarding questions.\n\n– Tyler`,
  };
}

/** Notice to the coach when a client signs. Flags any "yes" on the health questions. */
export function agreementCoachEmail(opts: { clientName: string; parqYes: string[]; explanation: string; link: string }) {
  const flagged = opts.parqYes.length > 0;
  const heading = flagged
    ? `${opts.clientName} signed and answered YES on the health questions`
    : `${opts.clientName} signed their coaching agreement`;
  // "[LEGAL]" lets Tyler's Gmail filter file it.
  const subject = `[LEGAL] ${flagged ? "⚠️" : "✅"} ${heading}`;
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
      heading,
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

/** To the client the first time their meal plan or training program is published. */
export function planPublishedClientEmail(firstName: string, part: "nutrition" | "training", link: string) {
  const meals = part === "nutrition";
  const subject = meals ? "Your Vital Fusion nutrition plan is ready 🎉" : "Your Vital Fusion training program is ready 💪";
  const heading = meals ? `${firstName}, your nutrition plan is live!` : `${firstName}, your training program is live!`;
  const body = meals
    ? "Your daily targets and your perfect day are now in the app, under the Nutrition tab, with links to the calorie-tracking app to use. More meals to swap in are under ☰ More → Meal library."
    : "Your workouts are now in the app, under the Training tab, with sets, reps and rest for every exercise.";
  return {
    subject,
    html: card(heading, `<p style="margin:0">${esc(body)}</p><p style="margin:12px 0 0">– Tyler</p>${button(meals ? "Open my nutrition plan" : "Open my training", link)}`),
    text: `${heading}\n\n${body}\n\n${link}\n\n– Tyler`,
  };
}

/** A client's check-in (or other form) for the coach. Subject starts with "[Check-in]" for a Gmail filter. */
export function checkinCoachEmail(opts: {
  clientName: string;
  formTitle: string;
  isCheckin: boolean;
  date: string;
  numbers: string[];
  summary: { summary: string[]; wins: string[]; concerns: string[]; suggestions: { change: string; reason: string }[] } | null;
  answers: { prompt: string; answer: string }[];
  link: string;
}) {
  const subject = opts.isCheckin ? `[Check-in] ${opts.clientName} · ${opts.date}` : `[Form] ${opts.clientName} · ${opts.formTitle}`;
  const list = (title: string, items: string[]) =>
    items.length ? `<p style="margin:14px 0 4px"><b>${esc(title)}</b></p><ul style="margin:0 0 0 18px;padding:0">${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>` : "";
  const s = opts.summary;
  const html = card(
    opts.isCheckin ? `${opts.clientName}'s check-in` : `${opts.clientName} filled in “${opts.formTitle}”`,
    `${list("This week's numbers", opts.numbers)}${
      s
        ? `${list("AI summary", s.summary)}${list("Wins", s.wins)}${list("Watch", s.concerns)}${list(
            "Suggested changes",
            s.suggestions.map((x) => `${x.change} (${x.reason})`),
          )}`
        : ""
    }<p style="margin:14px 0 4px"><b>Their answers</b></p><table style="width:100%;border-collapse:collapse;font-size:14px">${opts.answers
      .map(
        (a) =>
          `<tr><td style="padding:6px 8px 6px 0;color:#9aa3b2;vertical-align:top;width:45%">${esc(a.prompt)}</td><td style="padding:6px 0;vertical-align:top">${esc(a.answer)}</td></tr>`,
      )
      .join("")}</table>${button(s ? "Review & reply (AI draft ready)" : "Review & reply", opts.link)}`,
    "Reply from the app so it shows up in their app. Replying to this email goes to them by email instead.",
  );
  const text = [
    subject,
    "",
    "This week's numbers:",
    ...opts.numbers.map((n) => `- ${n}`),
    ...(s ? ["", "AI summary:", ...s.summary.map((x) => `- ${x}`), ...(s.suggestions.length ? ["", "Suggested changes:", ...s.suggestions.map((x) => `- ${x.change} (${x.reason})`)] : [])] : []),
    "",
    "Their answers:",
    ...opts.answers.map((a) => `- ${a.prompt}: ${a.answer}`),
    "",
    `Review and reply: ${opts.link}`,
  ].join("\n");
  return { subject, html, text };
}

/** To the client when the coach replies to their check-in. */
export function checkinReplyClientEmail(firstName: string, link: string) {
  const subject = "Tyler replied to your check-in 💬";
  return {
    subject,
    html: card(`${firstName}, Tyler replied`, `<p style="margin:0">Your coach has read your check-in and sent you feedback in the app.</p>${button("Read Tyler's reply", link)}`),
    text: `${firstName}, Tyler replied to your check-in.\n\nRead it in the app: ${link}`,
  };
}

/** To the client when Tyler sends their monthly progress report. */
export function progressReportClientEmail(firstName: string, headline: string, link: string) {
  const subject = "Your monthly progress report is ready 📊";
  return {
    subject,
    html: card(`${firstName}, here's your month`, `${headline ? `<p style="margin:0 0 10px;font-size:18px;font-weight:700;color:#f4f5f7">${esc(headline)}</p>` : ""}<p style="margin:0">Tyler put together your progress report: your numbers, your wins, and what to focus on next.</p>${button("See your report", link)}`),
    text: `${firstName}, your monthly progress report is ready.${headline ? `\n\n${headline}` : ""}\n\nSee it in the app: ${link}`,
  };
}

/** Reminder when push notifications aren't set up: today's plan (morning) or what's still open (evening). */
export function reminderEmail(firstName: string, kind: "morning" | "evening", lines: string[], link: string) {
  const subject = kind === "morning" ? "Your plan for today" : "Still to do today";
  const intro = kind === "morning" ? `Here's what's on your calendar today, ${firstName}:` : `${firstName}, a few things are still open today:`;
  const list = lines.map((l) => `<li style="margin:0 0 6px">${esc(l)}</li>`).join("");
  return {
    subject,
    html: card(subject, `<p style="margin:0 0 10px">${esc(intro)}</p><ul style="margin:0;padding-left:20px">${list}</ul>${button("Open the app", link)}<p style="margin:16px 0 0;color:#8d939e;font-size:13px">Turn on notifications in the app's Settings to get these on your phone instead. You can turn reminders off there too.</p>`),
    text: `${intro}\n${lines.map((l) => `- ${l}`).join("\n")}\n\nOpen the app: ${link}\n\nTurn on notifications in the app's Settings to get these on your phone instead, or turn reminders off there.`,
  };
}
