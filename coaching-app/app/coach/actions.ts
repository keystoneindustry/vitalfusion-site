"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireCoach } from "@/lib/auth";
import { addEvent, createClient, getClient, getClientByEmail, updateClient, type ClientRow } from "@/lib/clients";
import { firstName, isStage, parseClientForm, stageLabel, type FieldErrors } from "@/lib/client-input";
import { appOrigin } from "@/lib/origin";
import { emailSignInLink } from "@/lib/signin";

export type ClientFormState = { error?: string; fieldErrors?: FieldErrors; saved?: boolean };

/** Emails the welcome/invite link and records what happened. Returns an error message on failure. */
async function sendInvite(client: ClientRow): Promise<string | null> {
  try {
    const { userId } = await emailSignInLink({
      email: client.email,
      firstName: firstName(client.full_name),
      origin: await appOrigin(),
      welcome: true,
    });
    await updateClient(client.id, {
      invited_at: new Date().toISOString(),
      ...(client.user_id ? {} : { user_id: userId }),
    });
    await addEvent(client.id, "invite_sent");
    return null;
  } catch (err) {
    console.error("Invite failed", err);
    const reason = err instanceof Error ? err.message.slice(0, 200) : "unknown error";
    await addEvent(client.id, "invite_failed", { reason }).catch(() => undefined);
    return reason;
  }
}

export async function addClientAction(_prev: ClientFormState, form: FormData): Promise<ClientFormState> {
  await requireCoach("/coach/clients/new");
  const { input, errors } = parseClientForm(form);
  if (!input) return { fieldErrors: errors, error: "Please fix the highlighted fields." };

  const existing = await getClientByEmail(input.email);
  if (existing) return { fieldErrors: { email: `${existing.full_name} already uses this email.` } };

  let client: ClientRow;
  try {
    client = await createClient(input);
    await addEvent(client.id, "created", { weeks: input.coachingWeeks, start: input.startDate, end: input.endDate });
  } catch (err) {
    console.error("Create client failed", err);
    return { error: "Couldn't save the client. Please try again." };
  }

  const sendNow = form.get("sendInvite") === "on";
  let query = "";
  if (sendNow) query = (await sendInvite(client)) ? "?invite=failed" : "?invite=sent";

  revalidatePath("/coach");
  redirect(`/coach/clients/${client.id}${query}`);
}

export async function updateClientAction(id: string, _prev: ClientFormState, form: FormData): Promise<ClientFormState> {
  await requireCoach(`/coach/clients/${id}`);
  const client = await getClient(id);
  if (!client) return { error: "This client no longer exists." };

  const { input, errors } = parseClientForm(form);
  if (!input) return { fieldErrors: errors, error: "Please fix the highlighted fields." };

  if (input.email !== client.email) {
    const other = await getClientByEmail(input.email);
    if (other && other.id !== client.id) return { fieldErrors: { email: `${other.full_name} already uses this email.` } };
    if (client.user_id) {
      return {
        fieldErrors: { email: "This client has already signed in, so their email can't be changed here yet." },
      };
    }
  }

  const stageRaw = String(form.get("stage") || client.stage);
  const stage = isStage(stageRaw) ? stageRaw : client.stage;

  try {
    await updateClient(client.id, {
      full_name: input.fullName,
      email: input.email,
      phone: input.phone,
      coaching_weeks: input.coachingWeeks,
      start_date: input.startDate,
      end_date: input.endDate,
      notes: input.notes,
      stage,
    });
  } catch (err) {
    console.error("Update client failed", err);
    return { error: "Couldn't save the changes. Please try again." };
  }

  if (stage !== client.stage) {
    await addEvent(client.id, "stage_changed", { from: stageLabel(client.stage), to: stageLabel(stage) });
  }
  if (
    input.coachingWeeks !== client.coaching_weeks ||
    input.startDate !== client.start_date ||
    input.endDate !== client.end_date
  ) {
    await addEvent(client.id, "package_changed", { weeks: input.coachingWeeks, start: input.startDate, end: input.endDate });
  } else if (
    input.fullName !== client.full_name ||
    input.email !== client.email ||
    input.phone !== client.phone ||
    input.notes !== client.notes
  ) {
    await addEvent(client.id, "details_updated");
  }

  revalidatePath("/coach");
  revalidatePath(`/coach/clients/${client.id}`, "layout");
  return { saved: true };
}

export async function resendInviteAction(id: string): Promise<void> {
  await requireCoach(`/coach/clients/${id}`);
  const client = await getClient(id);
  if (!client) redirect("/coach");
  const failed = await sendInvite(client);
  revalidatePath(`/coach/clients/${id}`);
  redirect(`/coach/clients/${id}?invite=${failed ? "failed" : "sent"}`);
}
