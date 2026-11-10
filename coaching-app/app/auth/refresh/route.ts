import { NextResponse, type NextRequest } from "next/server";
import { authPublic, type AuthSession } from "@/lib/supabase";
import { ACCESS_COOKIE, REFRESH_COOKIE, REFRESH_MAX_AGE, cookieOptions, safeNext } from "@/lib/session";

/** Trades the long-lived refresh cookie for a fresh session, then returns to the page. */
export async function GET(request: NextRequest) {
  const next = safeNext(request.nextUrl.searchParams.get("next"));
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;

  if (refreshToken) {
    try {
      const session = await authPublic<AuthSession>("token?grant_type=refresh_token", {
        method: "POST",
        body: { refresh_token: refreshToken },
      });
      const res = NextResponse.redirect(new URL(next, request.url), 303);
      res.cookies.set(ACCESS_COOKIE, session.access_token, cookieOptions(session.expires_in));
      res.cookies.set(REFRESH_COOKIE, session.refresh_token, cookieOptions(REFRESH_MAX_AGE));
      return res;
    } catch (err) {
      console.error("Session refresh failed", err);
    }
  }

  const res = NextResponse.redirect(new URL(`/login?error=session&next=${encodeURIComponent(next)}`, request.url), 303);
  res.cookies.delete(ACCESS_COOKIE);
  res.cookies.delete(REFRESH_COOKIE);
  return res;
}
