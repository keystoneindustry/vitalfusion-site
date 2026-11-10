"use server";

import { redirect } from "next/navigation";
import { isCoachEmail } from "@/lib/env";
import { addEvent, getClientByEmail } from "@/lib/clients";
import { firstName } from "@/lib/client-input";
import { appOrigin } from "@/lib/origin";
import { cleanCode, emailSignInLink, verifyCode } from "@/lib/signin";
import { setSession } from "@/lib/session";
import { ensureProfile } from "@/lib/auth";
import type { AuthSession } from "@/lib/supabase";

export type LoginState = { sent?: string; error?: string };
export type CodeState = { error?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Emails a sign-in link and code to the coach or to anyone in the CRM. Everyone else sees the
 * same "check your email" message (so the form doesn't reveal who is a client) but gets nothing.
 */
export async function requestSignInLink(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") || "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { error: "Enter the email address your coach has on file." };

  try {
    const origin = await appOrigin();
    if (isCoachEmail(email)) {
      await emailSignInLink({ email, firstName: "Tyler", origin, welcome: false });
    } else {
      const client = await getClientByEmail(email);
      if (client && client.stage !== "finished") {
        await emailSignInLink({ email, firstName: firstName(client.full_name), origin, welcome: false });
        await addEvent(client.id, "signin_link_sent");
      }
    }
  } catch (err) {
    console.error("Sign-in link failed", err);
    return { error: "We couldn't send your email just now. Please try again in a minute." };
  }
  return { sent: email };
}

/** Signs in with the code from the email, for the installed app where links open in Safari instead. */
export async function signInWithCode(_prev: CodeState, form: FormData): Promise<CodeState> {
  const email = String(form.get("email") || "").trim().toLowerCase();
  const code = cleanCode(String(form.get("code") || ""));
  if (!EMAIL_RE.test(email)) return { error: "Something went wrong. Go back and enter your email again." };
  if (code.length < 6) return { error: "Enter the full code from your email." };

  let session: AuthSession;
  try {
    session = await verifyCode(email, code);
  } catch (err) {
    console.error("Sign-in code rejected", err);
    return { error: "That code didn't work. Check it, or go back and request a new one (codes expire after 1 hour)." };
  }

  await setSession(session);
  const profile = await ensureProfile(session.user);
  redirect(profile.role === "coach" ? "/coach" : "/");
}
