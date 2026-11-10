import { authAdmin, authPublic, SupabaseError, type AuthSession } from "./supabase";
import { inviteEmail, sendEmail, signInEmail } from "./email";

type GeneratedLink = {
  id?: string;
  email?: string;
  hashed_token?: string;
  email_otp?: string;
  verification_type?: string;
  user?: { id?: string };
  properties?: { hashed_token?: string; email_otp?: string; verification_type?: string };
};

/**
 * Creates a one-time sign-in token in Supabase Auth (making the account if it doesn't
 * exist yet) without Supabase sending anything. We email our own branded link instead.
 * The same token also has a short code the person can type into the app.
 */
async function generateToken(
  email: string,
): Promise<{ userId: string; tokenHash: string; type: string; code: string | null }> {
  let data: GeneratedLink;
  try {
    data = await authAdmin<GeneratedLink>("generate_link", { type: "magiclink", email });
  } catch (err) {
    // No account yet: an invite creates the account and returns a token.
    if (!(err instanceof SupabaseError) || err.status >= 500) throw err;
    data = await authAdmin<GeneratedLink>("generate_link", { type: "invite", email });
  }
  const tokenHash = data.hashed_token ?? data.properties?.hashed_token;
  const type = data.verification_type ?? data.properties?.verification_type ?? "magiclink";
  const userId = data.id ?? data.user?.id;
  const code = data.email_otp ?? data.properties?.email_otp ?? null;
  if (!tokenHash || !userId) throw new Error("Supabase didn't return a sign-in token.");
  return { userId, tokenHash, type, code };
}

export function confirmUrl(origin: string, tokenHash: string, type: string): string {
  const params = new URLSearchParams({ th: tokenHash, type });
  return `${origin}/auth/confirm?${params.toString()}`;
}

/** Emails a sign-in link and code. `welcome` sends the first-time welcome email instead of the plain one. */
export async function emailSignInLink(opts: {
  email: string;
  firstName: string;
  origin: string;
  welcome: boolean;
}): Promise<{ userId: string }> {
  const { userId, tokenHash, type, code } = await generateToken(opts.email);
  const link = confirmUrl(opts.origin, tokenHash, type);
  const msg = opts.welcome ? inviteEmail(opts.firstName, link, code) : signInEmail(opts.firstName, link, code);
  await sendEmail({ to: opts.email, ...msg });
  return { userId };
}

/** Normalizes what someone typed into the code box: digits only. */
export function cleanCode(input: string): string {
  return input.replace(/\D/g, "");
}

/**
 * Checks a code typed into the app. The code's type depends on whether the account
 * already existed when it was sent, so each type is tried in turn.
 */
export async function verifyCode(email: string, code: string): Promise<AuthSession> {
  let lastError: unknown = null;
  for (const type of ["email", "magiclink", "invite"]) {
    try {
      return await authPublic<AuthSession>("verify", { method: "POST", body: { type, email, token: code } });
    } catch (err) {
      lastError = err;
      if (!(err instanceof SupabaseError) || err.status >= 500) throw err;
    }
  }
  throw lastError ?? new Error("Code not accepted");
}
