"use client";

import { useActionState } from "react";
import { saveSettingsAction, type SettingsState } from "./actions";
import { parseDays, WEEKDAYS } from "@/lib/calendar";

export default function SettingsForm({ initial }: { initial: Record<string, string> }) {
  const weighDays = parseDays(initial.default_weighin_days || "1,3,5");
  const [state, formAction, pending] = useActionState<SettingsState, FormData>(saveSettingsAction, {});
  return (
    <form action={formAction}>
      {state.saved && <div className="notice notice-good">Saved ✓</div>}
      {state.error && <div className="notice notice-error">{state.error}</div>}
      <div className="field">
        <label htmlFor="welcome_video_url">Welcome video link</label>
        <input
          id="welcome_video_url"
          name="welcome_video_url"
          type="url"
          inputMode="url"
          placeholder="https://youtu.be/…"
          defaultValue={initial.welcome_video_url}
        />
        <span className="hint">
          Shown on the first onboarding screen. Upload it to YouTube as <b>Unlisted</b> (or use Vimeo or Loom) and paste the
          link. Leave it empty to show a short written welcome instead.
        </span>
      </div>
      <div className="field">
        <label htmlFor="kickoff_link">Kickoff call booking link (Cal.com)</label>
        <input id="kickoff_link" name="kickoff_link" type="url" inputMode="url" required defaultValue={initial.kickoff_link} />
      </div>
      <div className="field">
        <label htmlFor="checkin_link">Check-in call booking link (Cal.com)</label>
        <input id="checkin_link" name="checkin_link" type="url" inputMode="url" required defaultValue={initial.checkin_link} />
      </div>
      <h3 className="builder-section">New clients' starting schedule</h3>
      <p className="small muted" style={{ marginTop: 0 }}>
        Added when you first publish a client's plan (with a daily step goal from their onboarding answers). You can change it
        per client on their Progress and Habits tabs.
      </p>
      <div className="field">
        <label>Weigh-in days</label>
        <div className="chips">
          {WEEKDAYS.map((d, i) => (
            <label key={d} className="chip chip-check">
              <input type="checkbox" name="default_weighin_days" value={i} defaultChecked={weighDays.includes(i)} />
              {d}
            </label>
          ))}
        </div>
      </div>
      <div className="field">
        <label htmlFor="default_photo_every_weeks">Progress photos</label>
        <select id="default_photo_every_weeks" name="default_photo_every_weeks" defaultValue={initial.default_photo_every_weeks || "1"}>
          <option value="1">Every week</option>
          <option value="2">Every 2 weeks</option>
          <option value="4">Every 4 weeks</option>
        </select>
        <span className="hint">On the day each client picked during onboarding (Sunday if they didn't).</span>
      </div>
      <button className="btn btn-wide" type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}
