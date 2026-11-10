"use server";

import { revalidatePath } from "next/cache";
import { requireClient } from "@/lib/auth";
import { deleteMeal, getMeal, MEAL_PHOTO_BUCKET } from "@/lib/meals";
import { deleteFile } from "@/lib/storage";

/** A client removes one of their own meals (and its photo). */
export async function deleteMealAction(form: FormData): Promise<void> {
  const { client } = await requireClient("/food");
  const meal = await getMeal(String(form.get("id") || ""));
  if (!meal || meal.client_id !== client.id) return;
  await deleteMeal(meal.id);
  if (meal.photo_path) await deleteFile(MEAL_PHOTO_BUCKET, meal.photo_path).catch((e) => console.error("Photo delete failed", e));
  revalidatePath("/food");
  revalidatePath("/");
}
