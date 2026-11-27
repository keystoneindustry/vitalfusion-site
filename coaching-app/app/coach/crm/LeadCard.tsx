"use client";

import { useState, useTransition } from "react";
import { STATUSES, type Person } from "@/lib/crm-logic";
import { deleteLeadAction, saveLeadAction } from "./actions";

function when(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "short", day: "numeric" }).format(new Date(iso));
}

/** One lead: tap to open their history and your notes. */
export default function LeadCard({ p, reason, open = false }: { p: Person; reason?: string; open?: boolean }) {
  const [status, setStatus] = useState<string>(p.status);
  const [notes, setNotes] = useState(p.notes ?? "");
  const [followUp, setFollowUp] = useState(p.followUpOn ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save(contacted = false) {
    start(async () => {
      const r = await saveLeadAction({ email: p.email, id: p.crmId, status, notes, followUpOn: followUp, contacted });
      if (r.ok) {
        if (contacted && status === "new") setStatus("contacted");
        setMsg(contacted ? "Marked as contacted today ✓" : "Saved ✓");
      } else setMsg(r.error);
    });
  }

  const insta = p.instagram ? p.instagram.replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/$/, "") : null;
  const latest = p.activities[0];

  return (
    <details className="card lead" open={open} id={`lead-${p.key.replace(/[^a-z0-9]/gi, "-")}`}>
      <summary>
        <span className="lead-main">
          <b>{p.name}</b>
          <span className="small muted">
            {reason ?? (latest ? `${latest.label} · ${when(latest.at)}` : p.manual ? "Added by hand" : "")}
            {!reason && p.activities.length > 1 ? ` · ${p.activities.length} signups` : ""}
          </span>
        </span>
        <span className="lead-pills">
          {p.rating === "Hot" && <span className="pill pill-risk">Hot</span>}
          {p.applied && p.status !== "client" && <span className="pill pill-invited">Applied</span>}
          <span className={`pill lead-status-${p.status}`}>{STATUSES.find((s) => s.value === p.status)?.label}</span>
        </span>
      </summary>

      <div className="lead-body">
        <p className="lead-contact">
          {p.email && <a href={`mailto:${p.email}`}>✉️ {p.email}</a>}
          {p.phone && <a href={`sms:${p.phone}`}>💬 {p.phone}</a>}
          {insta && (
            <a href={`https://instagram.com/${insta}`} target="_blank" rel="noopener noreferrer">
              📷 @{insta}
            </a>
          )}
        </p>
        {(p.goal || p.rating) && (
          <p className="small muted" style={{ margin: "0 0 8px" }}>
            {[p.goal ? `Goal: ${p.goal}` : null, p.rating ? `Calculator rating: ${p.rating}` : null].filter(Boolean).join(" · ")}
          </p>
        )}
        {p.activities.length > 0 && (
          <ul className="lead-history">
            {p.activities.map((a, i) => (
              <li key={i}>
                <b>{a.label}</b>
                {a.detail ? ` (${a.detail})` : ""} <span className="muted">· {when(a.at)}{a.source ? ` · from ${a.source}` : ""}</span>
              </li>
            ))}
          </ul>
        )}
        {p.lastContactedAt && <p className="small muted" style={{ margin: "0 0 8px" }}>You last reached out {when(p.lastContactedAt)}.</p>}
        {p.autoClient && <p className="small muted" style={{ margin: "0 0 8px" }}>Marked Client automatically (they're in the coaching app or signed an agreement).</p>}

        <div className="grid-2">
          <div className="field">
            <label htmlFor={`st-${p.key}`}>Status</label>
            <select id={`st-${p.key}`} value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor={`fu-${p.key}`}>Follow up on</label>
            <input id={`fu-${p.key}`} type="date" value={followUp} onChange={(e) => setFollowUp(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label htmlFor={`no-${p.key}`}>Notes</label>
          <textarea id={`no-${p.key}`} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What you talked about, what they said, next step…" />
        </div>
        <div className="lead-actions">
          <button type="button" className="btn btn-sm" disabled={pending} onClick={() => save(false)}>
            {pending ? "Saving…" : "Save"}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" disabled={pending} onClick={() => save(true)}>
            I reached out today
          </button>
          {p.manual && p.crmId && (
            <button
              type="button"
              className="btn-link muted"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await deleteLeadAction(p.crmId!);
                  setMsg(r.ok ? "Removed" : r.error);
                })
              }
            >
              Remove
            </button>
          )}
          {msg && <span className="small muted">{msg}</span>}
        </div>
      </div>
    </details>
  );
}
