"use server";

import { isCoachEmail } from "@/lib/env";
import { addEvent, getClientByEmail } from "@/lib/clients";
import { firstName } from "@/lib/client-input";
import { appOrigin } from "@/lib/origin";
import { emailSignInLink } from "@/lib/signin";

export type LoginState = { sent?: string; error?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Emails a sign-in link to the coach or to anyone in the CRM. Everyone else sees the same
 * "check your email" message (so the form doesn't reveal who is a client) but gets nothing.
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
    return { error: "We couldn't send your link just now. Please try again in a minute." };
  }
  return { sent: email };
}
