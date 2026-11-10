import Link from "next/link";
import { getResponse } from "@/lib/onboarding-data";
import { onboardingPage } from "../guard";
import StepHeader from "../StepHeader";
import QuestionFlow from "./QuestionFlow";

export const metadata = { title: "Onboarding questions · Vital Fusion" };

export default async function QuestionsPage() {
  const { client } = await onboardingPage("questions", "/onboarding/questions");
  const saved = await getResponse(client.id);

  if (saved?.submitted_at) {
    return (
      <>
        <StepHeader step="questions" title="Questions done ✅" />
        <section className="card">
          <p className="coming" style={{ marginTop: 0 }}>
            Thanks! Tyler has your answers and will use them to build your plan.
          </p>
          <Link className="btn btn-wide" href="/onboarding">
            Continue →
          </Link>
        </section>
      </>
    );
  }

  return (
    <>
      <StepHeader
        step="questions"
        title="Tell Tyler about you"
        lead="Your goals, training, schedule and food. One question at a time, and your answers save as you go. About 10 minutes."
      />
      <QuestionFlow initialAnswers={saved?.answers ?? {}} initialIndex={saved?.current_question ?? 0} />
    </>
  );
}
