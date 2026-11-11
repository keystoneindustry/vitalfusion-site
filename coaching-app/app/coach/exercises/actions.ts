"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireCoach } from "@/lib/auth";
import { env } from "@/lib/env";
import { deleteFile, signedUploadUrl } from "@/lib/storage";
import { videoEmbedUrl } from "@/lib/settings";
import { checkUpload, RESOURCE_BUCKET, resourcePath } from "@/lib/resources";
import { deleteExercise, getExercise, insertExercise, listExercises, updateExercise } from "@/lib/exercises";

export type StartUpload = { ok: true; path: string; uploadUrl: string; apikey: string } | { ok: false; error: string };
export type Result = { ok: true } | { ok: false; error: string };

/** One-time link so the browser can send a demo video straight to storage. */
export async function startExerciseUploadAction(fileName: string, contentType: string, size: number): Promise<StartUpload> {
  await requireCoach("/coach/exercises");
  const check = checkUpload(contentType, size);
  if (!check.ok) return check;
  if (check.kind !== "video_file") return { ok: false, error: "Pick a video file (MP4 or MOV)." };
  const path = `exercises/${resourcePath(fileName, check.ext)}`;
  try {
    return { ok: true, path, uploadUrl: await signedUploadUrl(RESOURCE_BUCKET, path), apikey: env.supabasePublishableKey() };
  } catch (err) {
    console.error("Upload link failed", err);
    return { ok: false, error: "Couldn't start the upload. Try again." };
  }
}

/** Adds an exercise, or saves changes to one (id given). */
export async function saveExerciseAction(payload: string): Promise<Result> {
  await requireCoach("/coach/exercises");
  let o: Record<string, unknown> = {};
  try {
    o = JSON.parse(payload) as Record<string, unknown>;
  } catch {}
  const str = (k: string, max: number) => (typeof o[k] === "string" ? (o[k] as string).trim().slice(0, max) : "");
  const id = str("id", 40);
  const name = str("name", 80);
  const category = str("category", 40) || "Other";
  const cue = str("cue", 400) || null;
  const url = str("videoUrl", 500);
  const path = str("videoPath", 300);
  const clearVideo = o.clearVideo === true;
  if (!name) return { ok: false, error: "Give the exercise a name." };
  if (url && !videoEmbedUrl(url)) return { ok: false, error: "Use a YouTube, Vimeo or Loom link." };
  if (path && !path.startsWith("exercises/")) return { ok: false, error: "That upload didn't come through. Try again." };
  const existing = await listExercises(true);
  if (existing.some((x) => x.name.toLowerCase() === name.toLowerCase() && x.id !== id)) return { ok: false, error: `“${name}” is already in the library.` };

  if (id) {
    const x = await getExercise(id);
    if (!x) return { ok: false, error: "That exercise doesn't exist anymore." };
    const patch: Parameters<typeof updateExercise>[1] = { name, category, cue };
    if (url) Object.assign(patch, { video_url: url, video_path: null });
    else if (path) Object.assign(patch, { video_path: path, video_url: null });
    else if (clearVideo) Object.assign(patch, { video_url: null, video_path: null });
    await updateExercise(id, patch);
    if (x.video_path && (url || path || clearVideo) && x.video_path !== path) await deleteFile(RESOURCE_BUCKET, x.video_path).catch(() => {});
  } else {
    await insertExercise({ name, category, cue, video_url: url || null, video_path: path || null });
  }
  revalidatePath("/coach/exercises");
  return { ok: true };
}

export async function discardExerciseUploadAction(path: string): Promise<void> {
  await requireCoach("/coach/exercises");
  if (path.startsWith("exercises/")) await deleteFile(RESOURCE_BUCKET, path).catch(() => {});
}

export async function deleteExerciseAction(id: string): Promise<void> {
  await requireCoach("/coach/exercises");
  const x = await getExercise(id);
  if (x) {
    await deleteExercise(x.id);
    if (x.video_path) await deleteFile(RESOURCE_BUCKET, x.video_path).catch(() => {});
  }
  redirect("/coach/exercises?msg=deleted");
}
