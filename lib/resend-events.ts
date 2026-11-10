// Sends an event to Resend Automations (https://resend.com/docs/api-reference/events/send-event).
// "macro_quiz.completed" starts the follow-up email sequence; "coaching.applied"
// stops it early. The sequence itself (emails, delays, on/off) lives in Resend.

export async function sendResendEvent(event: string, email: string, payload?: Record<string, string>): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key || process.env.EMAIL_SEQUENCE === "off") return;
  const res = await fetch("https://api.resend.com/events/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ event, email, ...(payload ? { payload } : {}) }),
  });
  if (!res.ok) throw new Error(`Resend event error ${res.status}: ${await res.text()}`);
}
