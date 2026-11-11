/**
 * Permanently removes a client: their photos and files, their sign-in account, and every row about them
 * (the database deletes the rest through ON DELETE CASCADE). Used from the coach's Details tab.
 */

import { authAdminDeleteUser, db, q } from "./supabase";
import { deleteFiles } from "./storage";
import { MEAL_PHOTO_BUCKET } from "./meals";
import { PHOTO_BUCKET } from "./progress";
import type { ClientRow } from "./clients";

export async function deleteClientCompletely(client: ClientRow): Promise<void> {
  const id = q(client.id);
  const [meals, photos, agreements] = await Promise.all([
    db<{ photo_path: string | null }[]>(`meal_logs?select=photo_path&client_id=eq.${id}`),
    db<{ path: string }[]>(`progress_photos?select=path&client_id=eq.${id}`),
    db<{ pdf_path: string | null }[]>(`agreements?select=pdf_path&client_id=eq.${id}`),
  ]);
  await deleteFiles(MEAL_PHOTO_BUCKET, meals.map((m) => m.photo_path ?? ""));
  await deleteFiles(PHOTO_BUCKET, photos.map((p) => p.path));
  await deleteFiles("agreements", agreements.map((a) => a.pdf_path ?? ""));
  await db(`clients?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" });
  if (client.user_id) await authAdminDeleteUser(client.user_id);
  else {
    // Signed in but never linked? Remove the account that matches their email too.
    const prof = await db<{ id: string }[]>(`profiles?select=id&email=eq.${q(client.email.toLowerCase())}&role=eq.client`);
    for (const p of prof) await authAdminDeleteUser(p.id);
  }
}
