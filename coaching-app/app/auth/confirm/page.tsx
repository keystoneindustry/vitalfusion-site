import { confirmSignIn } from "./actions";
import SubmitButton from "@/app/components/SubmitButton";

export const metadata = { title: "Sign in · Vital Fusion" };

/**
 * The link in the email lands here. Signing in needs one tap, so email security scanners
 * that open links automatically can't use up the one-time token.
 */
export default async function ConfirmPage({ searchParams }: { searchParams: Promise<{ th?: string; type?: string }> }) {
  const { th, type } = await searchParams;
  return (
    <main className="auth">
      <img className="auth-logo" src="/icons/logo.png" alt="Vital Fusion" />
      <p className="eyebrow center">Vital Fusion Coaching</p>
      <h1 className="h1 center">You're almost in</h1>
      <p className="lead center">Tap below to open your coaching app.</p>
      {th ? (
        <form action={confirmSignIn}>
          <input type="hidden" name="th" value={th} />
          <input type="hidden" name="type" value={type || "magiclink"} />
          <SubmitButton label="Sign in" pendingLabel="Signing you in…" />
        </form>
      ) : (
        <div className="notice notice-warn">
          This link is missing a piece. <a href="/login">Request a new sign-in link</a>.
        </div>
      )}
    </main>
  );
}
