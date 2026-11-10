import { getViewer } from "@/lib/auth";
import { addEvent } from "@/lib/clients";
import { addDays, isIsoDate, todayIn } from "@/lib/dates";
import { PHOTO_BUCKET, POSES, savePhoto, type Pose } from "@/lib/progress";
import { deleteFile, uploadFile } from "@/lib/storage";

/** A client uploads one progress photo (front, side or back) for a date. Shrunk in the browser first. */

const MAX_BYTES = 4 * 1024 * 1024;
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

export async function POST(request: Request): Promise<Response> {
  const result = await getViewer();
  if (result.status !== "ok") return json({ error: "Your session ended. Sign in again." }, 401);
  const client = result.viewer.client;
  if (result.viewer.role !== "client" || !client) return json({ error: "Only clients can upload progress photos." }, 403);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "That upload didn't come through. Try again." }, 400);
  }
  const pose = String(form.get("pose") ?? "") as Pose;
  if (!POSES.some((p) => p.value === pose)) return json({ error: "Pick front, side or back." }, 400);
  const today = todayIn(client.timezone);
  const date = String(form.get("date") || today);
  if (!isIsoDate(date) || date > today || date < addDays(today, -7)) return json({ error: "Pick today or a day in the past week." }, 400);
  const photo = form.get("photo");
  const file = photo && typeof photo === "object" && "arrayBuffer" in photo && (photo as File).size > 0 ? (photo as File) : null;
  if (!file) return json({ error: "Add a photo." }, 400);
  if (file.size > MAX_BYTES) return json({ error: "That photo is too big. Try again." }, 400);
  if (!TYPES[file.type]) return json({ error: "That file isn't a photo we can use." }, 400);

  const path = `${client.id}/${date}-${pose}-${Date.now()}.${TYPES[file.type]}`;
  try {
    await uploadFile(PHOTO_BUCKET, path, new Uint8Array(await file.arrayBuffer()), file.type);
  } catch (err) {
    console.error("Progress photo upload failed", err);
    return json({ error: "The photo didn't upload. Check your connection and try again." }, 502);
  }
  const old = await savePhoto(client.id, date, pose, path);
  if (old) await deleteFile(PHOTO_BUCKET, old).catch(() => undefined);
  if (pose === "back") await addEvent(client.id, "photos_uploaded").catch(() => undefined);
  return json({ ok: true });
}
