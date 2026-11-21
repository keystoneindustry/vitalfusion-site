import { NextResponse } from "next/server";
import { requireCoach, VIEW_AS_COOKIE, VIEW_AS_FLAG_COOKIE } from "@/lib/auth";
import { getClient } from "@/lib/clients";

/** "Client view": opens the client app as this client (read-only) for the coach. Lasts 2 hours or until Exit. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireCoach(`/coach/clients/${id}`);
  const client = await getClient(id);
  const url = new URL(client ? "/" : "/coach/clients", req.url);
  const res = NextResponse.redirect(url, 303);
  if (client) {
    const base = { secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: 2 * 60 * 60 };
    res.cookies.set(VIEW_AS_COOKIE, client.id, { ...base, httpOnly: true });
    res.cookies.set(VIEW_AS_FLAG_COOKIE, "1", { ...base, httpOnly: false });
  }
  return res;
}
