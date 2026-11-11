import { getViewer } from "@/lib/auth";
import { db, q } from "@/lib/supabase";
import { updateClient } from "@/lib/clients";
import { pushToClient } from "@/lib/reminders";

/**
 * Phone notifications for the signed-in client.
 * POST {subscription} saves this device · DELETE {endpoint} forgets it ·
 * PUT {enabled} turns daily reminders on/off · PATCH sends a test notification.
 */

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

async function client() {
  const r = await getViewer();
  if (r.status !== "ok" || r.viewer.role !== "client" || !r.viewer.client) return null;
  return r.viewer.client;
}

export async function POST(request: Request): Promise<Response> {
  const c = await client();
  if (!c) return json({ error: "Sign in again." }, 401);
  const body = (await request.json().catch(() => ({}))) as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  const endpoint = String(body.endpoint ?? "");
  const p256dh = String(body.keys?.p256dh ?? "");
  const auth = String(body.keys?.auth ?? "");
  if (!/^https:\/\/[^\s]+$/.test(endpoint) || endpoint.length > 1000 || !p256dh || !auth) return json({ error: "That didn't work. Try again." }, 400);
  await db("push_subscriptions?on_conflict=endpoint", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: { client_id: c.id, endpoint, p256dh: p256dh.slice(0, 200), auth: auth.slice(0, 100), user_agent: (request.headers.get("user-agent") ?? "").slice(0, 300) },
  });
  if (c.reminders_enabled === false) await updateClient(c.id, { reminders_enabled: true });
  return json({ ok: true });
}

export async function DELETE(request: Request): Promise<Response> {
  const c = await client();
  if (!c) return json({ error: "Sign in again." }, 401);
  const body = (await request.json().catch(() => ({}))) as { endpoint?: string };
  if (body.endpoint) await db(`push_subscriptions?client_id=eq.${q(c.id)}&endpoint=eq.${q(body.endpoint)}`, { method: "DELETE", prefer: "return=minimal" });
  return json({ ok: true });
}

export async function PUT(request: Request): Promise<Response> {
  const c = await client();
  if (!c) return json({ error: "Sign in again." }, 401);
  const body = (await request.json().catch(() => ({}))) as { enabled?: boolean };
  await updateClient(c.id, { reminders_enabled: body.enabled !== false });
  return json({ ok: true });
}

export async function PATCH(): Promise<Response> {
  const c = await client();
  if (!c) return json({ error: "Sign in again." }, 401);
  const ok = await pushToClient(c.id, { title: "Notifications are on ✓", body: "You'll get your plan at 8am and a nudge at 7pm if anything's still open.", url: "/", tag: "test" });
  return json(ok ? { ok: true } : { error: "Couldn't reach this phone. Turn notifications off and on again." }, ok ? 200 : 502);
}
