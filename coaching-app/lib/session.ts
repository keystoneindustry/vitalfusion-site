import { cookies } from "next/headers";
import type { AuthSession } from "./supabase";

/** Sign-in cookies. httpOnly, so page scripts can never read the tokens. */
export const ACCESS_COOKIE = "vf_at";
export const REFRESH_COOKIE = "vf_rt";
const REFRESH_MAX_AGE = 60 * 60 * 24 * 60; // 60 days

export function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

/** Use only inside server actions or route handlers. */
export async function setSession(session: AuthSession): Promise<void> {
  const store = await cookies();
  store.set(ACCESS_COOKIE, session.access_token, cookieOptions(session.expires_in));
  store.set(REFRESH_COOKIE, session.refresh_token, cookieOptions(REFRESH_MAX_AGE));
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
}

export async function readSessionCookies(): Promise<{ access?: string; refresh?: string }> {
  const store = await cookies();
  return { access: store.get(ACCESS_COOKIE)?.value, refresh: store.get(REFRESH_COOKIE)?.value };
}

/** Only allow redirects to paths inside this app. */
export function safeNext(next: string | null | undefined, fallback = "/"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}

export { REFRESH_MAX_AGE };
