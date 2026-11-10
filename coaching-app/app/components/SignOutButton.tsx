"use client";

import { useState } from "react";

/** "Sign out" that asks first: tap once to see Yes / Cancel. */
export default function SignOutButton({ className = "btn btn-ghost btn-wide", icon }: { className?: string; icon?: string }) {
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return (
      <button type="button" className={className} onClick={() => setAsking(true)}>
        {icon && <span aria-hidden="true">{icon}</span>}
        Sign out
      </button>
    );
  }
  return (
    <div className="signout-confirm" role="alertdialog" aria-label="Sign out?">
      <p>Sign out of Vital Fusion? You'll need a new sign-in code to get back in.</p>
      <div className="signout-actions">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAsking(false)}>
          Cancel
        </button>
        <form action="/auth/logout" method="post">
          <button type="submit" className="btn btn-sm btn-danger">
            Yes, sign out
          </button>
        </form>
      </div>
    </div>
  );
}
