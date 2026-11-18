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

// Everyone who finishes the Nutrition Plan Calculator goes in this Resend segment, so Tyler can send
// them a Broadcast by hand. Separate from the follow-up sequence: it never touches the automation.
export const CALCULATOR_SEGMENT_ID = process.env.RESEND_CALCULATOR_SEGMENT_ID || "033e0913-801d-4646-93d9-a4763c1b7cc3";

export async function addToCalculatorSegment(email: string, firstName: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  // Live site only, so preview tests don't fill the list with test addresses.
  if (!key || process.env.VERCEL_ENV !== "production") return;
  const headers = { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  const addUrl = `https://api.resend.com/contacts/${encodeURIComponent(email)}/segments/${CALCULATOR_SEGMENT_ID}`;
  const add = () => fetch(addUrl, { method: "POST", headers });

  let res = await add();
  if (res.ok) return;
  if (res.status === 404) {
    // New person: create the contact already in the segment. (Never sets "unsubscribed", so an existing
    // unsubscribe is never undone.)
    const created = await fetch("https://api.resend.com/contacts", {
      method: "POST",
      headers,
      body: JSON.stringify({ email, ...(firstName ? { first_name: firstName } : {}), segments: [{ id: CALCULATOR_SEGMENT_ID }] }),
    });
    if (created.ok) return;
    // The sequence event may have created the contact a moment ago: try adding once more.
    res = await add();
    if (res.ok) return;
  }
  throw new Error(`Resend segment error ${res.status}: ${await res.text()}`);
}
