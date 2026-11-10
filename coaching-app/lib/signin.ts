import { authAdmin, SupabaseError } from "./supabase";
import { inviteEmail, sendEmail, signInEmail } from "./email";

type GeneratedLink = {
  id?: string;
  email?: string;
  hashed_token?: string;
  verification_type?: string;
  user?: { id?: string };
  properties?: { hashed_token?: string; verification_type?: string };
};

/**
 * Creates a one-time sign-in token in Supabase Auth (making the account if it doesn't
 * exist yet) without Supabase sending anything. We email our own branded link instead.
 */
async function generateToken(email: string): Promise<{ userId: string; tokenHash: string; type: string }> {
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
  if (!tokenHash || !userId) throw new Error("Supabase didn't return a sign-in token.");
  return { userId, tokenHash, type };
}

export function confirmUrl(origin: string, tokenHash: string, type: string): string {
  const params = new URLSearchParams({ th: tokenHash, type });
  return `${origin}/auth/confirm?${params.toString()}`;
}

/** Emails a sign-in link. `welcome` sends the first-time welcome email instead of the plain one. */
export async function emailSignInLink(opts: {
  email: string;
  firstName: string;
  origin: string;
  welcome: boolean;
}): Promise<{ userId: string }> {
  const { userId, tokenHash, type } = await generateToken(opts.email);
  const link = confirmUrl(opts.origin, tokenHash, type);
  const msg = opts.welcome ? inviteEmail(opts.firstName, link) : signInEmail(opts.firstName, link);
  await sendEmail({ to: opts.email, ...msg });
  return { userId };
}
