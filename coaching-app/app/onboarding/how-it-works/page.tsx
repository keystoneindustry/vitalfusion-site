import { onboardingPage } from "../guard";
import StepHeader from "../StepHeader";
import { finishStep } from "../actions";
import SubmitButton from "@/app/components/SubmitButton";
import Link from "next/link";
import { listResources, startHere } from "@/lib/resources";

export const metadata = { title: "How your coaching works · Vital Fusion" };

export default async function HowItWorksPage() {
  const { isCurrent } = await onboardingPage("how_it_works", "/onboarding/how-it-works");
  const guide = startHere(await listResources(true).catch(() => []));
  return (
    <>
      <StepHeader step="how_it_works" title="How your coaching works" lead="Here's what the next few days, and every week after, look like." />

      <section className="card">
        <ol className="timeline-steps">
          <li>
            <h3>First 3–5 days: show me how you eat</h3>
            <p>
              No changes yet. Just take a photo of every meal and snack, with the time and a quick note. This lets Tyler build
              a plan around how you really live, not a generic template.
            </p>
          </li>
          <li>
            <h3>Your kickoff call</h3>
            <p>
              You and Tyler go over your meals, goals and schedule together. Your next and final setup step is booking it.
            </p>
          </li>
          <li>
            <h3>Right after the call: your plan</h3>
            <p>
              Your training program and nutrition plan land in the app: your calorie and macro targets and a “perfect
              day” of eating built around foods you like (more meals to swap in are in your meal library). You'll track
              your calories in Cronometer or MyFitnessPal; the links are on your Nutrition tab.
            </p>
          </li>
          <li>
            <h3>Every week after that</h3>
            <p>
              Do the workouts on your calendar, tick off your daily habits, and weigh in on your scheduled days. On your
              check-in day, take your progress photos and fill out your weekly check-in. Tyler reads it, replies in the app
              and adjusts your plan, and you can book an optional 1-on-1 call that week.
            </p>
          </li>
        </ol>
      </section>

      <section className="card card-accent">
        <h2 className="h2">📚 Your Resources</h2>
        <p className="coming" style={{ marginTop: 0 }}>
          Tyler's guides and videos live in the app under <b>☰ More → Resources</b>.
          {guide ? " Start with the one marked READ FIRST: it walks you through weigh-ins, progress photos and tracking." : " Start with the Getting started section."}
        </p>
        {guide && (
          <a className="btn btn-ghost btn-wide" href={`/resources/${guide.id}`} target="_blank" rel="noopener noreferrer">
            📄 Open “{guide.title.replace(/^\(?read first\)?\s*[:\-–]?\s*/i, "")}”
          </a>
        )}
      </section>

      {isCurrent ? (
        <form action={finishStep}>
          <input type="hidden" name="step" value="how_it_works" />
          <SubmitButton label="Got it, last step →" pendingLabel="One moment…" />
        </form>
      ) : (
        <Link className="btn btn-wide" href="/onboarding">
          Continue →
        </Link>
      )}
    </>
  );
}
