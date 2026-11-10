"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireCoach } from "@/lib/auth";
import { env } from "@/lib/env";
import { deleteFile, fileInfo, signedUploadUrl } from "@/lib/storage";
import { videoEmbedUrl } from "@/lib/settings";
import {
  checkUpload,
  deleteResourceRow,
  getResource,
  insertResource,
  listResources,
  RESOURCE_BUCKET,
  resourcePath,
  updateResource,
  type ResourceKind,
} from "@/lib/resources";

export type StartUpload = { ok: true; path: string; uploadUrl: string; apikey: string; kind: ResourceKind } | { ok: false; error: string };

/** Step 1 of an upload: checks the file and returns a one-time link for the browser to send it straight to storage. */
export async function startUploadAction(fileName: string, contentType: string, size: number): Promise<StartUpload> {
  await requireCoach("/coach/resources");
  const check = checkUpload(contentType, size);
  if (!check.ok) return check;
  const path = resourcePath(fileName, check.ext);
  try {
    const uploadUrl = await signedUploadUrl(RESOURCE_BUCKET, path);
    return { ok: true, path, uploadUrl, apikey: env.supabasePublishableKey(), kind: check.kind };
  } catch (err) {
    console.error("Upload link failed", err);
    return { ok: false, error: "Couldn't start the upload. Try again." };
  }
}

export type SaveResult = { ok: true } | { ok: false; error: string };

/** Step 2: saves the resource (after the file finished uploading, or for a video link). */
export async function saveResourceAction(payload: string): Promise<SaveResult> {
  await requireCoach("/coach/resources");
  let d: Record<string, unknown>;
  try {
    d = JSON.parse(payload) as Record<string, unknown>;
  } catch {
    return { ok: false, error: "Something went wrong. Try again." };
  }
  const s = (k: string, max: number) => (typeof d[k] === "string" ? (d[k] as string).trim().slice(0, max) : "");
  const title = s("title", 120);
  if (!title) return { ok: false, error: "Give it a title." };
  const category = s("category", 60) || "General";
  const week = parseInt(String(d.unlockWeek ?? ""), 10);
  const base = {
    title,
    category,
    description: s("description", 600) || null,
    unlock_week: Number.isFinite(week) && week >= 1 && week <= 104 ? week : null,
    published: d.published !== false,
    sort: Date.now() % 2_000_000_000,
  };
  if (d.kind === "video_link") {
    const url = s("url", 500);
    if (!videoEmbedUrl(url)) return { ok: false, error: "Paste a YouTube, Vimeo or Loom link." };
    await insertResource({ ...base, kind: "video_link", url });
  } else {
    const path = s("path", 200);
    if (!/^\d+-[a-z0-9-]+\.(pdf|mp4|mov|webm|m4v)$/.test(path)) return { ok: false, error: "The upload didn't finish. Try again." };
    const info = await fileInfo(RESOURCE_BUCKET, path);
    if (!info) return { ok: false, error: "The upload didn't finish. Try again." };
    const kind: ResourceKind = path.endsWith(".pdf") ? "pdf" : "video_file";
    await insertResource({ ...base, kind, path, file_name: s("fileName", 200) || null, size_bytes: info.size || null });
  }
  revalidatePath("/coach/resources");
  revalidatePath("/resources");
  return { ok: true };
}

/** Cleans up a file whose resource was never saved (e.g. the coach closed the form mid-way). */
export async function discardUploadAction(path: string): Promise<void> {
  await requireCoach("/coach/resources");
  if (/^\d+-[a-z0-9-]+\.(pdf|mp4|mov|webm|m4v)$/.test(path)) await deleteFile(RESOURCE_BUCKET, path).catch(() => undefined);
}

export async function updateResourceAction(id: string, form: FormData): Promise<void> {
  await requireCoach("/coach/resources");
  const title = String(form.get("title") ?? "").trim().slice(0, 120);
  if (!title) redirect("/coach/resources?error=" + encodeURIComponent("Give it a title."));
  const week = parseInt(String(form.get("unlockWeek") ?? ""), 10);
  await updateResource(id, {
    title,
    category: String(form.get("category") ?? "").trim().slice(0, 60) || "General",
    description: String(form.get("description") ?? "").trim().slice(0, 600) || null,
    unlock_week: Number.isFinite(week) && week >= 1 && week <= 104 ? week : null,
  });
  revalidatePath("/resources");
  redirect("/coach/resources?msg=saved");
}

export async function setPublishedAction(id: string, published: boolean): Promise<void> {
  await requireCoach("/coach/resources");
  await updateResource(id, { published });
  revalidatePath("/resources");
  redirect(`/coach/resources?msg=${published ? "shown" : "hidden"}`);
}

export async function deleteResourceAction(id: string): Promise<void> {
  await requireCoach("/coach/resources");
  const r = await getResource(id);
  if (r) {
    await deleteResourceRow(r.id);
    if (r.path) await deleteFile(RESOURCE_BUCKET, r.path).catch(() => undefined);
  }
  revalidatePath("/resources");
  redirect("/coach/resources?msg=deleted");
}

/** Moves a resource up or down within its category. */
export async function moveResourceAction(id: string, dir: number): Promise<void> {
  await requireCoach("/coach/resources");
  const all = await listResources(false);
  const r = all.find((x) => x.id === id);
  if (!r) redirect("/coach/resources");
  const list = all.filter((x) => x.category === r.category).sort((a, b) => a.sort - b.sort || a.created_at.localeCompare(b.created_at));
  const i = list.findIndex((x) => x.id === id);
  const j = i + (dir < 0 ? -1 : 1);
  if (j >= 0 && j < list.length) {
    [list[i], list[j]] = [list[j], list[i]];
    await Promise.all(list.map((x, k) => (x.sort === k * 10 ? null : updateResource(x.id, { sort: k * 10 }))));
  }
  revalidatePath("/resources");
  redirect("/coach/resources");
}
