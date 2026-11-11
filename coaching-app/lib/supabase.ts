import { env } from "./env";

/**
 * Minimal Supabase client over REST (no extra npm packages).
 * - db():         database (PostgREST) with the SECRET key — server only.
 * - authAdmin():  Supabase Auth admin endpoints with the SECRET key — server only.
 * - authPublic(): Supabase Auth endpoints with the publishable key, optionally as a signed-in user.
 */

export class SupabaseError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "SupabaseError";
  }
}

function keyHeaders(key: string): Record<string, string> {
  const headers: Record<string, string> = { apikey: key, "Content-Type": "application/json" };
  // New-style keys (sb_secret_…, sb_publishable_…) go only in `apikey`;
  // legacy JWT keys are also sent as a bearer token.
  if (!key.startsWith("sb_")) headers.Authorization = `Bearer ${key}`;
  return headers;
}

async function parse<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!res.ok) throw new SupabaseError(res.status, text || res.statusText);
  return (text ? JSON.parse(text) : null) as T;
}

type DbInit = { method?: "GET" | "POST" | "PATCH" | "DELETE"; body?: unknown; prefer?: string };

export async function db<T>(path: string, init: DbInit = {}): Promise<T> {
  const headers = keyHeaders(env.supabaseSecretKey());
  if (init.prefer) headers.Prefer = init.prefer;
  const res = await fetch(`${env.supabaseUrl()}/rest/v1/${path}`, {
    method: init.method ?? "GET",
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
  });
  return parse<T>(res);
}

export async function authAdmin<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${env.supabaseUrl()}/auth/v1/admin/${path}`, {
    method: "POST",
    headers: keyHeaders(env.supabaseSecretKey()),
    body: JSON.stringify(body),
    cache: "no-store",
  });
  return parse<T>(res);
}

/** Deletes a sign-in account (Supabase Auth). A missing user counts as done. */
export async function authAdminDeleteUser(userId: string): Promise<void> {
  const res = await fetch(`${env.supabaseUrl()}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
    method: "DELETE",
    headers: keyHeaders(env.supabaseSecretKey()),
    cache: "no-store",
  });
  if (!res.ok && res.status !== 404) throw new SupabaseError(res.status, await res.text());
}

export async function authPublic<T>(
  path: string,
  init: { method?: "GET" | "POST"; body?: unknown; accessToken?: string } = {},
): Promise<T> {
  const headers = keyHeaders(env.supabasePublishableKey());
  if (init.accessToken) headers.Authorization = `Bearer ${init.accessToken}`;
  const res = await fetch(`${env.supabaseUrl()}/auth/v1/${path}`, {
    method: init.method ?? "GET",
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
  });
  return parse<T>(res);
}

/** Encodes a value for a PostgREST filter, e.g. `email=eq.${q(email)}`. */
export function q(value: string): string {
  return encodeURIComponent(value);
}

export type AuthUser = { id: string; email?: string };

export type AuthSession = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: AuthUser;
};
