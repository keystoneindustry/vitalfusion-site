import { getViewer } from "@/lib/auth";
import { db, q } from "@/lib/supabase";
import { downloadFile } from "@/lib/storage";
import { PHOTO_BUCKET } from "@/lib/progress";

/**
 * One of a client's progress photos, served from this app's own address so the share-card maker can
 * draw it on a canvas and export it (a photo from another address would block the export). Coach only.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const result = await getViewer();
  if (result.status !== "ok" || result.viewer.role !== "coach") return new Response("Not allowed", { status: 403 });
  const { id } = await params;
  const path = new URL(request.url).searchParams.get("path") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id) || !path) return new Response("Not found", { status: 404 });
  const rows = await db<{ path: string }[]>(`progress_photos?select=path&client_id=eq.${q(id)}&path=eq.${q(path)}`);
  if (!rows.length) return new Response("Not found", { status: 404 });
  const bytes = await downloadFile(PHOTO_BUCKET, path);
  if (!bytes) return new Response("Not found", { status: 404 });
  const type = path.endsWith(".png") ? "image/png" : path.endsWith(".webp") ? "image/webp" : "image/jpeg";
  return new Response(Buffer.from(bytes), { headers: { "content-type": type, "cache-control": "private, max-age=600" } });
}
