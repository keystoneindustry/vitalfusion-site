import { getViewer } from "@/lib/auth";
import { addEvent } from "@/lib/clients";
import { insertMeal, listMeals, MEAL_PHOTO_BUCKET, parseMealInput } from "@/lib/meals";
import { uploadFile } from "@/lib/storage";

/**
 * A client logs a meal: multipart form with an optional photo (already shrunk in the browser).
 * A route handler (not a server action) so photos up to a few MB get through.
 */

const MAX_BYTES = 4 * 1024 * 1024;
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

export async function POST(request: Request): Promise<Response> {
  const result = await getViewer();
  if (result.status !== "ok") return json({ error: "Your session ended. Sign in again." }, 401);
  const client = result.viewer.client;
  if (result.viewer.role !== "client" || !client) return json({ error: "Only clients can log meals." }, 403);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "That upload didn't come through. Try again." }, 400);
  }

  const photo = form.get("photo");
  const file = photo && typeof photo === "object" && "arrayBuffer" in photo && (photo as File).size > 0 ? (photo as File) : null;
  if (file && file.size > MAX_BYTES) return json({ error: "That photo is too big. Try again, or pick a smaller one." }, 400);
  if (file && !TYPES[file.type]) return json({ error: "That file isn't a photo we can use (JPEG, PNG or WebP)." }, 400);

  const parsed = parseMealInput(
    {
      eatenAt: form.get("eatenAt"),
      meal: form.get("meal"),
      place: form.get("place"),
      hunger: form.get("hunger"),
      note: form.get("note"),
    },
    !!file,
  );
  if (!parsed.ok) return json({ error: parsed.error }, 400);

  let photoPath: string | null = null;
  if (file) {
    photoPath = `${client.id}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${TYPES[file.type]}`;
    try {
      await uploadFile(MEAL_PHOTO_BUCKET, photoPath, new Uint8Array(await file.arrayBuffer()), file.type);
    } catch (err) {
      console.error("Meal photo upload failed", err);
      return json({ error: "The photo didn't upload. Check your connection and try again." }, 502);
    }
  }

  const before = await listMeals(client.id, 1);
  const meal = await insertMeal(client.id, parsed.data, photoPath);
  if (before.length === 0) await addEvent(client.id, "first_meal_logged").catch(() => undefined);
  return json({ ok: true, id: meal.id });
}
