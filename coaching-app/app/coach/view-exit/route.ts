import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { VIEW_AS_COOKIE, VIEW_AS_FLAG_COOKIE } from "@/lib/auth";

/** Leaves Client view and goes back to that client in the coach portal. */
export async function GET(req: Request) {
  const id = (await cookies()).get(VIEW_AS_COOKIE)?.value;
  const back = id && /^[0-9a-f-]{36}$/i.test(id) ? `/coach/clients/${id}` : "/coach/clients";
  const res = NextResponse.redirect(new URL(back, req.url), 303);
  res.cookies.delete(VIEW_AS_COOKIE);
  res.cookies.delete(VIEW_AS_FLAG_COOKIE);
  return res;
}
