import { requireCoach } from "@/lib/auth";
import { getSettings, videoEmbedUrl } from "@/lib/settings";
import SettingsForm from "./SettingsForm";
import { appOrigin } from "@/lib/origin";

export const metadata = { title: "Settings · Vital Fusion Coach" };

export default async function SettingsPage() {
  await requireCoach("/coach/settings");
  const settings = await getSettings();
  const embed = settings.welcome_video_url ? videoEmbedUrl(settings.welcome_video_url) : null;
  const origin = await appOrigin();
  return (
    <div style={{ maxWidth: 620 }}>
      <h1 className="h1">Settings</h1>
      <p className="lead">What your clients see during onboarding.</p>
      <section className="card">
        <SettingsForm initial={settings} />
      </section>
      <section className="card">
        <h2 className="h2">Cal.com connection</h2>
        <p className="coming" style={{ marginTop: 0 }}>
          This lets bookings show up in the app automatically. In Cal.com go to <b>Settings → Developer → Webhooks → New</b>,
          paste these two values, leave all booking events ticked, and save.
        </p>
        <div className="field">
          <label htmlFor="hook-url">Subscriber URL</label>
          <input id="hook-url" readOnly value={`${origin}/api/cal/webhook`} />
        </div>
        <div className="field">
          <label htmlFor="hook-secret">Secret</label>
          <input id="hook-secret" readOnly value={process.env.CAL_WEBHOOK_SECRET || "Not set up yet"} />
          <span className="hint">Keep this private. It proves the bookings really come from Cal.com.</span>
        </div>
      </section>

      {settings.welcome_video_url && (
        <section className="card">
          <h2 className="h2">Welcome video preview</h2>
          {embed ? (
            <div className="video">
              <iframe src={embed} title="Welcome video preview" allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
            </div>
          ) : (
            <p className="muted" style={{ margin: 0 }}>
              That link can't be played inside the app, so clients will see a button that opens it instead. YouTube
              (unlisted is fine), Vimeo and Loom links play inside the app.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
