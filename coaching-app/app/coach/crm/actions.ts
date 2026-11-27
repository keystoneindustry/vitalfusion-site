"use server";

import { revalidatePath } from "next/cache";
import { requireCoach } from "@/lib/auth";
import { addManualLead, deleteManualLead, saveLead } from "@/lib/crm";
import { isStatus } from "@/lib/crm-logic";
import { isIsoDate } from "@/lib/dates";

export type Result = { ok: true } | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function fresh() {
  revalidatePath("/coach/crm");
  revalidatePath("/coach");
  revalidatePath("/coach/business");
}

/** Saves status, notes and follow-up date for one lead. `contacted: true` also stamps "reached out today". */
export async function saveLeadAction(input: { email: string | null; id: string | null; status: string; notes: string; followUpOn: string; contacted?: boolean }): Promise<Result> {
  await requireCoach("/coach/crm");
  if (!isStatus(input.status)) return { ok: false, error: "Pick a status." };
  if (input.followUpOn && !isIsoDate(input.followUpOn)) return { ok: false, error: "That follow-up date isn't valid." };
  const email = input.email && EMAIL_RE.test(input.email) ? input.email : null;
  const id = input.id && /^[0-9a-f-]{36}$/i.test(input.id) ? input.id : null;
  if (!email && !id) return { ok: false, error: "Couldn't find that lead." };
  let status = input.status;
  if (input.contacted && status === "new") status = "contacted";
  try {
    await saveLead(
      // Prefer the email so the row is created the first time; hand-added leads without one save by id.
      email ? { email } : { id },
      {
        status,
        notes: input.notes.trim().slice(0, 4000) || null,
        follow_up_on: input.followUpOn || null,
        ...(input.contacted ? { last_contacted_at: new Date().toISOString() } : {}),
      },
    );
  } catch (err) {
    console.error("CRM save failed", err);
    return { ok: false, error: "Couldn't save. Try again." };
  }
  fresh();
  return { ok: true };
}

export async function addLeadAction(_prev: { error?: string; added?: string }, form: FormData): Promise<{ error?: string; added?: string }> {
  await requireCoach("/coach/crm");
  const get = (k: string, max: number) => String(form.get(k) ?? "").trim().slice(0, max);
  const name = get("name", 120);
  const email = get("email", 200).toLowerCase();
  const instagram = get("instagram", 80);
  if (!name) return { error: "Enter their name." };
  if (email && !EMAIL_RE.test(email)) return { error: "That email doesn't look right." };
  try {
    await addManualLead({ name, email: email || null, phone: get("phone", 40) || null, instagram: instagram || null, source: get("source", 60) || "Added by hand", notes: get("notes", 4000) || null });
  } catch (err) {
    console.error("CRM add failed", err);
    return { error: "Couldn't add them. Try again." };
  }
  fresh();
  return { added: name };
}

export async function deleteLeadAction(id: string): Promise<Result> {
  await requireCoach("/coach/crm");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, error: "Couldn't find that lead." };
  await deleteManualLead(id);
  fresh();
  return { ok: true };
}
