import { NextResponse, type NextRequest } from "next/server";
import { authPublic } from "@/lib/supabase";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/session";

/** Signs out on this device. */
export async function POST(request: NextRequest) {
  const access = request.cookies.get(ACCESS_COOKIE)?.value;
  if (access) {
    await authPublic("logout?scope=local", { method: "POST", accessToken: access }).catch(() => undefined);
  }
  const res = NextResponse.redirect(new URL("/login", request.url), 303);
  res.cookies.delete(ACCESS_COOKIE);
  res.cookies.delete(REFRESH_COOKIE);
  return res;
}
