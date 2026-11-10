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
