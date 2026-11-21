import { cache } from "react";
import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { after } from "next/server";
import { authPublic, db, q, SupabaseError, type AuthUser } from "./supabase";
import { readSessionCookies } from "./session";
import { isCoachEmail } from "./env";
import { addEvent, getClient, getClientByEmail, getClientByUserId, updateClient, type ClientRow } from "./clients";

export type Role = "coach" | "client";

export type Profile = { id: string; email: string; full_name: string | null; role: Role };

export type Viewer = {
  userId: string;
  email: string;
  role: Role;
  fullName: string | null;
  client: ClientRow | null;
  /** True when the coach is looking at the client app as this client ("Client view", read-only). */
  viewingAs?: boolean;
};

/** Cookie the coach portal sets for "Client view": which client the coach is looking at the app as. */
export const VIEW_AS_COOKIE = "vf_view_as";
/** Readable by page scripts, so error screens can say "read-only" instead of "something went wrong". */
export const VIEW_AS_FLAG_COOKIE = "vf_view_as_on";

/** Thrown when anything tries to save while the coach is in Client view. */
export class ReadOnlyViewError extends Error {
  constructor() {
    super("Client view is read-only: nothing was saved.");
  }
}

type ViewerResult = { status: "ok"; viewer: Viewer } | { status: "expired" } | { status: "none" };

/** Who is signed in, checked with Supabase once per request. */
export const getViewer = cache(async (): Promise<ViewerResult> => {
  const { access, refresh } = await readSessionCookies();
  if (!access) return refresh ? { status: "expired" } : { status: "none" };

  let user: AuthUser;
  try {
    user = await authPublic<AuthUser>("user", { accessToken: access });
  } catch (err) {
    if (err instanceof SupabaseError && err.status < 500) return refresh ? { status: "expired" } : { status: "none" };
    throw err;
  }

  const profiles = await db<Profile[]>(`profiles?select=id,email,full_name,role&id=eq.${q(user.id)}`);
  const profile = profiles[0] ?? (await ensureProfile(user));
  const client = profile.role === "client" ? await getClientByUserId(user.id) : null;
  return {
    status: "ok",
    viewer: { userId: user.id, email: profile.email, role: profile.role, fullName: profile.full_name, client },
  };
});

function loginPath(next: string): string {
  return `/login?next=${encodeURIComponent(next)}`;
}

/** Any signed-in person. `path` is where to come back to after a token refresh or sign-in. */
export async function requireViewer(path: string): Promise<Viewer> {
  const result = await getViewer();
  if (result.status === "expired") redirect(`/auth/refresh?next=${encodeURIComponent(path)}`);
  if (result.status === "none") redirect(loginPath(path));
  return result.viewer;
}

export async function requireCoach(path: string): Promise<Viewer> {
  const viewer = await requireViewer(path);
  if (viewer.role !== "coach") redirect("/");
  return viewer;
}

/** A client with an active CRM record. The coach is sent to the dashboard. */
export async function requireClient(path: string): Promise<Viewer & { client: ClientRow }> {
  const viewer = await requireViewer(path);
  if (viewer.role === "coach") {
    // Client view: the coach sees the app exactly as this client does, read-only.
    const id = (await cookies()).get(VIEW_AS_COOKIE)?.value;
    const client = id && /^[0-9a-f-]{36}$/i.test(id) ? await getClient(id) : null;
    if (!client) redirect("/coach");
    // Server actions (every save in the client app) arrive with a Next-Action header: refuse them.
    if ((await headers()).get("next-action")) throw new ReadOnlyViewError();
    return { ...viewer, client, viewingAs: true };
  }
  if (!viewer.client) redirect("/no-access");
  // Remember when they last opened the app (at most every 30 minutes), for Tyler's at-risk alerts.
  const seen = viewer.client.last_seen_at ? Date.parse(viewer.client.last_seen_at) : 0;
  if (Date.now() - seen > 30 * 60 * 1000) {
    const id = viewer.client.id;
    after(() => updateClient(id, { last_seen_at: new Date().toISOString() }).catch((err) => console.error("last_seen update failed", err)));
  }
  return viewer as Viewer & { client: ClientRow };
}

/**
 * Runs right after a successful sign-in: makes sure the person has a profile with the right
 * role and, for clients, links their CRM record and moves them from Invited to Onboarding.
 */
export async function ensureProfile(user: AuthUser): Promise<Profile> {
  const email = (user.email || "").trim().toLowerCase();
  const role: Role = isCoachEmail(email) ? "coach" : "client";
  const crm = role === "client" ? await getClientByEmail(email) : null;

  const rows = await db<Profile[]>("profiles?on_conflict=id", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=representation",
    body: { id: user.id, email, role, full_name: crm?.full_name ?? null },
  });
  const profile = rows[0];

  if (crm) {
    const now = new Date().toISOString();
    const patch: Partial<ClientRow> = { last_seen_at: now };
    if (!crm.user_id) patch.user_id = user.id;
    if (!crm.first_signed_in_at) patch.first_signed_in_at = now;
    if (crm.stage === "invited") patch.stage = "onboarding";
    await updateClient(crm.id, patch);
    if (!crm.first_signed_in_at) await addEvent(crm.id, "first_sign_in");
    if (crm.stage === "invited") await addEvent(crm.id, "stage_changed", { from: "Invited", to: "Onboarding" });
  }
  return profile;
}
