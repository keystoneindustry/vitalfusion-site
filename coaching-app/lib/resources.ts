/** Resources: PDFs, video files and video links the coach shares with clients. */

import { db, q } from "./supabase";
import { videoEmbedUrl } from "./settings";

export const RESOURCE_BUCKET = "resources";
export const MAX_UPLOAD_MB = 50;
export const DEFAULT_CATEGORIES = ["Getting started", "Nutrition", "Training", "Habits & lifestyle", "Mindset"];

export type ResourceKind = "pdf" | "video_file" | "video_link";

export type Resource = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  kind: ResourceKind;
  path: string | null;
  url: string | null;
  file_name: string | null;
  size_bytes: number | null;
  unlock_week: number | null;
  published: boolean;
  sort: number;
  created_at: string;
  updated_at: string;
};

export const KIND_LABEL: Record<ResourceKind, string> = { pdf: "PDF", video_file: "Video", video_link: "Video" };
export const KIND_ICON: Record<ResourceKind, string> = { pdf: "📄", video_file: "🎬", video_link: "🎬" };

const FILE_TYPES: Record<string, { kind: ResourceKind; ext: string }> = {
  "application/pdf": { kind: "pdf", ext: "pdf" },
  "video/mp4": { kind: "video_file", ext: "mp4" },
  "video/quicktime": { kind: "video_file", ext: "mov" },
  "video/webm": { kind: "video_file", ext: "webm" },
  "video/x-m4v": { kind: "video_file", ext: "m4v" },
};

/** Checks a file the coach wants to upload. */
export function checkUpload(contentType: string, size: number): { ok: true; kind: ResourceKind; ext: string } | { ok: false; error: string } {
  const t = FILE_TYPES[contentType];
  if (!t) return { ok: false, error: "Upload a PDF or a video (MP4 or MOV)." };
  if (!(size > 0)) return { ok: false, error: "That file is empty." };
  if (size > MAX_UPLOAD_MB * 1024 * 1024) {
    return {
      ok: false,
      error:
        t.kind === "pdf"
          ? `That PDF is over ${MAX_UPLOAD_MB} MB. Try compressing it.`
          : `That video is over ${MAX_UPLOAD_MB} MB. Upload it to YouTube as Unlisted (or Vimeo / Loom) and paste the link instead.`,
    };
  }
  return { ok: true, ...t };
}

/** A safe storage path for an uploaded file. */
export function resourcePath(fileName: string, ext: string, now = Date.now()): string {
  const base = fileName
    .replace(/\.[a-z0-9]+$/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50) || "file";
  return `${now}-${base}.${ext}`;
}

/** Can a client in coaching week `week` see this? (week 0 = not started yet counts as week 1) */
export function unlocked(r: Pick<Resource, "unlock_week" | "published">, week: number): boolean {
  return r.published && (!r.unlock_week || Math.max(1, week) >= r.unlock_week);
}

export function isVideoLink(url: string): boolean {
  return videoEmbedUrl(url) !== null;
}

export function formatSize(bytes: number | null): string {
  if (!bytes) return "";
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** Groups by category, keeping the default categories first. */
export function byCategory<T extends Pick<Resource, "category" | "sort" | "created_at">>(list: T[]): { category: string; items: T[] }[] {
  const map = new Map<string, T[]>();
  for (const r of list) {
    if (!map.has(r.category)) map.set(r.category, []);
    map.get(r.category)!.push(r);
  }
  const order = (c: string) => {
    const i = DEFAULT_CATEGORIES.indexOf(c);
    return i === -1 ? 100 : i;
  };
  return [...map.entries()]
    .sort((a, b) => order(a[0]) - order(b[0]) || a[0].localeCompare(b[0]))
    .map(([category, items]) => ({ category, items: items.sort((a, b) => a.sort - b.sort || a.created_at.localeCompare(b.created_at)) }));
}

// ───────── Database ─────────

export async function listResources(publishedOnly: boolean): Promise<Resource[]> {
  return db<Resource[]>(`resources?select=*${publishedOnly ? "&published=eq.true" : ""}&order=sort.asc,created_at.asc`);
}

export async function getResource(id: string): Promise<Resource | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const rows = await db<Resource[]>(`resources?select=*&id=eq.${q(id)}`);
  return rows[0] ?? null;
}

export async function insertResource(row: Partial<Resource> & Pick<Resource, "title" | "category" | "kind">): Promise<Resource> {
  const rows = await db<Resource[]>("resources", { method: "POST", prefer: "return=representation", body: row });
  return rows[0];
}

export async function updateResource(id: string, patch: Partial<Resource>): Promise<void> {
  await db(`resources?id=eq.${q(id)}`, { method: "PATCH", prefer: "return=minimal", body: patch });
}

export async function deleteResourceRow(id: string): Promise<void> {
  await db(`resources?id=eq.${q(id)}`, { method: "DELETE", prefer: "return=minimal" });
}
