"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { endDateFromWeeks, formatDate, isIsoDate } from "@/lib/dates";
import type { LegalFormState } from "./actions";

const WEEK_PRESETS = [4, 8, 12, 16, 20, 24];

/** Who to send the agreement to and what they bought. The dates go straight into the agreement's payment section. */
export default function LegalForm({ action, today }: { action: (prev: LegalFormState, form: FormData) => Promise<LegalFormState>; today: string }) {
  const [state, formAction, pending] = useActionState<LegalFormState, FormData>(action, {});
  const [billing, setBilling] = useState<"package" | "monthly">("package");
  const [weeks, setWeeks] = useState("12");
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState("");
  const [endTouched, setEndTouched] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.sentTo) formRef.current?.reset();
  }, [state]);

  const weeksNum = Number(weeks);
  const autoEnd = isIsoDate(start) && Number.isInteger(weeksNum) && weeksNum > 0 ? endDateFromWeeks(start, weeksNum) : "";
  const endValue = endTouched ? end : autoEnd;
  const fe = state.fieldErrors || {};

  return (
    <form action={formAction} ref={formRef}>
      {state.sentTo && <div className="notice notice-good">Sent to {state.sentTo} ✓ You'll get the signed PDF by email.</div>}
      {state.error && <div className="notice notice-error">{state.error}</div>}

      <div className="field">
        <label htmlFor="fullName">Full name</label>
        <input id="fullName" name="fullName" autoComplete="off" required />
        {fe.fullName && <p className="err">{fe.fullName}</p>}
      </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" inputMode="email" autoCapitalize="none" autoComplete="off" required />
          {fe.email && <p className="err">{fe.email}</p>}
        </div>
        <div className="field">
          <label htmlFor="phone">
            Phone <span className="muted">(optional)</span>
          </label>
          <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="off" />
          {fe.phone && <p className="err">{fe.phone}</p>}
        </div>

      <div className="field">
        <span className="label">What did they buy?</span>
        <input type="hidden" name="billing" value={billing} />
        <div className="chips">
          <button type="button" className="chip" aria-pressed={billing === "package"} onClick={() => setBilling("package")}>
            Package (set length)
          </button>
          <button type="button" className="chip" aria-pressed={billing === "monthly"} onClick={() => setBilling("monthly")}>
            Monthly (cancel anytime)
          </button>
        </div>
      </div>

      {billing === "package" && (
        <div className="field">
          <label htmlFor="coachingWeeks">Length of coaching (weeks)</label>
          <input id="coachingWeeks" name="coachingWeeks" type="number" inputMode="numeric" min={1} max={260} required value={weeks} onChange={(e) => setWeeks(e.target.value)} />
          <div className="chips">
            {WEEK_PRESETS.map((w) => (
              <button key={w} type="button" className="chip" aria-pressed={weeks === String(w)} onClick={() => setWeeks(String(w))}>
                {w} weeks
              </button>
            ))}
          </div>
          {fe.coachingWeeks && <p className="err">{fe.coachingWeeks}</p>}
        </div>
      )}

      <div className="grid-2">
        <div className="field">
          <label htmlFor="startDate">Start date</label>
          <input id="startDate" name="startDate" type="date" required value={start} onChange={(e) => setStart(e.target.value)} />
          {fe.startDate && <p className="err">{fe.startDate}</p>}
        </div>
        {billing === "package" && (
          <div className="field">
            <label htmlFor="endDate">End date</label>
            <input
              id="endDate"
              name="endDate"
              type="date"
              required
              value={endValue}
              onChange={(e) => {
                setEndTouched(true);
                setEnd(e.target.value);
              }}
            />
            {fe.endDate && <p className="err">{fe.endDate}</p>}
          </div>
        )}
      </div>
      <p className="muted small" style={{ margin: "-4px 0 14px" }}>
        {billing === "monthly"
          ? "Their agreement will say month-to-month, cancel anytime by email, no refunds once paid."
          : endTouched && autoEnd && endValue !== autoEnd
            ? (
              <>
                End date set by hand.{" "}
                <button type="button" className="btn-link" onClick={() => setEndTouched(false)}>
                  Use {formatDate(autoEnd)} instead
                </button>
              </>
            )
            : autoEnd
              ? `Ends ${formatDate(autoEnd)}. These dates go into their agreement.`
              : "Pick a start date and length to fill in the end date."}
      </p>

      <label className="row" style={{ alignItems: "flex-start", fontSize: 15, color: "var(--text-2)", margin: "0 0 16px", gap: 10 }}>
        <input type="checkbox" name="skipParq" style={{ width: 22, height: 22, flex: "0 0 auto", appearance: "auto", marginTop: 2 }} />
        <span>
          Leave out the health questions (PAR-Q)
          <br />
          <span className="muted small">They're included unless you tick this. Tick it if they already answer these in your other coaching app.</span>
        </span>
      </label>

      <button className="btn btn-wide" type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send agreement to sign"}
      </button>
    </form>
  );
}
