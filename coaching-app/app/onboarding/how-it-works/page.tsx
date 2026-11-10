import { onboardingPage } from "../guard";
import StepHeader from "../StepHeader";
import { finishStep } from "../actions";
import SubmitButton from "@/app/components/SubmitButton";
import Link from "next/link";

export const metadata = { title: "How your coaching works · Vital Fusion" };

export default async function HowItWorksPage() {
  const { isCurrent } = await onboardingPage("how_it_works", "/onboarding/how-it-works");
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
              Your training program and full nutrition plan land in the app: your calorie and macro targets, a “perfect day”
              of eating, and meals you can pick from, built around foods you like.
            </p>
          </li>
          <li>
            <h3>Every week after that</h3>
            <p>
              Follow your targets and daily habits, do your workouts, weigh in on your scheduled days, and fill out your
              Sunday check-in. Tyler reviews it and adjusts your plan. Progress pictures come on a set schedule, and you can
              book a check-in call whenever you need one.
            </p>
          </li>
        </ol>
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
