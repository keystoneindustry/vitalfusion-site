"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { requireClient } from "@/lib/auth";
import { addDays, isIsoDate, todayIn } from "@/lib/dates";
import { scheduleDueOn } from "@/lib/calendar";
import { listSchedules } from "@/lib/progress";
import { addEvent } from "@/lib/clients";
import { aiConfigured } from "@/lib/ai";
import { appOrigin } from "@/lib/origin";
import { checkAnswers, findSubmission, getForm, insertSubmission } from "@/lib/forms";
import { processSubmission } from "@/lib/checkins";

/** How many days late a form can still be filled in. */
const LATE_DAYS = 3;

export type SubmitResult = { ok: true; id: string } | { ok: false; error: string; id?: string };

export async function submitFormAction(formId: string, date: string, payload: string): Promise<SubmitResult> {
  const { client } = await requireClient("/check-ins");
  const form = await getForm(formId);
  const today = todayIn(client.timezone);
  if (!form || !isIsoDate(date) || date > today || date < addDays(today, -LATE_DAYS)) return { ok: false, error: "This form isn't open right now." };
  const schedules = await listSchedules(client.id);
  if (!schedules.some((s) => s.kind === "form" && s.form_id === form.id && scheduleDueOn(s, date))) return { ok: false, error: "This form isn't on your calendar for that day." };
  const existing = await findSubmission(client.id, form.id, date);
  if (existing?.replied_at) return { ok: false, error: "Tyler already replied to this one, so it can't be changed." };
  let raw: Record<string, unknown> = {};
  try {
    raw = JSON.parse(payload) as Record<string, unknown>;
  } catch {}
  const checked = checkAnswers(form.questions, raw);
  if (!checked.ok) return checked;
  const sub = await insertSubmission({
    client_id: client.id,
    form_id: form.id,
    due_date: date,
    answers: checked.answers,
    questions: form.questions,
    ai_status: form.kind === "checkin" && aiConfigured() ? "pending" : "none",
  });
  await addEvent(client.id, form.kind === "checkin" ? "checkin_submitted" : "form_submitted", { form: form.title, date });
  const origin = await appOrigin();
  after(() => processSubmission(sub.id, origin));
  revalidatePath("/");
  revalidatePath("/calendar");
  revalidatePath("/check-ins");
  return { ok: true, id: sub.id };
}
