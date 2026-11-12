"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireClient } from "@/lib/auth";
import { markMilestonesSeen } from "@/lib/wins";
import { addEvent, updateClient } from "@/lib/clients";

export async function markWinsSeenAction(): Promise<void> {
  const { client } = await requireClient("/");
  await markMilestonesSeen(client.id);
  revalidatePath("/");
}

export type WhyState = { error?: string };

export async function saveWhyAction(_prev: WhyState, form: FormData): Promise<WhyState> {
  const { client } = await requireClient("/why");
  const why = String(form.get("why") ?? "").trim().replace(/\s+\n/g, "\n").slice(0, 600);
  if (why.length < 3) return { error: "Write a few words about why this matters to you." };
  await updateClient(client.id, { why });
  if (why !== (client.why ?? "")) await addEvent(client.id, "why_updated");
  revalidatePath("/");
  redirect("/");
}
