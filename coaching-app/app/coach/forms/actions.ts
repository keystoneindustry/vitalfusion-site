"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireCoach } from "@/lib/auth";
import { getForm, insertForm, sanitizeQuestions, updateForm } from "@/lib/forms";

export type FormSaveResult = { ok: true } | { ok: false; error: string };

export async function createFormAction(form: FormData): Promise<void> {
  await requireCoach("/coach/forms");
  const title = String(form.get("title") ?? "").trim().slice(0, 100);
  if (!title) redirect("/coach/forms?error=" + encodeURIComponent("Give the form a name."));
  const created = await insertForm({
    title,
    intro: null,
    questions: [{ id: "q1", type: "longtext", prompt: "Your first question", required: true }],
  });
  redirect(`/coach/forms/${created.id}?msg=created`);
}

export async function saveFormAction(id: string, payload: string): Promise<FormSaveResult> {
  await requireCoach("/coach/forms");
  const existing = await getForm(id);
  if (!existing) return { ok: false, error: "That form doesn't exist anymore." };
  let d: Record<string, unknown>;
  try {
    d = JSON.parse(payload) as Record<string, unknown>;
  } catch {
    return { ok: false, error: "Something went wrong. Try again." };
  }
  const title = typeof d.title === "string" ? d.title.trim().slice(0, 100) : "";
  if (!title) return { ok: false, error: "The form needs a name." };
  const checked = sanitizeQuestions(d.questions);
  if (!checked.ok) return checked;
  await updateForm(id, { title, intro: typeof d.intro === "string" ? d.intro.trim().slice(0, 500) || null : null, questions: checked.questions });
  revalidatePath("/coach/forms");
  return { ok: true };
}

export async function archiveFormAction(id: string, archived: boolean): Promise<void> {
  await requireCoach("/coach/forms");
  const f = await getForm(id);
  if (f && f.kind !== "checkin") await updateForm(id, { archived });
  redirect(`/coach/forms?msg=${archived ? "archived" : "restored"}`);
}
