"use client";

import { useActionState, useEffect, useRef } from "react";
import { addLeadAction } from "./actions";

/** Add someone who didn't come through the website (an Instagram DM, a referral). */
export default function AddLead() {
  const [state, action, pending] = useActionState(addLeadAction, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.added) ref.current?.reset();
  }, [state]);
  return (
    <details className="card lead-add">
      <summary>➕ Add a lead by hand</summary>
      <form action={action} ref={ref} style={{ marginTop: 12 }}>
        {state.added && <div className="notice notice-good">Added {state.added} ✓</div>}
        {state.error && <div className="notice notice-error">{state.error}</div>}
        <div className="field">
          <label htmlFor="al-name">Name</label>
          <input id="al-name" name="name" autoComplete="off" required />
        </div>
        <div className="field">
          <label htmlFor="al-email">
            Email <span className="muted">(optional)</span>
          </label>
          <input id="al-email" name="email" type="email" inputMode="email" autoCapitalize="none" autoComplete="off" />
        </div>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="al-ig">
              Instagram <span className="muted">(optional)</span>
            </label>
            <input id="al-ig" name="instagram" autoCapitalize="none" autoComplete="off" placeholder="@handle" />
          </div>
          <div className="field">
            <label htmlFor="al-phone">
              Phone <span className="muted">(optional)</span>
            </label>
            <input id="al-phone" name="phone" type="tel" inputMode="tel" autoComplete="off" />
          </div>
        </div>
        <div className="field">
          <label htmlFor="al-source">Where did they come from?</label>
          <input id="al-source" name="source" autoComplete="off" placeholder="Instagram DM, referral…" />
        </div>
        <div className="field">
          <label htmlFor="al-notes">
            Notes <span className="muted">(optional)</span>
          </label>
          <textarea id="al-notes" name="notes" rows={2} />
        </div>
        <button className="btn btn-wide" type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add lead"}
        </button>
      </form>
    </details>
  );
}
