"use client";

import { useActionState } from "react";
import { saveWhyAction, type WhyState } from "../wins-actions";

export default function WhyForm({ initial }: { initial: string }) {
  const [state, action, pending] = useActionState<WhyState, FormData>(saveWhyAction, {});
  return (
    <form action={action} className="card">
      <div className="field">
        <label htmlFor="why">My why</label>
        <textarea id="why" name="why" defaultValue={initial} maxLength={600} rows={5} placeholder="e.g. I want to keep up with my kids and feel confident in my own skin again." required />
        <span className="hint">A sentence or two is perfect.</span>
      </div>
      {state.error && <p className="err">{state.error}</p>}
      <button className="btn btn-wide" type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
