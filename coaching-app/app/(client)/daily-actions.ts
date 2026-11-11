"use server";

import { revalidatePath } from "next/cache";
import { requireClient } from "@/lib/auth";
import { addDays, isIsoDate, todayIn } from "@/lib/dates";
import { getClientHabit, setCheck } from "@/lib/habits";
import { parseWeight, saveWeighIn } from "@/lib/progress";
import { updateClient } from "@/lib/clients";

/** Dates a client may log for: today and the past week. */
function allowedDate(date: string, today: string): boolean {
  return isIsoDate(date) && date <= today && date >= addDays(today, -7);
}

export async function toggleHabitAction(assignmentId: string, date: string, done: boolean): Promise<{ ok: boolean }> {
  const { client } = await requireClient("/");
  const a = await getClientHabit(assignmentId);
  if (!a || a.client_id !== client.id || !allowedDate(date, todayIn(client.timezone))) return { ok: false };
  await setCheck(a.id, client.id, date, done);
  revalidatePath("/calendar");
  return { ok: true };
}

export type WeighInState = { ok?: boolean; error?: string };

export async function saveWeighInAction(_prev: WeighInState, form: FormData): Promise<WeighInState> {
  const { client } = await requireClient("/progress");
  const today = todayIn(client.timezone);
  const date = String(form.get("date") || today);
  if (!allowedDate(date, today)) return { error: "Pick today or a day in the past week." };
  const weight = parseWeight(form.get("weight"));
  if (weight === null) return { error: "Enter your weight in pounds, e.g. 182.4" };
  const note = String(form.get("note") ?? "").trim().slice(0, 300) || null;
  await saveWeighIn(client.id, date, weight, note);
  revalidatePath("/");
  revalidatePath("/progress");
  revalidatePath("/calendar");
  return { ok: true };
}

/** The live app tour was finished or skipped; don't show it again. */
export async function markTourSeenAction(): Promise<void> {
  const { client } = await requireClient("/");
  if (!client.tour_seen_at) await updateClient(client.id, { tour_seen_at: new Date().toISOString() });
}
