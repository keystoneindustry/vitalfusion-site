"use server";

import { revalidatePath } from "next/cache";
import { requireCoach } from "@/lib/auth";
import { firstName, parseClientForm, type FieldErrors } from "@/lib/client-input";
import { legalRequestEmail, sendEmail } from "@/lib/email";
import { env } from "@/lib/env";
import { deleteLegalRequest, getLegalRequest, insertLegalRequest, updateLegalRequest, type LegalRequest } from "@/lib/legal";
import { appOrigin } from "@/lib/origin";
import { deleteFile } from "@/lib/storage";

export type LegalFormState = { error?: string; fieldErrors?: FieldErrors; sentTo?: string };
export type Result = { ok: true; message: string } | { ok: false; error: string };

async function sendLink(r: LegalRequest): Promise<void> {
  const origin = await appOrigin();
  await sendEmail({ to: r.email, replyTo: env.coachEmails()[0], ...legalRequestEmail(firstName(r.full_name), `${origin}/sign/${r.token}`) });
}

/** Creates the agreement request and emails the signing link. */
export async function sendLegalAction(_prev: LegalFormState, form: FormData): Promise<LegalFormState> {
  await requireCoach("/coach/legal");
  const { input, errors } = parseClientForm(form);
  if (!input) return { fieldErrors: errors, error: "Please fix the highlighted fields." };
  const row = await insertLegalRequest({
    full_name: input.fullName,
    email: input.email,
    phone: input.phone,
    billing: input.billing,
    coaching_weeks: input.coachingWeeks,
    start_date: input.startDate,
    end_date: input.billing === "monthly" ? null : input.endDate,
    include_parq: form.get("skipParq") !== "on",
  });
  try {
    await sendLink(row);
  } catch (err) {
    console.error("Legal email failed", err);
    revalidatePath("/coach/legal");
    return { error: `Saved, but the email to ${input.email} didn't send. Use “Resend” in the list below.` };
  }
  revalidatePath("/coach/legal");
  return { sentTo: input.email };
}

export async function resendLegalAction(id: string): Promise<Result> {
  await requireCoach("/coach/legal");
  const r = await getLegalRequest(id);
  if (!r) return { ok: false, error: "That agreement is gone." };
  if (r.status === "signed") return { ok: false, error: "They already signed." };
  try {
    await sendLink(r);
    await updateLegalRequest(r.id, { last_sent_at: new Date().toISOString() });
  } catch (err) {
    console.error("Legal resend failed", err);
    return { ok: false, error: "The email didn't send. Try again." };
  }
  revalidatePath("/coach/legal");
  return { ok: true, message: `Sent again to ${r.email}` };
}

/** Cancels an unsigned request (the link stops working) or deletes a signed one with its PDF. */
export async function deleteLegalAction(id: string): Promise<Result> {
  await requireCoach("/coach/legal");
  const r = await getLegalRequest(id);
  if (!r) return { ok: true, message: "Removed" };
  if (r.pdf_path) await deleteFile("agreements", r.pdf_path).catch(() => undefined);
  await deleteLegalRequest(r.id);
  revalidatePath("/coach/legal");
  return { ok: true, message: "Removed" };
}
