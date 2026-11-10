"use server";

import { redirect } from "next/navigation";
import { authPublic, type AuthSession } from "@/lib/supabase";
import { setSession } from "@/lib/session";
import { ensureProfile } from "@/lib/auth";

const ALLOWED_TYPES = new Set(["magiclink", "invite", "signup", "email"]);

/** Swaps the one-time token from the email for a session, then sends the person to their home screen. */
export async function confirmSignIn(form: FormData): Promise<void> {
  const tokenHash = String(form.get("th") || "");
  const type = String(form.get("type") || "magiclink");
  if (!tokenHash || !ALLOWED_TYPES.has(type)) redirect("/login?error=link");

  let session: AuthSession;
  try {
    session = await authPublic<AuthSession>("verify", { method: "POST", body: { type, token_hash: tokenHash } });
  } catch (err) {
    console.error("Sign-in link rejected", err);
    redirect("/login?error=link");
  }

  await setSession(session);
  const profile = await ensureProfile(session.user);
  redirect(profile.role === "coach" ? "/coach" : "/");
}
