"use client";

import { useActionState, useState } from "react";
import { STAGES } from "@/lib/client-input";
import { endDateFromWeeks, formatDate, isIsoDate } from "@/lib/dates";
import type { ClientFormState } from "./actions";

type Defaults = {
  fullName?: string;
  email?: string;
  phone?: string | null;
  coachingWeeks?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  notes?: string | null;
  stage?: string;
};

const WEEK_PRESETS = [4, 8, 12, 16, 24];

/** Add/edit client form. The end date follows the start date and length until it's edited by hand. */
export default function ClientForm({
  action,
  defaults = {},
  mode,
  today,
}: {
  action: (prev: ClientFormState, form: FormData) => Promise<ClientFormState>;
  defaults?: Defaults;
  mode: "new" | "edit";
  today: string;
}) {
  const [state, formAction, pending] = useActionState<ClientFormState, FormData>(action, {});
  const [weeks, setWeeks] = useState<string>(defaults.coachingWeeks ? String(defaults.coachingWeeks) : "12");
  const [start, setStart] = useState<string>(defaults.startDate || today);
  const [end, setEnd] = useState<string>(defaults.endDate || "");
  const [endTouched, setEndTouched] = useState<boolean>(mode === "edit" && Boolean(defaults.endDate));

  const weeksNum = Number(weeks);
  const autoEnd = isIsoDate(start) && Number.isInteger(weeksNum) && weeksNum > 0 ? endDateFromWeeks(start, weeksNum) : "";
  const endValue = endTouched ? end : autoEnd;
  const fe = state.fieldErrors || {};

  return (
    <form action={formAction}>
      {state.saved && <div className="notice notice-good">Saved ✓</div>}
      {state.error && <div className="notice notice-error">{state.error}</div>}

      <div className="field">
        <label htmlFor="fullName">Full name</label>
        <input id="fullName" name="fullName" autoComplete="off" required defaultValue={defaults.fullName} />
        {fe.fullName && <p className="err">{fe.fullName}</p>}
      </div>

      <div className="field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoCapitalize="none"
          autoComplete="off"
          required
          defaultValue={defaults.email}
        />
        {fe.email && <p className="err">{fe.email}</p>}
      </div>

      <div className="field">
        <label htmlFor="phone">
          Phone <span className="muted">(optional)</span>
        </label>
        <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="off" defaultValue={defaults.phone ?? ""} />
        {fe.phone && <p className="err">{fe.phone}</p>}
      </div>

      <div className="field">
        <label htmlFor="coachingWeeks">Length of coaching (weeks)</label>
        <input
          id="coachingWeeks"
          name="coachingWeeks"
          type="number"
          inputMode="numeric"
          min={1}
          max={260}
          required
          value={weeks}
          onChange={(e) => setWeeks(e.target.value)}
        />
        <div className="chips">
          {WEEK_PRESETS.map((w) => (
            <button
              key={w}
              type="button"
              className="chip"
              aria-pressed={weeks === String(w)}
              onClick={() => setWeeks(String(w))}
            >
              {w} weeks
            </button>
          ))}
        </div>
        {fe.coachingWeeks && <p className="err">{fe.coachingWeeks}</p>}
      </div>

      <div className="grid-2">
        <div className="field">
          <label htmlFor="startDate">Start date</label>
          <input id="startDate" name="startDate" type="date" required value={start} onChange={(e) => setStart(e.target.value)} />
          {fe.startDate && <p className="err">{fe.startDate}</p>}
        </div>
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
      </div>
      <p className="muted small" style={{ margin: "-4px 0 14px" }}>
        {endTouched && autoEnd && endValue !== autoEnd ? (
          <>
            End date set by hand.{" "}
            <button type="button" className="btn-link" onClick={() => setEndTouched(false)}>
              Use {formatDate(autoEnd)} instead
            </button>
          </>
        ) : autoEnd ? (
          `Ends ${formatDate(autoEnd)}, the last day of week ${weeksNum}. These dates go into their agreement.`
        ) : (
          "Pick a start date and length to fill in the end date."
        )}
      </p>

      {mode === "edit" && (
        <div className="field">
          <label htmlFor="stage">Stage</label>
          <select id="stage" name="stage" defaultValue={defaults.stage}>
            {STAGES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="field">
        <label htmlFor="notes">
          Private notes <span className="muted">(only you see these)</span>
        </label>
        <textarea id="notes" name="notes" defaultValue={defaults.notes ?? ""} />
      </div>

      {mode === "new" && (
        <label className="row" style={{ margin: "0 0 16px", fontSize: 16, color: "var(--text-2)" }}>
          <input type="checkbox" name="sendInvite" defaultChecked style={{ width: 22, height: 22, appearance: "auto" }} />
          Email their invite now
        </label>
      )}

      <button className="btn btn-wide" type="submit" disabled={pending}>
        {pending ? "Saving…" : mode === "new" ? "Add client" : "Save changes"}
      </button>
    </form>
  );
}
