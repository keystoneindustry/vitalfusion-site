import { env } from "./env";

/** Private file storage in Supabase (server only, secret key). */

function headers(contentType?: string): Record<string, string> {
  const key = env.supabaseSecretKey();
  const h: Record<string, string> = { apikey: key };
  if (!key.startsWith("sb_")) h.Authorization = `Bearer ${key}`;
  if (contentType) h["Content-Type"] = contentType;
  return h;
}

function objectUrl(bucket: string, path: string): string {
  const safe = path
    .split("/")
    .map((p) => encodeURIComponent(p))
    .join("/");
  return `${env.supabaseUrl()}/storage/v1/object/${bucket}/${safe}`;
}

export async function uploadFile(bucket: string, path: string, bytes: Uint8Array, contentType: string): Promise<void> {
  const res = await fetch(objectUrl(bucket, path), {
    method: "POST",
    headers: { ...headers(contentType), "x-upsert": "true" },
    body: new Blob([bytes as BlobPart], { type: contentType }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Storage upload failed (${res.status}): ${await res.text()}`);
}

export async function downloadFile(bucket: string, path: string): Promise<Uint8Array | null> {
  const res = await fetch(objectUrl(bucket, path), { headers: headers(), cache: "no-store" });
  if (res.status === 400 || res.status === 404) return null;
  if (!res.ok) throw new Error(`Storage download failed (${res.status}): ${await res.text()}`);
  return new Uint8Array(await res.arrayBuffer());
}

export async function deleteFile(bucket: string, path: string): Promise<void> {
  const res = await fetch(objectUrl(bucket, path), { method: "DELETE", headers: headers(), cache: "no-store" });
  if (!res.ok && res.status !== 404 && res.status !== 400) throw new Error(`Storage delete failed (${res.status}): ${await res.text()}`);
}

/**
 * Short-lived links to private files, so a page can show photos without making the bucket public.
 * Returns a map of path → URL (missing paths are left out).
 */
export async function signedUrls(bucket: string, paths: string[], expiresIn = 3600): Promise<Record<string, string>> {
  const unique = [...new Set(paths.filter(Boolean))];
  if (unique.length === 0) return {};
  const res = await fetch(`${env.supabaseUrl()}/storage/v1/object/sign/${bucket}`, {
    method: "POST",
    headers: headers("application/json"),
    body: JSON.stringify({ expiresIn, paths: unique }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Storage sign failed (${res.status}): ${await res.text()}`);
  const rows = (await res.json()) as { path: string | null; signedURL: string | null; error: string | null }[];
  const out: Record<string, string> = {};
  for (const r of rows) {
    if (r.path && r.signedURL) out[r.path] = `${env.supabaseUrl()}/storage/v1${r.signedURL}`;
  }
  return out;
}

/**
 * A one-time upload link so the browser can send a large file straight to storage (Vercel functions
 * can't take bodies over ~4.5 MB). Returns the full PUT url including its token.
 */
export async function signedUploadUrl(bucket: string, path: string): Promise<string> {
  const res = await fetch(`${env.supabaseUrl()}/storage/v1/object/upload/sign/${bucket}/${path.split("/").map(encodeURIComponent).join("/")}`, {
    method: "POST",
    headers: headers("application/json"),
    body: "{}",
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Storage upload link failed (${res.status}): ${await res.text()}`);
  const data = (await res.json()) as { url?: string };
  if (!data.url) throw new Error("Storage didn't return an upload link.");
  return `${env.supabaseUrl()}/storage/v1${data.url}`;
}

/** Size in bytes of a stored file, or null if it isn't there. */
export async function fileInfo(bucket: string, path: string): Promise<{ size: number; mimetype: string } | null> {
  const res = await fetch(`${env.supabaseUrl()}/storage/v1/object/info/${bucket}/${path.split("/").map(encodeURIComponent).join("/")}`, {
    headers: headers(),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const d = (await res.json()) as { size?: number; metadata?: { size?: number; mimetype?: string }; content_type?: string };
  return { size: d.size ?? d.metadata?.size ?? 0, mimetype: d.content_type ?? d.metadata?.mimetype ?? "" };
}
