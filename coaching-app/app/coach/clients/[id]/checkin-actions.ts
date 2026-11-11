"use server";

import { pushToClient } from "@/lib/reminders";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { requireCoach } from "@/lib/auth";
import { addEvent, getClient } from "@/lib/clients";
import { firstName } from "@/lib/client-input";
import { appOrigin } from "@/lib/origin";
import { checkinReplyClientEmail, sendEmail } from "@/lib/email";
import { getSubmission, updateSubmission } from "@/lib/forms";
import { rerunReview } from "@/lib/checkins";

export async function sendReplyAction(subId: string, form: FormData): Promise<void> {
  await requireCoach("/coach");
  const sub = await getSubmission(subId);
  if (!sub) redirect("/coach");
  const back = `/coach/clients/${sub.client_id}/check-ins/${sub.id}`;
  const reply = String(form.get("reply") ?? "").trim().slice(0, 5000);
  if (!reply) redirect(`${back}?error=${encodeURIComponent("Write your reply first.")}`);
  const client = await getClient(sub.client_id);
  if (!client) redirect("/coach");
  const first = !sub.replied_at;
  await updateSubmission(sub.id, { coach_reply: reply, replied_at: new Date().toISOString(), reply_seen_at: null });
  await addEvent(client.id, "checkin_replied", { date: sub.due_date });
  const link = `${await appOrigin()}/check-ins/${sub.id}`;
  try {
    const msg = checkinReplyClientEmail(firstName(client.full_name), link);
    await sendEmail({ to: client.email, ...msg });
  } catch (err) {
    console.error("Reply email failed", err);
  }
  if (first) {
    await pushToClient(client.id, { title: "Tyler replied to your check-in 💬", body: "Tap to read it.", url: link, tag: `reply-${sub.id}` }).catch((err) =>
      console.error("Reply push failed", err),
    );
  }
  redirect(`${back}?msg=${first ? "sent" : "updated"}`);
}

export async function rerunReviewAction(subId: string): Promise<void> {
  await requireCoach("/coach");
  const sub = await getSubmission(subId);
  if (!sub) redirect("/coach");
  await updateSubmission(sub.id, { ai_status: "pending", ai_error: null });
  after(() => rerunReview(sub.id));
  redirect(`/coach/clients/${sub.client_id}/check-ins/${sub.id}`);
}
