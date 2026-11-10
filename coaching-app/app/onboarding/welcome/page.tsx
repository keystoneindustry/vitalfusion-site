import { getSettings, videoEmbedUrl } from "@/lib/settings";
import { firstName } from "@/lib/client-input";
import { onboardingPage } from "../guard";
import StepHeader from "../StepHeader";
import Tour from "./Tour";

export const metadata = { title: "Welcome · Vital Fusion" };

export default async function WelcomePage() {
  const { client } = await onboardingPage("welcome", "/onboarding/welcome");
  const { welcome_video_url } = await getSettings();
  const embed = welcome_video_url ? videoEmbedUrl(welcome_video_url) : null;

  return (
    <>
      <StepHeader step="welcome" title={`Welcome, ${firstName(client.full_name)}!`} lead="A quick hello from Tyler, then a 30-second tour of your app." />

      <section className="card" style={{ padding: 0, overflow: "hidden" }}>
        {embed ? (
          <div className="video">
            <iframe
              src={embed}
              title="Welcome from Tyler"
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
            />
          </div>
        ) : welcome_video_url ? (
          <div style={{ padding: 18 }}>
            <a className="btn btn-wide" href={welcome_video_url} target="_blank" rel="noopener noreferrer">
              ▶ Watch Tyler's welcome video
            </a>
          </div>
        ) : (
          <div style={{ padding: 18 }}>
            <h2 className="h2">A note from Tyler</h2>
            <p className="coming" style={{ margin: 0 }}>
              I'm excited to work with you. Over the next few minutes you'll set up the app, sign your coaching agreement
              and tell me about your goals, schedule and food. Then we'll book your kickoff call. Let's get started!
            </p>
          </div>
        )}
      </section>

      <Tour />
    </>
  );
}
