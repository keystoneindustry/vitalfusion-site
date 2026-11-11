import { getSettings, videoEmbedUrl } from "@/lib/settings";
import { firstName } from "@/lib/client-input";
import { onboardingPage } from "../guard";
import StepHeader from "../StepHeader";
import { finishStep } from "../actions";
import SubmitButton from "@/app/components/SubmitButton";

export const metadata = { title: "Welcome · Vital Fusion" };

export default async function WelcomePage() {
  const { client } = await onboardingPage("welcome", "/onboarding/welcome");
  const { welcome_video_url } = await getSettings();
  const embed = welcome_video_url ? videoEmbedUrl(welcome_video_url) : null;

  return (
    <>
      <StepHeader step="welcome" title={`Welcome, ${firstName(client.full_name)}!`} lead="A quick hello from Tyler, then a few short steps to get you set up." />

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

      <section className="card">
        <h2 className="h2">What's next</h2>
        <ol className="steps">
          <li>Add the app to your home screen</li>
          <li>Sign your coaching agreement</li>
          <li>Answer a few questions about you</li>
          <li>Book your kickoff call with Tyler</li>
        </ol>
        <p className="small muted" style={{ margin: "10px 0 0" }}>About 15–20 minutes. Once you're done, you'll get a quick tour of the app.</p>
      </section>
      <form action={finishStep}>
        <input type="hidden" name="step" value="welcome" />
        <SubmitButton label="Let's get started →" pendingLabel="One moment…" />
      </form>
    </>
  );
}
