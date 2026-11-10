import { cache } from "react";
import { redirect } from "next/navigation";
import { authPublic, db, q, SupabaseError, type AuthUser } from "./supabase";
import { readSessionCookies } from "./session";
import { isCoachEmail } from "./env";
import { addEvent, getClientByEmail, getClientByUserId, updateClient, type ClientRow } from "./clients";

export type Role = "coach" | "client";

export type Profile = { id: string; email: string; full_name: string | null; role: Role };

export type Viewer = {
  userId: string;
  email: string;
  role: Role;
  fullName: string | null;
  client: ClientRow | null;
};

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
  if (viewer.role === "coach") redirect("/coach");
  if (!viewer.client) redirect("/no-access");
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
