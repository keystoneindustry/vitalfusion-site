import type { Metadata } from "next";
import { site } from "@/content/site";
import { youTubeId } from "@/lib/email";

// Hidden page: only linked from the "we got your application" email.
// Not in the menu, and search engines are told not to list it.
export const metadata: Metadata = {
  title: "What Happens Next | Vital Fusion Coaching",
  robots: { index: false, follow: false },
};

export default function NextStepsPage() {
  const n = site.nextSteps;
  const vid = n.videoUrl ? youTubeId(n.videoUrl) : null;

  return (
    <main className="wrap next-steps">
      <p className="pill">✓ {n.eyebrow}</p>
      <h1 className="display">{n.headline}</h1>
      <p className="body lead-body">{n.intro}</p>

      {vid && (
        <div className="video">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${vid}`}
            title="What coaching looks like"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      <h2 className="h2 steps-title">{n.stepsTitle}</h2>
      <ol className="vital">
        {n.steps.map((s, i) => (
          <li key={s.title}>
            <span className="vital-letter">{i + 1}</span>
            <div>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mission-card">
        <p>{n.closing}</p>
      </div>

      <p className="sign">
        {n.signOff}
        <br />
        <strong>{site.coachName}</strong>
        <br />
        <span className="muted">{site.brand}</span>
      </p>
    </main>
  );
}
