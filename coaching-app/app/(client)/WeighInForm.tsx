"use client";

import Link from "next/link";
import { useActionState } from "react";
import { saveWeighInAction, type WeighInState } from "./daily-actions";

/** Quick weigh-in: weight (lb), optional note; date defaults to today. */
export default function WeighInForm({ date, last, compact = false }: { date: string; last?: number | null; compact?: boolean }) {
  const [state, action, pending] = useActionState<WeighInState, FormData>(saveWeighInAction, {});
  if (state.ok)
    return (
      <>
        <p className="notice notice-good" style={{ margin: "0 0 10px" }}>Weigh-in saved ✓</p>
        {!compact && (
          <Link className="btn btn-ghost btn-wide" href="/">
            Back to Today
          </Link>
        )}
      </>
    );
  return (
    <form action={action} className="weigh-form">
      <input type="hidden" name="date" value={date} />
      <div className="with-unit">
        <input name="weight" type="number" inputMode="decimal" step="0.1" min="50" max="800" required placeholder={last ? String(last) : "e.g. 182.4"} aria-label="Weight in pounds" />
        <span className="unit">lb</span>
      </div>
      {!compact && <input name="note" placeholder="Note (optional)" maxLength={300} />}
      <button className="btn btn-sm" type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </button>
      {state.error && <p className="err">{state.error}</p>}
    </form>
  );
}
