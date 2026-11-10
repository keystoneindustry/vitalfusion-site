"use client";

import { useActionState, useState } from "react";
import { requestSignInLink, signInWithCode, type CodeState, type LoginState } from "./actions";

/** Step 2: type the code from the email. Works inside the home-screen app, where email links open in Safari. */
function CodeForm({ email, onBack }: { email: string; onBack: () => void }) {
  const [state, formAction, pending] = useActionState<CodeState, FormData>(signInWithCode, {});
  return (
    <div className="card">
      <h2 className="h2 center">Check your email 📬</h2>
      <p className="lead center" style={{ marginBottom: 16 }}>
        If <b>{email}</b> has a Vital Fusion account, we just sent a sign-in code and link. It can take a minute, so check
        spam too.
      </p>
      <form action={formAction}>
        <input type="hidden" name="email" value={email} />
        <div className="field">
          <label htmlFor="code">Enter the code from the email</label>
          <input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9 ]*"
            maxLength={12}
            required
            autoFocus
            placeholder="123456"
            style={{ fontSize: 26, letterSpacing: "0.3em", textAlign: "center" }}
          />
        </div>
        {state.error && <p className="err" style={{ margin: "0 0 12px" }}>{state.error}</p>}
        <button className="btn btn-wide" type="submit" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="muted small center" style={{ margin: "14px 0 0" }}>
        Or tap the button in the email.{" "}
        <button type="button" className="btn-link" onClick={onBack}>
          Use a different email
        </button>
      </p>
    </div>
  );
}

export default function LoginForm({ defaultEmail }: { defaultEmail?: string }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(requestSignInLink, {});
  const [backed, setBacked] = useState<LoginState | null>(null);

  if (state.sent && backed !== state) {
    return <CodeForm email={state.sent} onBack={() => setBacked(state)} />;
  }

  return (
    <form action={formAction} className="card">
      <div className="field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          required
          defaultValue={backed?.sent ?? defaultEmail}
          placeholder="you@example.com"
        />
      </div>
      {state.error && <p className="err" style={{ margin: "0 0 12px" }}>{state.error}</p>}
      <button className="btn btn-wide" type="submit" disabled={pending}>
        {pending ? "Sending…" : "Email me a sign-in code"}
      </button>
      <p className="muted small center" style={{ margin: "14px 0 0" }}>
        No password needed. We'll email you a code and a link that sign you in.
      </p>
    </form>
  );
}
