"use client";

import { useActionState } from "react";
import { requestSignInLink, type LoginState } from "./actions";

export default function LoginForm({ defaultEmail }: { defaultEmail?: string }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(requestSignInLink, {});

  if (state.sent) {
    return (
      <div className="card center">
        <h2 className="h2">Check your email 📬</h2>
        <p className="lead" style={{ marginBottom: 12 }}>
          If <b>{state.sent}</b> has a Vital Fusion account, a sign-in link is on its way. It can take a minute, so check
          your spam folder too.
        </p>
        <p className="muted small" style={{ margin: 0 }}>
          Open the link on this phone so you stay signed in here.
        </p>
      </div>
    );
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
          defaultValue={defaultEmail}
          placeholder="you@example.com"
        />
      </div>
      {state.error && <p className="err" style={{ margin: "0 0 12px" }}>{state.error}</p>}
      <button className="btn btn-wide" type="submit" disabled={pending}>
        {pending ? "Sending…" : "Email me a sign-in link"}
      </button>
      <p className="muted small center" style={{ margin: "14px 0 0" }}>
        No password needed. We'll email you a link that signs you in.
      </p>
    </form>
  );
}
