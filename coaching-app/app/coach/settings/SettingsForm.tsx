"use client";

import { useActionState } from "react";
import { saveSettingsAction, type SettingsState } from "./actions";

export default function SettingsForm({ initial }: { initial: Record<string, string> }) {
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
      <button className="btn btn-wide" type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}
