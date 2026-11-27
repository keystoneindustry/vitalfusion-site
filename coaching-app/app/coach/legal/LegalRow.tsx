"use client";

import { useState, useTransition } from "react";
import { deleteLegalAction, resendLegalAction } from "./actions";

/** Buttons for one agreement in the list: copy link / resend / cancel (unsigned), PDF / delete (signed). */
export default function LegalRowActions({ id, signed, link, name }: { id: string; signed: boolean; link: string; name: string }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();

  function run(fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) {
    start(async () => {
      const r = await fn();
      setMsg(r.ok ? (r.message ?? "Done") : (r.error ?? "Something went wrong."));
    });
  }

  return (
    <div className="legal-actions">
      {signed ? (
        <a className="btn btn-ghost btn-sm" href={`/coach/legal/${id}/pdf`} target="_blank" rel="noopener noreferrer">
          Open PDF
        </a>
      ) : (
        <>
          <button type="button" className="btn btn-ghost btn-sm" disabled={pending} onClick={() => run(() => resendLegalAction(id))}>
            Resend email
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(link);
                setMsg("Link copied. You can text it to them.");
              } catch {
                setMsg(link);
              }
            }}
          >
            Copy link
          </button>
        </>
      )}
      {confirming ? (
        <>
          <button type="button" className="btn btn-ghost btn-sm" style={{ color: "#ffb4b4" }} disabled={pending} onClick={() => run(() => deleteLegalAction(id))}>
            {signed ? `Yes, delete ${name}'s signed agreement` : "Yes, cancel it"}
          </button>
          <button type="button" className="btn-link muted" onClick={() => setConfirming(false)}>
            Keep
          </button>
        </>
      ) : (
        <button type="button" className="btn-link muted" onClick={() => setConfirming(true)}>
          {signed ? "Delete" : "Cancel"}
        </button>
      )}
      {msg && <p className="small muted legal-msg">{msg}</p>}
    </div>
  );
}
